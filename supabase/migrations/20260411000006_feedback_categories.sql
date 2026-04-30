-- Expand feedback categories to include campaign-level feedback and
-- mail variants requests. Also store structured extras (sub-reasons) in
-- a metadata JSONB column.

ALTER TABLE public.feedback_requests
  DROP CONSTRAINT feedback_requests_category_check;

ALTER TABLE public.feedback_requests
  ADD CONSTRAINT feedback_requests_category_check CHECK (
    category IN (
      'bug',
      'new_feature',
      'optimization',
      'other',
      'campaign_performance',
      'new_mail_variants'
    )
  );

ALTER TABLE public.feedback_requests ADD COLUMN metadata JSONB;
