-- =============================================================================
-- OPERATOR CHECK TASKS — campaign names
-- =============================================================================
-- Adds a campaign_names TEXT[] column to operator_check_tasks so each task can
-- be linked to one or more campaigns by name. Stored as plain text (not FK)
-- because the operator types the names in during the check itself — there is
-- no canonical campaign entity to reference.
--
-- Default is an empty array; existing rows are unaffected.
-- =============================================================================

ALTER TABLE public.operator_check_tasks
  ADD COLUMN campaign_names TEXT[] NOT NULL DEFAULT ARRAY[]::TEXT[];
