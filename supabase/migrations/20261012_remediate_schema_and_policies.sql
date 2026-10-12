-- ====================================================================
-- Production Database Remediation Migration
-- Project: dkkriesneublbmrihgvp (Client portal)
-- Generated: 2026-10-12
-- Safe, Idempotent, Additive Migration
-- ====================================================================

BEGIN;

-- --------------------------------------------------------------------
-- 1. Create Approval Center Tables & Indexes
-- --------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS public.approval_requests (
  id BIGINT GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
  project_id BIGINT NOT NULL REFERENCES public.projects(id) ON DELETE CASCADE,
  title TEXT NOT NULL,
  description TEXT NOT NULL,
  expected_benefit TEXT,
  cost_impact NUMERIC DEFAULT 0,
  timeline_impact TEXT,
  priority TEXT DEFAULT 'normal',
  due_date DATE,
  status TEXT DEFAULT 'pending',
  submitted_at TIMESTAMPTZ DEFAULT NOW(),
  decided_at TIMESTAMPTZ,
  created_by_email TEXT NOT NULL,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS public.approval_responses (
  id BIGINT GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
  request_id BIGINT NOT NULL REFERENCES public.approval_requests(id) ON DELETE CASCADE,
  reviewer_email TEXT NOT NULL,
  decision TEXT NOT NULL,
  feedback TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Enable RLS
ALTER TABLE public.approval_requests ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.approval_responses ENABLE ROW LEVEL SECURITY;

-- Indexes
CREATE INDEX IF NOT EXISTS idx_approval_requests_project_id ON public.approval_requests(project_id);
CREATE INDEX IF NOT EXISTS idx_approval_requests_status ON public.approval_requests(status);
CREATE INDEX IF NOT EXISTS idx_approval_responses_request_id ON public.approval_responses(request_id);

-- --------------------------------------------------------------------
-- 2. Approval Center RLS Policies & RPC
-- --------------------------------------------------------------------
DROP POLICY IF EXISTS "approval_requests_select" ON public.approval_requests;
CREATE POLICY "approval_requests_select" ON public.approval_requests
  FOR SELECT TO authenticated
  USING (
    public.is_admin() OR 
    project_id IN (SELECT id FROM public.projects WHERE client_id = public.my_client_id())
  );

DROP POLICY IF EXISTS "approval_requests_admin_write" ON public.approval_requests;
CREATE POLICY "approval_requests_admin_write" ON public.approval_requests
  FOR ALL TO authenticated
  USING (public.is_admin())
  WITH CHECK (public.is_admin());

DROP POLICY IF EXISTS "approval_responses_select" ON public.approval_responses;
CREATE POLICY "approval_responses_select" ON public.approval_responses
  FOR SELECT TO authenticated
  USING (
    public.is_admin() OR 
    request_id IN (
      SELECT ar.id FROM public.approval_requests ar
      JOIN public.projects p ON p.id = ar.project_id
      WHERE p.client_id = public.my_client_id()
    )
  );

-- RPC for client approval decisions
CREATE OR REPLACE FUNCTION public.respond_to_approval_request(
  p_request_id BIGINT,
  p_decision TEXT,
  p_feedback TEXT DEFAULT NULL
)
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_email TEXT := lower(coalesce(auth.jwt() ->> 'email', ''));
  v_request public.approval_requests%ROWTYPE;
  v_client_name TEXT;
BEGIN
  IF p_decision NOT IN ('approved', 'changes_requested', 'declined') THEN
    RAISE EXCEPTION 'Invalid approval decision: %', p_decision;
  END IF;

  SELECT ar.* INTO v_request
  FROM public.approval_requests ar
  JOIN public.projects p ON p.id = ar.project_id
  WHERE ar.id = p_request_id
    AND (public.is_admin() OR p.client_id = public.my_client_id())
  FOR UPDATE;

  IF NOT FOUND THEN
    RAISE EXCEPTION 'Approval request not found or access denied';
  END IF;

  INSERT INTO public.approval_responses (request_id, reviewer_email, decision, feedback)
  VALUES (p_request_id, v_email, p_decision, nullif(trim(coalesce(p_feedback, '')), ''));

  UPDATE public.approval_requests
  SET status = p_decision,
      decided_at = NOW(),
      updated_at = NOW()
  WHERE id = p_request_id;

  SELECT display_name INTO v_client_name
  FROM public.portal_users WHERE lower(email) = v_email LIMIT 1;

  INSERT INTO public.activity_log(project_id, type, text)
  VALUES (
    v_request.project_id,
    'update',
    CASE 
      WHEN p_decision = 'approved' THEN '✅ Approval request approved: ' || v_request.title
      WHEN p_decision = 'declined' THEN '❌ Approval request declined: ' || v_request.title
      ELSE '↩️ Changes requested: ' || v_request.title
    END
  );

  INSERT INTO public.notifications(type, message, client_name, client_email, related_id, is_read)
  VALUES (
    'message_sent',
    'Approval response (' || p_decision || ') for: ' || v_request.title,
    coalesce(v_client_name, 'Client'),
    v_email,
    p_request_id::text,
    false
  );

  RETURN jsonb_build_object('success', true, 'status', p_decision);
END;
$$;

-- --------------------------------------------------------------------
-- 3. Milestones: Admin Management Policy
-- --------------------------------------------------------------------
DROP POLICY IF EXISTS "milestones_admin_all" ON public.milestones;
CREATE POLICY "milestones_admin_all" ON public.milestones
  FOR ALL TO authenticated
  USING (public.is_admin())
  WITH CHECK (public.is_admin());

-- --------------------------------------------------------------------
-- 4. Contracts: Admin Update & Delete Policies
-- --------------------------------------------------------------------
DROP POLICY IF EXISTS "contracts_admin_update" ON public.contracts;
CREATE POLICY "contracts_admin_update" ON public.contracts
  FOR UPDATE TO authenticated
  USING (public.is_admin())
  WITH CHECK (public.is_admin());

DROP POLICY IF EXISTS "contracts_admin_delete" ON public.contracts;
CREATE POLICY "contracts_admin_delete" ON public.contracts
  FOR DELETE TO authenticated
  USING (public.is_admin());

-- --------------------------------------------------------------------
-- 5. Settings: Admin Manage Policy
-- --------------------------------------------------------------------
DROP POLICY IF EXISTS "settings_admin_all" ON public.settings;
CREATE POLICY "settings_admin_all" ON public.settings
  FOR ALL TO authenticated
  USING (public.is_admin())
  WITH CHECK (public.is_admin());

-- --------------------------------------------------------------------
-- 6. Meet Links: Client Read, Webhook Insert, Admin Manage
-- --------------------------------------------------------------------
DROP POLICY IF EXISTS "admin_only_select" ON public.meet_links;
DROP POLICY IF EXISTS "meet_links_admin_all" ON public.meet_links;
DROP POLICY IF EXISTS "meet_links_guest_select" ON public.meet_links;
DROP POLICY IF EXISTS "meet_links_insert_service" ON public.meet_links;

CREATE POLICY "meet_links_admin_all" ON public.meet_links
  FOR ALL TO authenticated
  USING (public.is_admin())
  WITH CHECK (public.is_admin());

CREATE POLICY "meet_links_guest_select" ON public.meet_links
  FOR SELECT TO authenticated
  USING (
    lower(guest_email) = lower(coalesce(auth.jwt() ->> 'email', ''))
  );

CREATE POLICY "meet_links_insert_service" ON public.meet_links
  FOR INSERT TO anon, authenticated
  WITH CHECK (true);

-- --------------------------------------------------------------------
-- 7. Supabase Realtime Publication Subscriptions
-- --------------------------------------------------------------------
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_publication_tables 
    WHERE pubname = 'supabase_realtime' AND tablename = 'contracts'
  ) THEN
    ALTER PUBLICATION supabase_realtime ADD TABLE public.contracts;
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM pg_publication_tables 
    WHERE pubname = 'supabase_realtime' AND tablename = 'deliverables'
  ) THEN
    ALTER PUBLICATION supabase_realtime ADD TABLE public.deliverables;
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM pg_publication_tables 
    WHERE pubname = 'supabase_realtime' AND tablename = 'approval_requests'
  ) THEN
    ALTER PUBLICATION supabase_realtime ADD TABLE public.approval_requests;
  END IF;
END $$;

COMMIT;
