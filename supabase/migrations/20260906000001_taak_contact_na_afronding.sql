-- =============================================================================
-- CONTACTEREN NA AFRONDING
-- =============================================================================
-- Een taak zegt wat er moet gebeuren, maar niet of de aanvrager het wil horen
-- zodra het klaar is. Dat werd tot nu toe in de beschrijving gepropt, waar de
-- opschoner het net zo goed als aandrang kon wegstrepen.
--
-- Vandaar een eigen vlag. De aanmaker zet hem aan; de ontvanger ziet op zijn
-- taakkaart dat hij zich na afronding moet melden bij degene namens wie de
-- taak is aangemaakt.
--
-- Bestaande taken krijgen FALSE: niemand hoeft achteraf alsnog gebeld te
-- worden over werk dat al af is.
--
-- Eén statement per regel, geen DO-blokken — de SQL-editor van Supabase knipt
-- statements op regeleinden.
-- =============================================================================

ALTER TABLE public.operator_check_tasks ADD COLUMN IF NOT EXISTS notify_on_complete BOOLEAN NOT NULL DEFAULT FALSE;
