# Icebreaker Elite — Developer Handoff

**Goal:** get the app fully live and owned by the client, off Emergent, with
Stripe payments flowing to the client's Stripe account. ~90% is done; the
remaining work is hosting the backend and pointing the app at it.

## Accounts (owned by client — client will log in / grant access)
- **GitHub:** `Epiqme` — repo `Epiqme/sb1-jdudykw7`
- **Working branch:** `claude/voyager-app-store-deployment-cv641i` (all work is here, NOT main)
- **Stripe:** account under `agoravoytravel@gmail.com` (business "Agoravoy"). Live payments already work; a $59 charge has gone through before. Client should roll a fresh secret key (old one was exposed).
- **Railway:** under the `Epiqme` GitHub login (currently on trial, no projects — the old backend was deleted).
- **Apple Developer:** enrolled; App Store Connect app id `6794970021`, bundle `com.epiqme.voyagerconnect`.

## Repo layout (on the working branch)
- `voyager-connect/` — Expo (SDK 54) React Native app (frontend). Recovered + bug-fixed. Icon = red triangle; name = Icebreaker Elite.
- `backend/` — FastAPI backend (reconstructed). JSON document store (`backend/store.py`), seeded from `backend/seed/` (52 cruises, 4 deals, 146 profiles). Real Stripe Checkout + Apple receipt verification implemented in `backend/server.py` (activate by setting `STRIPE_SECRET_KEY` / `APPLE_SHARED_SECRET`).
- `backend/Dockerfile`, `backend/render.yaml`, root `render.yaml` — deploy configs.
- `docs/` — prebuilt static web export (for GitHub Pages), baseUrl `/sb1-jdudykw7`.

## What's DONE
- Frontend recovered, typechecks, web build passes.
- Chat bugs fixed (message overflow + hidden text input) in `app/dm/[peerId].tsx` and `app/chat/[cruiseId].tsx`.
- Branding: Icebreaker Elite, red triangle icon (`voyager-connect/assets/icon.png`).
- Backend implements the full API contract in `voyager-connect/src/api.ts`, verified end-to-end in dev (profiles, elite paywall gating, chat, DMs, deal-scan, checkout create/verify).

## Remaining work
1. **Host the backend.** Deploy `backend/` (Docker) on the client's host. Railway is easiest (client is logged in):
   - New project → Deploy from GitHub repo → `Epiqme/sb1-jdudykw7` → branch above.
   - Set service **Root Directory = `backend`** (uses the Dockerfile).
   - Variables: `ADMIN_PIN` (6 digits), `STRIPE_SECRET_KEY` (fresh key). Optional: `APPLE_SHARED_SECRET`.
   - **Add a persistent volume** mounted at `/data` and set `DATA_DIR=/data` — otherwise profiles/unlocks reset on restart. (Or migrate `store.py` to Postgres/Mongo.)
   - Generate a public domain.
2. **Point the app at the backend.** Set `voyager-connect/.env` → `EXPO_PUBLIC_BACKEND_URL=<railway url>`; rebuild web export into `docs/` (`npx expo export -p web`, with `experiments.baseUrl=/sb1-jdudykw7`, add `.nojekyll` + copy `index.html`→`404.html`); commit.
3. **Web launch.** Enable GitHub Pages: Settings → Pages → branch above, folder `/docs`. Live at `https://epiqme.github.io/sb1-jdudykw7/`.
4. **Stripe webhook (optional).** Point Stripe webhook at `<railway url>/api/...` if webhook-driven unlocks are desired (current flow uses checkout verify).
5. **App Store build (native).** Fill `voyager-connect/eas.json` submit block (`appleId`, `appleTeamId`; `ascAppId` already set) → `eas build -p ios --profile production` → `eas submit`. App Store build uses Apple IAP for Elite (Stripe is web-only per Apple rules).

## Verify
- Backend: `GET /api/cruises` returns 52; Stripe test-mode checkout create→verify unlocks Elite.
- Web: open the Pages URL on a phone → Icebreaker Elite, red icon, chat typing shows text, a real Stripe checkout completes and unlocks.
- Confirm a test payment lands in the client's Stripe dashboard.
