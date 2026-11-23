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
- Applied `20261122201311_lbt_private_profile_rls_defense_policy`: added a defense-in-depth owner-only RLS policy to the private profile data table while retaining revoked direct table privileges.
- Applied `20261122201447_lbt_enforce_private_follow_requests_and_blocked_dm_access` and `20261122201558_lbt_secure_follow_acceptance_and_blocked_dm_reads`: blocked direct follows of private accounts, allowed accepted follow requests to create the relationship, and hid conversation/message history after a block.
- Applied `20261122201939_lbt_restrict_profile_column_writes` and `20261122202015_lbt_restrict_profile_and_message_mutations`: limited profile INSERT/UPDATE to user-editable fields, removed direct message UPDATE access, and limited direct notification UPDATE to `is_read`.
- Applied `20261122202514_lbt_restrict_content_insert_and_update_columns` and `20261122202537_lbt_revoke_reel_archive_override`: restricted post/story/reel INSERT fields, limited post updates to caption only, removed direct story/reel updates, and made reel archive state database-managed.
- Applied `20261122202753_lbt_fix_post_publication_triggers`: moved Explore and hashtag-maintenance triggers to trusted SECURITY DEFINER execution, removed the duplicate hashtag trigger, reconciled hashtag counts from actual links, and revoked direct EXECUTE on trigger-only functions.
- Applied `20261122203212_lbt_secure_comment_and_like_visibility` and `20261122203322_lbt_fix_comment_reply_rls_recursion`: restricted comment/like reads and inserts to viewers of the parent post, restricted comment/reply rows and server-owned counters, and moved parent-reply validation to a private helper to avoid recursive RLS.
- Applied `20261122203508_lbt_revoke_anonymous_comments_likes_reads`: removed anon/PUBLIC base SELECT grants from comments and likes while preserving authenticated reads through audience-aware RLS.
- Matching migration files for all applied versions are committed under `supabase/migrations/`. A transaction-only smoke test successfully inserted a post/story/reel, verified the Explore row and hashtag links, updated the post caption and re-synced the links, and confirmed counter/archive tampering was denied. All test inserts were rolled back. No Auth users or user-generated content were deleted.
- Consolidated the settings entry point so Personal Information opens the dedicated Edit Profile page.
- Persisted appearance/media preferences locally, applied autoplay/data-saver choices to feed and reel playback, and connected language/text-size settings to the app i18n provider.
- Fixed privacy preference rollback when database updates fail and aligned the mention-audience setting with its actual three-state values.
- Removed the fake Pro card-payment success path and replaced it with a clear unavailable state.
- Removed fake 2FA switches and the misleading account-delete action that only logged the user out.
- Fixed PWA manifest icon paths and made the in-app loading/login logo consistent with the LBT brand asset.
- Changed the Android launch background away from the obsolete splash artwork.

## Important environment limitations

- The connected Supabase project `chat` (`nopnxlhknrrsttouevxd`, eu-west-1) is active. The audience, RPC/messaging, private-profile-data, trigger-ACL and unread-count migrations are applied directly and confirmed in migration history. Verification confirms zero sensitive columns remain in `public.profiles`, prior phone/date/gender values were moved to the private table, anon and authenticated roles cannot read the private table directly, anon cannot execute private-data RPCs, and all conversation unread counters match the message rows. Direct message UPDATE is revoked; notification UPDATE is limited to `is_read`; profile updates cannot change verification or aggregate counters; post updates are caption-only; story/reel direct updates are revoked; content inserts cannot set server-owned counters. Hashtag counts match actual `post_hashtags` links. A transaction-only test successfully created a comment, reply and like on a private post, verified counters, and confirmed a second user could neither read nor interact with the private post’s comments/likes; test data was rolled back. Anonymous SELECT grants on comments/likes are revoked, while authenticated SELECT/INSERT column privileges remain. No Auth users or user-generated content were deleted.
- Added `.github/workflows/quality.yml` to run locked dependency installation, TypeScript checking, the production web/server build, Capacitor Android sync, and a debug APK build on pushes and pull requests. The TypeScript, production web build, Capacitor sync, and Android debug APK build passed on commit `3d4f4cb9bc9ce0fd0c6a9018e312b92fb1b96b78`; GitHub Actions uploaded the `lbt-android-debug` artifact. Later migration-only commits have new CI runs; check the latest run before merging. This is a CI build, not a real-device verification.
- A local dependency install, TypeScript check, Vite production build, Android Gradle build, and real-device tests have not been executed from this environment.
- Camera capabilities (4K/1080p availability, optical zoom, torch, microphone, MediaRecorder codecs, and recording quality) vary by device/WebView. The implementation uses browser APIs with capability fallbacks; it is not a replacement for the native Snapchat camera pipeline.
- Text overlays are composited into captured still photos and camera-recorded videos. Text placed over a video selected from the gallery is a preview/editor overlay only; video transcoding/burning that overlay into imported video is not implemented yet.
- Native launcher PNG variants are existing binary assets and were not regenerated in this pass. The app's web/in-app brand mark and Android launch background were aligned, but a complete density-by-density launcher asset replacement still needs a binary asset generation/sync step.

## Security audit notes

- Supabase Security Advisor still reports some SECURITY DEFINER RPCs. The remaining functions have explicit caller/ownership checks and are retained where the client or trusted trigger path needs privileged access; do not blanket-revoke their EXECUTE grants.
- Auth leaked-password protection is still disabled in Supabase Auth settings and must be enabled in the Dashboard.
- Performance Advisor continues to report pre-existing unindexed foreign keys, RLS initplan notices, duplicate indexes and permissive policy overlap on unrelated tables. Those require a separate table-by-table cleanup rather than broad policy deletion.
- Auth leaked-password protection is a project-level Auth setting; it has not been changed from this migration pass.

## Required pre-release verification

1. Complete two-account and anonymous end-to-end tests for post/story audiences, private profile contact data, blocks, conversation access, reactions and views.
2. Confirm the latest GitHub Actions run is green, then run `npm ci`, `npm run lint`, and `npm run build` locally.
3. Run Android `gradlew assembleDebug` after `npx cap sync android`.
4. Test camera capture, video/audio recording, gallery imports, permissions, zoom, torch, and story publishing on the actual Android phone.
5. Test every create flow, feed/reel gestures, search, profile edits (including private phone/date/gender reads and writes), settings persistence, unread counts and audience visibility end-to-end.
