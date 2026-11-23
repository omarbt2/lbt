-- Harden messaging, reactions, views and caller-bound read RPCs.
-- Applied to Supabase project nopnxlhknrrsttouevxd.

CREATE OR REPLACE FUNCTION private.lbt_can_view_post(p_post_id uuid)
RETURNS boolean LANGUAGE sql STABLE SECURITY DEFINER
SET search_path = pg_catalog
AS $function$
  SELECT auth.uid() IS NOT NULL AND EXISTS (
    SELECT 1 FROM public.posts p JOIN public.profiles pr ON pr.id=p.user_id
    WHERE p.id=p_post_id AND COALESCE(p.is_archived,false)=false
      AND p.user_id<>auth.uid()
      AND NOT private.lbt_is_blocked_from(p.user_id)
      AND (
        (p.visibility='public' AND COALESCE(p.close_friends_only,false)=false
          AND (NOT COALESCE(pr.is_private,true) OR private.lbt_follows_owner(p.user_id)))
        OR
        (p.visibility='followers' AND COALESCE(p.close_friends_only,false)=false
          AND private.lbt_follows_owner(p.user_id))
        OR
        (p.visibility<>'private' AND COALESCE(p.close_friends_only,false)=true
          AND private.lbt_is_close_friend_of(p.user_id)
          AND (NOT COALESCE(pr.is_private,true) OR private.lbt_follows_owner(p.user_id)))
      )
  );
$function$;

CREATE OR REPLACE FUNCTION private.lbt_can_view_story(p_story_id uuid)
RETURNS boolean LANGUAGE sql STABLE SECURITY DEFINER
SET search_path = pg_catalog
AS $function$
  SELECT auth.uid() IS NOT NULL AND EXISTS (
    SELECT 1 FROM public.stories s JOIN public.profiles pr ON pr.id=s.user_id
    WHERE s.id=p_story_id AND s.user_id<>auth.uid()
      AND (s.expires_at IS NULL OR s.expires_at>now())
      AND NOT private.lbt_is_blocked_from(s.user_id)
      AND (
        (s.audience='public' AND COALESCE(s.close_friends_only,false)=false
          AND (NOT COALESCE(pr.is_private,true) OR private.lbt_follows_owner(s.user_id)))
        OR
        (s.audience='followers' AND COALESCE(s.close_friends_only,false)=false
          AND private.lbt_follows_owner(s.user_id))
        OR
        ((s.audience='close_friends' OR COALESCE(s.close_friends_only,false))
          AND private.lbt_is_close_friend_of(s.user_id)
          AND (NOT COALESCE(pr.is_private,true) OR private.lbt_follows_owner(s.user_id)))
      )
  );
$function$;

CREATE OR REPLACE FUNCTION private.lbt_can_view_reel(p_reel_id uuid)
RETURNS boolean LANGUAGE sql STABLE SECURITY DEFINER
SET search_path = pg_catalog
AS $function$
  SELECT auth.uid() IS NOT NULL AND EXISTS (
    SELECT 1 FROM public.reels r JOIN public.profiles pr ON pr.id=r.user_id
    WHERE r.id=p_reel_id AND r.user_id<>auth.uid()
      AND COALESCE(r.is_public,false)=true
      AND COALESCE(r.is_archived,false)=false
      AND NOT private.lbt_is_blocked_from(r.user_id)
      AND (NOT COALESCE(pr.is_private,true) OR private.lbt_follows_owner(r.user_id))
  );
$function$;

REVOKE ALL ON FUNCTION private.lbt_can_view_post(uuid) FROM PUBLIC, anon;
REVOKE ALL ON FUNCTION private.lbt_can_view_story(uuid) FROM PUBLIC, anon;
REVOKE ALL ON FUNCTION private.lbt_can_view_reel(uuid) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION private.lbt_can_view_post(uuid) TO authenticated;
GRANT EXECUTE ON FUNCTION private.lbt_can_view_story(uuid) TO authenticated;
GRANT EXECUTE ON FUNCTION private.lbt_can_view_reel(uuid) TO authenticated;

DROP POLICY IF EXISTS conv_insert_safe ON public.conversations;
CREATE POLICY conv_insert_safe ON public.conversations
FOR INSERT TO authenticated
WITH CHECK (
  auth.uid() IS NOT NULL AND participant1<>participant2
  AND (
    (participant1=auth.uid() AND user1_id=auth.uid() AND participant2=user2_id)
    OR (participant2=auth.uid() AND user2_id=auth.uid() AND participant1=user1_id)
  )
  AND NOT private.lbt_is_blocked_from(
    CASE WHEN participant1=auth.uid() THEN participant2 ELSE participant1 END
  )
  AND EXISTS (
    SELECT 1 FROM public.profiles target
    WHERE target.id=CASE WHEN participant1=auth.uid() THEN participant2 ELSE participant1 END
      AND COALESCE(target.allow_messages_from,'everyone')<>'nobody'
      AND (
        COALESCE(target.allow_messages_from,'everyone')<>'followers'
        OR private.lbt_follows_owner(target.id)
      )
  )
);

DROP POLICY IF EXISTS msg_insert_unified ON public.messages;
CREATE POLICY msg_insert_unified ON public.messages
FOR INSERT TO authenticated
WITH CHECK (
  sender_id=(SELECT auth.uid())
  AND EXISTS (
    SELECT 1 FROM public.conversations c
    WHERE c.id=messages.conversation_id
      AND (
        c.participant1=(SELECT auth.uid()) OR c.participant2=(SELECT auth.uid())
        OR c.user1_id=(SELECT auth.uid()) OR c.user2_id=(SELECT auth.uid())
      )
      AND NOT private.lbt_is_blocked_from(
        CASE
          WHEN c.participant1=(SELECT auth.uid()) THEN c.participant2
          WHEN c.participant2=(SELECT auth.uid()) THEN c.participant1
          WHEN c.user1_id=(SELECT auth.uid()) THEN c.user2_id
          ELSE c.user1_id
        END
      )
  )
);

DROP POLICY IF EXISTS msg_update_safe ON public.messages;
CREATE POLICY msg_update_safe ON public.messages
FOR UPDATE TO authenticated
USING (sender_id=(SELECT auth.uid()))
WITH CHECK (
  sender_id=(SELECT auth.uid())
  AND EXISTS (
    SELECT 1 FROM public.conversations c
    WHERE c.id=messages.conversation_id
      AND (
        c.participant1=(SELECT auth.uid()) OR c.participant2=(SELECT auth.uid())
        OR c.user1_id=(SELECT auth.uid()) OR c.user2_id=(SELECT auth.uid())
      )
  )
);

REVOKE UPDATE ON TABLE public.conversations FROM PUBLIC, anon, authenticated;
GRANT UPDATE (is_muted1,is_muted2) ON TABLE public.conversations TO authenticated;

DROP POLICY IF EXISTS mr_select ON public.message_reactions;
DROP POLICY IF EXISTS mr_insert ON public.message_reactions;
DROP POLICY IF EXISTS mr_delete ON public.message_reactions;
DROP POLICY IF EXISTS mr_update ON public.message_reactions;
CREATE POLICY mr_select ON public.message_reactions FOR SELECT TO authenticated
USING (EXISTS (SELECT 1 FROM public.messages m WHERE m.id=message_reactions.message_id));
CREATE POLICY mr_insert ON public.message_reactions FOR INSERT TO authenticated
WITH CHECK (
  user_id=(SELECT auth.uid())
  AND EXISTS (SELECT 1 FROM public.messages m WHERE m.id=message_reactions.message_id)
);
CREATE POLICY mr_delete ON public.message_reactions FOR DELETE TO authenticated
USING (user_id=(SELECT auth.uid()));
DROP POLICY IF EXISTS pr_select ON public.post_reactions;
DROP POLICY IF EXISTS pr_insert ON public.post_reactions;
DROP POLICY IF EXISTS pr_delete ON public.post_reactions;
DROP POLICY IF EXISTS pr_update ON public.post_reactions;
CREATE POLICY pr_select ON public.post_reactions FOR SELECT TO authenticated
USING (EXISTS (SELECT 1 FROM public.posts p WHERE p.id=post_reactions.post_id));
CREATE POLICY pr_insert ON public.post_reactions FOR INSERT TO authenticated
WITH CHECK (
  user_id=(SELECT auth.uid())
  AND emoji=ANY(ARRAY['❤️','😂','😮','😢','😡','🔥']::text[])
  AND EXISTS (SELECT 1 FROM public.posts p WHERE p.id=post_reactions.post_id)
);
CREATE POLICY pr_delete ON public.post_reactions FOR DELETE TO authenticated
USING (user_id=(SELECT auth.uid()));
CREATE POLICY pr_update ON public.post_reactions FOR UPDATE TO authenticated
USING (user_id=(SELECT auth.uid()))
WITH CHECK (user_id=(SELECT auth.uid()));

DROP POLICY IF EXISTS story_views_insert ON public.story_views;
DROP POLICY IF EXISTS sv_insert ON public.story_views;
DROP POLICY IF EXISTS story_views_select ON public.story_views;
DROP POLICY IF EXISTS sv_select ON public.story_views;
CREATE POLICY story_views_insert ON public.story_views FOR INSERT TO authenticated
WITH CHECK (viewer_id=(SELECT auth.uid()) AND private.lbt_can_view_story(story_id));
CREATE POLICY story_views_select ON public.story_views FOR SELECT TO authenticated
USING (
  viewer_id=(SELECT auth.uid())
  OR EXISTS (
    SELECT 1 FROM public.stories s
    WHERE s.id=story_views.story_id AND s.user_id=(SELECT auth.uid())
  )
);

DROP POLICY IF EXISTS reel_views_insert ON public.reel_views;
DROP POLICY IF EXISTS reel_views_select ON public.reel_views;
DROP POLICY IF EXISTS reel_views_del_safe ON public.reel_views;
CREATE POLICY reel_views_insert ON public.reel_views FOR INSERT TO authenticated
WITH CHECK (user_id=(SELECT auth.uid()) AND private.lbt_can_view_reel(reel_id));
CREATE POLICY reel_views_select ON public.reel_views FOR SELECT TO authenticated
USING (
  user_id=(SELECT auth.uid())
  OR EXISTS (SELECT 1 FROM public.reels r WHERE r.id=reel_views.reel_id AND r.user_id=(SELECT auth.uid()))
);
CREATE POLICY reel_views_del_safe ON public.reel_views FOR DELETE TO authenticated
USING (user_id=(SELECT auth.uid()));

DROP POLICY IF EXISTS typing_select ON public.typing_indicators;
CREATE POLICY typing_select ON public.typing_indicators FOR SELECT TO authenticated
USING (
  EXISTS (
    SELECT 1 FROM public.conversations c
    WHERE c.id=typing_indicators.conversation_id
      AND (
        c.participant1=(SELECT auth.uid()) OR c.participant2=(SELECT auth.uid())
        OR c.user1_id=(SELECT auth.uid()) OR c.user2_id=(SELECT auth.uid())
      )
      AND NOT private.lbt_is_blocked_from(
        CASE
          WHEN c.participant1=(SELECT auth.uid()) THEN c.participant2
          WHEN c.participant2=(SELECT auth.uid()) THEN c.participant1
          WHEN c.user1_id=(SELECT auth.uid()) THEN c.user2_id
          ELSE c.user1_id
        END
      )
  )
);

DROP POLICY IF EXISTS notif_insert_safe ON public.notifications;
CREATE POLICY notif_insert_safe ON public.notifications FOR INSERT TO authenticated
WITH CHECK (
  actor_id=(SELECT auth.uid())
  AND recipient_id IS NOT NULL
  AND recipient_id<>(SELECT auth.uid())
  AND NOT private.lbt_is_blocked_from(recipient_id)
);

CREATE OR REPLACE FUNCTION public.get_explore(p_limit integer DEFAULT 30,p_offset integer DEFAULT 0)
RETURNS TABLE(id uuid,user_id uuid,caption text,media_urls text[],media_type text,likes_count integer,comments_count integer,views_count integer,created_at timestamptz,profiles jsonb)
LANGUAGE sql STABLE SECURITY INVOKER SET search_path=pg_catalog,public
AS $function$
  SELECT p.id,p.user_id,p.caption,p.media_urls,p.media_type,
    COALESCE(p.likes_count,0)::integer,COALESCE(p.comments_count,0)::integer,
    COALESCE(p.views_count,0)::integer,p.created_at,
    jsonb_build_object('id',pr.id,'username',pr.username,'display_name',COALESCE(pr.display_name,pr.username),
      'avatar_url',pr.avatar_url,'is_verified',COALESCE(pr.is_verified,false))
  FROM public.posts p JOIN public.profiles pr ON pr.id=p.user_id
  WHERE p.media_urls IS NOT NULL AND cardinality(p.media_urls)>0
    AND COALESCE(p.is_archived,false)=false
  ORDER BY (COALESCE(p.likes_count,0)*2+COALESCE(p.views_count,0)) DESC,p.created_at DESC
  LIMIT GREATEST(0,LEAST(COALESCE(p_limit,30),100)) OFFSET GREATEST(0,COALESCE(p_offset,0));
$function$;

CREATE OR REPLACE FUNCTION public.get_profile_posts(p_profile_id uuid,p_viewer_id uuid DEFAULT NULL,p_limit integer DEFAULT 12,p_offset integer DEFAULT 0)
RETURNS SETOF json LANGUAGE sql STABLE SECURITY INVOKER SET search_path=pg_catalog,public
AS $function$
  SELECT row_to_json(t) FROM (
    SELECT p.*,row_to_json(pr.*) AS profiles,
      EXISTS(SELECT 1 FROM public.likes l WHERE l.post_id=p.id AND l.user_id=auth.uid()) AS has_liked,
      EXISTS(SELECT 1 FROM public.saved_posts s WHERE s.post_id=p.id AND s.user_id=auth.uid()) AS has_bookmarked
    FROM public.posts p JOIN public.profiles pr ON pr.id=p.user_id
    WHERE p.user_id=p_profile_id AND (p_viewer_id IS NULL OR p_viewer_id=auth.uid())
      AND COALESCE(p.is_archived,false)=false
    ORDER BY p.created_at DESC
    LIMIT GREATEST(0,LEAST(COALESCE(p_limit,12),100)) OFFSET GREATEST(0,COALESCE(p_offset,0))
  ) t;
$function$;

CREATE OR REPLACE FUNCTION public.get_posts_by_hashtag(p_tag text,p_limit integer DEFAULT 20,p_offset integer DEFAULT 0)
RETURNS TABLE(id uuid,user_id uuid,caption text,image_url text,media_urls text[],media_type text,tags text[],likes_count integer,comments_count integer,created_at timestamptz,username text,display_name text,avatar_url text)
LANGUAGE sql STABLE SECURITY INVOKER SET search_path=pg_catalog,public
AS $function$
  SELECT p.id,p.user_id,p.caption,p.image_url,p.media_urls,p.media_type,p.tags,
    COALESCE(p.likes_count,0)::integer,COALESCE(p.comments_count,0)::integer,p.created_at,
    pr.username,COALESCE(pr.display_name,pr.username),pr.avatar_url
  FROM public.posts p JOIN public.profiles pr ON pr.id=p.user_id
  WHERE p.tags @> ARRAY[p_tag] AND COALESCE(p.is_archived,false)=false
  ORDER BY p.created_at DESC
  LIMIT GREATEST(0,LEAST(COALESCE(p_limit,20),100)) OFFSET GREATEST(0,COALESCE(p_offset,0));
$function$;

CREATE OR REPLACE FUNCTION public.get_post_reactions(p_post_id uuid)
RETURNS json LANGUAGE sql STABLE SECURITY INVOKER SET search_path=pg_catalog,public
AS $function$
  SELECT json_object_agg(emoji,cnt)
  FROM (SELECT pr.emoji,COUNT(*) AS cnt FROM public.post_reactions pr WHERE pr.post_id=p_post_id GROUP BY pr.emoji) t;
$function$;

ALTER FUNCTION public.toggle_post_reaction(uuid,text) SECURITY INVOKER;
ALTER FUNCTION public.toggle_post_reaction(uuid,text) SET search_path=pg_catalog,public;

CREATE OR REPLACE FUNCTION public.get_unread_messages_count(p_user_id uuid)
RETURNS integer LANGUAGE sql STABLE SECURITY INVOKER SET search_path=pg_catalog,public
AS $function$
  SELECT COALESCE(SUM(CASE
    WHEN c.user1_id=auth.uid() OR c.participant1=auth.uid() THEN COALESCE(c.unread_count1,0)
    WHEN c.user2_id=auth.uid() OR c.participant2=auth.uid() THEN COALESCE(c.unread_count2,0)
    ELSE 0 END),0)::integer
  FROM public.conversations c
  WHERE auth.uid() IS NOT NULL AND p_user_id=auth.uid()
    AND (c.user1_id=auth.uid() OR c.user2_id=auth.uid() OR c.participant1=auth.uid() OR c.participant2=auth.uid());
$function$;

CREATE OR REPLACE FUNCTION public.get_notifications(p_limit integer DEFAULT 30,p_offset integer DEFAULT 0)
RETURNS TABLE(id uuid,type text,is_read boolean,created_at timestamptz,content text,action_url text,image_url text,post_id uuid,actor_id uuid,recipient_id uuid,profiles jsonb)
LANGUAGE plpgsql SECURITY INVOKER SET search_path=pg_catalog,public
AS $function$
BEGIN
  IF auth.uid() IS NULL THEN RAISE EXCEPTION 'Not authenticated'; END IF;
  RETURN QUERY SELECT n.id,n.type,n.is_read,n.created_at,n.content,n.action_url,n.image_url,n.post_id,n.actor_id,n.recipient_id,
    CASE WHEN pr.id IS NOT NULL THEN jsonb_build_object(
      'id',pr.id,'username',pr.username,'display_name',COALESCE(pr.display_name,pr.username),
      'avatar_url',pr.avatar_url,'is_verified',COALESCE(pr.is_verified,false),'name',COALESCE(pr.display_name,pr.username)
    ) ELSE NULL END
  FROM public.notifications n LEFT JOIN public.profiles pr ON pr.id=n.actor_id
  WHERE n.recipient_id=auth.uid()
  ORDER BY n.created_at DESC
  LIMIT GREATEST(0,LEAST(COALESCE(p_limit,30),100)) OFFSET GREATEST(0,COALESCE(p_offset,0));
END;
$function$;

CREATE OR REPLACE FUNCTION public.get_post_insights(p_post_id uuid)
RETURNS json LANGUAGE sql STABLE SECURITY DEFINER SET search_path=pg_catalog,public
AS $function$
  SELECT json_build_object('likes',COALESCE(p.likes_count,0),'comments',COALESCE(p.comments_count,0),
    'shares',COALESCE(p.shares_count,0),'views',COALESCE(p.views_count,0),
    'saves',(SELECT COUNT(*) FROM public.saved_posts sp WHERE sp.post_id=p.id),
    'reach',(SELECT COUNT(DISTINCT sv.viewer_id) FROM public.story_views sv JOIN public.stories s ON s.id=sv.story_id WHERE s.user_id=p.user_id))
  FROM public.posts p WHERE p.id=p_post_id AND auth.uid() IS NOT NULL AND p.user_id=auth.uid();
$function$;

CREATE OR REPLACE FUNCTION public.get_suggested_users(p_user_id uuid,p_limit integer DEFAULT 10)
RETURNS TABLE(id uuid,username text,display_name text,avatar_url text,is_verified boolean,followers_count integer,mutual_count bigint)
LANGUAGE sql STABLE SECURITY DEFINER SET search_path=pg_catalog,public
AS $function$
  SELECT p.id,p.username,COALESCE(p.display_name,p.username),p.avatar_url,
    COALESCE(p.is_verified,false),COALESCE(p.followers_count,0),COUNT(DISTINCT mf.follower_id)
  FROM public.profiles p
  LEFT JOIN public.follows mf ON mf.following_id=p.id
    AND mf.follower_id IN (SELECT f.following_id FROM public.follows f WHERE f.follower_id=auth.uid())
  WHERE auth.uid() IS NOT NULL AND p_user_id=auth.uid() AND p.id<>auth.uid()
    AND NOT private.lbt_is_blocked_from(p.id)
    AND NOT EXISTS (SELECT 1 FROM public.follows f WHERE f.follower_id=auth.uid() AND f.following_id=p.id)
    AND COALESCE(p.is_private,false)=false
  GROUP BY p.id,p.username,p.display_name,p.avatar_url,p.is_verified,p.followers_count
  ORDER BY COUNT(DISTINCT mf.follower_id) DESC,p.followers_count DESC
  LIMIT GREATEST(0,LEAST(COALESCE(p_limit,10),50));
$function$;

CREATE OR REPLACE FUNCTION public.search_profiles(q text,lim integer DEFAULT 20)
RETURNS TABLE(id uuid,username text,display_name text,avatar_url text,is_verified boolean,followers_count integer,is_private boolean)
LANGUAGE sql STABLE SECURITY DEFINER SET search_path=pg_catalog,public
AS $function$
  SELECT p.id,p.username,p.display_name,p.avatar_url,p.is_verified,p.followers_count,p.is_private
  FROM public.profiles p
  WHERE auth.uid() IS NOT NULL
    AND (p.username ILIKE '%'||q||'%' OR p.display_name ILIKE '%'||q||'%')
    AND p.id<>auth.uid() AND NOT private.lbt_is_blocked_from(p.id)
  ORDER BY p.followers_count DESC NULLS LAST
  LIMIT GREATEST(0,LEAST(COALESCE(lim,20),50));
$function$;

CREATE OR REPLACE FUNCTION public.search_all(q text,p_user_id uuid DEFAULT NULL)
RETURNS json LANGUAGE plpgsql SECURITY DEFINER SET search_path=pg_catalog,public
AS $function$
DECLARE v_profiles json; v_posts json; v_hashtags json; safe_q text;
BEGIN
  IF auth.uid() IS NULL OR (p_user_id IS NOT NULL AND p_user_id<>auth.uid()) THEN
    RAISE EXCEPTION 'Not authorized to search for another user';
  END IF;
  safe_q := '%' || replace(replace(replace(q, E'\\', E'\\\\'), '%', E'\\%'), '_', E'\\_') || '%';

  SELECT json_agg(row_to_json(r)) INTO v_profiles FROM (
    SELECT pr.id,pr.username,pr.display_name,pr.full_name,pr.avatar_url,pr.is_verified,pr.followers_count,pr.is_private
    FROM public.profiles pr
    WHERE (pr.username ILIKE safe_q ESCAPE E'\\' OR pr.full_name ILIKE safe_q ESCAPE E'\\' OR COALESCE(pr.display_name,'') ILIKE safe_q ESCAPE E'\\')
      AND pr.id<>auth.uid() AND NOT private.lbt_is_blocked_from(pr.id)
    LIMIT 10
  ) r;

  SELECT json_agg(row_to_json(r)) INTO v_posts FROM (
    SELECT p.id,p.caption,p.media_urls,p.media_type,p.likes_count,p.created_at,pr.username,pr.avatar_url
    FROM public.posts p JOIN public.profiles pr ON pr.id=p.user_id
    WHERE p.caption ILIKE safe_q ESCAPE E'\\' AND p.visibility='public'
      AND COALESCE(p.close_friends_only,false)=false
      AND COALESCE(pr.is_private,false)=false
      AND COALESCE(p.is_archived,false)=false
      AND NOT private.lbt_is_blocked_from(p.user_id)
    LIMIT 20
  ) r;

  SELECT json_agg(row_to_json(r)) INTO v_hashtags FROM (
    SELECT h.id,h.name,h.posts_count FROM public.hashtags h
    WHERE h.name ILIKE safe_q ESCAPE E'\\' ORDER BY h.posts_count DESC LIMIT 10
  ) r;

  RETURN json_build_object('profiles',COALESCE(v_profiles,'[]'::json),'posts',COALESCE(v_posts,'[]'::json),'hashtags',COALESCE(v_hashtags,'[]'::json));
END;
$function$;

CREATE OR REPLACE FUNCTION public.get_or_create_conversation(p_other_user_id uuid)
RETURNS uuid LANGUAGE plpgsql SECURITY DEFINER SET search_path=pg_catalog,public
AS $function$
DECLARE v_conv_id uuid; v_user_id uuid:=auth.uid(); v_allow_messages text; v_p1 uuid; v_p2 uuid;
BEGIN
  IF v_user_id IS NULL THEN RAISE EXCEPTION 'Not authenticated'; END IF;
  IF p_other_user_id IS NULL OR p_other_user_id=v_user_id THEN RAISE EXCEPTION 'Invalid conversation target'; END IF;
  IF private.lbt_is_blocked_from(p_other_user_id) THEN RAISE EXCEPTION 'Messaging is unavailable for this account'; END IF;
  SELECT COALESCE(allow_messages_from,'everyone') INTO v_allow_messages FROM public.profiles WHERE id=p_other_user_id;
  IF NOT FOUND THEN RAISE EXCEPTION 'Conversation target does not exist'; END IF;
  IF v_allow_messages='nobody' OR (v_allow_messages='followers' AND NOT private.lbt_follows_owner(p_other_user_id)) THEN
    RAISE EXCEPTION 'This account does not accept messages from you';
  END IF;
  IF v_user_id<p_other_user_id THEN v_p1:=v_user_id; v_p2:=p_other_user_id;
  ELSE v_p1:=p_other_user_id; v_p2:=v_user_id; END IF;
  SELECT c.id INTO v_conv_id FROM public.conversations c
  WHERE (c.participant1=v_p1 AND c.participant2=v_p2) OR (c.user1_id=v_p1 AND c.user2_id=v_p2)
  LIMIT 1;
  IF v_conv_id IS NULL THEN
    INSERT INTO public.conversations(participant1,participant2,user1_id,user2_id)
    VALUES(v_p1,v_p2,v_p1,v_p2) RETURNING id INTO v_conv_id;
  END IF;
  RETURN v_conv_id;
END;
$function$;

CREATE OR REPLACE FUNCTION public.block_user(p_blocked_id uuid)
RETURNS void LANGUAGE plpgsql SECURITY DEFINER SET search_path=pg_catalog,public
AS $function$
DECLARE v_user_id uuid:=auth.uid();
BEGIN
  IF v_user_id IS NULL THEN RAISE EXCEPTION 'Not authenticated'; END IF;
  IF p_blocked_id IS NULL OR p_blocked_id=v_user_id THEN RAISE EXCEPTION 'Invalid block target'; END IF;
  IF NOT EXISTS(SELECT 1 FROM public.profiles p WHERE p.id=p_blocked_id) THEN RAISE EXCEPTION 'Block target does not exist'; END IF;
  DELETE FROM public.follows WHERE (follower_id=v_user_id AND following_id=p_blocked_id) OR (follower_id=p_blocked_id AND following_id=v_user_id);
  DELETE FROM public.follow_requests WHERE (requester_id=v_user_id AND target_id=p_blocked_id) OR (requester_id=p_blocked_id AND target_id=v_user_id);
  INSERT INTO public.user_blocks(blocker_id,blocked_id) VALUES(v_user_id,p_blocked_id) ON CONFLICT DO NOTHING;
END;
$function$;

CREATE OR REPLACE FUNCTION public.mark_messages_read(p_conversation_id uuid)
RETURNS void LANGUAGE plpgsql SECURITY DEFINER SET search_path=pg_catalog,public
AS $function$
DECLARE v_user_id uuid:=auth.uid();
BEGIN
  IF v_user_id IS NULL THEN RAISE EXCEPTION 'Not authenticated'; END IF;
  IF NOT EXISTS(SELECT 1 FROM public.conversations c WHERE c.id=p_conversation_id
    AND (c.participant1=v_user_id OR c.participant2=v_user_id OR c.user1_id=v_user_id OR c.user2_id=v_user_id)) THEN
    RAISE EXCEPTION 'Not authorized for this conversation';
  END IF;
  UPDATE public.messages m SET is_read=true,is_seen=true,read_at=COALESCE(m.read_at,now())
  WHERE m.conversation_id=p_conversation_id AND m.sender_id<>v_user_id AND COALESCE(m.is_read,false)=false;
  UPDATE public.conversations c
  SET unread_count1=CASE WHEN c.participant1=v_user_id OR c.user1_id=v_user_id THEN 0 ELSE c.unread_count1 END,
      unread_count2=CASE WHEN c.participant2=v_user_id OR c.user2_id=v_user_id THEN 0 ELSE c.unread_count2 END
  WHERE c.id=p_conversation_id
    AND (c.participant1=v_user_id OR c.participant2=v_user_id OR c.user1_id=v_user_id OR c.user2_id=v_user_id);
END;
$function$;

CREATE OR REPLACE FUNCTION public.mark_messages_seen(p_conversation_id uuid)
RETURNS void LANGUAGE plpgsql SECURITY DEFINER SET search_path=pg_catalog,public
AS $function$
DECLARE v_user_id uuid:=auth.uid();
BEGIN
  IF v_user_id IS NULL THEN RAISE EXCEPTION 'Not authenticated'; END IF;
  IF NOT EXISTS(SELECT 1 FROM public.conversations c WHERE c.id=p_conversation_id
    AND (c.participant1=v_user_id OR c.participant2=v_user_id OR c.user1_id=v_user_id OR c.user2_id=v_user_id)) THEN
    RAISE EXCEPTION 'Not authorized for this conversation';
  END IF;
  UPDATE public.messages m SET is_seen=true
  WHERE m.conversation_id=p_conversation_id AND m.sender_id<>v_user_id AND COALESCE(m.is_seen,false)=false;
END;
$function$;

CREATE OR REPLACE FUNCTION public.reset_unread_for_user(p_conversation_id uuid,p_user_id uuid)
RETURNS void LANGUAGE sql SECURITY DEFINER SET search_path=pg_catalog,public
AS $function$
  UPDATE public.conversations c
  SET unread_count1=CASE WHEN c.user1_id=auth.uid() OR c.participant1=auth.uid() THEN 0 ELSE c.unread_count1 END,
      unread_count2=CASE WHEN c.user2_id=auth.uid() OR c.participant2=auth.uid() THEN 0 ELSE c.unread_count2 END
  WHERE auth.uid() IS NOT NULL AND p_user_id=auth.uid() AND c.id=p_conversation_id
    AND (c.user1_id=auth.uid() OR c.user2_id=auth.uid() OR c.participant1=auth.uid() OR c.participant2=auth.uid());
$function$;

CREATE OR REPLACE FUNCTION public.save_permission_state(p_mic text DEFAULT NULL,p_camera text DEFAULT NULL,p_notif text DEFAULT NULL)
RETURNS void LANGUAGE plpgsql SECURITY INVOKER SET search_path=pg_catalog,public
AS $function$
BEGIN
  IF auth.uid() IS NULL THEN RAISE EXCEPTION 'Not authenticated'; END IF;
  IF (p_mic IS NOT NULL AND p_mic NOT IN ('granted','denied','prompt'))
    OR (p_camera IS NOT NULL AND p_camera NOT IN ('granted','denied','prompt'))
    OR (p_notif IS NOT NULL AND p_notif NOT IN ('granted','denied','prompt')) THEN
    RAISE EXCEPTION 'Invalid permission state';
  END IF;
  UPDATE public.profiles SET mic_permission=COALESCE(p_mic,mic_permission),
    camera_permission=COALESCE(p_camera,camera_permission),notif_permission=COALESCE(p_notif,notif_permission)
  WHERE id=auth.uid();
END;
$function$;

ALTER FUNCTION public.update_user_presence(boolean) SECURITY INVOKER;
ALTER FUNCTION public.update_user_presence(boolean) SET search_path=pg_catalog,public;

CREATE OR REPLACE FUNCTION public.increment_post_views(p_post_id uuid)
RETURNS void LANGUAGE plpgsql SECURITY DEFINER SET search_path=pg_catalog,public
AS $function$
BEGIN
  IF auth.uid() IS NULL THEN RAISE EXCEPTION 'Not authenticated'; END IF;
  UPDATE public.posts SET views_count=COALESCE(views_count,0)+1
  WHERE id=p_post_id AND private.lbt_can_view_post(p_post_id);
END;
$function$;

CREATE OR REPLACE FUNCTION public.increment_reel_views(p_reel_id uuid)
RETURNS void LANGUAGE plpgsql SECURITY DEFINER SET search_path=pg_catalog,public
AS $function$
BEGIN
  IF auth.uid() IS NULL THEN RAISE EXCEPTION 'Not authenticated'; END IF;
  INSERT INTO public.reel_views(reel_id,user_id)
  SELECT r.id,auth.uid() FROM public.reels r
  WHERE r.id=p_reel_id AND private.lbt_can_view_reel(p_reel_id)
  ON CONFLICT(reel_id,user_id) DO NOTHING;
END;
$function$;

CREATE OR REPLACE FUNCTION public.increment_story_views(p_story_id uuid)
RETURNS void LANGUAGE plpgsql SECURITY DEFINER SET search_path=pg_catalog,public
AS $function$
BEGIN
  IF auth.uid() IS NULL THEN RAISE EXCEPTION 'Not authenticated'; END IF;
  INSERT INTO public.story_views(story_id,viewer_id)
  SELECT s.id,auth.uid() FROM public.stories s
  WHERE s.id=p_story_id AND private.lbt_can_view_story(p_story_id)
  ON CONFLICT ON CONSTRAINT story_views_story_viewer_unique DO NOTHING;
END;
$function$;

REVOKE ALL ON FUNCTION public.increment_post_views(uuid) FROM PUBLIC,anon;
REVOKE ALL ON FUNCTION public.increment_reel_views(uuid) FROM PUBLIC,anon;
REVOKE ALL ON FUNCTION public.increment_story_views(uuid) FROM PUBLIC,anon;
GRANT EXECUTE ON FUNCTION public.increment_post_views(uuid) TO authenticated;
GRANT EXECUTE ON FUNCTION public.increment_reel_views(uuid) TO authenticated;
GRANT EXECUTE ON FUNCTION public.increment_story_views(uuid) TO authenticated;

DROP TRIGGER IF EXISTS on_message_unread ON public.messages;
DROP TRIGGER IF EXISTS trg_increment_unread ON public.messages;

CREATE OR REPLACE FUNCTION public.handle_new_message()
RETURNS trigger LANGUAGE plpgsql SECURITY DEFINER SET search_path=pg_catalog,public
AS $function$
BEGIN
  UPDATE public.conversations c
  SET last_message=CASE
      WHEN NEW.content IS NOT NULL AND NEW.content<>'' THEN LEFT(NEW.content,100)
      WHEN NEW.media_type='image' THEN '📷 صورة'
      WHEN NEW.media_type='video' THEN '🎥 فيديو'
      WHEN NEW.media_type='audio' THEN '🎵 صوت'
      ELSE '📎 مرفق' END,
    last_message_at=NEW.created_at,
    unread_count1=CASE WHEN c.participant1<>NEW.sender_id THEN COALESCE(c.unread_count1,0)+1 ELSE c.unread_count1 END,
    unread_count2=CASE WHEN c.participant2<>NEW.sender_id THEN COALESCE(c.unread_count2,0)+1 ELSE c.unread_count2 END
  WHERE c.id=NEW.conversation_id
    AND (c.participant1=NEW.sender_id OR c.participant2=NEW.sender_id OR c.user1_id=NEW.sender_id OR c.user2_id=NEW.sender_id);
  RETURN NEW;
END;
$function$;

CREATE OR REPLACE FUNCTION public.update_msg_reactions_count()
RETURNS trigger LANGUAGE plpgsql SECURITY DEFINER SET search_path=pg_catalog,public
AS $function$
BEGIN
  IF TG_OP='INSERT' THEN
    UPDATE public.messages SET reactions_count=COALESCE(reactions_count,0)+1 WHERE id=NEW.message_id;
  ELSIF TG_OP='DELETE' THEN
    UPDATE public.messages SET reactions_count=GREATEST(0,COALESCE(reactions_count,0)-1) WHERE id=OLD.message_id;
  END IF;
  RETURN NULL;
END;
$function$;

CREATE OR REPLACE FUNCTION public.fn_story_view_count()
RETURNS trigger LANGUAGE plpgsql SECURITY DEFINER SET search_path=pg_catalog,public
AS $function$
BEGIN
  UPDATE public.stories SET views_count=COALESCE(views_count,0)+1 WHERE id=NEW.story_id;
  RETURN NEW;
END;
$function$;

CREATE OR REPLACE FUNCTION public.update_reel_views_count()
RETURNS trigger LANGUAGE plpgsql SECURITY DEFINER SET search_path=pg_catalog,public
AS $function$
BEGIN
  IF TG_OP='INSERT' THEN
    UPDATE public.reels SET views_count=COALESCE(views_count,0)+1 WHERE id=NEW.reel_id;
  END IF;
  RETURN NULL;
END;
$function$;

ALTER FUNCTION public.get_post_insights(uuid) SET search_path=pg_catalog,public;
ALTER FUNCTION public.get_suggested_users(uuid,integer) SET search_path=pg_catalog,public;
ALTER FUNCTION public.search_profiles(text,integer) SET search_path=pg_catalog,public;
ALTER FUNCTION public.search_all(text,uuid) SET search_path=pg_catalog,public;
ALTER FUNCTION public.get_or_create_conversation(uuid) SET search_path=pg_catalog,public;
ALTER FUNCTION public.block_user(uuid) SET search_path=pg_catalog,public;
ALTER FUNCTION public.mark_messages_read(uuid) SET search_path=pg_catalog,public;
ALTER FUNCTION public.mark_messages_seen(uuid) SET search_path=pg_catalog,public;
ALTER FUNCTION public.reset_unread_for_user(uuid,uuid) SET search_path=pg_catalog,public;

REVOKE UPDATE ON TABLE public.messages FROM PUBLIC,anon,authenticated;
GRANT UPDATE ON TABLE public.messages TO authenticated;
REVOKE UPDATE ON TABLE public.conversations FROM PUBLIC,anon,authenticated;
GRANT UPDATE (is_muted1,is_muted2) ON TABLE public.conversations TO authenticated;
