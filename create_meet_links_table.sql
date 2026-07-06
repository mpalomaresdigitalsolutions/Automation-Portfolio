-- Run this in Supabase Dashboard → SQL Editor
-- Creates the meet_links table for storing Google Meet links

CREATE TABLE IF NOT EXISTS meet_links (
  id BIGINT GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
  guest_email TEXT NOT NULL,
  guest_name TEXT,
  meet_link TEXT NOT NULL,
  event_title TEXT,
  event_time TIMESTAMPTZ,
  status TEXT DEFAULT 'scheduled',
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Add RLS: allow inserts from anon key (for Apps Script)
ALTER TABLE meet_links ENABLE ROW LEVEL SECURITY;

-- Allow anyone with the anon key to insert meet links
CREATE POLICY "Allow insert meet_links" ON meet_links
  FOR INSERT WITH CHECK (true);

-- Allow anyone to select their own meet link by email
CREATE POLICY "Allow select own meet_links" ON meet_links
  FOR SELECT USING (true);
