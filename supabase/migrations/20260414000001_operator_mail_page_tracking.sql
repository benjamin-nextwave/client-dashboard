-- Track the last mail sent via the operator "Mailen" page so it
-- appears on the activity timeline.
ALTER TABLE public.clients
  ADD COLUMN operator_mail_page_sent_at TIMESTAMPTZ,
  ADD COLUMN operator_mail_page_category TEXT;
