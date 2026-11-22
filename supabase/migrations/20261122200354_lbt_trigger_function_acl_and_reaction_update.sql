-- Add owner-only UPDATE policy for message reaction upserts, then remove
-- Data API EXECUTE permission from trigger-only privileged functions.
CREATE POLICY mr_update
  ON public.message_reactions
  FOR UPDATE TO authenticated
  USING (user_id = (SELECT auth.uid()))
  WITH CHECK (user_id = (SELECT auth.uid()));

REVOKE ALL ON FUNCTION public.fn_story_view_count() FROM PUBLIC, anon, authenticated;
REVOKE ALL ON FUNCTION public.handle_new_message() FROM PUBLIC, anon, authenticated;
REVOKE ALL ON FUNCTION public.update_msg_reactions_count() FROM PUBLIC, anon, authenticated;
REVOKE ALL ON FUNCTION public.update_reel_views_count() FROM PUBLIC, anon, authenticated;
