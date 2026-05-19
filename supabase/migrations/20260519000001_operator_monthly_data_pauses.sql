-- =============================================================================
-- OPERATOR MAANDDATA — PAUZES KOLOM
-- =============================================================================
-- Campagnes worden gedurende een maand vaak op pauze gezet. De operator
-- voert per pauze het aantal dagen in (en eventueel een notitie); de UI
-- berekent de effectieve einddatum = end_date + SUM(pauses[].days).
--
-- Niet-destructief opzet: end_date blijft de oorspronkelijke geplande
-- einddatum, zodat een verwijderde pauze automatisch de juiste einddatum
-- herstelt.
--
-- Vorm van het JSONB-veld:
--   [
--     { "id": "uuid",       -- stabiele id voor edit/remove in UI
--       "days": 3,          -- positief geheel getal
--       "note": "wachten op feedback klant",  -- optional
--       "added_at": "2026-05-19T10:12:34.000Z" }
--   ]
-- =============================================================================

ALTER TABLE public.operator_client_monthly_data
  ADD COLUMN IF NOT EXISTS pauses JSONB NOT NULL DEFAULT '[]'::jsonb;
