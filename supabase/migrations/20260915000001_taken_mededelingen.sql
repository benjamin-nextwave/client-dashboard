-- =============================================================================
-- Takenpagina: naast taken en vragen ook mededelingen
-- =============================================================================
-- Een mededeling is een bericht ter informatie. Er komt geen kolom bij: het
-- afvinken (is_completed / completed_at) betekent bij een mededeling "gelezen",
-- en de tekst staat in description en details zoals bij elke andere regel.
--
-- LET OP voor de externe kant: rijen met kind = 'mededeling' komen in externe
-- dashboards die operator_check_tasks lezen binnen als gewone taak. Wie ze
-- apart wil tonen filtert op kind.
--
-- Bewust zonder DO-blokken en met elk statement op een regel: de SQL-editor
-- van Supabase struikelt over dollar-quoting en knipt meerregelige statements
-- op de verkeerde plek af.
-- =============================================================================

ALTER TABLE public.operator_check_tasks DROP CONSTRAINT IF EXISTS operator_check_tasks_kind_check;

ALTER TABLE public.operator_check_tasks ADD CONSTRAINT operator_check_tasks_kind_check CHECK (kind IS NULL OR kind IN ('taak', 'vraag', 'mededeling'));
