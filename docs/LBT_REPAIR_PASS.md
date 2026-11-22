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
- Applied live Supabase migration `20261122195257_lbt_audience_privacy_hardening` to project `nopnxlhknrrsttouevxd`: added `posts.visibility` and `profiles.allow_mentions`, normalized audience values without deleting content, replaced permissive post/story/close-friends SELECT policies, added a self-reference constraint, and preserved the existing `get_feed(uuid, integer, integer)` 25-column return shape. Relationship predicates are in the non-exposed `private` schema. The exact applied SQL is committed as `supabase/migrations/20261122195257_lbt_audience_privacy_hardening.sql`. Follow-up migration `20261122195410_lbt_feed_security_invoker` changes `get_feed` to SECURITY INVOKER so it uses normal grants/RLS rather than bypassing them.
- Consolidated the settings entry point so Personal Information opens the dedicated Edit Profile page.
- Persisted appearance/media preferences locally, applied autoplay/data-saver choices to feed and reel playback, and connected language/text-size settings to the app i18n provider.
- Fixed privacy preference rollback when database updates fail and aligned the mention-audience setting with its actual three-state values.
- Removed the fake Pro card-payment success path and replaced it with a clear unavailable state.
- Removed fake 2FA switches and the misleading account-delete action that only logged the user out.
- Fixed PWA manifest icon paths and made the in-app loading/login logo consistent with the LBT brand asset.
- Changed the Android launch background away from the obsolete splash artwork.

## Important environment limitations

- The connected Supabase project `chat` (`nopnxlhknrrsttouevxd`, eu-west-1) is active. The audience/privacy migration and a follow-up feed invoker migration have been applied directly to that project and confirmed in migration history. No Auth users or user-generated content were deleted.
- Added `.github/workflows/quality.yml` to run locked dependency installation, TypeScript checking, the production web/server build, Capacitor Android sync, and a debug APK build on pushes and pull requests. The TypeScript, production web build, Capacitor sync, and Android debug APK build passed on commit `3d4f4cb9bc9ce0fd0c6a9018e312b92fb1b96b78`; GitHub Actions uploaded the `lbt-android-debug` artifact. Later migration-only commits have new CI runs; check the latest run before merging. This is a CI build, not a real-device verification.
- A local dependency install, TypeScript check, Vite production build, Android Gradle build, and real-device tests have not been executed from this environment.
- Camera capabilities (4K/1080p availability, optical zoom, torch, microphone, MediaRecorder codecs, and recording quality) vary by device/WebView. The implementation uses browser APIs with capability fallbacks; it is not a replacement for the native Snapchat camera pipeline.
- Text overlays are composited into captured still photos and camera-recorded videos. Text placed over a video selected from the gallery is a preview/editor overlay only; video transcoding/burning that overlay into imported video is not implemented yet.
- Native launcher PNG variants are existing binary assets and were not regenerated in this pass. The app's web/in-app brand mark and Android launch background were aligned, but a complete density-by-density launcher asset replacement still needs a binary asset generation/sync step.

## Required pre-release verification

1. Complete two-account and anonymous end-to-end audience tests against the applied Supabase policies (owner, follower, non-follower, close friend, blocked user, anonymous visitor).
2. Confirm the latest GitHub Actions run is green, then run `npm ci`, `npm run lint`, and `npm run build` locally.
3. Run Android `gradlew assembleDebug` after `npx cap sync android`.
4. Test camera capture, video/audio recording, gallery imports, permissions, zoom, torch, and story publishing on the actual Android phone.
5. Test every create flow, feed/reel gestures, search, profile edit, settings persistence, and audience visibility end-to-end.
