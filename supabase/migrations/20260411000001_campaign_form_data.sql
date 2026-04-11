-- Store the submitted campaign onboarding form answers as JSONB
ALTER TABLE public.clients ADD COLUMN campaign_form_data JSONB;
