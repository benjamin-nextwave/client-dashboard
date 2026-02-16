-- Add opened_at column to synced_leads for read/unread tracking
-- When null, the lead has not been opened by the client yet

ALTER TABLE public.synced_leads ADD COLUMN IF NOT EXISTS opened_at TIMESTAMPTZ;
