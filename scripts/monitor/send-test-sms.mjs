#!/usr/bin/env node
import { sendTwilioMessage } from "./lib.mjs";

const result = await sendTwilioMessage({
  body:"ShowPing test: SMS delivery is connected. Your Ramayana tracker is active for 14 Nov 2026.",
});

console.log(`Test SMS accepted by Twilio (${result.sid}, ${result.status}).`);
