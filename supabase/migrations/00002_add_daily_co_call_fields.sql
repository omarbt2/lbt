-- Add 'call' type to notifications CHECK constraint
ALTER TABLE notifications DROP CONSTRAINT IF EXISTS notifications_type_check;
ALTER TABLE notifications ADD CONSTRAINT notifications_type_check
  CHECK (type IN ('like', 'comment', 'follow', 'mention', 'system', 'message', 'story_view', 'call'));

-- Add Daily.co room fields to calls table
ALTER TABLE calls ADD COLUMN IF NOT EXISTS room_name TEXT;
ALTER TABLE calls ADD COLUMN IF NOT EXISTS room_token TEXT;

-- Add duration_seconds column for call duration tracking
ALTER TABLE calls ADD COLUMN IF NOT EXISTS duration_seconds INTEGER;

-- Enable realtime on calls table (if not already)
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_publication_tables
    WHERE pubname = 'supabase_realtime'
      AND schemaname = 'public'
      AND tablename = 'calls'
  ) THEN
    ALTER PUBLICATION supabase_realtime ADD TABLE calls;
  END IF;
END
$$;
