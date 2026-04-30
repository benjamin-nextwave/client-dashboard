-- Meerdere campagne-flows per klant: weghalen UNIQUE op client_id + naam-kolom.
-- Sommige klanten hebben meerdere lopende campagnes; iedere flow krijgt een
-- naam (bv. "Outreach Q4", "B2B Tech") zodat klant + operator kunnen kiezen
-- welke flow ze bekijken.

ALTER TABLE public.campaign_flows
  DROP CONSTRAINT IF EXISTS campaign_flows_client_id_key;

ALTER TABLE public.campaign_flows
  ADD COLUMN IF NOT EXISTS name TEXT NOT NULL DEFAULT 'Standaard campagne';

CREATE INDEX IF NOT EXISTS idx_campaign_flows_client_created
  ON public.campaign_flows(client_id, created_at);
