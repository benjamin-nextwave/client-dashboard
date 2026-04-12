-- Track when operator last published variants to client dashboard
-- and when they last mailed the client about it, so these actions
-- appear on the operator activity timeline.
ALTER TABLE public.clients
  ADD COLUMN campaign_variants_last_published_at TIMESTAMPTZ,
  ADD COLUMN campaign_client_mailed_at TIMESTAMPTZ;
