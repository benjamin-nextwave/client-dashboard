-- =============================================================================
-- CLIENT EXCLUDED FROM DAILY CHECK
-- =============================================================================
-- Adds a flag so the operator can exclude specific clients from the
-- "Dagelijkse controle" client list. Excluded clients still exist as
-- regular clients (unlike is_hidden); they are only removed from the
-- ochtend-selection grid and surfaced on a separate exclusion page.
-- =============================================================================

ALTER TABLE public.clients
  ADD COLUMN is_excluded_from_check BOOLEAN NOT NULL DEFAULT FALSE;
