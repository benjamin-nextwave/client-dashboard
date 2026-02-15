-- Phase 4: Synced leads and campaign analytics tables for Instantly data sync
-- Depends on: 20260215000001_initial_schema.sql (clients table)

-- =============================================================================
-- SYNCED_LEADS TABLE (lead data synced from Instantly API)
-- =============================================================================

CREATE TABLE public.synced_leads (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  client_id UUID NOT NULL REFERENCES public.clients(id) ON DELETE CASCADE,
  instantly_lead_id TEXT NOT NULL,
  campaign_id TEXT NOT NULL,        -- internal only, never exposed to client
  email TEXT NOT NULL,
  first_name TEXT,
  last_name TEXT,
  company_name TEXT,
  job_title TEXT,                   -- normalized from payload custom variables
  industry TEXT,                    -- normalized from payload custom variables
  company_size TEXT,                -- normalized from payload custom variables
  website TEXT,
  phone TEXT,
  lead_status TEXT,                 -- emailed, not_yet_emailed, replied, bounced
  interest_status TEXT,             -- positive, neutral, negative (from Instantly)
  sender_account TEXT,              -- which email account sent to this lead (for reply routing)
  email_sent_count INTEGER DEFAULT 0,
  email_reply_count INTEGER DEFAULT 0,
  payload JSONB,                    -- raw custom variables from Instantly
  last_synced_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  UNIQUE(client_id, instantly_lead_id, campaign_id)
);

ALTER TABLE public.synced_leads ENABLE ROW LEVEL SECURITY;

CREATE INDEX idx_synced_leads_client_id ON public.synced_leads(client_id);
CREATE INDEX idx_synced_leads_interest ON public.synced_leads(client_id, interest_status);

-- =============================================================================
-- CAMPAIGN_ANALYTICS TABLE (daily analytics snapshots synced from Instantly API)
-- =============================================================================

CREATE TABLE public.campaign_analytics (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  client_id UUID NOT NULL REFERENCES public.clients(id) ON DELETE CASCADE,
  campaign_id TEXT NOT NULL,        -- internal only, never exposed to client
  date DATE NOT NULL,
  emails_sent INTEGER DEFAULT 0,
  leads_contacted INTEGER DEFAULT 0,
  replies INTEGER DEFAULT 0,
  unique_replies INTEGER DEFAULT 0,
  bounced INTEGER DEFAULT 0,
  opened INTEGER DEFAULT 0,
  clicked INTEGER DEFAULT 0,
  last_synced_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  UNIQUE(client_id, campaign_id, date)
);

ALTER TABLE public.campaign_analytics ENABLE ROW LEVEL SECURITY;

CREATE INDEX idx_campaign_analytics_client_date ON public.campaign_analytics(client_id, date);

-- =============================================================================
-- RLS POLICIES: synced_leads
-- =============================================================================

-- Clients can view their own leads (aggregated queries only in app code)
CREATE POLICY "Clients can view own leads" ON public.synced_leads
  FOR SELECT TO authenticated
  USING (client_id::TEXT = (SELECT auth.jwt() ->> 'client_id'));

-- Operators can view all leads
CREATE POLICY "Operators can view all leads" ON public.synced_leads
  FOR SELECT TO authenticated
  USING ((SELECT auth.jwt() ->> 'user_role') = 'operator');

-- =============================================================================
-- RLS POLICIES: campaign_analytics
-- =============================================================================

-- Clients can view their own analytics (aggregated queries only in app code)
CREATE POLICY "Clients can view own analytics" ON public.campaign_analytics
  FOR SELECT TO authenticated
  USING (client_id::TEXT = (SELECT auth.jwt() ->> 'client_id'));

-- Operators can view all analytics
CREATE POLICY "Operators can view all analytics" ON public.campaign_analytics
  FOR SELECT TO authenticated
  USING ((SELECT auth.jwt() ->> 'user_role') = 'operator');
