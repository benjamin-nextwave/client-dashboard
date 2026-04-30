-- Campaign proposals: operator can write a textual campaign change
-- proposal that the client must approve from their dashboard.
ALTER TABLE public.clients
  ADD COLUMN campaign_proposal_title TEXT,
  ADD COLUMN campaign_proposal_body TEXT,
  ADD COLUMN campaign_proposal_published_at TIMESTAMPTZ,
  ADD COLUMN campaign_proposal_acknowledged_at TIMESTAMPTZ;
