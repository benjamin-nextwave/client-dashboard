-- =============================================================================
-- DROP WHEEL_PICKS — "Rad van fortuin" feature verwijderd
-- =============================================================================
-- De rad-van-fortuin selector wordt niet meer gebruikt en is vervangen door
-- "De tekentafel". De bijbehorende tabel kan weg; CASCADE ruimt de RLS-policy
-- en index mee op.
-- =============================================================================

DROP TABLE IF EXISTS public.wheel_picks CASCADE;
