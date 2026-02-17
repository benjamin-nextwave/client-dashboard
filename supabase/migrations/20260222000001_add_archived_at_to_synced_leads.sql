-- Add archived_at column to synced_leads for "Afgehandeld" folder functionality
ALTER TABLE public.synced_leads ADD COLUMN archived_at TIMESTAMPTZ;
