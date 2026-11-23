-- Comments and likes are children of posts; inherit the parent's audience rules.
DROP POLICY IF EXISTS comments_select_safe ON public.comments;
CREATE POLICY comments_select_safe ON public.comments
FOR SELECT TO authenticated
USING (
  (
    comments.user_id=(SELECT auth.uid())
    OR NOT private.lbt_is_blocked_from(comments.user_id)
  )
  AND EXISTS (
    SELECT 1 FROM public.posts p
    WHERE p.id=comments.post_id
      AND (p.user_id=(SELECT auth.uid()) OR private.lbt_can_view_post(p.id))
  )
);

DROP POLICY IF EXISTS comments_insert_safe ON public.comments;
CREATE POLICY comments_insert_safe ON public.comments
FOR INSERT TO authenticated
WITH CHECK (
  user_id=(SELECT auth.uid())
  AND EXISTS (
    SELECT 1 FROM public.posts p
    WHERE p.id=comments.post_id
      AND (p.user_id=(SELECT auth.uid()) OR private.lbt_can_view_post(p.id))
  )
  AND (
    reply_to_id IS NULL
    OR EXISTS (
      SELECT 1 FROM public.comments parent
      WHERE parent.id=comments.reply_to_id
        AND parent.post_id=comments.post_id
    )
  )
);

REVOKE INSERT,UPDATE ON TABLE public.comments FROM PUBLIC,anon,authenticated;
GRANT INSERT (user_id,post_id,content,gif_url,reply_to_id)
ON TABLE public.comments TO authenticated;

DROP POLICY IF EXISTS likes_select_all ON public.likes;
CREATE POLICY likes_select_all ON public.likes
FOR SELECT TO authenticated
USING (
  user_id=(SELECT auth.uid())
  OR EXISTS (
    SELECT 1 FROM public.posts p
    WHERE p.id=likes.post_id
      AND (p.user_id=(SELECT auth.uid()) OR private.lbt_can_view_post(p.id))
  )
);

DROP POLICY IF EXISTS likes_insert_safe ON public.likes;
CREATE POLICY likes_insert_safe ON public.likes
FOR INSERT TO authenticated
WITH CHECK (
  user_id=(SELECT auth.uid())
  AND EXISTS (
    SELECT 1 FROM public.posts p
    WHERE p.id=likes.post_id
      AND (p.user_id=(SELECT auth.uid()) OR private.lbt_can_view_post(p.id))
  )
);

REVOKE INSERT,UPDATE ON TABLE public.likes FROM PUBLIC,anon,authenticated;
GRANT INSERT (user_id,post_id) ON TABLE public.likes TO authenticated;

DROP POLICY IF EXISTS comments_delete_own ON public.comments;
CREATE POLICY comments_delete_own ON public.comments
FOR DELETE TO authenticated
USING (user_id=(SELECT auth.uid()));

DROP POLICY IF EXISTS likes_delete_own ON public.likes;
CREATE POLICY likes_delete_own ON public.likes
FOR DELETE TO authenticated
USING (user_id=(SELECT auth.uid()));

CREATE OR REPLACE FUNCTION public.increment_comment_replies()
RETURNS trigger LANGUAGE plpgsql SECURITY DEFINER
SET search_path=pg_catalog,public
AS $function$
BEGIN
  IF NEW.reply_to_id IS NOT NULL THEN
    UPDATE public.comments
    SET replies_count=COALESCE(replies_count,0)+1
    WHERE id=NEW.reply_to_id;
  END IF;
  RETURN NEW;
END;
$function$;

CREATE OR REPLACE FUNCTION public.update_explore_score()
RETURNS trigger LANGUAGE plpgsql SECURITY DEFINER
SET search_path=pg_catalog,public
AS $function$
DECLARE v_post_id uuid;
BEGIN
  v_post_id := CASE WHEN TG_OP='DELETE' THEN OLD.post_id ELSE NEW.post_id END;
  UPDATE public.explore_feed
  SET score=(
    SELECT COALESCE(likes_count,0)+COALESCE(comments_count,0)*2+COALESCE(shares_count,0)*3
    FROM public.posts WHERE id=v_post_id
  ), updated_at=now()
  WHERE post_id=v_post_id;
  RETURN NULL;
END;
$function$;

REVOKE ALL ON FUNCTION public.increment_comment_replies() FROM PUBLIC,anon,authenticated;
REVOKE ALL ON FUNCTION public.update_explore_score() FROM PUBLIC,anon,authenticated;
