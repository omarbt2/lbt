-- RLS policies for calls table
-- Enable RLS if not already enabled
ALTER TABLE calls ENABLE ROW LEVEL SECURITY;

-- Allow authenticated users to insert calls where they are the caller
DROP POLICY IF EXISTS "Users can create calls" ON calls;
CREATE POLICY "Users can create calls" ON calls
  FOR INSERT WITH CHECK (auth.uid() = caller_id);

-- Allow users to read calls they are involved in
DROP POLICY IF EXISTS "Users can read own calls" ON calls;
CREATE POLICY "Users can read own calls" ON calls
  FOR SELECT USING (auth.uid() = caller_id OR auth.uid() = receiver_id);

-- Allow users to update calls they are involved in
DROP POLICY IF EXISTS "Users can update own calls" ON calls;
CREATE POLICY "Users can update own calls" ON calls
  FOR UPDATE USING (auth.uid() = caller_id OR auth.uid() = receiver_id);

-- Ensure started_at has a default so inserts don't fail
ALTER TABLE calls ALTER COLUMN started_at SET DEFAULT NOW();
