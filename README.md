# ShowPing

ShowPing is an unofficial BookMyShow booking monitor. A GitHub Action checks an exact theatre/date page every five minutes and sends one SMS through Twilio when the configured movie and format first appear together.

The web interface creates local tracker drafts and can copy the matching GitHub JSON. The repository is the production source of truth.

See [docs/HLD.md](docs/HLD.md) for the complete architecture, deployed components, external services, data flows, security boundaries, and operational model.

## How monitoring works

1. GitHub Actions runs `.github/workflows/check-bookings.yml` every five minutes.
2. `scripts/monitor/check-bookings.mjs` reads active records from `data/trackers.json`.
3. Each exact BookMyShow `buytickets` URL is fetched through a read-only page renderer because BookMyShow blocks plain server requests. Booking is open only when the final URL still targets the requested date and that movie's listing contains the configured format.
4. Access blocks, rate limits, redirects, and request failures are treated as unknown and never send an alert.
5. Twilio receives one SMS request on a closed/unknown → open transition.
6. `data/state.json` is committed only when state changes, preventing repeat messages.

Scheduled GitHub Actions can be delayed by GitHub. Five minutes is the shortest supported schedule interval, not a real-time delivery guarantee.

## 1. Configure a tracker

Copy `data/trackers.example.json`, or add an item to `data/trackers.json`:

```json
{
  "trackers": [
    {
      "id": "odyssey-mumbai",
      "active": true,
      "movie": "The Odyssey",
      "aliases": [],
      "theatre": "PVR: Example Theatre",
      "city": "Mumbai",
      "date": "2026-12-18",
      "format": "IMAX",
      "bookingUrl": "https://in.bookmyshow.com/cinemas/mumbai/example-theatre/buytickets/ABCD/20261218"
    }
  ]
}
```

Use the exact theatre/date page. The date in `YYYY-MM-DD` must match the final `YYYYMMDD` URL segment. Set `format` to `IMAX` to match all IMAX variants such as IMAX 2D, IMAX 3D, and IMAX Laser; use a more specific value when needed. Omit `format` to accept any format. Add an alternate displayed title to `aliases` only if BookMyShow uses a different spelling.

## 2. Add GitHub Actions secrets

In the GitHub repository, open **Settings → Secrets and variables → Actions** and add:

| Secret | Required | Purpose |
| --- | --- | --- |
| `TWILIO_ACCOUNT_SID` | Yes | Twilio account SID beginning with `AC` |
| `TWILIO_AUTH_TOKEN` | Yes | Twilio account auth token |
| `SMS_TO_NUMBER` | Yes | Destination in E.164 format, such as `+919876543210` |
| `TWILIO_MESSAGING_SERVICE_SID` | Recommended | Messaging Service SID beginning with `MG` |
| `TWILIO_FROM_NUMBER` | Alternative | Twilio sender number if no Messaging Service SID is used |
| `TWILIO_TRIAL_TEMPLATE` | Trial only | Set to `sms_event_notifications`; delete after upgrading to enable detailed custom messages |

Configure either `TWILIO_MESSAGING_SERVICE_SID` or `TWILIO_FROM_NUMBER`, not both. The workflow prefers the Messaging Service when both exist.

Never commit these values or paste them into tracker JSON. `.env.example` documents the local names without containing credentials.

## 3. Test safely

Run local unit tests and the production web build:

```bash
npm run monitor:test
npm run build
```

After pushing to GitHub, open **Actions → Check BookMyShow bookings → Run workflow**. Keep `dry_run` enabled first. A dry run fetches and evaluates pages without sending SMS or updating `data/state.json`.

Use **Actions → Test SMS delivery → Run workflow** to send one clearly labeled delivery test without changing booking state.

For a local live check:

```bash
cp .env.example .env.local
set -a
source .env.local
set +a
npm run monitor:check
```

Do not use live credentials in a shared shell history. The GitHub secrets UI is the preferred production path.

## Web app

```bash
npm install
npm run dev
```

The website stores drafts in browser local storage. Use a tracker card’s **Copy GitHub JSON** action and commit that object inside `data/trackers.json` to activate server-side monitoring.

## Operational notes

- Workflow concurrency prevents overlapping checks and state commits.
- The default reader is `r.jina.ai`; it receives only the public BookMyShow URL and no ShowPing or Twilio credentials. Set `BOOKMYSHOW_FETCH_MODE=direct` if direct server access works in your environment.
- Expired show dates are skipped automatically.
- Failed SMS requests fail the workflow and do not mark the tracker as notified, so the next run can retry.
- A later open → closed transition resets notification state, allowing a future reopening alert.
- Twilio trial accounts can message only verified recipient numbers.
- This project is not affiliated with BookMyShow. Keep request volume low and review applicable service terms before operating it.
