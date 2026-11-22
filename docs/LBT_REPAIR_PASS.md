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
- Added a database migration for the missing `close_friends` table and RLS policies for stories/posts, including the SECURITY DEFINER feed RPC.
- Consolidated the settings entry point so Personal Information opens the dedicated Edit Profile page.
- Persisted appearance/media preferences locally, applied autoplay/data-saver choices to feed and reel playback, and connected language/text-size settings to the app i18n provider.
- Fixed privacy preference rollback when database updates fail and aligned the mention-audience setting with its actual three-state values.
- Removed the fake Pro card-payment success path and replaced it with a clear unavailable state.
- Removed fake 2FA switches and the misleading account-delete action that only logged the user out.
- Fixed PWA manifest icon paths and made the in-app loading/login logo consistent with the LBT brand asset.
- Changed the Android launch background away from the obsolete splash artwork.

## Important environment limitations

- The Supabase MCP connection currently returns no projects. The new SQL migration is committed to this branch but has **not** been applied to the live database and has not been run against a development database.
- No GitHub Actions workflow is configured for this branch/repository commit; there are no CI runs to report.
- A local dependency install, TypeScript check, Vite production build, Android Gradle build, and real-device tests have not been executed from this environment.
- Camera capabilities (4K/1080p availability, optical zoom, torch, microphone, MediaRecorder codecs, and recording quality) vary by device/WebView. The implementation uses browser APIs with capability fallbacks; it is not a replacement for the native Snapchat camera pipeline.
- Text overlays are composited into captured still photos and camera-recorded videos. Text placed over a video selected from the gallery is a preview/editor overlay only; video transcoding/burning that overlay into imported video is not implemented yet.
- Native launcher PNG variants are existing binary assets and were not regenerated in this pass. The app's web/in-app brand mark and Android launch background were aligned, but a complete density-by-density launcher asset replacement still needs a binary asset generation/sync step.

## Required pre-release verification

1. Apply `20261122000001_enforce_audience_visibility.sql` to a Supabase development branch and verify policies/RPC behavior with at least two accounts (owner, follower, non-follower, close friend, blocked user, anonymous visitor).
2. Run `npm ci`, `npm run lint`, and `npm run build`.
3. Run Android `gradlew assembleDebug` after `npx cap sync android`.
4. Test camera capture, video/audio recording, gallery imports, permissions, zoom, torch, and story publishing on the actual Android phone.
5. Test every create flow, feed/reel gestures, search, profile edit, settings persistence, and audience visibility end-to-end.
