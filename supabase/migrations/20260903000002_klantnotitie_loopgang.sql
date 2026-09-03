-- =============================================================================
-- ALGEMENE KLANTNOTITIE VOOR DE LOOPGANG
-- =============================================================================
-- Er staan al notities op de klant, maar allemaal aan iets vast: bij de
-- livegang, bij de cyclusstart, bij een pauze, bij de DNC-lijst. Wat ontbreekt
-- is de losse aantekening die je altijd wil zien zodra je een klant openslaat —
-- "belt liever 's ochtends", "wil geen mails naar de holding", "factuur via
-- crediteuren@".
--
-- Bewust één vrij tekstveld en geen lijst met losse notities. Wie een notitie
-- moet doorlezen om te weten wat er speelt, leest er geen twintig; dit veld
-- hoort kort te blijven en overschreven te worden als het niet meer klopt.
--
-- Eén statement per regel, geen DO-blokken — de SQL-editor van Supabase knipt
-- statements op regeleinden.
-- =============================================================================

ALTER TABLE public.clients ADD COLUMN IF NOT EXISTS operator_note TEXT;
