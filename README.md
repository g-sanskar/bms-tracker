# ShowPing

An unofficial BookMyShow booking tracker concept. Pick a movie, theatre, date and notification channel, then manage the watchlist from a responsive dashboard.

## Current milestone

- Responsive tracker dashboard and two-step creation flow
- Movie, city, theatre, date, email and SMS preferences
- Local browser persistence, search, pause/resume and delete
- Browser notification test
- Honest preview-mode labels for integrations that are not connected yet

Live BookMyShow monitoring and outbound email/SMS are the next backend milestone. They require a server-side availability checker, durable storage, a scheduled job, and provider credentials (for example Resend and Twilio). Keep those secrets server-side.

## Run locally

```bash
npm install
npm run dev
```

Then open the local URL printed by the development server.

## Verify

```bash
npm run build
```

This project is not affiliated with BookMyShow.
