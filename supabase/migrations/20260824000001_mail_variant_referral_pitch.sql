-- =============================================================================
-- Mailvariant aanhouden voor de doorverwijzingsmail
-- =============================================================================
-- De assistent die een doorverwezen contactpersoon aanschrijft heeft de pitch
-- nodig. Tot nu toe pakte hij automatisch de eerste gepubliceerde variant van
-- mail 1. Met deze kolom kan de operator er zelf een aanwijzen.
--
-- Eén variant per klant, afgedwongen met een partiële unieke index in plaats
-- van met code: zo kan er ook bij een half mislukte update nooit meer dan één
-- aangevinkt staan.
--
-- Staat er niets aan, dan blijft het oude gedrag gelden. De kolom hoeft dus
-- niet gevuld te worden om de functie te laten werken.
--
-- Idempotent via IF NOT EXISTS.
-- =============================================================================

ALTER TABLE public.mail_variants
  ADD COLUMN IF NOT EXISTS use_for_referral BOOLEAN NOT NULL DEFAULT FALSE;

COMMENT ON COLUMN public.mail_variants.use_for_referral IS
  'Aangehouden als pitch voor de doorverwijzingsmail. Hooguit één per klant.';

CREATE UNIQUE INDEX IF NOT EXISTS uniq_mail_variants_referral_per_client
  ON public.mail_variants(client_id)
  WHERE use_for_referral;
