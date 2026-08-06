-- =============================================================================
-- CLIENT — commissie cap
-- =============================================================================
-- Voegt één bewerkbaar veld toe op `clients` dat op de admin-overzichtspagina
-- als bubbel te zien is naast dealbasis/inbox-aanpak/data:
--   - commission_cap (bedrag, max. commissie)
--
-- Volledig idempotent. Geen bestaande data wordt aangepast of verwijderd.
-- =============================================================================

ALTER TABLE public.clients
  ADD COLUMN IF NOT EXISTS commission_cap NUMERIC(12, 2);
