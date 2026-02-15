-- Migration: Add is_excluded column for contact preview exclusions
-- Allows clients to soft-delete contacts from the preview so they won't be emailed

-- Add is_excluded column
ALTER TABLE public.synced_leads
ADD COLUMN IF NOT EXISTS is_excluded BOOLEAN DEFAULT FALSE;

-- Partial index for preview queries: only not_yet_emailed + not excluded
CREATE INDEX IF NOT EXISTS idx_synced_leads_preview
ON public.synced_leads(client_id, lead_status, is_excluded)
WHERE lead_status = 'not_yet_emailed' AND is_excluded = FALSE;

-- RLS UPDATE policy: Clients can exclude their own leads
CREATE POLICY "Clients can exclude own leads"
ON public.synced_leads
FOR UPDATE
TO authenticated
USING (client_id::TEXT = (SELECT auth.jwt() ->> 'client_id'))
WITH CHECK (client_id::TEXT = (SELECT auth.jwt() ->> 'client_id'));
