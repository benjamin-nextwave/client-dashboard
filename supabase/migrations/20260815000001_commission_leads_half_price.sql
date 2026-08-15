-- =============================================================================
-- COMMISSIE-LEADS — HALVE PRIJS (50% korting)
-- =============================================================================
-- Markering voor een lead die twijfelachtig in zijn categorie valt: de commissie
-- telt dan voor de helft mee.
--
-- Bewust een vlag en géén aangepaste unit_price_cents: die kolom is een snapshot
-- van de categorieprijs op het moment van invoeren. Zou de korting daarin
-- verrekend worden, dan is achteraf niet meer te zien of een lage prijs kwam
-- door de categorie of door de korting, en is de korting niet terug te draaien.
-- De halvering wordt daarom in de overzichten afgeleid.
--
-- Bestaande leads houden hun volle prijs (DEFAULT FALSE) — er verandert dus
-- niets aan reeds ingevoerde commissies.
--
-- Idempotent via IF NOT EXISTS.
-- =============================================================================

ALTER TABLE public.operator_commission_leads
  ADD COLUMN IF NOT EXISTS is_half_price BOOLEAN NOT NULL DEFAULT FALSE;

COMMENT ON COLUMN public.operator_commission_leads.is_half_price IS
  'Lead valt twijfelachtig in zijn categorie; commissie telt voor 50% mee.';
