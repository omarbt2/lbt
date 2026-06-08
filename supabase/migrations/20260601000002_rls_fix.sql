-- Enable RLS on posts if not already
ALTER TABLE posts ENABLE ROW LEVEL SECURITY;

-- Allow authenticated users to read all posts
DROP POLICY IF EXISTS "read_all_posts" ON posts;
CREATE POLICY "read_all_posts" ON posts
  FOR SELECT TO authenticated USING (true);

-- Allow users to insert their own posts
DROP POLICY IF EXISTS "insert_own_posts" ON posts;
CREATE POLICY "insert_own_posts" ON posts
  FOR INSERT TO authenticated
  WITH CHECK (auth.uid() = user_id);

-- Allow users to update/delete their own posts
DROP POLICY IF EXISTS "modify_own_posts" ON posts;
CREATE POLICY "modify_own_posts" ON posts
  FOR ALL TO authenticated
  USING (auth.uid() = user_id);

-- Comments RLS
ALTER TABLE comments ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "read_all_comments" ON comments;
CREATE POLICY "read_all_comments" ON comments
  FOR SELECT TO authenticated USING (true);
DROP POLICY IF EXISTS "insert_own_comments" ON comments;
CREATE POLICY "insert_own_comments" ON comments
  FOR INSERT TO authenticated WITH CHECK (auth.uid() = user_id);

-- Likes RLS
ALTER TABLE likes ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "manage_own_likes" ON likes;
CREATE POLICY "manage_own_likes" ON likes
  FOR ALL TO authenticated USING (auth.uid() = user_id);
DROP POLICY IF EXISTS "read_all_likes" ON likes;
CREATE POLICY "read_all_likes" ON likes
  FOR SELECT TO authenticated USING (true);

-- saved_posts RLS
ALTER TABLE saved_posts ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "manage_own_saved" ON saved_posts;
CREATE POLICY "manage_own_saved" ON saved_posts
  FOR ALL TO authenticated USING (auth.uid() = user_id);

-- notifications RLS
ALTER TABLE notifications ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "read_own_notifications" ON notifications;
CREATE POLICY "read_own_notifications" ON notifications
  FOR SELECT TO authenticated USING (auth.uid() = user_id);
DROP POLICY IF EXISTS "insert_notifications" ON notifications;
CREATE POLICY "insert_notifications" ON notifications
  FOR INSERT TO authenticated WITH CHECK (true);
DROP POLICY IF EXISTS "update_own_notifications" ON notifications;
CREATE POLICY "update_own_notifications" ON notifications
  FOR UPDATE TO authenticated USING (auth.uid() = user_id);

-- conversations RLS
ALTER TABLE conversations ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "read_own_conversations" ON conversations;
CREATE POLICY "read_own_conversations" ON conversations
  FOR SELECT TO authenticated
  USING (auth.uid() = user1_id OR auth.uid() = user2_id);
DROP POLICY IF EXISTS "insert_conversations" ON conversations;
CREATE POLICY "insert_conversations" ON conversations
  FOR INSERT TO authenticated WITH CHECK (auth.uid() = user1_id);

-- messages RLS
ALTER TABLE messages ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "read_conversation_messages" ON messages;
CREATE POLICY "read_conversation_messages" ON messages
  FOR SELECT TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM conversations c
      WHERE c.id = conversation_id
      AND (c.user1_id = auth.uid() OR c.user2_id = auth.uid())
    )
  );
DROP POLICY IF EXISTS "insert_own_messages" ON messages;
CREATE POLICY "insert_own_messages" ON messages
  FOR INSERT TO authenticated WITH CHECK (auth.uid() = sender_id);
