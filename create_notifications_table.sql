-- Run this in your Supabase SQL Editor (https://supabase.com/dashboard/project/dkkriesneublbmrihgvp/sql/new)

CREATE TABLE IF NOT EXISTS notifications (
  id BIGINT GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
  type TEXT NOT NULL,
  message TEXT NOT NULL,
  client_name TEXT DEFAULT '',
  client_email TEXT DEFAULT '',
  related_id TEXT DEFAULT '',
  is_read BOOLEAN DEFAULT false,
  created_at TIMESTAMPTZ DEFAULT now()
);

-- Index for sorting (newest first)
CREATE INDEX IF NOT EXISTS idx_notifications_created_at ON notifications(created_at DESC);
-- Index for unread count
CREATE INDEX IF NOT EXISTS idx_notifications_is_read ON notifications(is_read);

-- Enable RLS but allow anon insert/select
ALTER TABLE notifications ENABLE ROW LEVEL SECURITY;

-- Allow anyone to insert (for client-side logging)
CREATE POLICY "Allow insert for all" ON notifications
  FOR INSERT WITH CHECK (true);

-- Allow anyone to select
CREATE POLICY "Allow select for all" ON notifications
  FOR SELECT USING (true);

-- Allow anyone to update (for marking as read)
CREATE POLICY "Allow update for all" ON notifications
  FOR UPDATE USING (true);
