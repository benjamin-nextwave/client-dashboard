-- =============================================================================
-- OPERATOR COMMISSIE-LEADS — OPTIONEEL NOTITIEVELD
-- =============================================================================
-- Voegt een vrij tekstveld `note` toe aan operator_commission_leads, zodat er
-- per lead een (grote) notitie geschreven en gelezen kan worden — zowel bij het
-- toevoegen in de commissiecontrole als in de lead-geschiedenis.
--
-- Puur additief: NOT NULL met DEFAULT '' zodat alle bestaande rijen een lege
-- notitie krijgen zonder dataverlies. Idempotent via IF NOT EXISTS.
-- =============================================================================

ALTER TABLE public.operator_commission_leads
  ADD COLUMN IF NOT EXISTS note TEXT NOT NULL DEFAULT '';
