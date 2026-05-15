-- LinkedIn outreach flow per client.
--
-- The flow has a fixed structure (8 steps) where only 4 message bodies are
-- editable by the operator: day +1, +4, +9 and +14 after connection accept.
-- Everything else (profile visit, like+comment, connection request without
-- note) is a hard-coded instruction in the UI. Because the structure is
-- fixed and we don't need A/B variants, we store the messages as plain
-- columns on `clients` rather than spinning up a separate table.

ALTER TABLE public.clients
  ADD COLUMN linkedin_flow_enabled BOOLEAN NOT NULL DEFAULT FALSE,
  ADD COLUMN linkedin_message_day_plus_1 TEXT NOT NULL DEFAULT '',
  ADD COLUMN linkedin_message_day_plus_4 TEXT NOT NULL DEFAULT '',
  ADD COLUMN linkedin_message_day_plus_9 TEXT NOT NULL DEFAULT '',
  ADD COLUMN linkedin_message_day_plus_14 TEXT NOT NULL DEFAULT '',
  ADD COLUMN linkedin_flow_published_at TIMESTAMPTZ,
  ADD COLUMN linkedin_flow_approved_at TIMESTAMPTZ;
