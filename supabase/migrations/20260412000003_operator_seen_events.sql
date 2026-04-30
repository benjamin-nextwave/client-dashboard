-- Simple key-value store for operator "I've seen this" checkmarks
-- on the activity timeline. No RLS needed (operator-only page).
CREATE TABLE public.operator_seen_events (
  event_key TEXT PRIMARY KEY,
  seen_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  note TEXT
);
