-- =============================================================================
-- CLIENT BEDRIJFSKENNIS — diepere "leer het bedrijf kennen"-sectie
-- =============================================================================
-- Voegt drie velden toe op `clients` voor een aparte, diepere bedrijfskennis
-- naast de bestaande korte `company_summary`:
--   - company_knowledge           (vrije tekst, langere samenvatting)
--   - company_knowledge_checklist (jsonb, status per vraag in de checklist)
--   - company_knowledge_complete  (bool, handmatige "klaar"-toggle die de
--                                  knopkleur op de overzichtspagina stuurt:
--                                  false = rood, true = groen)
--
-- Volledig idempotent. Geen bestaande data wordt aangepast of verwijderd.
-- =============================================================================

ALTER TABLE public.clients
  ADD COLUMN IF NOT EXISTS company_knowledge TEXT,
  ADD COLUMN IF NOT EXISTS company_knowledge_checklist JSONB NOT NULL DEFAULT '{}'::jsonb,
  ADD COLUMN IF NOT EXISTS company_knowledge_complete BOOLEAN NOT NULL DEFAULT FALSE;
