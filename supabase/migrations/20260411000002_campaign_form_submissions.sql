-- Store each form submission as its own row so a client can submit
-- multiple times (operator-gated). The existing campaign_form_data /
-- campaign_form_submitted_at columns on `clients` stay as a denormalized
-- "latest submission" marker for the status tracker.

CREATE TABLE public.campaign_form_submissions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  client_id UUID NOT NULL REFERENCES public.clients(id) ON DELETE CASCADE,
  data JSONB NOT NULL,
  submitted_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX idx_campaign_form_submissions_client
  ON public.campaign_form_submissions(client_id, submitted_at DESC);

ALTER TABLE public.campaign_form_submissions ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Operators full access to campaign_form_submissions"
  ON public.campaign_form_submissions
  FOR ALL
  TO authenticated
  USING ((SELECT auth.jwt() ->> 'user_role') = 'operator')
  WITH CHECK ((SELECT auth.jwt() ->> 'user_role') = 'operator');

CREATE POLICY "Clients can view own campaign_form_submissions"
  ON public.campaign_form_submissions
  FOR SELECT
  TO authenticated
  USING (client_id::TEXT = (SELECT auth.jwt() ->> 'client_id'));

-- How many times the client is allowed to submit the form in total.
-- Default 1 (one-shot). Operator can bump this to let a client re-submit.
ALTER TABLE public.clients
  ADD COLUMN campaign_form_allowed_count INTEGER NOT NULL DEFAULT 1;

-- Backfill any existing submissions from the denormalized columns
INSERT INTO public.campaign_form_submissions (client_id, data, submitted_at)
SELECT id, campaign_form_data, campaign_form_submitted_at
FROM public.clients
WHERE campaign_form_data IS NOT NULL
  AND campaign_form_submitted_at IS NOT NULL;
