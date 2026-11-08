import test from "node:test";
import assert from "node:assert/strict";
import { buildSmsBody, evaluateBookingPage, extractReaderFinalUrl, normalizeText, validateTracker } from "../scripts/monitor/lib.mjs";

const tracker = {
  id:"odyssey-mumbai", active:true, movie:"The Odyssey", aliases:["Odyssey"],
  theatre:"PVR Example", city:"Mumbai", date:"2026-12-18",
  bookingUrl:"https://in.bookmyshow.com/cinemas/mumbai/pvr-example/buytickets/PVRE/20261218",
};

test("normalizes markup and punctuation", () => {
  assert.equal(normalizeText("<b>The&nbsp;Odyssey</b> — IMAX"), "the odyssey imax");
});

test("detects an open booking by movie title", () => {
  assert.equal(evaluateBookingPage({ tracker, status:200, finalUrl:tracker.bookingUrl, body:"<main><h2>The Odyssey</h2><button>07:30 PM</button></main>" }).state, "open");
});

test("does not alert when the title is absent", () => {
  assert.equal(evaluateBookingPage({ tracker, status:200, finalUrl:tracker.bookingUrl, body:"<main>Other Movie 07:30 PM</main>" }).state, "closed");
});

test("does not alert when BookMyShow redirects to another date", () => {
  const redirected = tracker.bookingUrl.replace("20261218", "20261217");
  const result = evaluateBookingPage({ tracker, status:200, finalUrl:redirected, body:"The Odyssey" });
  assert.equal(result.state, "closed");
  assert.match(result.reason, /redirected/);
});

test("extracts the final BookMyShow URL from reader output", () => {
  const redirected = tracker.bookingUrl.replace("20261218", "20261217");
  assert.equal(extractReaderFinalUrl(`URL Source: ${tracker.bookingUrl}\n\nFinal URL: ${redirected}\n`, tracker.bookingUrl), redirected);
});

test("treats rate limits and access blocks as unknown", () => {
  assert.equal(evaluateBookingPage({ tracker, status:429, finalUrl:tracker.bookingUrl, body:"" }).state, "unknown");
  assert.equal(evaluateBookingPage({ tracker, status:200, finalUrl:tracker.bookingUrl, body:"Please verify you are human: The Odyssey" }).state, "unknown");
});

test("validates the BookMyShow theatre/date URL", () => {
  assert.deepEqual(validateTracker(tracker), []);
  assert.ok(validateTracker({ ...tracker, date:"2026-12-19" }).some((error) => error.includes("must match")));
});

test("SMS includes the booking link", () => {
  assert.match(buildSmsBody(tracker), /The Odyssey/);
  assert.match(buildSmsBody(tracker), /https:\/\/in\.bookmyshow\.com/);
});
