-- LBT: enforce post/story audience and close-friends visibility.
-- This migration is written against the existing schema inspected on the
-- linked project. It does not delete user content or modify Auth users.

-- ---------------------------------------------------------------------------
-- 1. Schema used by the current client
-- ---------------------------------------------------------------------------

ALTER TABLE public.posts
  ADD COLUMN IF NOT EXISTS visibility text;

UPDATE public.posts
SET visibility = 'public'
WHERE visibility IS NULL
   OR visibility NOT IN ('public', 'followers', 'private');

ALTER TABLE public.posts
  ALTER COLUMN visibility SET DEFAULT 'public',
  ALTER COLUMN visibility SET NOT NULL;

ALTER TABLE public.posts
  ADD COLUMN IF NOT EXISTS close_friends_only boolean;

UPDATE public.posts
SET close_friends_only = false
WHERE close_friends_only IS NULL;

ALTER TABLE public.posts
  ALTER COLUMN close_friends_only SET DEFAULT false,
  ALTER COLUMN close_friends_only SET NOT NULL;

-- These columns already exist in the inspected project. The statements also
-- make the migration safe on installations where one of them is still absent.
ALTER TABLE public.stories
  ADD COLUMN IF NOT EXISTS audience text,
  ADD COLUMN IF NOT EXISTS close_friends_only boolean;

UPDATE public.stories
SET audience = 'public'
WHERE audience IS NULL;

UPDATE public.stories
SET close_friends_only = false
WHERE close_friends_only IS NULL;

ALTER TABLE public.stories
  ALTER COLUMN audience SET DEFAULT 'public',
  ALTER COLUMN audience SET NOT NULL,
  ALTER COLUMN close_friends_only SET DEFAULT false,
  ALTER COLUMN close_friends_only SET NOT NULL;

-- The live profiles table has who_can_mention, while the current client reads
-- and writes allow_mentions. Copy the old preference only when adding the
-- replacement column; do not overwrite a preference on a later re-run.
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1
    FROM information_schema.columns
    WHERE table_schema = 'public'
      AND table_name = 'profiles'
      AND column_name = 'allow_mentions'
  ) THEN
    ALTER TABLE public.profiles
      ADD COLUMN allow_mentions text NOT NULL DEFAULT 'everyone';

    IF EXISTS (
      SELECT 1
      FROM information_schema.columns
      WHERE table_schema = 'public'
        AND table_name = 'profiles'
        AND column_name = 'who_can_mention'
    ) THEN
      EXECUTE $copy$
        UPDATE public.profiles
        SET allow_mentions = CASE
          WHEN lower(btrim(who_can_mention::text)) IN ('everyone', 'followers', 'nobody')
            THEN lower(btrim(who_can_mention::text))
          ELSE 'everyone'
        END
      $copy$;
    END IF;
  END IF;
END
$$;

UPDATE public.profiles
SET allow_mentions = 'everyone'
WHERE allow_mentions IS NULL
   OR allow_mentions NOT IN ('everyone', 'followers', 'nobody');

ALTER TABLE public.profiles
  ALTER COLUMN allow_mentions SET DEFAULT 'everyone',
  ALTER COLUMN allow_mentions SET NOT NULL;

-- close_friends already exists in the live project, but it has no constraints
-- there. Keep its existing id column and add the missing integrity guarantees.
CREATE TABLE IF NOT EXISTS public.close_friends (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  friend_id uuid NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  created_at timestamptz NOT NULL DEFAULT now(),
  CONSTRAINT close_friends_pair_key UNIQUE (user_id, friend_id),
  CONSTRAINT close_friends_not_self CHECK (user_id <> friend_id)
);

ALTER TABLE public.close_friends
  ADD COLUMN IF NOT EXISTS id uuid,
  ADD COLUMN IF NOT EXISTS created_at timestamptz;

UPDATE public.close_friends
SET id = gen_random_uuid()
WHERE id IS NULL;

UPDATE public.close_friends
SET created_at = now()
WHERE created_at IS NULL;

ALTER TABLE public.close_friends
  ALTER COLUMN id SET DEFAULT gen_random_uuid(),
  ALTER COLUMN id SET NOT NULL,
  ALTER COLUMN user_id SET NOT NULL,
  ALTER COLUMN friend_id SET NOT NULL,
  ALTER COLUMN created_at SET DEFAULT now(),
  ALTER COLUMN created_at SET NOT NULL;

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint
    WHERE conrelid = 'public.close_friends'::regclass
      AND contype = 'p'
  ) THEN
    ALTER TABLE public.close_friends
      ADD CONSTRAINT close_friends_pkey PRIMARY KEY (id);
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint
    WHERE conrelid = 'public.close_friends'::regclass
      AND conname = 'close_friends_pair_key'
  ) THEN
    ALTER TABLE public.close_friends
      ADD CONSTRAINT close_friends_pair_key UNIQUE (user_id, friend_id);
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint
    WHERE conrelid = 'public.close_friends'::regclass
      AND conname = 'close_friends_not_self'
  ) THEN
    ALTER TABLE public.close_friends
      ADD CONSTRAINT close_friends_not_self CHECK (user_id <> friend_id);
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint
    WHERE conrelid = 'public.close_friends'::regclass
      AND conname = 'close_friends_user_id_fkey'
  ) THEN
    ALTER TABLE public.close_friends
      ADD CONSTRAINT close_friends_user_id_fkey
      FOREIGN KEY (user_id) REFERENCES public.profiles(id) ON DELETE CASCADE;
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint
    WHERE conrelid = 'public.close_friends'::regclass
      AND conname = 'close_friends_friend_id_fkey'
  ) THEN
    ALTER TABLE public.close_friends
      ADD CONSTRAINT close_friends_friend_id_fkey
      FOREIGN KEY (friend_id) REFERENCES public.profiles(id) ON DELETE CASCADE;
  END IF;
END
$$;

CREATE INDEX IF NOT EXISTS close_friends_friend_idx
  ON public.close_friends(friend_id);

-- ---------------------------------------------------------------------------
-- 2. close_friends RLS
-- PostgreSQL combines permissive policies with OR. Remove the old ALL policy
-- and its companion policies before creating the narrower rules.
-- ---------------------------------------------------------------------------

ALTER TABLE public.close_friends ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS cf_own ON public.close_friends;
DROP POLICY IF EXISTS cf_insert ON public.close_friends;
DROP POLICY IF EXISTS cf_delete ON public.close_friends;
DROP POLICY IF EXISTS cf_select ON public.close_friends;
DROP POLICY IF EXISTS close_friends_select_own ON public.close_friends;
DROP POLICY IF EXISTS close_friends_insert_own ON public.close_friends;
DROP POLICY IF EXISTS close_friends_delete_own ON public.close_friends;
DROP POLICY IF EXISTS close_friends_select_related ON public.close_friends;
DROP POLICY IF EXISTS close_friends_insert_followers ON public.close_friends;
DROP POLICY IF EXISTS close_friends_delete_owner ON public.close_friends;

CREATE POLICY close_friends_select_related
  ON public.close_friends
  FOR SELECT TO authenticated
  USING (user_id = (SELECT auth.uid()));

CREATE POLICY close_friends_insert_followers
  ON public.close_friends
  FOR INSERT TO authenticated
  WITH CHECK (
    user_id = (SELECT auth.uid())
    AND friend_id <> (SELECT auth.uid())
    AND public.lbt_can_add_close_friend(friend_id)
  );

CREATE POLICY close_friends_delete_owner
  ON public.close_friends
  FOR DELETE TO authenticated
  USING (user_id = (SELECT auth.uid()));

REVOKE ALL ON TABLE public.close_friends FROM anon, PUBLIC;
GRANT SELECT, INSERT, DELETE ON TABLE public.close_friends TO authenticated;

-- RLS policies cannot reliably inspect other users' follow/block rows because
-- those tables have their own RLS. These narrowly scoped SECURITY DEFINER
-- predicates always bind the viewer to auth.uid(); callers cannot probe an
-- arbitrary pair of users.
CREATE OR REPLACE FUNCTION public.lbt_is_blocked_from(p_owner_id uuid)
RETURNS boolean
LANGUAGE sql STABLE SECURITY DEFINER
SET search_path = pg_catalog, public
AS $
  SELECT auth.uid() IS NOT NULL AND EXISTS (
    SELECT 1 FROM public.user_blocks b
    WHERE (b.blocker_id = p_owner_id AND b.blocked_id = auth.uid())
       OR (b.blocker_id = auth.uid() AND b.blocked_id = p_owner_id)
  );
$;

CREATE OR REPLACE FUNCTION public.lbt_profile_is_private(p_owner_id uuid)
RETURNS boolean
LANGUAGE sql STABLE SECURITY DEFINER
SET search_path = pg_catalog, public
AS $
  SELECT COALESCE(
    (SELECT p.is_private FROM public.profiles p WHERE p.id = p_owner_id),
    false
  );
$;

CREATE OR REPLACE FUNCTION public.lbt_follows_owner(p_owner_id uuid)
RETURNS boolean
LANGUAGE sql STABLE SECURITY DEFINER
SET search_path = pg_catalog, public
AS $
  SELECT auth.uid() IS NOT NULL AND EXISTS (
    SELECT 1 FROM public.follows f
    WHERE f.follower_id = auth.uid() AND f.following_id = p_owner_id
  );
$;

CREATE OR REPLACE FUNCTION public.lbt_is_close_friend_of(p_owner_id uuid)
RETURNS boolean
LANGUAGE sql STABLE SECURITY DEFINER
SET search_path = pg_catalog, public
AS $
  SELECT auth.uid() IS NOT NULL AND EXISTS (
    SELECT 1 FROM public.close_friends cf
    WHERE cf.user_id = p_owner_id AND cf.friend_id = auth.uid()
  );
$;

CREATE OR REPLACE FUNCTION public.lbt_can_add_close_friend(p_friend_id uuid)
RETURNS boolean
LANGUAGE sql STABLE SECURITY DEFINER
SET search_path = pg_catalog, public
AS $
  SELECT auth.uid() IS NOT NULL
    AND p_friend_id <> auth.uid()
    AND EXISTS (
      SELECT 1 FROM public.follows f
      WHERE f.follower_id = p_friend_id AND f.following_id = auth.uid()
    )
    AND NOT EXISTS (
      SELECT 1 FROM public.user_blocks b
      WHERE (b.blocker_id = auth.uid() AND b.blocked_id = p_friend_id)
         OR (b.blocker_id = p_friend_id AND b.blocked_id = auth.uid())
    );
$;

REVOKE ALL ON FUNCTION public.lbt_is_blocked_from(uuid) FROM PUBLIC, anon;
REVOKE ALL ON FUNCTION public.lbt_profile_is_private(uuid) FROM PUBLIC, anon;
REVOKE ALL ON FUNCTION public.lbt_follows_owner(uuid) FROM PUBLIC, anon;
REVOKE ALL ON FUNCTION public.lbt_is_close_friend_of(uuid) FROM PUBLIC, anon;
REVOKE ALL ON FUNCTION public.lbt_can_add_close_friend(uuid) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.lbt_is_blocked_from(uuid) TO authenticated;
GRANT EXECUTE ON FUNCTION public.lbt_profile_is_private(uuid) TO authenticated;
GRANT EXECUTE ON FUNCTION public.lbt_follows_owner(uuid) TO authenticated;
GRANT EXECUTE ON FUNCTION public.lbt_is_close_friend_of(uuid) TO authenticated;
GRANT EXECUTE ON FUNCTION public.lbt_can_add_close_friend(uuid) TO authenticated;

-- ---------------------------------------------------------------------------
-- 3. Stories visibility
-- Remove the actual legacy stories_select policy seen on the live database.
-- Leaving it in place would OR its conditions with the new policy.
-- ---------------------------------------------------------------------------

DROP POLICY IF EXISTS stories_select ON public.stories;
DROP POLICY IF EXISTS stories_select_auth ON public.stories;
DROP POLICY IF EXISTS stories_select_anon ON public.stories;
DROP POLICY IF EXISTS stories_select_authenticated ON public.stories;
DROP POLICY IF EXISTS "Public read stories" ON public.stories;

CREATE POLICY stories_select_authenticated
  ON public.stories
  FOR SELECT TO authenticated
  USING (
    expires_at > now()
    AND (
      user_id = (SELECT auth.uid())
      OR (
        NOT public.lbt_is_blocked_from(stories.user_id)
        AND (
          (
            COALESCE(audience, 'public') = 'public'
            AND COALESCE(close_friends_only, false) = false
            AND (
              NOT public.lbt_profile_is_private(stories.user_id)
              OR public.lbt_follows_owner(stories.user_id)
            )
          )
          OR (
            COALESCE(audience, 'public') = 'followers'
            AND COALESCE(close_friends_only, false) = false
            AND public.lbt_follows_owner(stories.user_id)
          )
          OR (
            (
              COALESCE(audience, 'public') = 'close_friends'
              OR COALESCE(close_friends_only, false) = true
            )
            AND public.lbt_is_close_friend_of(stories.user_id)
            AND (
              NOT public.lbt_profile_is_private(stories.user_id)
              OR EXISTS (
                SELECT 1
                FROM public.follows f
                WHERE f.follower_id = (SELECT auth.uid())
                  AND f.following_id = stories.user_id
              )
            )
          )
        )
      )
    )
  );

-- ---------------------------------------------------------------------------
-- 4. Posts visibility
-- Remove both live SELECT policies. This app requires authentication; disable
-- anonymous table reads rather than infer privacy through another RLS table.
-- ---------------------------------------------------------------------------

DROP POLICY IF EXISTS posts_select_auth ON public.posts;
DROP POLICY IF EXISTS posts_select_anon ON public.posts;
DROP POLICY IF EXISTS posts_select_authenticated ON public.posts;
REVOKE SELECT ON TABLE public.posts, public.stories FROM anon, PUBLIC;
GRANT SELECT ON TABLE public.posts, public.stories TO authenticated;

CREATE POLICY posts_select_authenticated
  ON public.posts
  FOR SELECT TO authenticated
  USING (
    user_id = (SELECT auth.uid())
    OR (
      NOT public.lbt_is_blocked_from(posts.user_id)
      AND (
        (
          COALESCE(visibility, 'public') = 'public'
          AND COALESCE(close_friends_only, false) = false
          AND (
            NOT public.lbt_profile_is_private(posts.user_id)
            OR public.lbt_follows_owner(posts.user_id)
          )
        )
        OR (
          COALESCE(visibility, 'public') = 'followers'
          AND COALESCE(close_friends_only, false) = false
          AND public.lbt_follows_owner(posts.user_id)
        )
        OR (
          COALESCE(close_friends_only, false) = true
          AND public.lbt_is_close_friend_of(posts.user_id)
          AND (
            NOT public.lbt_profile_is_private(posts.user_id)
            OR EXISTS (
              SELECT 1
              FROM public.follows f
              WHERE f.follower_id = (SELECT auth.uid())
                AND f.following_id = posts.user_id
            )
          )
        )
      )
    )
  );

-- ---------------------------------------------------------------------------
-- 5. Feed RPC
-- Preserve the exact live return signature. PostgreSQL cannot change a
-- RETURNS TABLE shape through CREATE OR REPLACE FUNCTION.
-- ---------------------------------------------------------------------------

CREATE OR REPLACE FUNCTION public.get_feed(
  p_user_id uuid,
  p_limit integer DEFAULT 20,
  p_offset integer DEFAULT 0
)
RETURNS TABLE (
  id uuid,
  user_id uuid,
  caption text,
  media_urls text[],
  media_type text,
  likes_count integer,
  comments_count integer,
  shares_count integer,
  views_count integer,
  reposts_count integer,
  is_repost boolean,
  repost_of uuid,
  repost_caption text,
  close_friends_only boolean,
  tags text[],
  category text,
  location text,
  created_at timestamptz,
  username text,
  display_name text,
  avatar_url text,
  is_verified boolean,
  is_liked boolean,
  is_saved boolean,
  is_following boolean
)
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public', 'extensions'
AS $$
BEGIN
  IF auth.uid() IS NULL OR p_user_id IS DISTINCT FROM auth.uid() THEN
    RAISE EXCEPTION 'Not authorized to read this feed';
  END IF;

  RETURN QUERY
  SELECT
    p.id,
    p.user_id,
    p.caption,
    p.media_urls,
    p.media_type,
    COALESCE(p.likes_count, 0)::integer,
    COALESCE(p.comments_count, 0)::integer,
    COALESCE(p.shares_count, 0)::integer,
    COALESCE(p.views_count, 0)::integer,
    COALESCE(p.reposts_count, 0)::integer,
    COALESCE(p.is_repost, false),
    p.repost_of,
    p.repost_caption,
    COALESCE(p.close_friends_only, false),
    p.tags,
    p.category,
    p.location,
    p.created_at,
    pr.username,
    pr.display_name,
    pr.avatar_url,
    COALESCE(pr.is_verified, false),
    EXISTS (
      SELECT 1 FROM public.likes l
      WHERE l.post_id = p.id AND l.user_id = p_user_id
    ),
    EXISTS (
      SELECT 1 FROM public.saved_posts sp
      WHERE sp.post_id = p.id AND sp.user_id = p_user_id
    ),
    EXISTS (
      SELECT 1 FROM public.follows f
      WHERE f.follower_id = p_user_id AND f.following_id = p.user_id
    )
  FROM public.posts p
  JOIN public.profiles pr ON pr.id = p.user_id
  WHERE p.is_archived = false
    AND NOT EXISTS (
      SELECT 1
      FROM public.user_blocks ub
      WHERE (ub.blocker_id = p_user_id AND ub.blocked_id = p.user_id)
         OR (ub.blocker_id = p.user_id AND ub.blocked_id = p_user_id)
    )
    AND NOT EXISTS (
      SELECT 1
      FROM public.hidden_posts hp
      WHERE hp.user_id = p_user_id AND hp.post_id = p.id
    )
    AND NOT EXISTS (
      SELECT 1
      FROM public.muted_users mu
      WHERE mu.muter_id = p_user_id AND mu.muted_id = p.user_id
    )
    AND p.user_id IN (
      SELECT f.following_id
      FROM public.follows f
      WHERE f.follower_id = p_user_id
      UNION
      SELECT p_user_id
    )
    AND (
      p.user_id = p_user_id
      OR (
        COALESCE(p.visibility, 'public') = 'public'
        AND COALESCE(p.close_friends_only, false) = false
        AND (
          NOT public.lbt_profile_is_private(p.user_id)
          OR public.lbt_follows_owner(p.user_id)
        )
      )
      OR (
        COALESCE(p.visibility, 'public') = 'followers'
        AND COALESCE(p.close_friends_only, false) = false
        AND public.lbt_follows_owner(p.user_id)
      )
      OR (
        COALESCE(p.close_friends_only, false) = true
        AND public.lbt_is_close_friend_of(p.user_id)
        AND (
          NOT public.lbt_profile_is_private(p.user_id)
          OR public.lbt_follows_owner(p.user_id)
        )
      )
    )
  ORDER BY p.created_at DESC
  LIMIT p_limit OFFSET p_offset;
END;
$$;

REVOKE ALL ON FUNCTION public.get_feed(uuid, integer, integer) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.get_feed(uuid, integer, integer) TO authenticated;
