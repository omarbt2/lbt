-- Restrict authenticated content writers to client-owned fields only.
-- Counters, IDs, timestamps and moderation state remain database-owned.

REVOKE INSERT, UPDATE ON TABLE public.posts FROM PUBLIC,anon,authenticated;
GRANT INSERT (
  user_id,
  caption,
  category,
  media_urls,
  media_type,
  tags,
  close_friends_only,
  visibility,
  repost_of,
  is_repost,
  repost_caption
) ON TABLE public.posts TO authenticated;
GRANT UPDATE (caption)
ON TABLE public.posts TO authenticated;

DROP POLICY IF EXISTS posts_insert_final ON public.posts;
CREATE POLICY posts_insert_final
ON public.posts
FOR INSERT TO authenticated
WITH CHECK (user_id=(SELECT auth.uid()));

DROP POLICY IF EXISTS posts_update_own ON public.posts;
CREATE POLICY posts_update_own
ON public.posts
FOR UPDATE TO authenticated
USING (user_id=(SELECT auth.uid()))
WITH CHECK (user_id=(SELECT auth.uid()));

REVOKE INSERT, UPDATE ON TABLE public.stories FROM PUBLIC,anon,authenticated;
GRANT INSERT (
  user_id,
  media_url,
  media_type,
  caption,
  expires_at,
  audience,
  close_friends_only
) ON TABLE public.stories TO authenticated;

DROP POLICY IF EXISTS stories_insert_own ON public.stories;
CREATE POLICY stories_insert_own
ON public.stories
FOR INSERT TO authenticated
WITH CHECK (user_id=(SELECT auth.uid()));

REVOKE INSERT, UPDATE ON TABLE public.reels FROM PUBLIC,anon,authenticated;
GRANT INSERT (
  user_id,
  video_url,
  thumbnail_url,
  caption,
  audio_name,
  duration_sec,
  is_public,
  is_archived
) ON TABLE public.reels TO authenticated;

DROP POLICY IF EXISTS reels_insert ON public.reels;
CREATE POLICY reels_insert
ON public.reels
FOR INSERT TO authenticated
WITH CHECK (user_id=(SELECT auth.uid()));

DROP POLICY IF EXISTS reels_delete ON public.reels;
CREATE POLICY reels_delete
ON public.reels
FOR DELETE TO authenticated
USING (user_id=(SELECT auth.uid()));

DROP POLICY IF EXISTS reels_select ON public.reels;
DROP POLICY IF EXISTS reels_select_safe ON public.reels;
CREATE POLICY reels_select_safe
ON public.reels
FOR SELECT TO authenticated
USING (
  user_id=(SELECT auth.uid())
  OR (
    COALESCE(is_public,false)=true
    AND COALESCE(is_archived,false)=false
    AND NOT private.lbt_is_blocked_from(reels.user_id)
    AND (
      NOT private.lbt_profile_is_private(reels.user_id)
      OR private.lbt_follows_owner(reels.user_id)
    )
  )
);
