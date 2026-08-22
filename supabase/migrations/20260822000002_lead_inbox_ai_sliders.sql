-- =============================================================================
-- Antwoord-assistent — schuifregelaars
-- =============================================================================
-- Formeel/informeel, kort/lang, oppervlakkig/inhoudelijk en vrolijk/serieus
-- zijn spectra, geen keuzes. Ze staan als { "id": stand } in één kolom; de
-- standen lopen van 0 tot en met 20.
--
-- Geen aparte kolom per regelaar: er komen er waarschijnlijk meer bij, en dan
-- zou elke nieuwe regelaar een migratie kosten. Een lege waarde betekent
-- "middenstand", dus bestaande rijen hoeven niet bijgewerkt te worden.
--
-- Idempotent via IF NOT EXISTS.
-- =============================================================================

ALTER TABLE public.lead_inbox_ai_settings
  ADD COLUMN IF NOT EXISTS sliders JSONB NOT NULL DEFAULT '{}'::jsonb;

COMMENT ON COLUMN public.lead_inbox_ai_settings.sliders IS
  'Standen van de schuifregelaars, als { regelaar_id: 0..20 }. Leeg = midden.';
