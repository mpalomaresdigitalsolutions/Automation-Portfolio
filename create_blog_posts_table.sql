-- ============================================
-- BLOG POSTS TABLE & RLS POLICIES
-- Run this in your Supabase SQL Editor
-- ============================================

CREATE TABLE IF NOT EXISTS blog_posts (
  id BIGINT PRIMARY KEY GENERATED ALWAYS AS IDENTITY,
  title TEXT NOT NULL,
  slug TEXT NOT NULL UNIQUE,
  excerpt TEXT,
  content TEXT NOT NULL,
  cover_image TEXT,
  category TEXT DEFAULT 'Automation',
  tags TEXT[] DEFAULT '{}',
  status TEXT DEFAULT 'draft' CHECK (status IN ('draft', 'published')),
  author_name TEXT DEFAULT 'Marlon Palomares',
  read_time_minutes INT DEFAULT 5,
  views_count INT DEFAULT 0,
  published_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Index on slug and status for fast lookups
CREATE INDEX IF NOT EXISTS idx_blog_posts_slug ON blog_posts(slug);
CREATE INDEX IF NOT EXISTS idx_blog_posts_status ON blog_posts(status);
CREATE INDEX IF NOT EXISTS idx_blog_posts_published_at ON blog_posts(published_at DESC);

-- Enable Row Level Security
ALTER TABLE blog_posts ENABLE ROW LEVEL SECURITY;

-- 1. Public can read published posts
DROP POLICY IF EXISTS "Public can view published blog posts" ON blog_posts;
CREATE POLICY "Public can view published blog posts"
  ON blog_posts FOR SELECT
  TO anon, authenticated
  USING (status = 'published');

-- 2. Authenticated Admins have full access (select, insert, update, delete)
DROP POLICY IF EXISTS "Admins full access on blog posts" ON blog_posts;
CREATE POLICY "Admins full access on blog posts"
  ON blog_posts FOR ALL
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM portal_users
      WHERE portal_users.email = auth.jwt() ->> 'email'
      AND portal_users.role = 'admin'
    )
  )
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM portal_users
      WHERE portal_users.email = auth.jwt() ->> 'email'
      AND portal_users.role = 'admin'
    )
  );

-- Sample starter posts
INSERT INTO blog_posts (title, slug, excerpt, content, cover_image, category, tags, status, published_at, read_time_minutes)
VALUES
(
  'How to Build an Autonomous Lead Qualification Pipeline with n8n and AI',
  'how-to-build-autonomous-lead-qualification-n8n-ai',
  'Discover how connecting webhooks, LLM evaluation, and CRM routing eliminates 90% of manual lead triage while increasing reply speed.',
  '## The Problem with Manual Lead Triage

Most service businesses lose hot leads in the first 15 minutes. When someone submits a contact form, they are actively looking for a solution. If your team takes hours to respond, that lead has already booked with a competitor.

### How the n8n Workflow Works

By setting up an event-driven workflow in **n8n**, we can intercept incoming inquiries instantly:

1. **Webhook Trigger**: Catches incoming form submissions from web landing pages or ad campaigns.
2. **Data Sanitization**: Cleans phone numbers, normalizes email addresses, and checks company domains.
3. **AI Qualification Agent**: Passes the inquiry to an LLM evaluator (like DeepSeek or Claude) with custom scoring rubric.
4. **CRM Dispatch**: Automatically creates the contact in GoHighLevel with high-priority tags.
5. **Instant SMS/Email Outreach**: Sends a personalized confirmation with booking link.

```javascript
// Sample scoring rule snippet
if (lead.budget >= 1500 && lead.timeline === "immediate") {
  return { priority: "HOT", routing: "instant_booking" };
}
```

### Results & Impact
Implementing this setup for local contractor and home service clients reduced response times from 3.5 hours down to **under 45 seconds**, boosting closed discovery calls by over 38%.',
  'https://images.unsplash.com/photo-1518770660439-4636190af475?auto=format&fit=crop&w=1200&q=80',
  'Automation',
  ARRAY['n8n', 'AI', 'CRM', 'GoHighLevel'],
  'published',
  NOW() - INTERVAL '2 days',
  6
),
(
  'Top 5 Zapier Workflows Every High-Growth Agency Needs in 2026',
  'top-5-zapier-workflows-high-growth-agency-2026',
  'A breakdown of the essential automations that streamline client onboarding, invoice reconciliation, and cross-channel task alerts.',
  '## Why Modern Agencies Fail to Scale

Scaling an agency is rarely a sales problem—it is almost always an operational bottleneck. When new clients sign on, onboarding checklists get delayed, Google Drive folders are created manually, and project managers spend hours copy-pasting data.

### 1. Instant Client Workspace Onboarding
Whenever a contract is signed in DocuSign or an initial retainer invoice is paid in Stripe:
- Auto-generate the client Notion/ClickUp workspace.
- Provision shared Google Drive directories with template assets.
- Post welcome message to private Slack channel.

### 2. Multi-Channel Alert Aggregation
Cut down notification fatigue by routing high-priority client emails, Stripe disputes, and appointment cancellations into a unified incident feed.

### 3. Automated Weekly Performance Digest
Pull Google Ads and Meta Ads metrics every Monday at 8:00 AM, format a clean summary table, and send it directly to the client without human intervention.

### Summary
Automation is leverage. When you build reliable workflows, your team focuses on high-leverage strategy rather than repetitive admin work.',
  'https://images.unsplash.com/photo-1451187580459-43490279c0fa?auto=format&fit=crop&w=1200&q=80',
  'Zapier',
  ARRAY['Zapier', 'Productivity', 'Agency', 'Operations'],
  'published',
  NOW() - INTERVAL '5 days',
  5
);

-- ========================================================
-- OPTIONAL: STORAGE BUCKET FOR BLOG MEDIA (IMAGES & VIDEOS)
-- ========================================================
INSERT INTO storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
VALUES (
  'blog-media',
  'blog-media',
  true,
  52428800,
  ARRAY['image/jpeg', 'image/png', 'image/webp', 'image/gif', 'image/svg+xml', 'video/mp4', 'video/webm', 'video/ogg', 'video/quicktime']
)
ON CONFLICT (id) DO UPDATE SET public = true;

DROP POLICY IF EXISTS "Public can view blog media" ON storage.objects;
CREATE POLICY "Public can view blog media"
ON storage.objects FOR SELECT
TO anon, authenticated
USING (bucket_id = 'blog-media');

DROP POLICY IF EXISTS "Authenticated users can upload blog media" ON storage.objects;
CREATE POLICY "Authenticated users can upload blog media"
ON storage.objects FOR INSERT
TO authenticated
WITH CHECK (bucket_id = 'blog-media');
