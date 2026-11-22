-- LBT: enforce post/story audience and close-friends visibility.
-- Idempotent schema changes; safe to apply after the existing 2026-06 migrations.

ALTER TABLE public.posts
  ALTER COLUMN visibility SET DEFAULT 'public',
  ALTER COLUMN close_friends_only SET DEFAULT false;

ALTER TABLE public.stories
  ALTER COLUMN audience SET DEFAULT 'public',
  ALTER COLUMN close_friends_only SET DEFAULT false;

-- The UI stores a three-state mention audience, not a boolean.
ALTER TABLE public.profiles
  ALTER COLUMN allow_mentions TYPE text
  USING CASE
    WHEN allow_mentions IS TRUE THEN 'everyone'
    WHEN allow_mentions IS FALSE THEN 'nobody'
    ELSE 'everyone'
  END;
ALTER TABLE public.profiles ALTER COLUMN allow_mentions SET DEFAULT 'everyone';

CREATE TABLE IF NOT EXISTS public.close_friends (
  user_id uuid NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  friend_id uuid NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  created_at timestamptz NOT NULL DEFAULT now(),
  PRIMARY KEY (user_id, friend_id),
  CONSTRAINT close_friends_not_self CHECK (user_id <> friend_id)
);

ALTER TABLE public.close_friends ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS close_friends_select_own ON public.close_friends;
DROP POLICY IF EXISTS close_friends_insert_own ON public.close_friends;
DROP POLICY IF EXISTS close_friends_delete_own ON public.close_friends;

CREATE POLICY close_friends_select_own ON public.close_friends
  FOR SELECT TO authenticated USING ((select auth.uid()) = user_id);
CREATE POLICY close_friends_insert_own ON public.close_friends
  FOR INSERT TO authenticated
  WITH CHECK (
    (select auth.uid()) = user_id
    AND EXISTS (
      SELECT 1 FROM public.follows f
      WHERE f.follower_id = friend_id AND f.following_id = user_id
    )
  );
CREATE POLICY close_friends_delete_own ON public.close_friends
  FOR DELETE TO authenticated USING ((select auth.uid()) = user_id);

GRANT SELECT, INSERT, DELETE ON public.close_friends TO authenticated;
CREATE INDEX IF NOT EXISTS close_friends_friend_idx ON public.close_friends(friend_id);

-- Replace the previous broad read policies: permissive policies are ORed by
-- PostgreSQL, so the known earlier policies must be removed explicitly.
DROP POLICY IF EXISTS "Public read stories" ON public.stories;
DROP POLICY IF EXISTS stories_select_auth ON public.stories;
CREATE POLICY stories_select_auth ON public.stories
  FOR SELECT TO authenticated
  USING (
    expires_at > now()
    AND (
      user_id = (select auth.uid())
      OR (
        COALESCE(audience, 'public') = 'public'
        AND COALESCE(close_friends_only, false) = false
      )
      OR (
        (COALESCE(audience, 'public') = 'close_friends' OR COALESCE(close_friends_only, false))
        AND EXISTS (
          SELECT 1 FROM public.close_friends cf
          WHERE cf.user_id = stories.user_id
            AND cf.friend_id = (select auth.uid())
        )
      )
    )
  );

DROP POLICY IF EXISTS posts_select_auth ON public.posts;
DROP POLICY IF EXISTS posts_select_anon ON public.posts;
CREATE POLICY posts_select_auth ON public.posts
  FOR SELECT TO authenticated
  USING (
    NOT EXISTS (
      SELECT 1 FROM public.user_blocks b
      WHERE (b.blocker_id = posts.user_id AND b.blocked_id = (select auth.uid()))
         OR (b.blocker_id = (select auth.uid()) AND b.blocked_id = posts.user_id)
    )
    AND (
      posts.user_id = (select auth.uid())
      OR (
        COALESCE(posts.visibility, 'public') = 'public'
        AND COALESCE(posts.close_friends_only, false) = false
        AND (
          NOT COALESCE((SELECT pr.is_private FROM public.profiles pr WHERE pr.id = posts.user_id), false)
          OR EXISTS (
            SELECT 1 FROM public.follows f
            WHERE f.follower_id = (select auth.uid()) AND f.following_id = posts.user_id
          )
        )
      )
      OR (
        COALESCE(posts.visibility, 'public') = 'followers'
        AND COALESCE(posts.close_friends_only, false) = false
        AND EXISTS (
          SELECT 1 FROM public.follows f
          WHERE f.follower_id = (select auth.uid()) AND f.following_id = posts.user_id
        )
      )
      OR (
        COALESCE(posts.close_friends_only, false)
        AND EXISTS (
          SELECT 1 FROM public.close_friends cf
          WHERE cf.user_id = posts.user_id AND cf.friend_id = (select auth.uid())
        )
      )
    )
  );

CREATE POLICY posts_select_anon ON public.posts
  FOR SELECT TO anon
  USING (
    COALESCE(visibility, 'public') = 'public'
    AND COALESCE(close_friends_only, false) = false
    AND NOT COALESCE((SELECT pr.is_private FROM public.profiles pr WHERE pr.id = posts.user_id), false)
  );

-- get_feed is SECURITY DEFINER, so it must apply the same audience checks
-- itself instead of relying on table RLS.
CREATE OR REPLACE FUNCTION public.get_feed(
  p_user_id uuid,
  p_limit integer DEFAULT 20,
  p_offset integer DEFAULT 0
)
RETURNS TABLE (
  id uuid, user_id uuid, caption text, category text, media_urls text[],
  media_type text, likes_count integer, comments_count integer,
  shares_count integer, tags text[], created_at timestamptz,
  profiles jsonb, has_liked boolean, has_bookmarked boolean, comments jsonb
)
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  IF auth.uid() IS NULL OR p_user_id <> auth.uid() THEN
    RAISE EXCEPTION 'Not authorized to read this feed';
  END IF;

  RETURN QUERY
  SELECT
    p.id, p.user_id, p.caption, p.category, p.media_urls, p.media_type,
    COALESCE(p.likes_count, 0)::int, COALESCE(p.comments_count, 0)::int,
    COALESCE(p.shares_count, 0)::int, p.tags, p.created_at,
    jsonb_build_object(
      'id', pr.id, 'username', pr.username,
      'display_name', COALESCE(pr.display_name, pr.username),
      'avatar_url', pr.avatar_url, 'bio', pr.bio,
      'followers_count', COALESCE(pr.followers_count, 0),
      'following_count', COALESCE(pr.following_count, 0)
    ),
    EXISTS (SELECT 1 FROM public.likes l WHERE l.post_id = p.id AND l.user_id = p_user_id),
    EXISTS (SELECT 1 FROM public.saved_posts sp WHERE sp.post_id = p.id AND sp.user_id = p_user_id),
    COALESCE((
      SELECT jsonb_agg(
        jsonb_build_object(
          'id', c.id, 'post_id', c.post_id, 'user_id', c.user_id,
          'content', c.content, 'likes_count', COALESCE(c.likes_count, 0),
          'created_at', c.created_at,
          'profiles', jsonb_build_object(
            'id', cpr.id, 'username', cpr.username,
            'display_name', COALESCE(cpr.display_name, cpr.username),
            'avatar_url', cpr.avatar_url
          )
        ) ORDER BY c.created_at ASC
      )
      FROM (
        SELECT * FROM public.comments WHERE post_id = p.id
        ORDER BY created_at ASC LIMIT 3
      ) c
      JOIN public.profiles cpr ON cpr.id = c.user_id
    ), '[]'::jsonb)
  FROM public.posts p
  JOIN public.profiles pr ON pr.id = p.user_id
  WHERE p.user_id IN (
    SELECT following_id FROM public.follows WHERE follower_id = p_user_id
    UNION ALL SELECT p_user_id
  )
  AND NOT EXISTS (
    SELECT 1 FROM public.user_blocks b
    WHERE (b.blocker_id = p.user_id AND b.blocked_id = p_user_id)
       OR (b.blocker_id = p_user_id AND b.blocked_id = p.user_id)
  )
  AND (
    p.user_id = p_user_id
    OR (
      COALESCE(p.visibility, 'public') = 'public'
      AND COALESCE(p.close_friends_only, false) = false
      AND (
        NOT COALESCE(pr.is_private, false)
        OR EXISTS (
          SELECT 1 FROM public.follows f
          WHERE f.follower_id = p_user_id AND f.following_id = p.user_id
        )
      )
    )
    OR (
      COALESCE(p.visibility, 'public') = 'followers'
      AND COALESCE(p.close_friends_only, false) = false
      AND EXISTS (
        SELECT 1 FROM public.follows f
        WHERE f.follower_id = p_user_id AND f.following_id = p.user_id
      )
    )
    OR (
      COALESCE(p.close_friends_only, false)
      AND EXISTS (
        SELECT 1 FROM public.close_friends cf
        WHERE cf.user_id = p.user_id AND cf.friend_id = p_user_id
      )
    )
  )
  ORDER BY p.created_at DESC
  LIMIT p_limit OFFSET p_offset;
END;
$$;

REVOKE ALL ON FUNCTION public.get_feed(uuid, integer, integer) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.get_feed(uuid, integer, integer) TO authenticated;
