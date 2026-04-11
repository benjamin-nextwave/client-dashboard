-- Per-variant publish flag: lets the operator individually add/remove
-- variants from the client dashboard without deleting them.
ALTER TABLE public.mail_variants
  ADD COLUMN is_published BOOLEAN NOT NULL DEFAULT FALSE;

-- Backfill: any variants that existed before this migration were implicitly
-- visible when approval was requested, so mark them as published.
UPDATE public.mail_variants mv
SET is_published = TRUE
FROM public.clients c
WHERE mv.client_id = c.id
  AND c.campaign_variants_approval_requested_at IS NOT NULL;
