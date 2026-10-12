-- ========================================================
-- WEBSITE ANALYTICS & CLICK TRACKING TABLES
-- Run this in your Supabase SQL Editor (SQL Editor -> New Query)
-- ========================================================

-- 1. Table: analytics_pageviews
CREATE TABLE IF NOT EXISTS public.analytics_pageviews (
  id BIGINT PRIMARY KEY GENERATED ALWAYS AS IDENTITY,
  session_id TEXT NOT NULL,
  visitor_id TEXT,
  page_path TEXT NOT NULL,
  page_title TEXT,
  referrer TEXT,
  device_type TEXT DEFAULT 'desktop', -- 'desktop', 'mobile', 'tablet'
  browser TEXT,
  screen_resolution TEXT,
  duration_seconds INT DEFAULT 0,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- 2. Table: analytics_events (Clicks & Interactions)
CREATE TABLE IF NOT EXISTS public.analytics_events (
  id BIGINT PRIMARY KEY GENERATED ALWAYS AS IDENTITY,
  session_id TEXT NOT NULL,
  visitor_id TEXT,
  event_name TEXT NOT NULL,           -- e.g. 'click_cta', 'click_book', 'click_social', 'click_project', 'click_blog'
  element_text TEXT,                  -- Text on button/link (e.g. 'Book a 30-Min Strategy Call')
  element_id TEXT,
  element_class TEXT,
  target_url TEXT,                    -- e.g. 'book.html', 'https://github.com/...'
  page_path TEXT NOT NULL,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- 3. High-Performance Indexes for Rapid Dashboard Queries
CREATE INDEX IF NOT EXISTS idx_analytics_pageviews_created_at ON public.analytics_pageviews(created_at DESC);
CREATE INDEX IF NOT EXISTS idx_analytics_pageviews_page_path ON public.analytics_pageviews(page_path);
CREATE INDEX IF NOT EXISTS idx_analytics_pageviews_session_id ON public.analytics_pageviews(session_id);

CREATE INDEX IF NOT EXISTS idx_analytics_events_created_at ON public.analytics_events(created_at DESC);
CREATE INDEX IF NOT EXISTS idx_analytics_events_event_name ON public.analytics_events(event_name);
CREATE INDEX IF NOT EXISTS idx_analytics_events_page_path ON public.analytics_events(page_path);
CREATE INDEX IF NOT EXISTS idx_analytics_events_session_id ON public.analytics_events(session_id);

-- 4. Enable Row Level Security (RLS)
ALTER TABLE public.analytics_pageviews ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.analytics_events ENABLE ROW LEVEL SECURITY;

-- 5. RLS Policies: Public/Anonymous visitors can INSERT tracking records
DROP POLICY IF EXISTS "Anon can insert pageviews" ON public.analytics_pageviews;
CREATE POLICY "Anon can insert pageviews"
  ON public.analytics_pageviews FOR INSERT
  TO anon, authenticated
  WITH CHECK (true);

DROP POLICY IF EXISTS "Anon can insert analytics events" ON public.analytics_events;
CREATE POLICY "Anon can insert analytics events"
  ON public.analytics_events FOR INSERT
  TO anon, authenticated
  WITH CHECK (true);

-- 6. RLS Policies: Reading data is open for authenticated users & anon dashboard
-- (Allows dashboard to query metrics seamlessly while preventing unauthorized deletes/updates)
DROP POLICY IF EXISTS "Allow select pageviews" ON public.analytics_pageviews;
CREATE POLICY "Allow select pageviews"
  ON public.analytics_pageviews FOR SELECT
  TO anon, authenticated
  USING (true);

DROP POLICY IF EXISTS "Allow select analytics events" ON public.analytics_events;
CREATE POLICY "Allow select analytics events"
  ON public.analytics_events FOR SELECT
  TO anon, authenticated
  USING (true);

-- 7. Seed Sample Data (Optional: only if empty to give dashboard immediate demo records)
INSERT INTO public.analytics_pageviews (session_id, visitor_id, page_path, page_title, referrer, device_type, browser, screen_resolution, duration_seconds, created_at)
SELECT 'demo-sess-01', 'demo-vis-01', '/', 'Google Ads & AI Automation Specialist | Marlon Palomares', 'https://www.google.com', 'desktop', 'Chrome', '1920x1080', 145, NOW() - INTERVAL '1 hour'
WHERE NOT EXISTS (SELECT 1 FROM public.analytics_pageviews LIMIT 1);

INSERT INTO public.analytics_events (session_id, visitor_id, event_name, element_text, element_id, element_class, target_url, page_path, created_at)
SELECT 'demo-sess-01', 'demo-vis-01', 'click_cta', 'Book a 30-Min Strategy Call →', 'bookCtaBtn', 'btn-cta', 'book.html', '/', NOW() - INTERVAL '58 minutes'
WHERE NOT EXISTS (SELECT 1 FROM public.analytics_events LIMIT 1);
