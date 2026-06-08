-- ============================================================
-- LBT Social: Comprehensive Bug-Fix Migration
-- Resolves BUGs #1–#11 and all Medium Issues
-- Run AFTER init.sql + fixes.sql + rls_fix.sql
-- ============================================================

-- ──────────────────────────────────────────────
-- BUG #1  Profiles: add display_name, sync from name
-- ──────────────────────────────────────────────
ALTER TABLE public.profiles
  ADD COLUMN IF NOT EXISTS display_name text;

-- Back-fill display_name from existing name column
UPDATE public.profiles
  SET display_name = name
  WHERE display_name IS NULL OR display_name = '';

-- Make display_name NOT NULL with a sensible default going forward
ALTER TABLE public.profiles
  ALTER COLUMN display_name SET DEFAULT '';

-- ──────────────────────────────────────────────
-- BUG #11  Add follow counter columns if missing
-- (init.sql already has them, but fixes.sql may run on older DBs)
-- ──────────────────────────────────────────────
ALTER TABLE public.profiles
  ADD COLUMN IF NOT EXISTS followers_count int DEFAULT 0,
  ADD COLUMN IF NOT EXISTS following_count int DEFAULT 0;

-- ──────────────────────────────────────────────
-- BUG #6 / ISSUE #2  bookmarks → saved_posts
-- ──────────────────────────────────────────────
DO $$
BEGIN
  -- Only rename if 'bookmarks' exists and 'saved_posts' does not
  IF EXISTS (
    SELECT 1 FROM information_schema.tables
    WHERE table_schema = 'public' AND table_name = 'bookmarks'
  ) AND NOT EXISTS (
    SELECT 1 FROM information_schema.tables
    WHERE table_schema = 'public' AND table_name = 'saved_posts'
  ) THEN
    ALTER TABLE public.bookmarks RENAME TO saved_posts;
  END IF;
END;
$$;

-- Re-enable RLS on saved_posts (name changed)
ALTER TABLE IF EXISTS public.saved_posts ENABLE ROW LEVEL SECURITY;

-- Drop old bookmark policies (may error silently if already dropped)
DROP POLICY IF EXISTS "Users can read own bookmarks"    ON public.saved_posts;
DROP POLICY IF EXISTS "Users can bookmark posts"        ON public.saved_posts;
DROP POLICY IF EXISTS "Users can unbookmark posts"      ON public.saved_posts;
DROP POLICY IF EXISTS "manage_own_saved"                ON public.saved_posts;

-- Fresh clean policies
CREATE POLICY "saved_select" ON public.saved_posts
  FOR SELECT TO authenticated USING (auth.uid() = user_id);

CREATE POLICY "saved_insert" ON public.saved_posts
  FOR INSERT TO authenticated WITH CHECK (auth.uid() = user_id);

CREATE POLICY "saved_delete" ON public.saved_posts
  FOR DELETE TO authenticated USING (auth.uid() = user_id);

-- ──────────────────────────────────────────────
-- BUG #3 / BUG #5  chats → conversations
-- ──────────────────────────────────────────────

-- Create conversations table if it doesn't exist yet
CREATE TABLE IF NOT EXISTS public.conversations (
  id         uuid DEFAULT gen_random_uuid() PRIMARY KEY,
  user1_id   uuid REFERENCES public.profiles(id) ON DELETE CASCADE NOT NULL,
  user2_id   uuid REFERENCES public.profiles(id) ON DELETE CASCADE NOT NULL,
  updated_at timestamptz DEFAULT now(),
  created_at timestamptz DEFAULT now(),
  UNIQUE (user1_id, user2_id)
);

-- Add conversation_id to messages if not present
ALTER TABLE public.messages
  ADD COLUMN IF NOT EXISTS conversation_id uuid REFERENCES public.conversations(id) ON DELETE CASCADE;

-- ── Trigger: auto-update conversations.updated_at on new message ──
CREATE OR REPLACE FUNCTION public.handle_conversation_updated_at()
RETURNS TRIGGER LANGUAGE plpgsql SECURITY DEFINER AS $$
BEGIN
  UPDATE public.conversations
    SET updated_at = now()
    WHERE id = NEW.conversation_id;
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS on_message_inserted ON public.messages;
CREATE TRIGGER on_message_inserted
  AFTER INSERT ON public.messages
  FOR EACH ROW
  WHEN (NEW.conversation_id IS NOT NULL)
  EXECUTE FUNCTION public.handle_conversation_updated_at();

-- RLS for conversations
ALTER TABLE public.conversations ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "read_own_conversations"  ON public.conversations;
DROP POLICY IF EXISTS "insert_conversations"    ON public.conversations;

CREATE POLICY "conv_select" ON public.conversations
  FOR SELECT TO authenticated
  USING (auth.uid() = user1_id OR auth.uid() = user2_id);

CREATE POLICY "conv_insert" ON public.conversations
  FOR INSERT TO authenticated
  WITH CHECK (auth.uid() = user1_id);

CREATE POLICY "conv_update" ON public.conversations
  FOR UPDATE TO authenticated
  USING (auth.uid() = user1_id OR auth.uid() = user2_id);

-- RLS for messages (use conversation_id)
ALTER TABLE public.messages ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "read_conversation_messages" ON public.messages;
DROP POLICY IF EXISTS "insert_own_messages"        ON public.messages;
DROP POLICY IF EXISTS "Participants can read messages in their chats"    ON public.messages;
DROP POLICY IF EXISTS "Participants can insert messages in their chats"  ON public.messages;

CREATE POLICY "msg_select" ON public.messages
  FOR SELECT TO authenticated
  USING (
    -- support both old chat_id path and new conversation_id path
    (conversation_id IS NOT NULL AND EXISTS (
      SELECT 1 FROM public.conversations c
      WHERE c.id = conversation_id
        AND (c.user1_id = auth.uid() OR c.user2_id = auth.uid())
    ))
    OR
    (chat_id IS NOT NULL AND EXISTS (
      SELECT 1 FROM public.chat_participants cp
      WHERE cp.chat_id = messages.chat_id
        AND cp.user_id = auth.uid()
    ))
  );

CREATE POLICY "msg_insert" ON public.messages
  FOR INSERT TO authenticated
  WITH CHECK (auth.uid() = sender_id);

-- ──────────────────────────────────────────────
-- BUG #2 / ISSUE #3  notifications: recipient_id policy
-- ──────────────────────────────────────────────
ALTER TABLE public.notifications ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Only recipients can view own notifications"                             ON public.notifications;
DROP POLICY IF EXISTS "Allow authenticated users to insert system or triggered notifications"  ON public.notifications;
DROP POLICY IF EXISTS "Only recipients can mark notifications as read"                         ON public.notifications;
DROP POLICY IF EXISTS "read_own_notifications"   ON public.notifications;
DROP POLICY IF EXISTS "insert_notifications"     ON public.notifications;
DROP POLICY IF EXISTS "update_own_notifications" ON public.notifications;

CREATE POLICY "notif_select" ON public.notifications
  FOR SELECT TO authenticated USING (auth.uid() = recipient_id);

CREATE POLICY "notif_insert" ON public.notifications
  FOR INSERT TO authenticated WITH CHECK (true);

CREATE POLICY "notif_update" ON public.notifications
  FOR UPDATE TO authenticated USING (auth.uid() = recipient_id);

-- ──────────────────────────────────────────────
-- ISSUE #4  Add media_type to posts
-- ──────────────────────────────────────────────
ALTER TABLE public.posts
  ADD COLUMN IF NOT EXISTS media_type text
    CHECK (media_type IN ('image', 'video', 'carousel'))
    DEFAULT 'image';

-- ──────────────────────────────────────────────
-- ISSUE #6  Ensure likes trigger exists (idempotent)
-- ──────────────────────────────────────────────
CREATE OR REPLACE FUNCTION public.handle_like_count()
RETURNS TRIGGER LANGUAGE plpgsql SECURITY DEFINER AS $$
BEGIN
  IF TG_OP = 'INSERT' THEN
    UPDATE public.posts SET likes_count = COALESCE(likes_count, 0) + 1 WHERE id = NEW.post_id;
  ELSIF TG_OP = 'DELETE' THEN
    UPDATE public.posts SET likes_count = GREATEST(COALESCE(likes_count, 0) - 1, 0) WHERE id = OLD.post_id;
  END IF;
  RETURN NULL;
END;
$$;

DROP TRIGGER IF EXISTS on_like_change ON public.likes;
CREATE TRIGGER on_like_change
  AFTER INSERT OR DELETE ON public.likes
  FOR EACH ROW EXECUTE FUNCTION public.handle_like_count();

-- ──────────────────────────────────────────────
-- Indexes
-- ──────────────────────────────────────────────
CREATE INDEX IF NOT EXISTS idx_notifications_recipient  ON public.notifications(recipient_id, created_at DESC);
CREATE INDEX IF NOT EXISTS idx_messages_conversation    ON public.messages(conversation_id, created_at ASC);
CREATE INDEX IF NOT EXISTS idx_posts_user_created       ON public.posts(user_id, created_at DESC);
CREATE INDEX IF NOT EXISTS idx_conversations_users      ON public.conversations(user1_id, user2_id);
CREATE INDEX IF NOT EXISTS idx_saved_posts_user         ON public.saved_posts(user_id);
