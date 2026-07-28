# Voyager Connect (frontend)

Expo (React Native) app — the cruise community app with Sailings, Chats,
Icebreaker, Deals, and Profile tabs, DMs, invites/QR, Elite membership
(Apple in-app purchase / checkout), and an admin screen.

## Provenance

This source was recovered on 2026-07-28 from the development build served at
`https://voyager-connect-4.preview.emergentagent.com` (Expo SDK 54, dev-mode
Metro bundle with source maps). All 34 application source files were restored
byte-for-byte from the source map's `sourcesContent`, and the header image
asset was downloaded from the dev server. The following files were
reconstructed by hand because they are not part of a web bundle:

- `package.json`, `app.json`, `tsconfig.json`, `babel.config.js` — recreated
  from the imports and SDK version found in the bundle. Run
  `npx expo install --fix` after the first install to align native package
  versions with the Expo SDK.
- `src/utils/storage/index.ts` (native storage) — rewritten to match the
  contract in `storage-base.ts` and the comments in `index.web.ts`
  (AsyncStorage for general KV, expo-secure-store for secure values).

## Running it

```bash
npm install
npx expo install --fix
cp .env.example .env   # set EXPO_PUBLIC_BACKEND_URL to your backend
npx expo start         # then press w for web, or scan the QR in Expo Go
```

## Important: the backend is NOT in this repo

Only the frontend could be recovered from the browser bundle. The app expects
a backend (currently the Emergent preview URL) exposing these routes under
`/api`:

- `GET /cruises`, `GET /cruises/:id`, cruise members and messages
- `POST /profiles`, `GET/PUT /profiles/:id`, `POST /profiles/:id/wave`
- `GET /community/members`
- DMs: `/dm/conversations`, `/dm/thread`, `/dm/send`
- Deals: `/deals`, `/deal-scan`, `/booking-links`
- Checkout: `/checkout/create-session`, `/checkout/verify`
- Elite/IAP: `/elite/status/:id`, `/elite/confirm`, `/iap/apple/verify`,
  `/iap/apple/restore`
- Confirmations: `/confirmations/resolve`
- Admin: `/admin/verify`, `/admin/cruises`, `/admin/deals`,
  `/admin/confirmations` (+ bulk)

The backend code and database still live on Emergent's servers. To fully own
the app, either export the backend from the Emergent workspace, or rebuild it
against this route list and migrate the data.
