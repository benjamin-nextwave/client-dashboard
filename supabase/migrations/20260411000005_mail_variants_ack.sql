-- Track when the client last acknowledged the mail variants block.
-- Used to decide whether the "Goedkeuren" button is visible (when there
-- are variant updates after this timestamp, the client must approve again).
ALTER TABLE public.clients
  ADD COLUMN mail_variants_last_acknowledged_at TIMESTAMPTZ;
