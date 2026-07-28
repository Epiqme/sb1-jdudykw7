# Voyager Connect — Backend (reconstructed)

A self-owned FastAPI backend that implements the exact API the Voyager Connect
app expects, seeded with the real data pulled from the live service.

## Honest provenance — read this

The **original backend source code could not be recovered.** Unlike the
frontend (which the browser downloads, so its source maps could be extracted),
the backend runs only on Emergent's servers and never sends its code to
clients. Its interactive API docs were disabled, so there was no schema to
export either.

What this folder *is*:

1. **A faithful reimplementation.** Every route, query parameter, request body,
   and response shape was reconstructed from the recovered frontend
   (`voyager-connect/src/api.ts`) and confirmed against the live API's actual
   responses. The stack is FastAPI (matching the original's fingerprints:
   `{"detail": ...}` errors, trailing-slash redirects, `/api` mount).
2. **Your real data**, harvested from the public endpoints and committed under
   `seed/`:
   - `cruises.json` — all 52 sailings
   - `deals.json` — all 4 deals
   - `profiles.json` — 146 community profiles
   - `booking_links.json` — your Virgin Voyages booking links

What could **not** be pulled: per-cruise member lists and cruise/DM chat
history are behind your app's own Elite paywall, so they aren't publicly
readable. That data still lives in your Emergent database — export it there if
you want it. (The reconstructed backend recreates those features; it just
starts with empty chat/DM history.)

Payment and Apple in-app-purchase verification are implemented as **clearly
marked stubs** — they unlock without charging. Wire in Stripe and Apple's App
Store Server API before taking real money (see `server.py`).

## Run it

```bash
cd backend
python3 -m venv .venv && source .venv/bin/activate
pip install -r requirements.txt
cp .env.example .env         # set ADMIN_PIN
uvicorn server:app --reload --port 8001
```

Point the frontend at it: in `voyager-connect/.env` set
`EXPO_PUBLIC_BACKEND_URL=http://localhost:8001` (the app adds `/api` itself),
then `npx expo start`.

Interactive API docs are at http://localhost:8001/docs.

## Data & persistence

On first run the seed files are loaded into a JSON database at `data/db.json`
(git-ignored). Every change is written back to that file. It's simple and
portable; for production scale, replace `store.py` with Postgres or Mongo —
the server only touches storage through that module.

## Route map

- **Cruises** — `GET /api/cruises`, `GET /api/cruises/{id}`
- **Profiles** — `POST/GET/PUT/DELETE /api/profiles`, `POST /api/profiles/{id}/wave`
  (DELETE performs full account deletion — required by App Store guideline 5.1.1(v))
- **Members** — `GET /api/community/members`, `GET /api/cruises/{id}/members` (Elite-gated)
- **Chat** — `GET/POST /api/cruises/{id}/messages` (Elite-gated except `general`)
- **DMs** — `GET /api/dm/conversations`, `GET /api/dm/thread`, `POST /api/dm/send`
- **Deals** — `GET /api/deals`, `POST /api/deal-scan`, `GET /api/booking-links`
- **Elite unlock** — `/api/confirmations/resolve`, `/api/elite/confirm`,
  `/api/elite/status/{id}`, `/api/checkout/*`, `/api/iap/apple/*`
- **Admin** (X-Admin-Pin header) — `/api/admin/verify`, and CRUD for
  `confirmations` (+ bulk), `cruises`, `deals`

## Before production

- Replace the payment/IAP stubs with real Stripe + Apple verification.
- Set a strong `ADMIN_PIN`.
- Move off the JSON store to a real database and migrate any data you export
  from Emergent.
- Re-host the images: seed rows point at `*.emergentagent.net` asset URLs.
  Copy those assets to your own storage/CDN and update the URLs so you don't
  depend on Emergent.
