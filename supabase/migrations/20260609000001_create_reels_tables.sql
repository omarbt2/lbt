-- ============================================================
-- Create reels, reel_likes, reel_views tables (idempotent)
-- ============================================================

CREATE TABLE IF NOT EXISTS reels (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  video_url TEXT NOT NULL,
  thumbnail_url TEXT,
  caption TEXT DEFAULT '',
  audio_name TEXT DEFAULT 'Original Audio',
  duration_sec INT DEFAULT 0,
  likes_count INT DEFAULT 0,
  comments_count INT DEFAULT 0,
  views_count INT DEFAULT 0,
  shares_count INT DEFAULT 0,
  is_archived BOOLEAN DEFAULT false,
  is_public BOOLEAN DEFAULT true,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

ALTER TABLE reels ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "reels_select" ON reels;
CREATE POLICY "reels_select" ON reels FOR SELECT USING (is_public = true OR auth.uid() = user_id);
DROP POLICY IF EXISTS "reels_insert" ON reels;
CREATE POLICY "reels_insert" ON reels FOR INSERT WITH CHECK (auth.uid() = user_id);
DROP POLICY IF EXISTS "reels_update" ON reels;
CREATE POLICY "reels_update" ON reels FOR UPDATE USING (auth.uid() = user_id);
DROP POLICY IF EXISTS "reels_delete" ON reels;
CREATE POLICY "reels_delete" ON reels FOR DELETE USING (auth.uid() = user_id);

CREATE TABLE IF NOT EXISTS reel_likes (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  reel_id UUID NOT NULL REFERENCES reels(id) ON DELETE CASCADE,
  user_id UUID NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE(reel_id, user_id)
);

ALTER TABLE reel_likes ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "reel_likes_select" ON reel_likes;
CREATE POLICY "reel_likes_select" ON reel_likes FOR SELECT USING (true);
DROP POLICY IF EXISTS "reel_likes_insert" ON reel_likes;
CREATE POLICY "reel_likes_insert" ON reel_likes FOR INSERT WITH CHECK (auth.uid() = user_id);
DROP POLICY IF EXISTS "reel_likes_delete" ON reel_likes;
CREATE POLICY "reel_likes_delete" ON reel_likes FOR DELETE USING (auth.uid() = user_id);

CREATE TABLE IF NOT EXISTS reel_views (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  reel_id UUID NOT NULL REFERENCES reels(id) ON DELETE CASCADE,
  user_id UUID NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  viewed_at TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE(reel_id, user_id)
);

ALTER TABLE reel_views ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "reel_views_select" ON reel_views;
CREATE POLICY "reel_views_select" ON reel_views FOR SELECT USING (true);
DROP POLICY IF EXISTS "reel_views_insert" ON reel_views;
CREATE POLICY "reel_views_insert" ON reel_views FOR INSERT WITH CHECK (auth.uid() = user_id);

CREATE INDEX IF NOT EXISTS idx_reels_user_id ON reels(user_id);
CREATE INDEX IF NOT EXISTS idx_reels_created_at ON reels(created_at DESC);
CREATE INDEX IF NOT EXISTS idx_reel_likes_reel ON reel_likes(reel_id);
CREATE INDEX IF NOT EXISTS idx_reel_views_reel ON reel_views(reel_id);

DO $$ BEGIN
  ALTER PUBLICATION supabase_realtime ADD TABLE reels;
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;

-- ============================================================
-- Storage buckets for reels, stories, chat-media, voice-messages
-- ============================================================

INSERT INTO storage.buckets (id, name, public) VALUES ('reels', 'reels', true) ON CONFLICT (id) DO NOTHING;
INSERT INTO storage.buckets (id, name, public) VALUES ('stories', 'stories', true) ON CONFLICT (id) DO NOTHING;
INSERT INTO storage.buckets (id, name, public) VALUES ('chat-media', 'chat-media', true) ON CONFLICT (id) DO NOTHING;
INSERT INTO storage.buckets (id, name, public) VALUES ('voice-messages', 'voice-messages', true) ON CONFLICT (id) DO NOTHING;

-- Storage policies for reels
DROP POLICY IF EXISTS "Public read reels objects" ON storage.objects;
CREATE POLICY "Public read reels objects" ON storage.objects FOR SELECT USING (bucket_id = 'reels');
DROP POLICY IF EXISTS "Auth users insert reels" ON storage.objects;
CREATE POLICY "Auth users insert reels" ON storage.objects FOR INSERT WITH CHECK (bucket_id = 'reels' AND auth.role() = 'authenticated');

-- Storage policies for stories
DROP POLICY IF EXISTS "Public read stories objects" ON storage.objects;
CREATE POLICY "Public read stories objects" ON storage.objects FOR SELECT USING (bucket_id = 'stories');
DROP POLICY IF EXISTS "Auth users insert stories" ON storage.objects;
CREATE POLICY "Auth users insert stories" ON storage.objects FOR INSERT WITH CHECK (bucket_id = 'stories' AND auth.role() = 'authenticated');

-- Storage policies for chat-media
DROP POLICY IF EXISTS "Public read chat-media objects" ON storage.objects;
CREATE POLICY "Public read chat-media objects" ON storage.objects FOR SELECT USING (bucket_id = 'chat-media');
DROP POLICY IF EXISTS "Auth users insert chat-media" ON storage.objects;
CREATE POLICY "Auth users insert chat-media" ON storage.objects FOR INSERT WITH CHECK (bucket_id = 'chat-media' AND auth.role() = 'authenticated');

-- Storage policies for voice-messages
DROP POLICY IF EXISTS "Public read voice-messages objects" ON storage.objects;
CREATE POLICY "Public read voice-messages objects" ON storage.objects FOR SELECT USING (bucket_id = 'voice-messages');
DROP POLICY IF EXISTS "Auth users insert voice-messages" ON storage.objects;
CREATE POLICY "Auth users insert voice-messages" ON storage.objects FOR INSERT WITH CHECK (bucket_id = 'voice-messages' AND auth.role() = 'authenticated');
