-- =============================================================================
-- CLIENT — dagelijks aanvullen (checkbox)
-- =============================================================================
-- Voegt één booleaanse checkbox toe op `clients` die op de admin-overzichts-
-- pagina als bubbel te zien is:
--   - daily_topup ("Dagelijks aanvullen?")
--
-- Puur een aan/uit-vlag; niet aan verdere logica gekoppeld.
-- Volledig idempotent. Geen bestaande data wordt aangepast of verwijderd.
-- =============================================================================

ALTER TABLE public.clients
  ADD COLUMN IF NOT EXISTS daily_topup BOOLEAN NOT NULL DEFAULT FALSE;
