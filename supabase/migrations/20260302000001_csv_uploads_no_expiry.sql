-- Remove automatic expiry from CSV uploads so they persist indefinitely.
-- Previously uploads expired after 7 days and were cleaned up by the cron,
-- which caused data loss (including client exclusions).

-- Make expires_at nullable and default to NULL (no expiry)
ALTER TABLE public.csv_uploads
  ALTER COLUMN expires_at DROP NOT NULL,
  ALTER COLUMN expires_at SET DEFAULT NULL;

-- Clear expiry on all existing uploads so they are never auto-deleted
UPDATE public.csv_uploads SET expires_at = NULL WHERE expires_at IS NOT NULL;
