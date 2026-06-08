-- =====================================================
-- LBT Social: Bug fixes & atomic counter RPCs
-- =====================================================

-- 1. Atomic follow/unfollow counter RPCs
CREATE OR REPLACE FUNCTION increment_following(profile_id uuid)
RETURNS void LANGUAGE sql SECURITY DEFINER AS $$
  UPDATE profiles SET following_count = COALESCE(following_count, 0) + 1 WHERE id = profile_id;
$$;

CREATE OR REPLACE FUNCTION decrement_following(profile_id uuid)
RETURNS void LANGUAGE sql SECURITY DEFINER AS $$
  UPDATE profiles SET following_count = GREATEST(COALESCE(following_count, 0) - 1, 0) WHERE id = profile_id;
$$;

CREATE OR REPLACE FUNCTION increment_followers(profile_id uuid)
RETURNS void LANGUAGE sql SECURITY DEFINER AS $$
  UPDATE profiles SET followers_count = COALESCE(followers_count, 0) + 1 WHERE id = profile_id;
$$;

CREATE OR REPLACE FUNCTION decrement_followers(profile_id uuid)
RETURNS void LANGUAGE sql SECURITY DEFINER AS $$
  UPDATE profiles SET followers_count = GREATEST(COALESCE(followers_count, 0) - 1, 0) WHERE id = profile_id;
$$;

-- 2. Auto-increment likes_count on insert/delete via trigger
CREATE OR REPLACE FUNCTION handle_like_count()
RETURNS TRIGGER LANGUAGE plpgsql SECURITY DEFINER AS $$
BEGIN
  IF TG_OP = 'INSERT' THEN
    UPDATE posts SET likes_count = COALESCE(likes_count, 0) + 1 WHERE id = NEW.post_id;
  ELSIF TG_OP = 'DELETE' THEN
    UPDATE posts SET likes_count = GREATEST(COALESCE(likes_count, 0) - 1, 0) WHERE id = OLD.post_id;
  END IF;
  RETURN NULL;
END;
$$;

DROP TRIGGER IF EXISTS on_like_change ON likes;
CREATE TRIGGER on_like_change
  AFTER INSERT OR DELETE ON likes
  FOR EACH ROW EXECUTE FUNCTION handle_like_count();

-- 3. Auto-increment comments_count on insert/delete via trigger
CREATE OR REPLACE FUNCTION handle_comment_count()
RETURNS TRIGGER LANGUAGE plpgsql SECURITY DEFINER AS $$
BEGIN
  IF TG_OP = 'INSERT' THEN
    UPDATE posts SET comments_count = COALESCE(comments_count, 0) + 1 WHERE id = NEW.post_id;
  ELSIF TG_OP = 'DELETE' THEN
    UPDATE posts SET comments_count = GREATEST(COALESCE(comments_count, 0) - 1, 0) WHERE id = OLD.post_id;
  END IF;
  RETURN NULL;
END;
$$;

DROP TRIGGER IF EXISTS on_comment_change ON comments;
CREATE TRIGGER on_comment_change
  AFTER INSERT OR DELETE ON comments
  FOR EACH ROW EXECUTE FUNCTION handle_comment_count();

-- 4. Add is_read column to messages if not exists
ALTER TABLE messages ADD COLUMN IF NOT EXISTS is_read boolean DEFAULT false;

-- 5. Add post_id column to notifications if not exists
ALTER TABLE notifications ADD COLUMN IF NOT EXISTS post_id uuid REFERENCES posts(id) ON DELETE SET NULL;

-- 6. Add actor_id to notifications if not exists (who triggered it)
ALTER TABLE notifications ADD COLUMN IF NOT EXISTS actor_id uuid REFERENCES profiles(id) ON DELETE SET NULL;

-- 7. Ensure notifications has recipient_id
ALTER TABLE notifications ADD COLUMN IF NOT EXISTS recipient_id uuid REFERENCES profiles(id) ON DELETE CASCADE;

-- 8. Add index for notification queries
CREATE INDEX IF NOT EXISTS idx_notifications_recipient ON notifications(recipient_id, created_at DESC);
CREATE INDEX IF NOT EXISTS idx_messages_chat ON messages(chat_id, created_at ASC);
CREATE INDEX IF NOT EXISTS idx_posts_created ON posts(created_at DESC);
CREATE INDEX IF NOT EXISTS idx_likes_user ON likes(user_id);
CREATE INDEX IF NOT EXISTS idx_bookmarks_user ON bookmarks(user_id);
