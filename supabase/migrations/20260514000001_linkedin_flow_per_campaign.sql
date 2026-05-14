-- Move LinkedIn flow data from `clients` (one per client) to `campaign_flows`
-- (one per mail flow), so a client with multiple campaigns can run a
-- different LinkedIn sequence per campaign.
--
-- The existing client-level columns from 20260513000004_linkedin_flow.sql
-- stay in place for safety; the application stops reading them after this
-- migration and they can be dropped in a future cleanup.

ALTER TABLE public.campaign_flows
  ADD COLUMN linkedin_flow_enabled BOOLEAN NOT NULL DEFAULT FALSE,
  ADD COLUMN linkedin_message_day_plus_1 TEXT NOT NULL DEFAULT '',
  ADD COLUMN linkedin_message_day_plus_4 TEXT NOT NULL DEFAULT '',
  ADD COLUMN linkedin_message_day_plus_9 TEXT NOT NULL DEFAULT '',
  ADD COLUMN linkedin_message_day_plus_14 TEXT NOT NULL DEFAULT '',
  ADD COLUMN linkedin_flow_published_at TIMESTAMPTZ,
  ADD COLUMN linkedin_flow_approved_at TIMESTAMPTZ;

-- Backfill: copy each client's current LinkedIn state onto every existing
-- flow for that client. All of a client's flows start with identical
-- LinkedIn content; the operator can diverge them from there.
UPDATE public.campaign_flows cf
SET
  linkedin_flow_enabled = c.linkedin_flow_enabled,
  linkedin_message_day_plus_1 = c.linkedin_message_day_plus_1,
  linkedin_message_day_plus_4 = c.linkedin_message_day_plus_4,
  linkedin_message_day_plus_9 = c.linkedin_message_day_plus_9,
  linkedin_message_day_plus_14 = c.linkedin_message_day_plus_14,
  linkedin_flow_published_at = c.linkedin_flow_published_at,
  linkedin_flow_approved_at = c.linkedin_flow_approved_at
FROM public.clients c
WHERE cf.client_id = c.id;
