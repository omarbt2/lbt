-- ============================================================
-- FIX: Ensure posts.media_urls is nullable + profiles join safety
-- Run AFTER 20260601000003_comprehensive_fixes.sql
-- ============================================================

-- media_urls is already text[] (nullable) in init.sql, but ensure
-- no NOT NULL constraint was added by a later migration
DO $$
BEGIN
  -- Drop NOT NULL if it somehow got set
  ALTER TABLE public.posts ALTER COLUMN media_urls DROP NOT NULL;
EXCEPTION WHEN undefined_column THEN NULL;
END $$;

-- Ensure media_type column exists (added in comprehensive_fixes)
ALTER TABLE public.posts
  ADD COLUMN IF NOT EXISTS media_type text
    CHECK (media_type IN ('image', 'video', 'carousel'))
    DEFAULT 'image';

-- Ensure the get_feed RPC function handles missing profiles gracefully
CREATE OR REPLACE FUNCTION public.get_feed(
  p_user_id UUID,
  p_limit INT DEFAULT 10,
  p_offset INT DEFAULT 0
)
RETURNS TABLE (
  id UUID,
  user_id UUID,
  caption TEXT,
  category TEXT,
  media_urls TEXT[],
  media_type TEXT,
  tags TEXT[],
  likes_count INT,
  comments_count INT,
  created_at TIMESTAMPTZ,
  profiles JSONB,
  comments JSONB,
  has_liked BOOLEAN,
  has_bookmarked BOOLEAN
)
LANGUAGE plpgsql SECURITY DEFINER
AS $$
BEGIN
  RETURN QUERY
  SELECT
    p.id,
    p.user_id,
    p.caption,
    p.category,
    p.media_urls,
    p.media_type,
    p.tags,
    p.likes_count,
    p.comments_count,
    p.created_at,
    COALESCE(
      (SELECT jsonb_build_object(
        'id', pr.id,
        'username', pr.username,
        'display_name', COALESCE(pr.display_name, pr.name, pr.username),
        'avatar_url', pr.avatar_url,
        'bio', pr.bio,
        'followers_count', pr.followers_count,
        'following_count', pr.following_count
      ) FROM public.profiles pr WHERE pr.id = p.user_id),
      jsonb_build_object(
        'id', p.user_id,
        'username', 'unknown',
        'display_name', 'Deleted User',
        'avatar_url', NULL,
        'bio', NULL,
        'followers_count', 0,
        'following_count', 0
      )
    ) AS profiles,
    COALESCE(
      (SELECT jsonb_agg(jsonb_build_object(
        'id', c.id,
        'content', c.content,
        'likes_count', c.likes_count,
        'created_at', c.created_at,
        'profiles', COALESCE(
          (SELECT jsonb_build_object(
            'id', cpr.id,
            'username', cpr.username,
            'display_name', COALESCE(cpr.display_name, cpr.name, cpr.username),
            'avatar_url', cpr.avatar_url,
            'bio', cpr.bio,
            'followers_count', cpr.followers_count,
            'following_count', cpr.following_count
          ) FROM public.profiles cpr WHERE cpr.id = c.user_id),
          jsonb_build_object('id', c.user_id, 'username', 'unknown', 'display_name', 'Deleted User')
        )
      )) FROM public.comments c WHERE c.post_id = p.id ORDER BY c.created_at ASC),
      '[]'::jsonb
    ) AS comments,
    EXISTS(SELECT 1 FROM public.likes l WHERE l.post_id = p.id AND l.user_id = p_user_id) AS has_liked,
    EXISTS(SELECT 1 FROM public.saved_posts sp WHERE sp.post_id = p.id AND sp.user_id = p_user_id) AS has_bookmarked
  FROM public.posts p
  ORDER BY p.created_at DESC
  LIMIT p_limit OFFSET p_offset;
END;
$$;

-- Fix searchProfiles to handle NULL display_name
-- The app uses: .or(`username.ilike.%${query}%,display_name.ilike.%${query}%`)
-- ilike does NOT match NULL values, so profiles with NULL display_name are excluded
-- Add a functional index to make COALESCE searchable
CREATE INDEX IF NOT EXISTS idx_profiles_search_name
  ON public.profiles USING gin (
    to_tsvector('simple', COALESCE(display_name, '') || ' ' || COALESCE(name, '') || ' ' || COALESCE(username, ''))
  );
