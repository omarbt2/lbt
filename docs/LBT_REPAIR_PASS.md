# LBT repair pass — implementation and verification notes

Branch: `fix/lbt-social-ux-and-reel-interactions`

## Implemented in source

- Rebuilt the story composer as a portrait camera/editor with front/back camera switching, hardware zoom when available, pinch/slider zoom, torch when supported, photo capture, short video recording, gallery import, draggable text, text color/size, filters, and close-friends audience selection.
- Added WebM and common camera recording formats to the storage allow-list; aligned story/post video limits with the storage layer's 50 MB limit.
- Fixed accidental reel likes on a single tap and added a touchscreen double-tap path.
- Fixed long-press post reactions so they do not also trigger the ordinary like action.
- Added native video rendering to the home feed instead of treating uploaded videos as still images.
- Added Explore search results for people, caption matches, and hashtag matches. Search now queries the posts table directly rather than the legacy `explore_feed` view.
- Persisted post audience settings (`public` / `followers`) and close-friends flags to the database.
- Made story view recording idempotent: repeated viewing by the same account no longer increments the aggregate view count repeatedly.
- Fixed the signup/login profile lifecycle: accounts created while email confirmation is enabled now receive their missing `profiles` row after first verified sign-in; login and auth-session restoration also repair a missing profile.
- Applied live Supabase migration `20261122195257_lbt_audience_privacy_hardening` to project `nopnxlhknrrsttouevxd`: added `posts.visibility` and `profiles.allow_mentions`, normalized audience values without deleting content, replaced permissive post/story/close-friends SELECT policies, added a self-reference constraint, and preserved the existing `get_feed(uuid, integer, integer)` 25-column return shape. Relationship predicates are in the non-exposed `private` schema. Source: `supabase/migrations/20261122195257_lbt_audience_privacy_hardening.sql`.
- Applied `20261122195410_lbt_feed_security_invoker` so `get_feed` runs as SECURITY INVOKER and respects normal grants/RLS.
- Applied `20261122200259_lbt_rpc_messaging_and_view_security` and `20261122200354_lbt_trigger_function_acl_and_reaction_update`: tightened conversation/message membership checks, restricted reactions and view rows, scoped caller-bound RPCs, removed duplicate unread-count triggers, and removed Data API execution from trigger-only functions.
- Applied `20261122200849_lbt_private_profile_personal_data`: moved `phone`, `dob`, `date_of_birth`, and `gender` into the non-exposed `private.profile_private_data` table, copied existing values, exposed owner-only get/update RPCs, then dropped the sensitive columns from `public.profiles`.
- Applied `20261122200900_lbt_reconcile_message_unread_counters`: fixed read-trigger recalculation and reconciled stored unread counts against unread message rows.
- All five additional migration source files are committed under `supabase/migrations/` with matching versions. No Auth users or user-generated content were deleted.
- Consolidated the settings entry point so Personal Information opens the dedicated Edit Profile page.
- Persisted appearance/media preferences locally, applied autoplay/data-saver choices to feed and reel playback, and connected language/text-size settings to the app i18n provider.
- Fixed privacy preference rollback when database updates fail and aligned the mention-audience setting with its actual three-state values.
- Removed the fake Pro card-payment success path and replaced it with a clear unavailable state.
- Removed fake 2FA switches and the misleading account-delete action that only logged the user out.
- Fixed PWA manifest icon paths and made the in-app loading/login logo consistent with the LBT brand asset.
- Changed the Android launch background away from the obsolete splash artwork.

## Important environment limitations

- The connected Supabase project `chat` (`nopnxlhknrrsttouevxd`, eu-west-1) is active. The audience, RPC/messaging, private-profile-data, trigger-ACL and unread-count migrations are applied directly and confirmed in migration history. Verification confirms zero sensitive columns remain in `public.profiles`, prior phone/date/gender values were moved to the private table, anonymous roles cannot execute the private-data RPCs, and all conversation unread counters match the message rows. No Auth users or user-generated content were deleted.
- Added `.github/workflows/quality.yml` to run locked dependency installation, TypeScript checking, the production web/server build, Capacitor Android sync, and a debug APK build on pushes and pull requests. The TypeScript, production web build, Capacitor sync, and Android debug APK build passed on commit `3d4f4cb9bc9ce0fd0c6a9018e312b92fb1b96b78`; GitHub Actions uploaded the `lbt-android-debug` artifact. Later migration-only commits have new CI runs; check the latest run before merging. This is a CI build, not a real-device verification.
- A local dependency install, TypeScript check, Vite production build, Android Gradle build, and real-device tests have not been executed from this environment.
- Camera capabilities (4K/1080p availability, optical zoom, torch, microphone, MediaRecorder codecs, and recording quality) vary by device/WebView. The implementation uses browser APIs with capability fallbacks; it is not a replacement for the native Snapchat camera pipeline.
- Text overlays are composited into captured still photos and camera-recorded videos. Text placed over a video selected from the gallery is a preview/editor overlay only; video transcoding/burning that overlay into imported video is not implemented yet.
- Native launcher PNG variants are existing binary assets and were not regenerated in this pass. The app's web/in-app brand mark and Android launch background were aligned, but a complete density-by-density launcher asset replacement still needs a binary asset generation/sync step.

## Security audit notes

- Supabase Security Advisor still reports some SECURITY DEFINER RPCs. The remaining functions have explicit caller/ownership checks and are retained where the client or trusted trigger path needs privileged access; do not blanket-revoke their EXECUTE grants.
- Auth leaked-password protection is still disabled in Supabase Auth settings and must be enabled in the Dashboard.
- Performance Advisor continues to report pre-existing unindexed foreign keys, RLS initplan notices, duplicate indexes and permissive policy overlap on unrelated tables. Those require a separate table-by-table cleanup rather than broad policy deletion.

## Required pre-release verification

1. Complete two-account and anonymous end-to-end tests for post/story audiences, private profile contact data, blocks, conversation access, reactions and views.
2. Confirm the latest GitHub Actions run is green, then run `npm ci`, `npm run lint`, and `npm run build` locally.
3. Run Android `gradlew assembleDebug` after `npx cap sync android`.
4. Test camera capture, video/audio recording, gallery imports, permissions, zoom, torch, and story publishing on the actual Android phone.
5. Test every create flow, feed/reel gestures, search, profile edits (including private phone/date/gender reads and writes), settings persistence, unread counts and audience visibility end-to-end.
