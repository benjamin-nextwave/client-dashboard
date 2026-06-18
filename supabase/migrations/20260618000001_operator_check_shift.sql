-- =============================================================================
-- OPERATOR CONTROLE — OCHTEND/AVOND SHIFT (Benjamin)
-- =============================================================================
-- Benjamin doet voortaan twee dagelijkse controles: een ochtend- en een
-- avondronde, elk met een eigen vragenlijst. Om beide rondes per dag los te
-- kunnen volgen krijgt operator_client_checks een 'shift' kolom.
--
--   shift = 'ochtend' | 'avond'  → Benjamin
--   shift = NULL                 → Merlijn en alle historische controles
--
-- Nullable, geen backfill: bestaande rijen blijven zonder shift zichtbaar.
-- Idempotent via IF NOT EXISTS / existence-checks.
-- =============================================================================

ALTER TABLE public.operator_client_checks
  ADD COLUMN IF NOT EXISTS shift TEXT;

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint
    WHERE conname = 'operator_client_checks_shift_check'
  ) THEN
    ALTER TABLE public.operator_client_checks
      ADD CONSTRAINT operator_client_checks_shift_check
      CHECK (shift IN ('ochtend', 'avond'));
  END IF;
END $$;

-- Gecombineerde index: de selectielijst zoekt de laatste controle per
-- (assignee, shift) op.
CREATE INDEX IF NOT EXISTS idx_operator_client_checks_assignee_shift
  ON public.operator_client_checks(assignee, shift);
