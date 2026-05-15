-- =============================================================================
-- MAIL VARIANT FEEDBACK — BODY SNAPSHOT FOR TIMELINE
-- =============================================================================
-- When a client submits feedback we want to remember exactly what the
-- variant looked like at that moment, so the timeline view can show the
-- original body+subject next to the highlighted feedback — even after the
-- operator has edited the variant later on.
--
-- These are nullable so existing rows keep working; new submissions are
-- always written with snapshots populated by commitMailVariantDecisions.
-- =============================================================================

ALTER TABLE public.mail_variant_feedback_submissions
  ADD COLUMN variant_subject_snapshot TEXT,
  ADD COLUMN variant_body_snapshot TEXT,
  ADD COLUMN variant_example_body_snapshot TEXT,
  ADD COLUMN variant_label_snapshot TEXT,
  ADD COLUMN variant_explanation_snapshot TEXT;

-- Best-effort backfill: only copy from the current mail_variants row when
-- the variant hasn't been edited since the feedback was submitted (i.e.
-- the version snapshot matches the variant's current updated_at). For all
-- other rows we leave snapshots NULL; the timeline UI falls back gracefully.
UPDATE public.mail_variant_feedback_submissions s
SET
  variant_subject_snapshot = m.subject,
  variant_body_snapshot = m.body,
  variant_example_body_snapshot = m.example_body,
  variant_label_snapshot = m.variant_label,
  variant_explanation_snapshot = m.explanation
FROM public.mail_variants m
WHERE s.mail_variant_id = m.id
  AND s.variant_body_snapshot IS NULL
  AND s.variant_version = m.updated_at;
