-- LBT audience/privacy hardening for the live schema.
-- Additive data updates only; no user content or Auth records are deleted.

ALTER TABLE public.posts
  ADD COLUMN IF NOT EXISTS visibility text;

UPDATE public.posts
SET visibility = 'public'
WHERE visibility IS NULL
   OR visibility NOT IN ('public', 'followers', 'private');

ALTER TABLE public.posts
  ALTER COLUMN visibility SET DEFAULT 'public',
  ALTER COLUMN visibility SET NOT NULL;

UPDATE public.posts
SET close_friends_only = false
WHERE close_friends_only IS NULL;

ALTER TABLE public.posts
  ALTER COLUMN close_friends_only SET DEFAULT false,
  ALTER COLUMN close_friends_only SET NOT NULL;

ALTER TABLE public.stories
  ADD COLUMN IF NOT EXISTS audience text,
  ADD COLUMN IF NOT EXISTS close_friends_only boolean;

UPDATE public.stories
SET audience = 'public'
WHERE audience IS NULL
   OR audience NOT IN ('public', 'followers', 'close_friends');

UPDATE public.stories
SET close_friends_only = false
WHERE close_friends_only IS NULL;

ALTER TABLE public.stories
  ALTER COLUMN audience SET DEFAULT 'public',
  ALTER COLUMN audience SET NOT NULL,
  ALTER COLUMN close_friends_only SET DEFAULT false,
  ALTER COLUMN close_friends_only SET NOT NULL;

ALTER TABLE public.profiles
  ADD COLUMN IF NOT EXISTS allow_mentions text;

UPDATE public.profiles
SET allow_mentions = CASE
  WHEN lower(btrim(COALESCE(who_can_mention, 'everyone'))) IN ('everyone', 'followers', 'nobody')
    THEN lower(btrim(COALESCE(who_can_mention, 'everyone')))
  ELSE 'everyone'
END
WHERE allow_mentions IS NULL
   OR allow_mentions NOT IN ('everyone', 'followers', 'nobody');

ALTER TABLE public.profiles
  ALTER COLUMN allow_mentions SET DEFAULT 'everyone',
  ALTER COLUMN allow_mentions SET NOT NULL;

DO $migration$
BEGIN
  IF EXISTS (
    SELECT 1 FROM public.close_friends WHERE user_id = friend_id
  ) THEN
    RAISE EXCEPTION 'close_friends contains self-references; refusing to add constraint';
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
    WHERE conrelid = 'public.posts'::regclass
      AND conname = 'posts_visibility_check'
  ) THEN
    ALTER TABLE public.posts
      ADD CONSTRAINT posts_visibility_check
      CHECK (visibility IN ('public', 'followers', 'private'));
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint
    WHERE conrelid = 'public.stories'::regclass
      AND conname = 'stories_audience_check'
  ) THEN
    ALTER TABLE public.stories
      ADD CONSTRAINT stories_audience_check
      CHECK (audience IN ('public', 'followers', 'close_friends'));
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint
    WHERE conrelid = 'public.profiles'::regclass
      AND conname = 'profiles_allow_mentions_check'
  ) THEN
    ALTER TABLE public.profiles
      ADD CONSTRAINT profiles_allow_mentions_check
      CHECK (allow_mentions IN ('everyone', 'followers', 'nobody'));
  END IF;
END
$migration$;

-- Helper functions are in a non-exposed schema. Do not add "private" to the
-- PostgREST exposed schemas list.
CREATE SCHEMA IF NOT EXISTS private;
REVOKE ALL ON SCHEMA private FROM PUBLIC, anon;
GRANT USAGE ON SCHEMA private TO authenticated;

CREATE OR REPLACE FUNCTION private.lbt_is_blocked_from(p_owner_id uuid)
RETURNS boolean
LANGUAGE sql STABLE SECURITY DEFINER
SET search_path = pg_catalog
AS $function$
  SELECT auth.uid() IS NOT NULL AND EXISTS (
    SELECT 1 FROM public.user_blocks b
    WHERE (b.blocker_id = p_owner_id AND b.blocked_id = auth.uid())
       OR (b.blocker_id = auth.uid() AND b.blocked_id = p_owner_id)
  );
$function$;

CREATE OR REPLACE FUNCTION private.lbt_profile_is_private(p_owner_id uuid)
RETURNS boolean
LANGUAGE sql STABLE SECURITY DEFINER
SET search_path = pg_catalog
AS $function$
  SELECT COALESCE(
    (SELECT p.is_private FROM public.profiles p WHERE p.id = p_owner_id),
    true
  );
$function$;

CREATE OR REPLACE FUNCTION private.lbt_follows_owner(p_owner_id uuid)
RETURNS boolean
LANGUAGE sql STABLE SECURITY DEFINER
SET search_path = pg_catalog
AS $function$
  SELECT auth.uid() IS NOT NULL AND EXISTS (
    SELECT 1 FROM public.follows f
    WHERE f.follower_id = auth.uid() AND f.following_id = p_owner_id
  );
$function$;

CREATE OR REPLACE FUNCTION private.lbt_is_close_friend_of(p_owner_id uuid)
RETURNS boolean
LANGUAGE sql STABLE SECURITY DEFINER
SET search_path = pg_catalog
AS $function$
  SELECT auth.uid() IS NOT NULL AND EXISTS (
    SELECT 1 FROM public.close_friends cf
    WHERE cf.user_id = p_owner_id AND cf.friend_id = auth.uid()
  );
$function$;

CREATE OR REPLACE FUNCTION private.lbt_can_add_close_friend(p_friend_id uuid)
RETURNS boolean
LANGUAGE sql STABLE SECURITY DEFINER
SET search_path = pg_catalog
AS $function$
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
$function$;

REVOKE ALL ON FUNCTION private.lbt_is_blocked_from(uuid) FROM PUBLIC, anon;
REVOKE ALL ON FUNCTION private.lbt_profile_is_private(uuid) FROM PUBLIC, anon;
REVOKE ALL ON FUNCTION private.lbt_follows_owner(uuid) FROM PUBLIC, anon;
REVOKE ALL ON FUNCTION private.lbt_is_close_friend_of(uuid) FROM PUBLIC, anon;
REVOKE ALL ON FUNCTION private.lbt_can_add_close_friend(uuid) FROM PUBLIC, anon;

GRANT EXECUTE ON FUNCTION private.lbt_is_blocked_from(uuid) TO authenticated;
GRANT EXECUTE ON FUNCTION private.lbt_profile_is_private(uuid) TO authenticated;
GRANT EXECUTE ON FUNCTION private.lbt_follows_owner(uuid) TO authenticated;
GRANT EXECUTE ON FUNCTION private.lbt_is_close_friend_of(uuid) TO authenticated;
GRANT EXECUTE ON FUNCTION private.lbt_can_add_close_friend(uuid) TO authenticated;

ALTER TABLE public.close_friends ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS cf_own ON public.close_friends;
DROP POLICY IF EXISTS cf_insert ON public.close_friends;
DROP POLICY IF EXISTS cf_delete ON public.close_friends;
DROP POLICY IF EXISTS cf_select ON public.close_friends;
DROP POLICY IF EXISTS close_friends_select_related ON public.close_friends;
DROP POLICY IF EXISTS close_friends_insert_followers ON public.close_friends;
DROP POLICY IF EXISTS close_friends_delete_owner ON public.close_friends;

CREATE POLICY close_friends_select_related
  ON public.close_friends FOR SELECT TO authenticated
  USING (user_id = (SELECT auth.uid()));

CREATE POLICY close_friends_insert_followers
  ON public.close_friends FOR INSERT TO authenticated
  WITH CHECK (
    user_id = (SELECT auth.uid())
    AND private.lbt_can_add_close_friend(friend_id)
  );

CREATE POLICY close_friends_delete_owner
  ON public.close_friends FOR DELETE TO authenticated
  USING (user_id = (SELECT auth.uid()));

REVOKE ALL ON TABLE public.close_friends FROM PUBLIC, anon, authenticated;
GRANT SELECT, INSERT, DELETE ON TABLE public.close_friends TO authenticated;

DROP POLICY IF EXISTS posts_select_anon ON public.posts;
DROP POLICY IF EXISTS posts_select_auth ON public.posts;
DROP POLICY IF EXISTS posts_select_authenticated ON public.posts;

CREATE POLICY posts_select_authenticated
  ON public.posts FOR SELECT TO authenticated
  USING (
    user_id = (SELECT auth.uid())
    OR (
      NOT private.lbt_is_blocked_from(posts.user_id)
      AND (
        (
          visibility = 'public'
          AND close_friends_only = false
          AND (
            NOT private.lbt_profile_is_private(posts.user_id)
            OR private.lbt_follows_owner(posts.user_id)
          )
        )
        OR (
          visibility = 'followers'
          AND close_friends_only = false
          AND private.lbt_follows_owner(posts.user_id)
        )
        OR (
          visibility <> 'private'
          AND close_friends_only = true
          AND private.lbt_is_close_friend_of(posts.user_id)
          AND (
            NOT private.lbt_profile_is_private(posts.user_id)
            OR private.lbt_follows_owner(posts.user_id)
          )
        )
      )
    )
  );

DROP POLICY IF EXISTS stories_select ON public.stories;
DROP POLICY IF EXISTS stories_select_auth ON public.stories;
DROP POLICY IF EXISTS stories_select_anon ON public.stories;
DROP POLICY IF EXISTS stories_select_authenticated ON public.stories;

CREATE POLICY stories_select_authenticated
  ON public.stories FOR SELECT TO authenticated
  USING (
    (expires_at IS NULL OR expires_at > now())
    AND (
      user_id = (SELECT auth.uid())
      OR (
        NOT private.lbt_is_blocked_from(stories.user_id)
        AND (
          (
            audience = 'public'
            AND close_friends_only = false
            AND (
              NOT private.lbt_profile_is_private(stories.user_id)
              OR private.lbt_follows_owner(stories.user_id)
            )
          )
          OR (
            audience = 'followers'
            AND close_friends_only = false
            AND private.lbt_follows_owner(stories.user_id)
          )
          OR (
            (audience = 'close_friends' OR close_friends_only = true)
            AND private.lbt_is_close_friend_of(stories.user_id)
            AND (
              NOT private.lbt_profile_is_private(stories.user_id)
              OR private.lbt_follows_owner(stories.user_id)
            )
          )
        )
      )
    )
  );

REVOKE ALL ON TABLE public.posts, public.stories FROM PUBLIC, anon, authenticated;
GRANT SELECT, INSERT, UPDATE, DELETE ON TABLE public.posts, public.stories TO authenticated;

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
AS $function$
BEGIN
  IF auth.uid() IS NULL OR p_user_id IS DISTINCT FROM auth.uid() THEN
    RAISE EXCEPTION 'Not authorized to read this feed';
  END IF;

  RETURN QUERY
  SELECT
    p.id, p.user_id, p.caption, p.media_urls, p.media_type,
    COALESCE(p.likes_count, 0)::integer,
    COALESCE(p.comments_count, 0)::integer,
    COALESCE(p.shares_count, 0)::integer,
    COALESCE(p.views_count, 0)::integer,
    COALESCE(p.reposts_count, 0)::integer,
    COALESCE(p.is_repost, false),
    p.repost_of, p.repost_caption,
    COALESCE(p.close_friends_only, false),
    p.tags, p.category, p.location, p.created_at,
    pr.username, pr.display_name, pr.avatar_url,
    COALESCE(pr.is_verified, false),
    EXISTS (SELECT 1 FROM public.likes l WHERE l.post_id=p.id AND l.user_id=p_user_id),
    EXISTS (SELECT 1 FROM public.saved_posts sp WHERE sp.post_id=p.id AND sp.user_id=p_user_id),
    EXISTS (SELECT 1 FROM public.follows f WHERE f.follower_id=p_user_id AND f.following_id=p.user_id)
  FROM public.posts p
  JOIN public.profiles pr ON pr.id=p.user_id
  WHERE p.is_archived=false
    AND (p.user_id=p_user_id OR NOT private.lbt_is_blocked_from(p.user_id))
    AND NOT EXISTS (
      SELECT 1 FROM public.hidden_posts hp
      WHERE hp.user_id=p_user_id AND hp.post_id=p.id
    )
    AND NOT EXISTS (
      SELECT 1 FROM public.muted_users mu
      WHERE mu.muter_id=p_user_id AND mu.muted_id=p.user_id
    )
    AND (
      p.user_id=p_user_id
      OR EXISTS (
        SELECT 1 FROM public.follows f
        WHERE f.follower_id=p_user_id AND f.following_id=p.user_id
      )
    )
    AND (
      p.user_id=p_user_id
      OR (
        p.visibility='public'
        AND p.close_friends_only=false
        AND (
          NOT private.lbt_profile_is_private(p.user_id)
          OR private.lbt_follows_owner(p.user_id)
        )
      )
      OR (
        p.visibility='followers'
        AND p.close_friends_only=false
        AND private.lbt_follows_owner(p.user_id)
      )
      OR (
        p.visibility<>'private'
        AND p.close_friends_only=true
        AND private.lbt_is_close_friend_of(p.user_id)
        AND (
          NOT private.lbt_profile_is_private(p.user_id)
          OR private.lbt_follows_owner(p.user_id)
        )
      )
    )
  ORDER BY p.created_at DESC
  LIMIT p_limit OFFSET p_offset;
END;
$function$;

REVOKE ALL ON FUNCTION public.get_feed(uuid, integer, integer) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.get_feed(uuid, integer, integer) TO authenticated;
