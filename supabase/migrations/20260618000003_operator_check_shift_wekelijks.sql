-- =============================================================================
-- OPERATOR CONTROLE — SHIFT 'wekelijks' toevoegen
-- =============================================================================
-- Benjamin krijgt naast ochtend en avond een derde ronde: de wekelijkse
-- analyse. De CHECK-constraint op operator_client_checks.shift wordt uitgebreid
-- zodat 'wekelijks' is toegestaan.
--
-- Drop-then-add is idempotent: bij herdraaien wordt de bestaande constraint
-- verwijderd en opnieuw aangemaakt met dezelfde definitie.
-- =============================================================================

ALTER TABLE public.operator_client_checks
  DROP CONSTRAINT IF EXISTS operator_client_checks_shift_check;

ALTER TABLE public.operator_client_checks
  ADD CONSTRAINT operator_client_checks_shift_check
  CHECK (shift IN ('ochtend', 'avond', 'wekelijks'));
