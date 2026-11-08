import { readFile } from "node:fs/promises";

const BOOKMYSHOW_HOST = "in.bookmyshow.com";
const BLOCKED_MARKERS = [
  "access denied",
  "captcha",
  "verify you are human",
  "unusual traffic",
  "temporarily blocked",
];

export function normalizeText(value) {
  return String(value ?? "")
    .normalize("NFKD")
    .replace(/[\u0300-\u036f]/g, "")
    .replace(/&amp;/gi, "&")
    .replace(/&nbsp;/gi, " ")
    .replace(/&#39;|&apos;/gi, "'")
    .replace(/&quot;/gi, '"')
    .replace(/<script\b[^>]*>[\s\S]*?<\/script>/gi, " ")
    .replace(/<style\b[^>]*>[\s\S]*?<\/style>/gi, " ")
    .replace(/<[^>]+>/g, " ")
    .replace(/[^\p{L}\p{N}'+:&-]+/gu, " ")
    .replace(/\s+/g, " ")
    .trim()
    .toLowerCase();
}

export function validateTracker(tracker) {
  const errors = [];
  if (!tracker || typeof tracker !== "object") return ["tracker must be an object"];
  if (!/^[a-z0-9][a-z0-9-]{1,62}$/.test(tracker.id ?? "")) errors.push("id must use 2-63 lowercase letters, numbers, or hyphens");
  for (const key of ["movie", "theatre", "city"]) {
    if (typeof tracker[key] !== "string" || !tracker[key].trim()) errors.push(`${key} is required`);
  }
  if (!/^\d{4}-\d{2}-\d{2}$/.test(tracker.date ?? "")) errors.push("date must be YYYY-MM-DD");
  try {
    const url = new URL(tracker.bookingUrl);
    if (url.protocol !== "https:") errors.push("bookingUrl must use HTTPS");
    if (url.hostname !== BOOKMYSHOW_HOST) errors.push(`bookingUrl must use ${BOOKMYSHOW_HOST}`);
    if (!url.pathname.toLowerCase().includes("/buytickets/")) errors.push("bookingUrl must be the theatre/date buytickets page");
    const urlDate = url.pathname.match(/\/(\d{8})\/?$/)?.[1];
    if (urlDate && tracker.date?.replaceAll("-", "") !== urlDate) errors.push("date must match the YYYYMMDD at the end of bookingUrl");
  } catch {
    errors.push("bookingUrl must be a valid URL");
  }
  if (tracker.aliases !== undefined && (!Array.isArray(tracker.aliases) || tracker.aliases.some((item) => typeof item !== "string" || !item.trim()))) errors.push("aliases must be an array of non-empty strings");
  return errors;
}

export function evaluateBookingPage({ tracker, status, body, finalUrl }) {
  if (status === 403 || status === 429) return { state:"unknown", reason:`BookMyShow returned HTTP ${status}` };
  if (status < 200 || status >= 300) return { state:"unknown", reason:`BookMyShow returned HTTP ${status}` };
  let parsedFinalUrl;
  try {
    parsedFinalUrl = new URL(finalUrl);
    if (parsedFinalUrl.hostname !== BOOKMYSHOW_HOST) return { state:"unknown", reason:"request was redirected away from BookMyShow" };
  } catch {
    return { state:"unknown", reason:"response URL was invalid" };
  }
  const text = normalizeText(body);
  if (BLOCKED_MARKERS.some((marker) => text.includes(marker))) return { state:"unknown", reason:"BookMyShow returned a bot-check or access block" };
  const expectedDate = tracker.date.replaceAll("-", "");
  const finalDate = parsedFinalUrl.pathname.match(/\/(\d{8})\/?$/)?.[1];
  if (!finalDate) return { state:"unknown", reason:"BookMyShow response did not identify a show date" };
  if (finalDate !== expectedDate) return { state:"closed", reason:`target date is not open; BookMyShow redirected to ${finalDate}` };
  const candidates = [tracker.movie, ...(tracker.aliases ?? [])].map(normalizeText).filter((value) => value.length >= 2);
  const matched = candidates.find((title) => text.includes(title));
  if (matched) return { state:"open", reason:`movie title matched: ${matched}` };
  return { state:"closed", reason:"movie is not listed on the theatre/date page" };
}

export async function loadJson(path) {
  return JSON.parse(await readFile(path, "utf8"));
}

export function extractReaderFinalUrl(body, fallbackUrl) {
  return body.match(/^Final URL:\s*(https:\/\/in\.bookmyshow\.com\/\S+)\s*$/mi)?.[1]
    ?? body.match(/^URL Source:\s*(https:\/\/in\.bookmyshow\.com\/\S+)\s*$/mi)?.[1]
    ?? fallbackUrl;
}

export async function checkTracker(tracker, fetchImpl = fetch, mode = process.env.BOOKMYSHOW_FETCH_MODE || "reader") {
  const requestUrl = mode === "direct" ? tracker.bookingUrl : `https://r.jina.ai/${tracker.bookingUrl}`;
  const response = await fetchImpl(requestUrl, {
    redirect:"follow",
    signal:AbortSignal.timeout(15_000),
    headers:{
      accept:mode === "direct" ? "text/html,application/xhtml+xml" : "text/plain",
      "accept-language":"en-IN,en;q=0.9",
      "cache-control":"no-cache",
      "user-agent":"ShowPing/1.0 (+https://github.com; personal booking availability monitor)",
    },
  });
  const body = await response.text();
  const finalUrl = mode === "direct" ? (response.url || tracker.bookingUrl) : extractReaderFinalUrl(body, tracker.bookingUrl);
  return evaluateBookingPage({ tracker, status:response.status, body, finalUrl });
}

export function buildSmsBody(tracker) {
  return `ShowPing: Booking is open for ${tracker.movie} at ${tracker.theatre} on ${tracker.date}. Book now: ${tracker.bookingUrl}`;
}

export async function sendTwilioSms({ tracker, env = process.env, fetchImpl = fetch }) {
  const accountSid = env.TWILIO_ACCOUNT_SID;
  const authToken = env.TWILIO_AUTH_TOKEN;
  const to = env.SMS_TO_NUMBER;
  const messagingServiceSid = env.TWILIO_MESSAGING_SERVICE_SID;
  const from = env.TWILIO_FROM_NUMBER;
  const missing = [
    !accountSid && "TWILIO_ACCOUNT_SID",
    !authToken && "TWILIO_AUTH_TOKEN",
    !to && "SMS_TO_NUMBER",
    !messagingServiceSid && !from && "TWILIO_MESSAGING_SERVICE_SID or TWILIO_FROM_NUMBER",
  ].filter(Boolean);
  if (missing.length) throw new Error(`Missing SMS secrets: ${missing.join(", ")}`);
  const form = new URLSearchParams({ To:to, Body:buildSmsBody(tracker) });
  if (messagingServiceSid) form.set("MessagingServiceSid", messagingServiceSid);
  else form.set("From", from);
  const response = await fetchImpl(`https://api.twilio.com/2010-04-01/Accounts/${encodeURIComponent(accountSid)}/Messages.json`, {
    method:"POST",
    headers:{
      authorization:`Basic ${Buffer.from(`${accountSid}:${authToken}`).toString("base64")}`,
      "content-type":"application/x-www-form-urlencoded",
    },
    body:form,
    signal:AbortSignal.timeout(15_000),
  });
  const result = await response.json().catch(() => ({}));
  if (!response.ok || !result.sid) throw new Error(`Twilio rejected the SMS (${response.status}): ${result.message ?? "unknown error"}`);
  return { sid:result.sid, status:result.status };
}
