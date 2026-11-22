-- Final version of private-follow acceptance and block-aware message reads.

CREATE OR REPLACE FUNCTION private.lbt_pair_is_blocked(p_user_a uuid,p_user_b uuid)
RETURNS boolean
LANGUAGE sql STABLE SECURITY DEFINER
SET search_path = pg_catalog
AS $function$
  SELECT EXISTS (
    SELECT 1 FROM public.user_blocks b
    WHERE (b.blocker_id=p_user_a AND b.blocked_id=p_user_b)
       OR (b.blocker_id=p_user_b AND b.blocked_id=p_user_a)
  );
$function$;

REVOKE ALL ON FUNCTION private.lbt_pair_is_blocked(uuid,uuid) FROM PUBLIC,anon;
GRANT EXECUTE ON FUNCTION private.lbt_pair_is_blocked(uuid,uuid) TO authenticated;

DROP POLICY IF EXISTS follows_insert_own ON public.follows;
CREATE POLICY follows_insert_own
ON public.follows
FOR INSERT TO authenticated
WITH CHECK (
  follower_id<>following_id
  AND NOT private.lbt_pair_is_blocked(follower_id,following_id)
  AND (
    (
      follower_id=(SELECT auth.uid())
      AND NOT private.lbt_profile_is_private(following_id)
    )
    OR
    (
      following_id=(SELECT auth.uid())
      AND EXISTS (
        SELECT 1 FROM public.follow_requests fr
        WHERE fr.requester_id=follower_id
          AND fr.target_id=(SELECT auth.uid())
          AND fr.status='accepted'
      )
    )
  )
);

DROP POLICY IF EXISTS fr_insert ON public.follow_requests;
CREATE POLICY fr_insert
ON public.follow_requests
FOR INSERT TO authenticated
WITH CHECK (
  requester_id=(SELECT auth.uid())
  AND target_id<>requester_id
  AND private.lbt_profile_is_private(target_id)
  AND NOT private.lbt_pair_is_blocked(requester_id,target_id)
);

DROP POLICY IF EXISTS conv_select_final ON public.conversations;
CREATE POLICY conv_select_final
ON public.conversations
FOR SELECT TO authenticated
USING (
  (
    participant1=(SELECT auth.uid()) OR participant2=(SELECT auth.uid())
    OR user1_id=(SELECT auth.uid()) OR user2_id=(SELECT auth.uid())
  )
  AND NOT private.lbt_pair_is_blocked(
    (SELECT auth.uid()),
    CASE
      WHEN participant1=(SELECT auth.uid()) THEN participant2
      WHEN participant2=(SELECT auth.uid()) THEN participant1
      WHEN user1_id=(SELECT auth.uid()) THEN user2_id
      ELSE user1_id
    END
  )
);

DROP POLICY IF EXISTS msg_select_unified ON public.messages;
CREATE POLICY msg_select_unified
ON public.messages
FOR SELECT TO authenticated
USING (
  EXISTS (
    SELECT 1 FROM public.conversations c
    WHERE c.id=messages.conversation_id
      AND (
        c.participant1=(SELECT auth.uid()) OR c.participant2=(SELECT auth.uid())
        OR c.user1_id=(SELECT auth.uid()) OR c.user2_id=(SELECT auth.uid())
      )
      AND NOT private.lbt_pair_is_blocked(
        (SELECT auth.uid()),
        CASE
          WHEN c.participant1=(SELECT auth.uid()) THEN c.participant2
          WHEN c.participant2=(SELECT auth.uid()) THEN c.participant1
          WHEN c.user1_id=(SELECT auth.uid()) THEN c.user2_id
          ELSE c.user1_id
        END
      )
  )
);

REVOKE UPDATE ON TABLE public.follow_requests FROM PUBLIC,anon,authenticated;
GRANT UPDATE(status) ON TABLE public.follow_requests TO authenticated;
