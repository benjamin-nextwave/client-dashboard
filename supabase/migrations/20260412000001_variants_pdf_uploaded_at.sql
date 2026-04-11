-- Track when the mail variants PDF was last uploaded, so the client-side
-- approval block can detect updates and prompt re-approval.
ALTER TABLE public.clients
  ADD COLUMN campaign_variants_pdf_uploaded_at TIMESTAMPTZ;
