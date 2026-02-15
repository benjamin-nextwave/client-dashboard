-- Phase 5: Inbox email cache and synced_leads extensions for reply functionality
-- Depends on: 20260216000002_synced_leads_and_analytics.sql (synced_leads table)

-- =============================================================================
-- EXTEND SYNCED_LEADS with inbox-related columns
-- =============================================================================

ALTER TABLE public.synced_leads ADD COLUMN IF NOT EXISTS linkedin_url TEXT;
ALTER TABLE public.synced_leads ADD COLUMN IF NOT EXISTS vacancy_url TEXT;
ALTER TABLE public.synced_leads ADD COLUMN IF NOT EXISTS client_has_replied BOOLEAN DEFAULT FALSE;
ALTER TABLE public.synced_leads ADD COLUMN IF NOT EXISTS reply_subject TEXT;
ALTER TABLE public.synced_leads ADD COLUMN IF NOT EXISTS reply_content TEXT;

-- =============================================================================
-- CACHED_EMAILS TABLE (email thread cache from Instantly API)
-- =============================================================================

CREATE TABLE public.cached_emails (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  client_id UUID NOT NULL REFERENCES public.clients(id) ON DELETE CASCADE,
  instantly_email_id TEXT NOT NULL UNIQUE,
  thread_id TEXT NOT NULL,
  lead_email TEXT NOT NULL,
  from_address TEXT NOT NULL,
  to_address TEXT NOT NULL,
  subject TEXT,
  body_text TEXT,
  body_html TEXT,
  is_reply BOOLEAN DEFAULT FALSE,
  sender_account TEXT,
  email_timestamp TIMESTAMPTZ,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

ALTER TABLE public.cached_emails ENABLE ROW LEVEL SECURITY;

-- =============================================================================
-- RLS POLICIES: cached_emails
-- =============================================================================

-- Clients can view their own cached emails
CREATE POLICY "Clients can view own cached emails" ON public.cached_emails
  FOR SELECT TO authenticated
  USING (client_id::TEXT = (SELECT auth.jwt() ->> 'client_id'));

-- Operators can view all cached emails
CREATE POLICY "Operators can view all cached emails" ON public.cached_emails
  FOR SELECT TO authenticated
  USING ((SELECT auth.jwt() ->> 'user_role') = 'operator');

-- =============================================================================
-- INDEXES
-- =============================================================================

CREATE INDEX idx_cached_emails_client_lead ON public.cached_emails(client_id, lead_email);
CREATE INDEX idx_cached_emails_thread ON public.cached_emails(thread_id);
