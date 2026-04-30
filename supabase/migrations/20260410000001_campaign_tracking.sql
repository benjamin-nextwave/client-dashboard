-- Campaign tracking: state columns on clients + mail_variants table

-- =============================================================================
-- CLIENTS: campaign tracking fields
-- =============================================================================

ALTER TABLE public.clients
  ADD COLUMN campaign_form_submitted_at TIMESTAMPTZ,
  ADD COLUMN campaign_mail_drafts_ready BOOLEAN NOT NULL DEFAULT FALSE,
  ADD COLUMN campaign_preview_filled BOOLEAN NOT NULL DEFAULT FALSE,
  ADD COLUMN campaign_approval_deadline DATE,
  ADD COLUMN campaign_preview_approval_requested_at TIMESTAMPTZ,
  ADD COLUMN campaign_preview_approved_at TIMESTAMPTZ,
  ADD COLUMN campaign_variants_approval_requested_at TIMESTAMPTZ,
  ADD COLUMN campaign_variants_approved_at TIMESTAMPTZ,
  ADD COLUMN campaign_completed_at TIMESTAMPTZ;

-- =============================================================================
-- MAIL VARIANTS
-- =============================================================================

CREATE TABLE public.mail_variants (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  client_id UUID NOT NULL REFERENCES public.clients(id) ON DELETE CASCADE,
  mail_number INTEGER NOT NULL CHECK (mail_number IN (1, 2, 3)),
  variant_label TEXT NOT NULL,
  subject TEXT NOT NULL DEFAULT '',
  body TEXT NOT NULL DEFAULT '',
  explanation TEXT NOT NULL DEFAULT '',
  position INTEGER NOT NULL DEFAULT 0,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX idx_mail_variants_client ON public.mail_variants(client_id, mail_number, position);

ALTER TABLE public.mail_variants ENABLE ROW LEVEL SECURITY;

-- Operators full access
CREATE POLICY "Operators full access to mail_variants"
  ON public.mail_variants
  FOR ALL
  TO authenticated
  USING ((SELECT auth.jwt() ->> 'user_role') = 'operator')
  WITH CHECK ((SELECT auth.jwt() ->> 'user_role') = 'operator');

-- Clients can view their own variants (only after operator has requested approval)
CREATE POLICY "Clients can view own mail_variants"
  ON public.mail_variants
  FOR SELECT
  TO authenticated
  USING (
    client_id::TEXT = (SELECT auth.jwt() ->> 'client_id')
    AND EXISTS (
      SELECT 1 FROM public.clients c
      WHERE c.id = mail_variants.client_id
      AND c.campaign_variants_approval_requested_at IS NOT NULL
    )
  );
