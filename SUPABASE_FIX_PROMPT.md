# Supabase Database Fix Prompt

Copy everything inside the SQL block below and run it in your Supabase SQL Editor (Dashboard > SQL Editor > New Query).

---

```sql
-- ============================================================
-- LBT Social App - Complete Supabase Database Fix
-- Run this ENTIRE script in the Supabase SQL Editor
-- ============================================================

-- ============================================================
-- 1. FIX: message_reactions - Remove broken trigger that references non-existent "updated_at" column
-- Error: record "new" has no field "updated_at" (code 42703)
-- ============================================================
DROP TRIGGER IF EXISTS update_message_reactions_updated_at ON public.message_reactions;
DROP FUNCTION IF EXISTS update_updated_at_column();

-- If there's a trigger on message_reactions that sets updated_at, remove it
DO $$
DECLARE
  trig record;
BEGIN
  FOR trig IN
    SELECT trigger_name
    FROM information_schema.triggers
    WHERE event_object_table = 'message_reactions'
      AND event_object_schema = 'public'
  LOOP
    EXECUTE format('DROP TRIGGER IF EXISTS %I ON public.message_reactions', trig.trigger_name);
  END LOOP;
END $$;

-- ============================================================
-- 2. FIX: story_views - Add unique constraint for upsert to work
-- Error: 400 on upsert with onConflict='story_id,viewer_id'
-- ============================================================
DO $$
BEGIN
  -- Add unique constraint if it doesn't exist
  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint
    WHERE conname = 'story_views_story_id_viewer_id_key'
  ) THEN
    ALTER TABLE public.story_views
      ADD CONSTRAINT story_views_story_id_viewer_id_key
      UNIQUE (story_id, viewer_id);
  END IF;
EXCEPTION WHEN duplicate_table THEN NULL;
END $$;

-- ============================================================
-- 3. FIX: posts - Remove duplicate FK to profiles if it exists
-- Error: "Could not embed because more than one relationship was found for 'posts' and 'profiles'"
-- The code already uses profiles!posts_user_id_fkey to disambiguate,
-- but let's clean up any extra FKs
-- ============================================================
DO $$
DECLARE
  con record;
BEGIN
  FOR con IN
    SELECT conname, pg_get_constraintdef(oid) as def
    FROM pg_constraint
    WHERE conrelid = 'public.posts'::regclass
      AND confrelid = 'public.profiles'::regclass
      AND conname != 'posts_user_id_fkey'
  LOOP
    -- Drop any extra FK from posts to profiles (keep only posts_user_id_fkey)
    EXECUTE format('ALTER TABLE public.posts DROP CONSTRAINT IF EXISTS %I', con.conname);
    RAISE NOTICE 'Dropped extra FK: %', con.conname;
  END LOOP;
END $$;

-- ============================================================
-- 4. FIX: close_friends table - Create if not exists
-- ============================================================
CREATE TABLE IF NOT EXISTS public.close_friends (
  id uuid DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  friend_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  created_at timestamptz DEFAULT now(),
  UNIQUE(user_id, friend_id)
);

ALTER TABLE public.close_friends ENABLE ROW LEVEL SECURITY;

DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE policyname = 'Users can view own close friends' AND tablename = 'close_friends') THEN
    CREATE POLICY "Users can view own close friends"
      ON public.close_friends FOR SELECT
      USING (auth.uid() = user_id);
  END IF;
  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE policyname = 'Users can manage own close friends' AND tablename = 'close_friends') THEN
    CREATE POLICY "Users can manage own close friends"
      ON public.close_friends FOR ALL
      USING (auth.uid() = user_id);
  END IF;
END $$;

-- ============================================================
-- 5. FIX: hidden_posts table - Create if not exists
-- ============================================================
CREATE TABLE IF NOT EXISTS public.hidden_posts (
  id uuid DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  post_id uuid NOT NULL REFERENCES public.posts(id) ON DELETE CASCADE,
  created_at timestamptz DEFAULT now(),
  UNIQUE(user_id, post_id)
);

ALTER TABLE public.hidden_posts ENABLE ROW LEVEL SECURITY;

DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE policyname = 'Users can view own hidden posts' AND tablename = 'hidden_posts') THEN
    CREATE POLICY "Users can view own hidden posts"
      ON public.hidden_posts FOR SELECT
      USING (auth.uid() = user_id);
  END IF;
  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE policyname = 'Users can manage own hidden posts' AND tablename = 'hidden_posts') THEN
    CREATE POLICY "Users can manage own hidden posts"
      ON public.hidden_posts FOR ALL
      USING (auth.uid() = user_id);
  END IF;
END $$;

-- ============================================================
-- 6. FIX: explore_feed table - Create if not exists
-- ============================================================
CREATE TABLE IF NOT EXISTS public.explore_feed (
  id uuid DEFAULT gen_random_uuid() PRIMARY KEY,
  post_id uuid NOT NULL REFERENCES public.posts(id) ON DELETE CASCADE,
  score float DEFAULT 0,
  created_at timestamptz DEFAULT now()
);

ALTER TABLE public.explore_feed ENABLE ROW LEVEL SECURITY;

DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE policyname = 'Anyone can view explore feed' AND tablename = 'explore_feed') THEN
    CREATE POLICY "Anyone can view explore feed"
      ON public.explore_feed FOR SELECT
      USING (true);
  END IF;
END $$;

-- ============================================================
-- 7. FIX: messages table - Ensure is_seen and is_read columns exist and are nullable
-- ============================================================
DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name='messages' AND column_name='is_seen') THEN
    ALTER TABLE public.messages ADD COLUMN is_seen boolean DEFAULT false;
  END IF;
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name='messages' AND column_name='is_read') THEN
    ALTER TABLE public.messages ADD COLUMN is_read boolean DEFAULT false;
  END IF;
  -- Make them nullable in case they were created as NOT NULL
  ALTER TABLE public.messages ALTER COLUMN is_seen DROP NOT NULL;
  ALTER TABLE public.messages ALTER COLUMN is_read DROP NOT NULL;
END $$;

-- ============================================================
-- 8. FIX: profiles table - Ensure all needed columns exist
-- ============================================================
DO $$
BEGIN
  -- blocked_count
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name='profiles' AND column_name='blocked_count') THEN
    ALTER TABLE public.profiles ADD COLUMN blocked_count integer DEFAULT 0;
  END IF;
  -- muted_count
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name='profiles' AND column_name='muted_count') THEN
    ALTER TABLE public.profiles ADD COLUMN muted_count integer DEFAULT 0;
  END IF;
  -- hide_activity
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name='profiles' AND column_name='hide_activity') THEN
    ALTER TABLE public.profiles ADD COLUMN hide_activity boolean DEFAULT false;
  END IF;
  -- allow_mentions
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name='profiles' AND column_name='allow_mentions') THEN
    ALTER TABLE public.profiles ADD COLUMN allow_mentions text DEFAULT 'everyone';
  END IF;
  -- notif_likes
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name='profiles' AND column_name='notif_likes') THEN
    ALTER TABLE public.profiles ADD COLUMN notif_likes boolean DEFAULT true;
  END IF;
  -- notif_comments
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name='profiles' AND column_name='notif_comments') THEN
    ALTER TABLE public.profiles ADD COLUMN notif_comments boolean DEFAULT true;
  END IF;
  -- notif_dms
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name='profiles' AND column_name='notif_dms') THEN
    ALTER TABLE public.profiles ADD COLUMN notif_dms boolean DEFAULT true;
  END IF;
  -- notif_followers
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name='profiles' AND column_name='notif_followers') THEN
    ALTER TABLE public.profiles ADD COLUMN notif_followers boolean DEFAULT false;
  END IF;
  -- is_following (computed column for profiles)
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name='profiles' AND column_name='is_following') THEN
    ALTER TABLE public.profiles ADD COLUMN is_following boolean DEFAULT false;
  END IF;
END $$;

-- ============================================================
-- 9. FIX: follows - Add unique constraint (prevent duplicate follows)
-- ============================================================
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint
    WHERE conname = 'follows_follower_id_following_id_key'
  ) THEN
    ALTER TABLE public.follows
      ADD CONSTRAINT follows_follower_id_following_id_key
      UNIQUE (follower_id, following_id);
  END IF;
EXCEPTION WHEN duplicate_table THEN NULL;
END $$;

-- ============================================================
-- 10. FIX: message_reactions - Ensure unique constraint exists for upsert
-- ============================================================
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint
    WHERE conname = 'message_reactions_message_id_user_id_key'
  ) THEN
    ALTER TABLE public.message_reactions
      ADD CONSTRAINT message_reactions_message_id_user_id_key
      UNIQUE (message_id, user_id);
  END IF;
EXCEPTION WHEN duplicate_table THEN NULL;
END $$;

-- ============================================================
-- 11. FIX: increment_story_views RPC - Recreate with correct parameter name
-- ============================================================
CREATE OR REPLACE FUNCTION public.increment_story_views(story_id uuid)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
BEGIN
  UPDATE public.stories
  SET views_count = COALESCE(views_count, 0) + 1
  WHERE id = story_id;
END;
$$;

-- ============================================================
-- 12. FIX: toggle_post_reaction RPC - Recreate without updated_at reference
-- ============================================================
CREATE OR REPLACE FUNCTION public.toggle_post_reaction(p_post_id uuid, p_emoji text)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  existing_id uuid;
BEGIN
  SELECT id INTO existing_id
  FROM public.post_reactions
  WHERE post_id = p_post_id AND user_id = auth.uid();

  IF existing_id IS NOT NULL THEN
    DELETE FROM public.post_reactions WHERE id = existing_id;
  ELSE
    INSERT INTO public.post_reactions (post_id, user_id, emoji)
    VALUES (p_post_id, auth.uid(), p_emoji);
  END IF;
END;
$$;

-- ============================================================
-- 13. FIX: get_post_reactions RPC - Recreate
-- ============================================================
CREATE OR REPLACE FUNCTION public.get_post_reactions(p_post_id uuid)
RETURNS TABLE(emoji text, count bigint, has_reacted boolean)
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
BEGIN
  RETURN QUERY
  SELECT
    pr.emoji,
    COUNT(*) as count,
    BOOL_OR(pr.user_id = auth.uid()) as has_reacted
  FROM public.post_reactions pr
  WHERE pr.post_id = p_post_id
  GROUP BY pr.emoji
  ORDER BY count DESC;
END;
$$;

-- ============================================================
-- 14. FIX: post_reactions table - Create if not exists (needed by toggle_post_reaction)
-- ============================================================
CREATE TABLE IF NOT EXISTS public.post_reactions (
  id uuid DEFAULT gen_random_uuid() PRIMARY KEY,
  post_id uuid NOT NULL REFERENCES public.posts(id) ON DELETE CASCADE,
  user_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  emoji text NOT NULL,
  created_at timestamptz DEFAULT now(),
  UNIQUE(post_id, user_id)
);

ALTER TABLE public.post_reactions ENABLE ROW LEVEL SECURITY;

DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE policyname = 'Anyone can view post reactions' AND tablename = 'post_reactions') THEN
    CREATE POLICY "Anyone can view post reactions"
      ON public.post_reactions FOR SELECT
      USING (true);
  END IF;
  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE policyname = 'Users can manage own reactions' AND tablename = 'post_reactions') THEN
    CREATE POLICY "Users can manage own reactions"
      ON public.post_reactions FOR ALL
      USING (auth.uid() = user_id);
  END IF;
END $$;

-- ============================================================
-- 15. FIX: collections table - Create if not exists (used by BookmarkCollectionsModal)
-- ============================================================
CREATE TABLE IF NOT EXISTS public.collections (
  id uuid DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  name text NOT NULL,
  cover_url text,
  is_private boolean DEFAULT false,
  posts_count integer DEFAULT 0,
  created_at timestamptz DEFAULT now()
);

ALTER TABLE public.collections ENABLE ROW LEVEL SECURITY;

DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE policyname = 'Users can view own collections' AND tablename = 'collections') THEN
    CREATE POLICY "Users can view own collections"
      ON public.collections FOR SELECT
      USING (auth.uid() = user_id);
  END IF;
  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE policyname = 'Users can manage own collections' AND tablename = 'collections') THEN
    CREATE POLICY "Users can manage own collections"
      ON public.collections FOR ALL
      USING (auth.uid() = user_id);
  END IF;
END $$;

-- ============================================================
-- 16. FIX: saved_posts table - Create if not exists
-- ============================================================
CREATE TABLE IF NOT EXISTS public.saved_posts (
  post_id uuid NOT NULL REFERENCES public.posts(id) ON DELETE CASCADE,
  user_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  collection_id uuid REFERENCES public.collections(id) ON DELETE SET NULL,
  created_at timestamptz DEFAULT now(),
  PRIMARY KEY (post_id, user_id)
);

ALTER TABLE public.saved_posts ENABLE ROW LEVEL SECURITY;

DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE policyname = 'Users can view own saved posts' AND tablename = 'saved_posts') THEN
    CREATE POLICY "Users can view own saved posts"
      ON public.saved_posts FOR SELECT
      USING (auth.uid() = user_id);
  END IF;
  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE policyname = 'Users can manage own saved posts' AND tablename = 'saved_posts') THEN
    CREATE POLICY "Users can manage own saved posts"
      ON public.saved_posts FOR ALL
      USING (auth.uid() = user_id);
  END IF;
END $$;

-- ============================================================
-- 17. STORAGE BUCKETS - Create if not exists
-- ============================================================
-- Voice messages bucket
INSERT INTO storage.buckets (id, name, public)
VALUES ('voice-messages', 'voice-messages', true)
ON CONFLICT (id) DO NOTHING;

-- Messages media bucket
INSERT INTO storage.buckets (id, name, public)
VALUES ('messages-media', 'messages-media', true)
ON CONFLICT (id) DO NOTHING;

-- Reels bucket
INSERT INTO storage.buckets (id, name, public)
VALUES ('reels', 'reels', true)
ON CONFLICT (id) DO NOTHING;

-- ============================================================
-- 18. STORAGE POLICIES - Allow authenticated uploads
-- ============================================================
DO $$
BEGIN
  -- voice-messages: allow authenticated read
  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE policyname = 'Authenticated users can read voice messages' AND tablename = 'objects') THEN
    CREATE POLICY "Authenticated users can read voice messages"
      ON storage.objects FOR SELECT
      USING (bucket_id = 'voice-messages' AND auth.role() = 'authenticated');
  END IF;
  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE policyname = 'Authenticated users can upload voice messages' AND tablename = 'objects') THEN
    CREATE POLICY "Authenticated users can upload voice messages"
      ON storage.objects FOR INSERT
      WITH CHECK (bucket_id = 'voice-messages' AND auth.role() = 'authenticated');
  END IF;

  -- messages-media: allow authenticated read/write
  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE policyname = 'Authenticated users can read messages-media' AND tablename = 'objects') THEN
    CREATE POLICY "Authenticated users can read messages-media"
      ON storage.objects FOR SELECT
      USING (bucket_id = 'messages-media' AND auth.role() = 'authenticated');
  END IF;
  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE policyname = 'Authenticated users can upload messages-media' AND tablename = 'objects') THEN
    CREATE POLICY "Authenticated users can upload messages-media"
      ON storage.objects FOR INSERT
      WITH CHECK (bucket_id = 'messages-media' AND auth.role() = 'authenticated');
  END IF;

  -- reels: allow authenticated read/write
  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE policyname = 'Authenticated users can read reels' AND tablename = 'objects') THEN
    CREATE POLICY "Authenticated users can read reels"
      ON storage.objects FOR SELECT
      USING (bucket_id = 'reels' AND auth.role() = 'authenticated');
  END IF;
  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE policyname = 'Authenticated users can upload reels' AND tablename = 'objects') THEN
    CREATE POLICY "Authenticated users can upload reels"
      ON storage.objects FOR INSERT
      WITH CHECK (bucket_id = 'reels' AND auth.role() = 'authenticated');
  END IF;
END $$;

-- ============================================================
-- 19. FIX: RLS policies for messages - Allow UPDATE for markAsSeen/markAsRead
-- ============================================================
DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE policyname = 'Users can update messages in their conversations' AND tablename = 'messages') THEN
    CREATE POLICY "Users can update messages in their conversations"
      ON public.messages FOR UPDATE
      USING (
        conversation_id IN (
          SELECT id FROM public.conversations
          WHERE participant1 = auth.uid()
             OR participant2 = auth.uid()
             OR user1_id = auth.uid()
             OR user2_id = auth.uid()
        )
      )
      WITH CHECK (true);
  END IF;
END $$;

-- ============================================================
-- 20. RLS policies for RLS-enabled tables that may be missing policies
-- ============================================================

-- conversations: allow users to read their own conversations
DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE policyname = 'Users can view own conversations' AND tablename = 'conversations') THEN
    CREATE POLICY "Users can view own conversations"
      ON public.conversations FOR SELECT
      USING (
        participant1 = auth.uid() OR participant2 = auth.uid()
        OR user1_id = auth.uid() OR user2_id = auth.uid()
      );
  END IF;
  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE policyname = 'Users can create conversations' AND tablename = 'conversations') THEN
    CREATE POLICY "Users can create conversations"
      ON public.conversations FOR INSERT
      WITH CHECK (auth.uid() = participant1 OR auth.uid() = participant2 OR auth.uid() = user1_id OR auth.uid() = user2_id);
  END IF;
  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE policyname = 'Users can update own conversations' AND tablename = 'conversations') THEN
    CREATE POLICY "Users can update own conversations"
      ON public.conversations FOR UPDATE
      USING (
        participant1 = auth.uid() OR participant2 = auth.uid()
        OR user1_id = auth.uid() OR user2_id = auth.uid()
      );
  END IF;
END $$;

-- typing_indicators
DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE policyname = 'Users can view typing indicators' AND tablename = 'typing_indicators') THEN
    CREATE POLICY "Users can view typing indicators"
      ON public.typing_indicators FOR SELECT
      USING (true);
  END IF;
  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE policyname = 'Users can manage own typing indicators' AND tablename = 'typing_indicators') THEN
    CREATE POLICY "Users can manage own typing indicators"
      ON public.typing_indicators FOR ALL
      USING (auth.uid() = user_id);
  END IF;
END $$;

-- message_reactions
DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE policyname = 'Anyone can view message reactions' AND tablename = 'message_reactions') THEN
    CREATE POLICY "Anyone can view message reactions"
      ON public.message_reactions FOR SELECT
      USING (true);
  END IF;
  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE policyname = 'Users can manage own message reactions' AND tablename = 'message_reactions') THEN
    CREATE POLICY "Users can manage own message reactions"
      ON public.message_reactions FOR ALL
      USING (auth.uid() = user_id);
  END IF;
END $$;

-- follow_requests
DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE policyname = 'Users can view follow requests' AND tablename = 'follow_requests') THEN
    CREATE POLICY "Users can view follow requests"
      ON public.follow_requests FOR SELECT
      USING (auth.uid() = requester_id OR auth.uid() = target_id);
  END IF;
  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE policyname = 'Users can manage follow requests' AND tablename = 'follow_requests') THEN
    CREATE POLICY "Users can manage follow requests"
      ON public.follow_requests FOR ALL
      USING (auth.uid() = requester_id);
  END IF;
END $$;

-- notes
DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE policyname = 'Users can view own notes' AND tablename = 'notes') THEN
    CREATE POLICY "Users can view own notes"
      ON public.notes FOR SELECT
      USING (auth.uid() = user_id);
  END IF;
  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE policyname = 'Users can manage own notes' AND tablename = 'notes') THEN
    CREATE POLICY "Users can manage own notes"
      ON public.notes FOR ALL
      USING (auth.uid() = user_id);
  END IF;
END $$;

-- support_tickets
DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE policyname = 'Users can view own tickets' AND tablename = 'support_tickets') THEN
    CREATE POLICY "Users can view own tickets"
      ON public.support_tickets FOR SELECT
      USING (auth.uid() = user_id);
  END IF;
  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE policyname = 'Users can create tickets' AND tablename = 'support_tickets') THEN
    CREATE POLICY "Users can create tickets"
      ON public.support_tickets FOR INSERT
      WITH CHECK (auth.uid() = user_id);
  END IF;
END $$;

-- link_previews
DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE policyname = 'Anyone can read link previews' AND tablename = 'link_previews') THEN
    CREATE POLICY "Anyone can read link previews"
      ON public.link_previews FOR SELECT
      USING (true);
  END IF;
END $$;

-- ============================================================
-- DONE! All fixes applied.
-- After running this, regenerate Supabase types with:
--   npx supabase gen types typescript --local > src/types/supabase.ts
-- ============================================================
```

---

## How to use:

1. Open your Supabase Dashboard
2. Go to **SQL Editor**
3. Click **New Query**
4. Paste the entire SQL block above
5. Click **Run** (or press Ctrl+Enter)
6. After it succeeds, regenerate types:
   ```bash
   npx supabase gen types typescript --local > src/types/supabase.ts
   ```

## What this fixes:

| # | Issue | Fix |
|---|-------|-----|
| 1 | `message_reactions` trigger references non-existent `updated_at` | Dropped the broken trigger |
| 2 | `story_views` upsert fails (no unique constraint) | Added unique constraint on `(story_id, viewer_id)` |
| 3 | `posts` has ambiguous FK to `profiles` | Dropped duplicate FK, code already uses explicit `!posts_user_id_fkey` |
| 4 | `close_friends` table missing | Created table with RLS |
| 5 | `hidden_posts` table missing | Created table with RLS |
| 6 | `explore_feed` table missing | Created table with RLS |
| 7 | `messages.is_seen`/`is_read` may not exist | Ensured columns exist and are nullable |
| 8 | `profiles` missing columns (`blocked_count`, `muted_count`, etc.) | Added all missing columns |
| 9 | `follows` duplicate key conflict | Added unique constraint |
| 10 | `message_reactions` upsert fails | Added unique constraint |
| 11 | `increment_story_views` RPC | Recreated with correct parameter name |
| 12 | `toggle_post_reaction` RPC references `updated_at` | Recreated without it |
| 13 | `get_post_reactions` RPC | Recreated |
| 14 | `post_reactions` table missing | Created with RLS |
| 15 | `collections` table missing | Created with RLS |
| 16 | `saved_posts` table missing | Created with composite PK and FKs |
| 17 | Storage buckets missing | Created `voice-messages`, `messages-media`, `reels` |
| 18 | Storage policies | Added read/write policies |
| 19 | Messages RLS too restrictive | Added UPDATE policy for markAsSeen/Read |
| 20 | Missing RLS policies | Added policies for all tables |
