-- ============================================
-- CLIENT PORTAL — Supabase Schema
-- Run this in Supabase SQL Editor
-- ============================================

-- 1. CLIENTS table
CREATE TABLE clients (
  id BIGINT PRIMARY KEY GENERATED ALWAYS AS IDENTITY,
  name TEXT NOT NULL,
  email TEXT NOT NULL UNIQUE,
  company TEXT,
  phone TEXT,
  avatar_initials TEXT DEFAULT 'MP',
  avatar_color TEXT DEFAULT 'av-blue',
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- 2. PROJECTS table
CREATE TABLE projects (
  id BIGINT PRIMARY KEY GENERATED ALWAYS AS IDENTITY,
  client_id BIGINT NOT NULL REFERENCES clients(id) ON DELETE CASCADE,
  name TEXT NOT NULL,
  type TEXT NOT NULL,
  status TEXT DEFAULT 'active' CHECK (status IN ('active','review','completed','hold')),
  budget NUMERIC(10,2) DEFAULT 0,
  total_paid NUMERIC(10,2) DEFAULT 0,
  outstanding NUMERIC(10,2) DEFAULT 0,
  start_date DATE DEFAULT NOW(),
  deadline TEXT DEFAULT 'Ongoing',
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- 3. INVOICES table
CREATE TABLE invoices (
  id BIGINT PRIMARY KEY GENERATED ALWAYS AS IDENTITY,
  project_id BIGINT NOT NULL REFERENCES projects(id) ON DELETE CASCADE,
  invoice_num TEXT NOT NULL UNIQUE,
  title TEXT,
  amount NUMERIC(10,2) NOT NULL,
  due_date DATE NOT NULL,
  status TEXT DEFAULT 'sent' CHECK (status IN ('paid','sent','pending','overdue')),
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- 4. DELIVERABLES table
CREATE TABLE deliverables (
  id BIGINT PRIMARY KEY GENERATED ALWAYS AS IDENTITY,
  project_id BIGINT NOT NULL REFERENCES projects(id) ON DELETE CASCADE,
  name TEXT NOT NULL,
  file_size TEXT,
  uploaded_at TIMESTAMPTZ DEFAULT NOW()
);

-- 5. ACTIVITY LOG table
CREATE TABLE activity_log (
  id BIGINT PRIMARY KEY GENERATED ALWAYS AS IDENTITY,
  project_id BIGINT NOT NULL REFERENCES projects(id) ON DELETE CASCADE,
  type TEXT NOT NULL CHECK (type IN ('created','invoice','payment','update')),
  text TEXT NOT NULL,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- 6. USERS table (for auth)
CREATE TABLE portal_users (
  id BIGINT PRIMARY KEY GENERATED ALWAYS AS IDENTITY,
  email TEXT NOT NULL UNIQUE,
  role TEXT DEFAULT 'client' CHECK (role IN ('admin','client')),
  client_id BIGINT REFERENCES clients(id) ON DELETE SET NULL,
  display_name TEXT NOT NULL,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Row Level Security
ALTER TABLE clients ENABLE ROW LEVEL SECURITY;
ALTER TABLE projects ENABLE ROW LEVEL SECURITY;
ALTER TABLE invoices ENABLE ROW LEVEL SECURITY;
ALTER TABLE deliverables ENABLE ROW LEVEL SECURITY;
ALTER TABLE activity_log ENABLE ROW LEVEL SECURITY;
ALTER TABLE portal_users ENABLE ROW LEVEL SECURITY;

-- IMPORTANT: do not use permissive USING (true) policies here. After creating
-- the schema, run secure-rls-migration.sql to install tenant-aware policies.

-- Insert sample admin
INSERT INTO portal_users (email, role, display_name)
VALUES ('admin@mpalomares.com', 'admin', 'Marlo Palomares');

-- Insert sample clients
INSERT INTO clients (name, email, company, avatar_initials, avatar_color)
VALUES 
  ('CleanOut Pro', 'cleanout@example.com', 'CleanOut Pro Junk Removal', 'CP', 'av-blue'),
  ('FlowFix Plumbing', 'flowfix@example.com', 'FlowFix Plumbing Services', 'FP', 'av-purple'),
  ('Humanity Impact Institute', 'hi@example.com', 'Humanity Impact Institute', 'HI', 'av-green');

-- Insert sample projects
INSERT INTO projects (client_id, name, type, status, budget, total_paid, outstanding, start_date, deadline)
VALUES
  (1, 'CleanOut Pro', 'Google Ads Management', 'active', 10000, 20000, 10000, '2026-01-15', 'Ongoing'),
  (2, 'FlowFix Plumbing', 'GHL + Zapier Automation', 'review', 25000, 12500, 12500, '2026-03-01', 'Apr 30, 2026'),
  (3, 'Humanity Impact Institute', 'Google Ads Grant (Nonprofit)', 'completed', 5000, 5000, 0, '2025-11-10', 'Feb 28, 2026');

-- Insert sample invoices
INSERT INTO invoices (project_id, invoice_num, title, amount, due_date, status)
VALUES
  (1, '#IV-00001', 'January 2026 Management', 10000, '2026-02-15', 'paid'),
  (1, '#IV-00004', 'February 2026 Management', 10000, '2026-03-15', 'paid'),
  (1, '#IV-00007', 'March 2026 Management', 10000, '2026-04-15', 'sent'),
  (2, '#IV-00002', 'Phase 1 - CRM Setup', 12500, '2026-03-15', 'paid'),
  (2, '#IV-00005', 'Phase 2 - Automation Build', 12500, '2026-04-30', 'sent'),
  (3, '#IV-00003', 'Grant Setup & Optimization', 5000, '2025-12-10', 'paid');

-- Insert sample deliverables
INSERT INTO deliverables (project_id, name, file_size)
VALUES
  (1, 'Q1 Campaign Report.pdf', '2.4 MB'),
  (1, 'Keyword Strategy v2.xlsx', '156 KB'),
  (1, 'Ad Copy Variants.docx', '89 KB'),
  (2, 'GHL Pipeline Setup.png', '1.1 MB'),
  (2, 'Zapier Workflow Map.pdf', '340 KB'),
  (3, 'Final Performance Report.pdf', '3.2 MB'),
  (3, 'Grant Account Screenshot.png', '890 KB');

-- Insert sample activity
INSERT INTO activity_log (project_id, type, text, created_at)
VALUES
  (1, 'invoice', 'Invoice #IV-00007 sent - ₱10,000', '2026-04-01 10:00:00+08'),
  (1, 'update', 'Campaign report uploaded: Q1 Campaign Report.pdf', '2026-03-31 16:30:00+08'),
  (1, 'payment', 'Payment received for #IV-00004 - ₱10,000', '2026-03-12 14:15:00+08'),
  (1, 'update', 'Keyword strategy updated - 24 new keywords added', '2026-02-20 11:00:00+08'),
  (1, 'created', 'Project created - Google Ads Management engagement', '2026-01-15 09:00:00+08'),
  (2, 'invoice', 'Invoice #IV-00005 sent - ₱12,500', '2026-04-10 09:00:00+08'),
  (2, 'update', 'Zapier workflow map uploaded for review', '2026-03-22 15:00:00+08'),
  (2, 'payment', 'Payment received for #IV-00002 - ₱12,500', '2026-03-14 11:30:00+08'),
  (2, 'created', 'Project created - GHL + Zapier Automation', '2026-03-01 10:00:00+08'),
  (3, 'update', 'Project marked as completed', '2026-02-28 17:00:00+08'),
  (3, 'update', 'Final report uploaded - 67% waste cut, 211% conversion lift', '2026-02-28 16:45:00+08'),
  (3, 'payment', 'Payment received for #IV-00003 - ₱5,000', '2025-12-08 10:00:00+08'),
  (3, 'created', 'Project created - Google Ads Grant Optimization', '2025-11-10 14:00:00+08');
