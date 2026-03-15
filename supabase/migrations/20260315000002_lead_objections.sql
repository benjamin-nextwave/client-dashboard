-- Add objection fields to synced_leads
ALTER TABLE public.synced_leads
  ADD COLUMN objection_status TEXT CHECK (objection_status IN ('submitted', 'approved', 'rejected')),
  ADD COLUMN objection_data JSONB;
