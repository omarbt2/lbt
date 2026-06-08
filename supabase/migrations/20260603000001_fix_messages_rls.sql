-- ============================================================
-- FIX: Messages table RLS policy
-- Drop broken "msg_select" and recreate using conversations subquery
-- ============================================================

-- Drop the potentially broken policy
DROP POLICY IF EXISTS "msg_select" ON public.messages;
DROP POLICY IF EXISTS "read_conversation_messages" ON public.messages;
DROP POLICY IF EXISTS "Participants can read messages in their chats" ON public.messages;

-- Recreate clean policy using conversations subquery only
CREATE POLICY "msg_select" ON public.messages
  FOR SELECT TO authenticated
  USING (
    conversation_id IN (
      SELECT id FROM public.conversations
      WHERE user1_id = auth.uid() OR user2_id = auth.uid()
    )
  );

-- Ensure insert policy exists
DROP POLICY IF EXISTS "msg_insert" ON public.messages;
DROP POLICY IF EXISTS "insert_own_messages" ON public.messages;
DROP POLICY IF EXISTS "Participants can insert messages in their chats" ON public.messages;

CREATE POLICY "msg_insert" ON public.messages
  FOR INSERT TO authenticated
  WITH CHECK (auth.uid() = sender_id);
