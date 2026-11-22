# LBT Social — Bug Fix Batch (10 files)

Apply the fixed files in `src/` (same relative paths as in the project) by
replacing the corresponding files in `lbt-social-fixed/src/`. Below is a
summary of every change so you can review/cherry-pick.

## Critical

### 1. `src/store/authStore.ts` — Signup race condition (duplicate registrations)
- Moved the username-uniqueness check to BEFORE `supabase.auth.signUp()`.
- Previously: signUp() created the auth user first, THEN checked username
  uniqueness — if a duplicate was found, it called `signOut()` but the auth
  user (and its `auth.users` row) was already created, leaving orphaned
  accounts and allowing two concurrent signups to both pass the check.
- Now: checks `profiles` for the lowercase username first and throws before
  any auth user is created. The unique index `idx_profiles_username_unique`
  on `lower(username)` (already present in DB) remains as a final 23505
  backstop on the profile insert.

### 2. `src/store/authStore.ts` — Network errors force logout
- The 5-minute session-refresh interval previously called
  `set({ currentUser: null, session: null })` on ANY error, including
  network failures — instantly logging the user out when offline/flaky.
- Now: only clears the session if `supabase.auth.getSession()` returns
  successfully with `session === null`. Network/transient errors are logged
  and the cycle is retried 5 minutes later; the user stays logged in.

### 3. `src/lib/api/profiles.ts` — Filter injection via search
- `searchProfiles(query)` interpolated raw user input directly into a
  PostgREST `.or()` filter string, allowing characters like `,`, `(`, `)`
  to inject additional filter clauses or manipulate the query logic.
- Now: input is capped to 50 chars, restricted to letters/numbers/space/`_`/
  `.`/`-`, and `%`/`_` (ilike wildcards) are escaped, `,`/`(`/`)` stripped
  before building the filter string.

### 4. `src/lib/webrtc.ts` — Hardcoded TURN credentials
- The hardcoded `openrelayproject` credentials are the *public* credentials
  for the free OpenRelay service (not a private secret), but they're a poor
  fallback shared by the entire internet.
- Renamed to `PUBLIC_FALLBACK_ICE_SERVERS`, clearly documented as last-resort
  only. Added `getIceServers()` — a cached async getter (5 min TTL) that
  fetches short-lived, per-session credentials from `/api/turn-credentials`
  and falls back to the public servers only if that fails.
- `src/hooks/useWebRTC.ts` now calls `getIceServers()` before creating each
  peer connection in both `startCall` and `answerCall`.

## Medium

### 5. `src/hooks/useWebRTC.ts` — setTimeout leaks / state on unmounted component
- Added `trackedSetTimeout()` / `clearAllPendingTimeouts()` helpers backed by
  a `Set` of timeout handles, plus a `mountedRef`.
- All 3 untracked `setTimeout` calls (ICE channel cleanup, and the 3
  `setCallState('idle')` calls after ending/rejecting calls) now go through
  `trackedSetTimeout`, which checks `mountedRef` before firing.
- The hook's unmount effect now sets `mountedRef.current = false` and clears
  all pending timeouts.

### 6. `src/components/ProfileView.tsx` — Reels promise chain has no .catch()
- The `.from('reels').select(...).then(({ data }) => ...)` chain had no
  error handling — `setReelsLoading(false)` was inside `.then()`, so a
  rejected promise (network error) left `reelsLoading` stuck `true` forever.
- Added error checking on `{ data, error }`, a `.catch()`, and moved
  `setReelsLoading(false)` into `.finally()`.

### 7. `src/store/authStore.ts` — Module-level state breaks under Vite HMR
- `authListenerUnsubscribe`, `refreshIntervalId`, `isInitialized` were plain
  module-level `let`s, reset to defaults on every HMR re-execution while the
  PREVIOUS module instance's listener/interval kept running — causing
  duplicate auth listeners and intervals to accumulate in dev.
- Now persisted across HMR via `import.meta.hot.data` with a `hot.dispose()`
  hook that hands off state to the next module instance. Production builds
  (`import.meta.hot` undefined) behave exactly as before.

### 8. `src/hooks/useAppState.ts` — triggerToast setTimeout never cleared
- `triggerToast` called bare `setTimeout(() => setToast(null), 3000)` with no
  reference kept — leaked on unmount, and rapid toasts could have an old
  timer clear a newer toast early.
- Added `toastTimeoutRef`; `triggerToast` clears any pending timeout before
  setting a new one, and the timeout is cleared in a cleanup effect on
  unmount.

### 9. `src/pages/SettingsPage.tsx` — Promise chains fail silently
- The notification-preferences `.single().then(({ data }) => ...)` chain had
  no error handling. Added `{ data, error }` check + `.catch()`.
- Also added error logging (previously silently swallowed) to
  `updateNotifPref()` and `updateProfileField()` — both `await`ed updates
  with no error check.

### 10. `src/lib/api/emojis.ts` — innerHTML XSS risk
- `decodeHtmlCode()` used `el.innerHTML = code; return el.value` on a
  `<textarea>` to decode HTML entities from `emojihub.yurace.pro`. If that
  API ever returned malicious markup, `innerHTML` would parse it as live DOM.
- Replaced with `DOMParser().parseFromString(code, 'text/html')` + reading
  `.body.textContent` from the DETACHED document — entities decode correctly,
  but any tags/scripts are inert (never inserted into the live DOM, never
  executed).

## Low (hardening)

### 11. `src/App.tsx` — UUID interpolation in `.or()` filter
### 12. `src/lib/api/blocks.ts` — same pattern in `blockUser()`
- Both interpolate `currentUser.id` / `blockedId` into a PostgREST `.or()`
  filter for cleaning up follow relationships on block. These values are
  currently always server-issued UUIDs, but the pattern is fragile.
- Added a UUID regex check (`/^[0-9a-f]{8}-...$/i`) before interpolation; if
  either ID fails validation, the follow-cleanup query is skipped (with a
  console.error) rather than running a malformed/unsafe filter.

---

## Supabase backend change (already applied via MCP)

- `get_post_insights(uuid)` RPC was `SECURITY DEFINER` WITHOUT
  `SET search_path = public` (inconsistent with `get_profile_posts` and
  `update_user_presence`, which already had it). Applied migration
  `fix_get_post_insights_search_path_v2` to add
  `ALTER FUNCTION public.get_post_insights(uuid) SET search_path = public;`
  — closes a search_path-hijacking vector on this SECURITY DEFINER function.

---

## Notes / things to verify after applying
- `useWebRTC.ts`: confirm `getIceServers` is exported and imported correctly
  (`import { ICE_SERVERS, getIceServers } from '../lib/webrtc'`).
- `authStore.ts`: the HMR guard uses `(import.meta as any).hot` — if your
  TS config complains, this can be typed via `vite/client` types
  (`/// <reference types="vite/client" />`), already likely present via
  `vite-env.d.ts`.
- All `.catch()`/error-logging additions are non-breaking — they only add
  logging and prevent stuck loading states; no behavior changes for the
  happy path.
