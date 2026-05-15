-- Per-client go-live date with optional explanation.
--
-- Operator fills this in from the edit page. When set, the client's
-- dashboard home shows a big "Datum van livegang" block. A 06:00 cron
-- job fires a webhook on the morning of the date — `linkedin_flow_*`-
-- style: `go_live_webhook_fired_at` records the firing so the cron is
-- idempotent. Changing the date resets that timestamp in code so the
-- new date can fire fresh.

ALTER TABLE public.clients
  ADD COLUMN go_live_date DATE,
  ADD COLUMN go_live_note TEXT,
  ADD COLUMN go_live_webhook_fired_at TIMESTAMPTZ;
