-- Safe version of get_feed that doesn't require is_archived column
CREATE OR REPLACE FUNCTION public.get_feed(
  p_user_id uuid,
  p_limit   integer DEFAULT 20,
  p_offset  integer DEFAULT 0
)
RETURNS TABLE (
  id              uuid,
  user_id         uuid,
  caption         text,
  category        text,
  media_urls      text[],
  media_type      text,
  likes_count     integer,
  comments_count  integer,
  shares_count    integer,
  tags            text[],
  created_at      timestamptz,
  profiles        jsonb,
  has_liked       boolean,
  has_bookmarked  boolean,
  comments        jsonb
)
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  RETURN QUERY
  SELECT
    p.id, p.user_id, p.caption, p.category,
    p.media_urls, p.media_type,
    COALESCE(p.likes_count, 0)::int,
    COALESCE(p.comments_count, 0)::int,
    COALESCE(p.shares_count, 0)::int,
    p.tags, p.created_at,
    jsonb_build_object(
      'id',              pr.id,
      'username',        pr.username,
      'display_name',    COALESCE(pr.display_name, pr.username),
      'avatar_url',      pr.avatar_url,
      'bio',             pr.bio,
      'followers_count', COALESCE(pr.followers_count, 0),
      'following_count', COALESCE(pr.following_count, 0)
    ) AS profiles,
    EXISTS(
      SELECT 1 FROM public.likes l
      WHERE l.post_id = p.id AND l.user_id = p_user_id
    ) AS has_liked,
    EXISTS(
      SELECT 1 FROM public.saved_posts sp
      WHERE sp.post_id = p.id AND sp.user_id = p_user_id
    ) AS has_bookmarked,
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
    ), '[]'::jsonb) AS comments
  FROM public.posts p
  JOIN public.profiles pr ON pr.id = p.user_id
  WHERE p.user_id IN (
    SELECT following_id FROM public.follows WHERE follower_id = p_user_id
    UNION ALL SELECT p_user_id
  )
  ORDER BY p.created_at DESC
  LIMIT p_limit OFFSET p_offset;
END;
$$;

GRANT EXECUTE ON FUNCTION public.get_feed(uuid, integer, integer) TO authenticated;
