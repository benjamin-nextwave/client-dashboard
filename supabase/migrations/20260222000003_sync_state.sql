-- =============================================================================
-- SYNC STATE TABLE (tracks incremental sync cursors per campaign)
-- =============================================================================
-- Stores the last-fetched email timestamp and lead count per campaign
-- so that subsequent syncs only fetch new data instead of everything.

CREATE TABLE public.sync_state (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  client_id UUID NOT NULL REFERENCES public.clients(id) ON DELETE CASCADE,
  campaign_id TEXT NOT NULL,
  last_email_timestamp TIMESTAMPTZ,
  last_lead_count INTEGER DEFAULT 0,
  last_analytics_sync TIMESTAMPTZ,
  last_full_sync TIMESTAMPTZ,
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  UNIQUE(client_id, campaign_id)
);

ALTER TABLE public.sync_state ENABLE ROW LEVEL SECURITY;

CREATE INDEX idx_sync_state_client ON public.sync_state(client_id);

-- Only operators and service role need access (sync runs server-side)
CREATE POLICY "Operators can view sync state" ON public.sync_state
  FOR ALL TO authenticated
  USING ((SELECT auth.jwt() ->> 'user_role') = 'operator')
  WITH CHECK ((SELECT auth.jwt() ->> 'user_role') = 'operator');
