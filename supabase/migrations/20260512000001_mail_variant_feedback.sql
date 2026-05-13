-- =============================================================================
-- MAIL VARIANT PER-VARIANT APPROVAL + IN-CONTEXT FEEDBACK
-- =============================================================================
-- Adds two capabilities on top of the existing mail_variants flow without
-- removing or changing existing functionality:
--   1. Per-variant client approval (next to the existing global
--      mail_variants_last_acknowledged_at on clients, which keeps working).
--   2. Structured per-passage feedback the client can leave on a variant
--      (replace_with / remove / other) plus optional general feedback.
--
-- All existing rows / PDFs / mail drafts remain intact. New columns are
-- nullable with default NULL; new tables are additive.
-- =============================================================================

-- --- Per-variant approval + feedback state on mail_variants -------------------
-- "_version" columns store a snapshot of mail_variants.updated_at at the
-- moment of the client action. When the operator edits the variant later,
-- updated_at moves forward and the snapshot becomes stale, which surfaces
-- the variant as "open" again for the client.
ALTER TABLE public.mail_variants
  ADD COLUMN client_approved_at TIMESTAMPTZ,
  ADD COLUMN client_approved_version TIMESTAMPTZ,
  ADD COLUMN client_feedback_submitted_at TIMESTAMPTZ,
  ADD COLUMN client_feedback_submitted_version TIMESTAMPTZ;

CREATE INDEX idx_mail_variants_client_approved
  ON public.mail_variants(client_id, client_approved_at);

-- --- Submission rows (one row per "Indienen" click per variant) ---------------
CREATE TABLE public.mail_variant_feedback_submissions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  mail_variant_id UUID NOT NULL REFERENCES public.mail_variants(id) ON DELETE CASCADE,
  client_id UUID NOT NULL REFERENCES public.clients(id) ON DELETE CASCADE,
  general_feedback TEXT,
  variant_version TIMESTAMPTZ NOT NULL,
  submitted_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX idx_mvf_submissions_variant
  ON public.mail_variant_feedback_submissions(mail_variant_id, submitted_at DESC);
CREATE INDEX idx_mvf_submissions_client
  ON public.mail_variant_feedback_submissions(client_id, submitted_at DESC);

-- --- Passage-level items belonging to a submission ----------------------------
CREATE TABLE public.mail_variant_feedback_items (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  submission_id UUID NOT NULL REFERENCES public.mail_variant_feedback_submissions(id) ON DELETE CASCADE,
  selection_text TEXT NOT NULL,
  selection_start INTEGER NOT NULL,
  selection_end INTEGER NOT NULL,
  action_type TEXT NOT NULL CHECK (action_type IN ('replace_with', 'remove', 'other')),
  feedback_text TEXT,
  position INTEGER NOT NULL DEFAULT 0,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX idx_mvf_items_submission
  ON public.mail_variant_feedback_items(submission_id, position);

-- --- RLS ----------------------------------------------------------------------
ALTER TABLE public.mail_variant_feedback_submissions ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.mail_variant_feedback_items ENABLE ROW LEVEL SECURITY;

-- Submissions: clients can see + insert their own; operators full access
CREATE POLICY "Operators full access to mvf_submissions"
  ON public.mail_variant_feedback_submissions
  FOR ALL
  TO authenticated
  USING ((SELECT auth.jwt() ->> 'user_role') = 'operator')
  WITH CHECK ((SELECT auth.jwt() ->> 'user_role') = 'operator');

CREATE POLICY "Clients can view own mvf_submissions"
  ON public.mail_variant_feedback_submissions
  FOR SELECT
  TO authenticated
  USING (client_id::TEXT = (SELECT auth.jwt() ->> 'client_id'));

CREATE POLICY "Clients can insert own mvf_submissions"
  ON public.mail_variant_feedback_submissions
  FOR INSERT
  TO authenticated
  WITH CHECK (client_id::TEXT = (SELECT auth.jwt() ->> 'client_id'));

-- Items: access is derived from the parent submission's client_id
CREATE POLICY "Operators full access to mvf_items"
  ON public.mail_variant_feedback_items
  FOR ALL
  TO authenticated
  USING ((SELECT auth.jwt() ->> 'user_role') = 'operator')
  WITH CHECK ((SELECT auth.jwt() ->> 'user_role') = 'operator');

CREATE POLICY "Clients can view own mvf_items"
  ON public.mail_variant_feedback_items
  FOR SELECT
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM public.mail_variant_feedback_submissions s
      WHERE s.id = submission_id
        AND s.client_id::TEXT = (SELECT auth.jwt() ->> 'client_id')
    )
  );

CREATE POLICY "Clients can insert own mvf_items"
  ON public.mail_variant_feedback_items
  FOR INSERT
  TO authenticated
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM public.mail_variant_feedback_submissions s
      WHERE s.id = submission_id
        AND s.client_id::TEXT = (SELECT auth.jwt() ->> 'client_id')
    )
  );
