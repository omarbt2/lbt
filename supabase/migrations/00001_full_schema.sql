-- ============================================================
-- LBT Social — Full Database Schema, RLS, Triggers, RPC
-- Project: nopnxlhknrrsttouevxd
-- ============================================================

-- =====================
-- 1. TABLES
-- =====================

CREATE TABLE IF NOT EXISTS profiles (
  id UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  username TEXT UNIQUE NOT NULL,
  display_name TEXT,
  name TEXT,
  full_name TEXT,
  avatar_url TEXT,
  bio TEXT,
  followers_count INT DEFAULT 0,
  following_count INT DEFAULT 0,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS posts (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  caption TEXT NOT NULL DEFAULT '',
  category TEXT,
  media_urls TEXT[],
  media_type TEXT DEFAULT 'image',
  likes_count INT DEFAULT 0,
  comments_count INT DEFAULT 0,
  shares_count INT DEFAULT 0,
  tags TEXT[],
  created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS comments (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  post_id UUID NOT NULL REFERENCES posts(id) ON DELETE CASCADE,
  user_id UUID NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  content TEXT NOT NULL,
  likes_count INT DEFAULT 0,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS likes (
  post_id UUID NOT NULL REFERENCES posts(id) ON DELETE CASCADE,
  user_id UUID NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  PRIMARY KEY (post_id, user_id)
);

CREATE TABLE IF NOT EXISTS saved_posts (
  post_id UUID NOT NULL REFERENCES posts(id) ON DELETE CASCADE,
  user_id UUID NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  PRIMARY KEY (post_id, user_id)
);

CREATE TABLE IF NOT EXISTS follows (
  follower_id UUID NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  following_id UUID NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  PRIMARY KEY (follower_id, following_id)
);

CREATE TABLE IF NOT EXISTS stories (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  media_url TEXT NOT NULL,
  expires_at TIMESTAMPTZ DEFAULT (NOW() + INTERVAL '24 hours'),
  views_count INT DEFAULT 0,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS conversations (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user1_id UUID NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  user2_id UUID NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  updated_at TIMESTAMPTZ DEFAULT NOW(),
  created_at TIMESTAMPTZ DEFAULT NOW(),
  CONSTRAINT conversations_different_users CHECK (user1_id <> user2_id)
);

CREATE TABLE IF NOT EXISTS messages (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  conversation_id UUID NOT NULL REFERENCES conversations(id) ON DELETE CASCADE,
  sender_id UUID NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  content TEXT,
  media_url TEXT,
  is_read BOOLEAN DEFAULT FALSE,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS notifications (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  recipient_id UUID NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  actor_id UUID REFERENCES profiles(id) ON DELETE SET NULL,
  type TEXT NOT NULL CHECK (type IN ('like', 'comment', 'follow', 'mention', 'system')),
  post_id UUID REFERENCES posts(id) ON DELETE CASCADE,
  is_read BOOLEAN DEFAULT FALSE,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- =====================
-- 2. ENABLE ROW LEVEL SECURITY
-- =====================

ALTER TABLE profiles ENABLE ROW LEVEL SECURITY;
ALTER TABLE posts ENABLE ROW LEVEL SECURITY;
ALTER TABLE comments ENABLE ROW LEVEL SECURITY;
ALTER TABLE likes ENABLE ROW LEVEL SECURITY;
ALTER TABLE saved_posts ENABLE ROW LEVEL SECURITY;
ALTER TABLE follows ENABLE ROW LEVEL SECURITY;
ALTER TABLE stories ENABLE ROW LEVEL SECURITY;
ALTER TABLE conversations ENABLE ROW LEVEL SECURITY;
ALTER TABLE messages ENABLE ROW LEVEL SECURITY;
ALTER TABLE notifications ENABLE ROW LEVEL SECURITY;

-- =====================
-- 3. RLS POLICIES
-- =====================

-- profiles
DROP POLICY IF EXISTS "Public read profiles" ON profiles;
CREATE POLICY "Public read profiles" ON profiles FOR SELECT USING (true);

DROP POLICY IF EXISTS "Update own profile" ON profiles;
CREATE POLICY "Update own profile" ON profiles FOR UPDATE USING (auth.uid() = id);

DROP POLICY IF EXISTS "Insert own profile" ON profiles;
CREATE POLICY "Insert own profile" ON profiles FOR INSERT WITH CHECK (auth.uid() = id);

-- posts
DROP POLICY IF EXISTS "Public read posts" ON posts;
CREATE POLICY "Public read posts" ON posts FOR SELECT USING (true);

DROP POLICY IF EXISTS "Insert own post" ON posts;
CREATE POLICY "Insert own post" ON posts FOR INSERT WITH CHECK (auth.uid() = user_id);

DROP POLICY IF EXISTS "Update own post" ON posts;
CREATE POLICY "Update own post" ON posts FOR UPDATE USING (auth.uid() = user_id);

DROP POLICY IF EXISTS "Delete own post" ON posts;
CREATE POLICY "Delete own post" ON posts FOR DELETE USING (auth.uid() = user_id);

-- comments
DROP POLICY IF EXISTS "Public read comments" ON comments;
CREATE POLICY "Public read comments" ON comments FOR SELECT USING (true);

DROP POLICY IF EXISTS "Insert own comment" ON comments;
CREATE POLICY "Insert own comment" ON comments FOR INSERT WITH CHECK (auth.uid() = user_id);

DROP POLICY IF EXISTS "Delete own comment" ON comments;
CREATE POLICY "Delete own comment" ON comments FOR DELETE USING (auth.uid() = user_id);

-- likes
DROP POLICY IF EXISTS "Manage own likes" ON likes;
CREATE POLICY "Manage own likes" ON likes
  USING (auth.uid() = user_id)
  WITH CHECK (auth.uid() = user_id);

-- saved_posts
DROP POLICY IF EXISTS "Manage own saves" ON saved_posts;
CREATE POLICY "Manage own saves" ON saved_posts
  USING (auth.uid() = user_id)
  WITH CHECK (auth.uid() = user_id);

-- follows
DROP POLICY IF EXISTS "Public read follows" ON follows;
CREATE POLICY "Public read follows" ON follows FOR SELECT USING (true);

DROP POLICY IF EXISTS "Manage own follows" ON follows;
CREATE POLICY "Manage own follows" ON follows
  USING (auth.uid() = follower_id)
  WITH CHECK (auth.uid() = follower_id);

-- stories
DROP POLICY IF EXISTS "Public read stories" ON stories;
CREATE POLICY "Public read stories" ON stories FOR SELECT USING (true);

DROP POLICY IF EXISTS "Insert own story" ON stories;
CREATE POLICY "Insert own story" ON stories FOR INSERT WITH CHECK (auth.uid() = user_id);

DROP POLICY IF EXISTS "Delete own story" ON stories;
CREATE POLICY "Delete own story" ON stories FOR DELETE USING (auth.uid() = user_id);

-- conversations
DROP POLICY IF EXISTS "Read own conversations" ON conversations;
CREATE POLICY "Read own conversations" ON conversations
  FOR SELECT USING (auth.uid() = user1_id OR auth.uid() = user2_id);

DROP POLICY IF EXISTS "Create conversation" ON conversations;
CREATE POLICY "Create conversation" ON conversations
  FOR INSERT WITH CHECK (auth.uid() = user1_id OR auth.uid() = user2_id);

-- messages
DROP POLICY IF EXISTS "Read own messages" ON messages;
CREATE POLICY "Read own messages" ON messages
  FOR SELECT USING (
    EXISTS (
      SELECT 1 FROM conversations c
      WHERE c.id = conversation_id
      AND (c.user1_id = auth.uid() OR c.user2_id = auth.uid())
    )
  );

DROP POLICY IF EXISTS "Send messages" ON messages;
CREATE POLICY "Send messages" ON messages
  FOR INSERT WITH CHECK (auth.uid() = sender_id);

DROP POLICY IF EXISTS "Update own messages" ON messages;
CREATE POLICY "Update own messages" ON messages
  FOR UPDATE USING (auth.uid() = sender_id);

-- notifications
DROP POLICY IF EXISTS "Read own notifications" ON notifications;
CREATE POLICY "Read own notifications" ON notifications
  FOR SELECT USING (auth.uid() = recipient_id);

DROP POLICY IF EXISTS "Insert notifications" ON notifications;
CREATE POLICY "Insert notifications" ON notifications
  FOR INSERT WITH CHECK (true);

DROP POLICY IF EXISTS "Update own notifications" ON notifications;
CREATE POLICY "Update own notifications" ON notifications
  FOR UPDATE USING (auth.uid() = recipient_id);

-- =====================
-- 4. TRIGGERS — Auto-update counters
-- =====================

-- likes_count on posts
CREATE OR REPLACE FUNCTION update_likes_count()
RETURNS TRIGGER AS $$
BEGIN
  IF TG_OP = 'INSERT' THEN
    UPDATE posts SET likes_count = likes_count + 1 WHERE id = NEW.post_id;
  ELSIF TG_OP = 'DELETE' THEN
    UPDATE posts SET likes_count = GREATEST(0, likes_count - 1) WHERE id = OLD.post_id;
  END IF;
  RETURN NULL;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

DROP TRIGGER IF EXISTS on_like_change ON likes;
CREATE TRIGGER on_like_change AFTER INSERT OR DELETE ON likes
FOR EACH ROW EXECUTE FUNCTION update_likes_count();

-- comments_count on posts
CREATE OR REPLACE FUNCTION update_comments_count()
RETURNS TRIGGER AS $$
BEGIN
  IF TG_OP = 'INSERT' THEN
    UPDATE posts SET comments_count = comments_count + 1 WHERE id = NEW.post_id;
  ELSIF TG_OP = 'DELETE' THEN
    UPDATE posts SET comments_count = GREATEST(0, comments_count - 1) WHERE id = OLD.post_id;
  END IF;
  RETURN NULL;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

DROP TRIGGER IF EXISTS on_comment_change ON comments;
CREATE TRIGGER on_comment_change AFTER INSERT OR DELETE ON comments
FOR EACH ROW EXECUTE FUNCTION update_comments_count();

-- followers_count / following_count on profiles
CREATE OR REPLACE FUNCTION update_follow_counts()
RETURNS TRIGGER AS $$
BEGIN
  IF TG_OP = 'INSERT' THEN
    UPDATE profiles SET followers_count = followers_count + 1 WHERE id = NEW.following_id;
    UPDATE profiles SET following_count = following_count + 1 WHERE id = NEW.follower_id;
  ELSIF TG_OP = 'DELETE' THEN
    UPDATE profiles SET followers_count = GREATEST(0, followers_count - 1) WHERE id = OLD.following_id;
    UPDATE profiles SET following_count = GREATEST(0, following_count - 1) WHERE id = OLD.follower_id;
  END IF;
  RETURN NULL;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

DROP TRIGGER IF EXISTS on_follow_change ON follows;
CREATE TRIGGER on_follow_change AFTER INSERT OR DELETE ON follows
FOR EACH ROW EXECUTE FUNCTION update_follow_counts();

-- conversations updated_at on new message
CREATE OR REPLACE FUNCTION update_conversation_timestamp()
RETURNS TRIGGER AS $$
BEGIN
  UPDATE conversations SET updated_at = NOW() WHERE id = NEW.conversation_id;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

DROP TRIGGER IF EXISTS on_message_inserted ON messages;
CREATE TRIGGER on_message_inserted AFTER INSERT ON messages
FOR EACH ROW EXECUTE FUNCTION update_conversation_timestamp();

-- =====================
-- 5. RPC — get_feed function
-- =====================

CREATE OR REPLACE FUNCTION get_feed(p_user_id UUID, p_limit INT, p_offset INT)
RETURNS SETOF json AS $$
  SELECT row_to_json(t) FROM (
    SELECT
      p.*,
      row_to_json(pr.*) as profiles,
      EXISTS(SELECT 1 FROM likes l WHERE l.post_id = p.id AND l.user_id = p_user_id) as has_liked,
      EXISTS(SELECT 1 FROM saved_posts s WHERE s.post_id = p.id AND s.user_id = p_user_id) as has_bookmarked,
      COALESCE((
        SELECT json_agg(row_to_json(c.*))
        FROM (
          SELECT cm.*, row_to_json(cpr.*) as profiles
          FROM comments cm
          JOIN profiles cpr ON cpr.id = cm.user_id
          WHERE cm.post_id = p.id
          ORDER BY cm.created_at ASC
          LIMIT 3
        ) c
      ), '[]'::json) as comments
    FROM posts p
    JOIN profiles pr ON pr.id = p.user_id
    WHERE p.user_id IN (
      SELECT following_id FROM follows WHERE follower_id = p_user_id
      UNION
      SELECT p_user_id
    )
    ORDER BY p.created_at DESC
    LIMIT p_limit OFFSET p_offset
  ) t
$$ LANGUAGE sql SECURITY DEFINER;

-- =====================
-- 6. INDEXES
-- =====================

CREATE INDEX IF NOT EXISTS idx_posts_user_id ON posts(user_id);
CREATE INDEX IF NOT EXISTS idx_posts_created_at ON posts(created_at DESC);
CREATE INDEX IF NOT EXISTS idx_comments_post_id ON comments(post_id);
CREATE INDEX IF NOT EXISTS idx_likes_user_id ON likes(user_id);
CREATE INDEX IF NOT EXISTS idx_saved_posts_user_id ON saved_posts(user_id);
CREATE INDEX IF NOT EXISTS idx_follows_follower ON follows(follower_id);
CREATE INDEX IF NOT EXISTS idx_follows_following ON follows(following_id);
CREATE INDEX IF NOT EXISTS idx_messages_conversation ON messages(conversation_id);
CREATE INDEX IF NOT EXISTS idx_notifications_recipient ON notifications(recipient_id);
CREATE INDEX IF NOT EXISTS idx_stories_user_id ON stories(user_id);

-- =====================
-- 7. ENABLE REALTIME
-- =====================

ALTER PUBLICATION supabase_realtime ADD TABLE messages;
ALTER PUBLICATION supabase_realtime ADD TABLE notifications;
ALTER PUBLICATION supabase_realtime ADD TABLE posts;
