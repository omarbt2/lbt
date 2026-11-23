-- Derived post metadata is maintained by trusted triggers, not by client grants.
CREATE OR REPLACE FUNCTION public.on_new_post_update_explore()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = pg_catalog,public
AS $function$
BEGIN
  INSERT INTO public.explore_feed(post_id,score,category,updated_at)
  VALUES(NEW.id,0,COALESCE(NEW.category,'General'),now())
  ON CONFLICT DO NOTHING;
  RETURN NEW;
END;
$function$;

CREATE OR REPLACE FUNCTION public.sync_post_hashtags()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = pg_catalog,public
AS $function$
DECLARE
  v_tag text;
  v_tag_id uuid;
  v_affected_tag_ids uuid[] := ARRAY[]::uuid[];
BEGIN
  IF TG_OP='UPDATE' THEN
    SELECT COALESCE(array_agg(ph.hashtag_id),ARRAY[]::uuid[])
      INTO v_affected_tag_ids
    FROM public.post_hashtags ph
    WHERE ph.post_id=NEW.id;

    DELETE FROM public.post_hashtags
    WHERE post_id=NEW.id;
  END IF;

  FOR v_tag IN
    SELECT DISTINCT lower(regexp_replace(m[1],'[^[:alnum:]_]+','','g'))
    FROM regexp_matches(
      COALESCE(NEW.caption,''),
      '#([^[:space:]#،,\.!?؟]+)',
      'g'
    ) AS matches(m)
    WHERE length(m[1])>=2
  LOOP
    INSERT INTO public.hashtags(name,posts_count)
    VALUES(v_tag,0)
    ON CONFLICT(name) DO NOTHING;

    SELECT h.id INTO v_tag_id
    FROM public.hashtags h
    WHERE h.name=v_tag;

    INSERT INTO public.post_hashtags(post_id,hashtag_id)
    VALUES(NEW.id,v_tag_id)
    ON CONFLICT DO NOTHING;

    v_affected_tag_ids := array_append(v_affected_tag_ids,v_tag_id);
  END LOOP;

  IF cardinality(v_affected_tag_ids)>0 THEN
    UPDATE public.hashtags h
    SET posts_count=(
      SELECT count(*)::integer
      FROM public.post_hashtags ph
      WHERE ph.hashtag_id=h.id
    )
    WHERE h.id=ANY(v_affected_tag_ids);
  END IF;

  RETURN NEW;
END;
$function$;

DROP TRIGGER IF EXISTS trg_hashtags_on_post ON public.posts;

REVOKE ALL ON FUNCTION public.on_new_post_update_explore() FROM PUBLIC,anon,authenticated;
REVOKE ALL ON FUNCTION public.sync_post_hashtags() FROM PUBLIC,anon,authenticated;
REVOKE ALL ON FUNCTION public.extract_and_link_hashtags() FROM PUBLIC,anon,authenticated;
REVOKE ALL ON FUNCTION public.handle_posts_count() FROM PUBLIC,anon,authenticated;
REVOKE ALL ON FUNCTION public.notify_collab_invite() FROM PUBLIC,anon,authenticated;
REVOKE ALL ON FUNCTION public.increment_reposts_count() FROM PUBLIC,anon,authenticated;
REVOKE ALL ON FUNCTION public.update_shares_count() FROM PUBLIC,anon,authenticated;
REVOKE ALL ON FUNCTION public.set_updated_at() FROM PUBLIC,anon,authenticated;

UPDATE public.hashtags h
SET posts_count=(
  SELECT count(*)::integer
  FROM public.post_hashtags ph
  WHERE ph.hashtag_id=h.id
);
