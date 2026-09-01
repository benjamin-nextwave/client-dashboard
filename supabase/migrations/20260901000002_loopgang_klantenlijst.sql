-- =============================================================================
-- LOOPGANG — welke klanten in de kalender staan
-- =============================================================================
-- Het loopgangoverzicht toonde elke klant die niet globaal verborgen is. In de
-- praktijk hoort niet iedereen in dit overzicht thuis: klanten zonder lopende
-- campagne maken de kalender voller zonder dat er iets van ze verwacht wordt.
--
-- Bewust een eigen kolom en niet is_hidden hergebruiken: is_hidden verbergt een
-- klant overal, en dat is een veel zwaardere ingreep dan hem uit één overzicht
-- laten. Default TRUE, zodat er na de migratie niets verandert totdat er bewust
-- iemand wordt uitgevinkt.
--
-- Scheelt ook werk: onzichtbare klanten worden niet meer bij Instantly
-- opgevraagd.
--
-- Eén statement op één regel — de SQL-editor knipt statements op regeleinden.
-- =============================================================================

ALTER TABLE public.clients ADD COLUMN IF NOT EXISTS loopgang_visible BOOLEAN NOT NULL DEFAULT TRUE;
