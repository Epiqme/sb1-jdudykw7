# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Commands

```bash
npm run dev        # Start the NativeScript preview (runs setup-nativescript-stackblitz && ns preview)
npm run type-check # TypeScript type checking without emit
```

There is no test runner or linter configured in this project.

## Architecture

**Remember When** is a NativeScript mobile app (React + TypeScript) for sharing messages and memories between users. It targets iOS and Android via NativeScript with React via `react-nativescript`.

### Entry point & navigation

`src/app.ts` bootstraps `ReactNativeScript.start()` with the `MainStack` component. Navigation uses `react-nativescript-navigation` (a NativeScript wrapper around React Navigation). All route names and their param types are defined in `src/NavigationParamList.ts` — add new screens there first.

`src/components/MainStack.tsx` registers screens in the stack navigator. Currently registered: `Welcome`, `SignUp`, `Login`, `Dashboard`. Several routes are declared in `NavigationParamList.ts` but have no screen component yet: **`NewMessage`, `Inbox`, `SentMessages`, `SavedMemories`, `Settings`** — these are the next screens to build.

### Supabase backend

`src/utils/supabase.ts` exports a single `supabase` client. Auth tokens are stored via `@nativescript/secure-storage` (device keychain/keystore), not AsyncStorage. The client reads `SUPABASE_URL` and `SUPABASE_ANON_KEY` from environment variables.

**Database schema** (see `supabase/migrations/`):
- `profiles` — one row per user, auto-created via trigger on `auth.users` insert; stores `display_name` and `avatar_url`
- `messages` — sender/recipient UUIDs, `content`, optional `scheduled_for`, `is_lasting_memory` flag, `media_url[]` array
- `saved_memories` — join table linking a user to a message they've saved, with an optional `note`

All tables have RLS enabled. Users can only read messages where they are `sender_id` or `recipient_id`. Only the sender can insert messages.

### Styling

Tailwind CSS via `@nativescript/tailwind`. Dark mode is controlled by the `.ns-dark` class (not media queries). `preflight` is disabled. The app uses a purple (`purple-600`/`purple-700`) primary palette on white backgrounds.

### NativeScript JSX elements

Components use NativeScript layout elements (`<flexboxLayout>`, `<gridLayout>`, `<stackLayout>`) and widgets (`<label>`, `<button>`, `<textField>`) — not React Native or HTML elements. Use `onTap` for button press events, `onTextChange` for text input.
