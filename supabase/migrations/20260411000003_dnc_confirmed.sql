-- Lets the client mark their DNC step as completed
ALTER TABLE public.clients ADD COLUMN campaign_dnc_confirmed_at TIMESTAMPTZ;
