-- =============================================================================
-- FACTUREN WEER MET DE HAND
-- =============================================================================
-- De koppeling met Rompslomp haalde de hele factuurhistorie sinds 2025 binnen,
-- en kon van de betaling alleen zeggen dát er betaald was en niet wanneer. Dat
-- laatste vulden we in met de dag van synchroniseren, wat drieëndertig facturen
-- opleverde die allemaal op dezelfde dag betaald zouden zijn.
--
-- De koppeling gaat er daarom uit. Facturen worden weer met de hand vastgelegd,
-- op het tabblad Facturen, en daar vink je ze ook betaald af met de datum die je
-- zelf kent.
--
-- Deze migratie ruimt op wat de koppeling heeft achtergelaten:
--
--   1. Alle factuurregels weg, op één na: de factuur van Bluebrd van
--      4 september van 1500 euro. Dat is de enige die nog actueel is.
--   2. Alle Rompslomp-contactkoppelingen los, zodat er niets meer terugkomt.
--
-- De kolommen rompslomp_contact_id en rompslomp_invoice_id blijven bestaan maar
-- worden nergens meer gevuld. Ze weggooien zou de migraties die ze aanmaakten
-- ongedaan moeten maken, en een lege kolom kost niets.
--
-- LET OP: dit verwijdert ook de twee handmatig ingevoerde factuurregels; die
-- staan niet in Rompslomp en komen dus niet terug. Bewaar de uitkomst van deze
-- query als je ze wil kunnen terugzetten:
--
--   SELECT c.company_name, m.invoice_date, m.amount_cents, m.paid_at, m.note
--   FROM public.client_invoice_marks m
--   JOIN public.clients c ON c.id = m.client_id ORDER BY m.invoice_date DESC;
--
-- Eén statement per regel, geen DO-blokken — de SQL-editor van Supabase knipt
-- statements op regeleinden.
-- =============================================================================

DELETE FROM public.client_invoice_marks WHERE id <> '09341271-03b2-48e7-80db-8f9e3e2e79ce';

UPDATE public.clients SET rompslomp_contact_id = NULL WHERE rompslomp_contact_id IS NOT NULL;
