-- =============================================================================
-- DNC — admin approval + sectoren + admin note
-- =============================================================================
-- 1) dnc_entries: per entry een goedkeur-vlag plus tijdstip wanneer goedgekeurd.
--    Default = false → nieuwe entries van de klant tonen als "In verwerking".
--    Pas wanneer een operator de checkmark zet → "Doorgevoerd".
--
-- 2) clients: vrije velden voor de admin-side DNC-pagina:
--    - dnc_sectors    : JSONB-array met door admin getypte sectoren
--    - dnc_admin_note : groot vrij tekstvak voor de operator
--
-- Volledig idempotent.
-- =============================================================================

ALTER TABLE public.dnc_entries
  ADD COLUMN IF NOT EXISTS approved BOOLEAN NOT NULL DEFAULT FALSE,
  ADD COLUMN IF NOT EXISTS approved_at TIMESTAMPTZ;

CREATE INDEX IF NOT EXISTS idx_dnc_entries_approval
  ON public.dnc_entries(client_id, approved);

ALTER TABLE public.clients
  ADD COLUMN IF NOT EXISTS dnc_sectors JSONB NOT NULL DEFAULT '[]'::jsonb,
  ADD COLUMN IF NOT EXISTS dnc_admin_note TEXT;
