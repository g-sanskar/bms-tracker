#!/usr/bin/env node
import { writeFile } from "node:fs/promises";
import { resolve } from "node:path";
import { checkTracker, loadJson, sendTwilioSms, validateTracker } from "./lib.mjs";

const trackerPath = resolve(process.env.TRACKERS_PATH || "data/trackers.json");
const statePath = resolve(process.env.STATE_PATH || "data/state.json");
const onlyTrackerId = process.env.TRACKER_ID?.trim();
const dryRun = process.env.DRY_RUN === "true";
const now = new Date();
const todayInIndia = new Intl.DateTimeFormat("en-CA", { timeZone:"Asia/Kolkata", year:"numeric", month:"2-digit", day:"2-digit" }).format(now);

const trackersDocument = await loadJson(trackerPath);
const trackers = Array.isArray(trackersDocument) ? trackersDocument : trackersDocument.trackers;
if (!Array.isArray(trackers)) throw new Error(`${trackerPath} must contain an array or a { "trackers": [] } object`);

let state;
try { state = await loadJson(statePath); }
catch (error) {
  if (error.code !== "ENOENT") throw error;
  state = { schemaVersion:1, trackers:{} };
}
state.schemaVersion = 1;
state.trackers ??= {};
let changed = false;
let failures = 0;
let checked = 0;

for (const tracker of trackers) {
  const errors = validateTracker(tracker);
  if (errors.length) {
    console.error(`::error title=Invalid tracker ${tracker?.id ?? "unknown"}::${errors.join("; ")}`);
    failures += 1;
    continue;
  }
  if (tracker.active === false || (onlyTrackerId && tracker.id !== onlyTrackerId)) continue;
  if (tracker.date < todayInIndia) {
    console.log(`[${tracker.id}] skipped: show date ${tracker.date} has passed`);
    continue;
  }
  checked += 1;
  try {
    const result = await checkTracker(tracker);
    console.log(`[${tracker.id}] ${result.state}: ${result.reason}`);
    if (dryRun || result.state === "unknown") continue;
    const previous = state.trackers[tracker.id]?.lastKnownState ?? "unknown";
    if (result.state === "open" && previous !== "open") {
      const sent = await sendTwilioSms({ tracker });
      console.log(`[${tracker.id}] SMS accepted by Twilio (${sent.sid}, ${sent.status})`);
      state.trackers[tracker.id] = { lastKnownState:"open", changedAt:now.toISOString(), notifiedAt:now.toISOString(), twilioMessageSid:sent.sid };
      changed = true;
    } else if (result.state === "closed" && previous !== "closed") {
      state.trackers[tracker.id] = { lastKnownState:"closed", changedAt:now.toISOString(), notifiedAt:null, twilioMessageSid:null };
      changed = true;
    }
  } catch (error) {
    failures += 1;
    console.error(`::error title=Tracker ${tracker.id} failed::${error.message}`);
  }
}

if (onlyTrackerId && !trackers.some((tracker) => tracker.id === onlyTrackerId)) {
  console.error(`::error::TRACKER_ID ${onlyTrackerId} does not exist`);
  failures += 1;
}
if (changed && !dryRun) await writeFile(statePath, `${JSON.stringify(state, null, 2)}\n`, "utf8");
console.log(`Checked ${checked} active tracker(s); state ${changed ? "changed" : "unchanged"}; failures ${failures}.`);
if (failures) process.exitCode = 1;
