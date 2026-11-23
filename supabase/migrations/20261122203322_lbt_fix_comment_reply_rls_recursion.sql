CREATE OR REPLACE FUNCTION private.lbt_comment_reply_matches_post(
  p_parent_comment_id uuid,
  p_post_id uuid
)
RETURNS boolean
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = pg_catalog
AS $function$
  SELECT auth.uid() IS NOT NULL
    AND (
      p_parent_comment_id IS NULL
      OR EXISTS (
        SELECT 1
        FROM public.comments parent
        WHERE parent.id=p_parent_comment_id
          AND parent.post_id=p_post_id
          AND (
            parent.user_id=auth.uid()
            OR NOT private.lbt_is_blocked_from(parent.user_id)
          )
      )
    );
$function$;

REVOKE ALL ON FUNCTION private.lbt_comment_reply_matches_post(uuid,uuid) FROM PUBLIC,anon;
GRANT EXECUTE ON FUNCTION private.lbt_comment_reply_matches_post(uuid,uuid) TO authenticated;

DROP POLICY IF EXISTS comments_insert_safe ON public.comments;
CREATE POLICY comments_insert_safe
ON public.comments
FOR INSERT TO authenticated
WITH CHECK (
  user_id=(SELECT auth.uid())
  AND EXISTS (
    SELECT 1 FROM public.posts p
    WHERE p.id=comments.post_id
      AND (
        p.user_id=(SELECT auth.uid())
        OR private.lbt_can_view_post(p.id)
      )
  )
  AND private.lbt_comment_reply_matches_post(reply_to_id,post_id)
);
