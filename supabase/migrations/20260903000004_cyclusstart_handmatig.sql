-- =============================================================================
-- CYCLUSSTART WORDT UITSLUITEND HANDMATIG
-- =============================================================================
-- Tot nu toe leidde de code het startpunt van een campagnemaand af als er geen
-- handmatige datum stond: eerst de laatste factuurdatum, anders de livegang.
-- Dat betekende dat een factuur die een dag te laat de deur uit ging de hele
-- volgende periode een dag opschoof, zonder dat iemand dat besloot.
--
-- Vanaf nu telt alleen `cycle_start_date`. Staat die leeg, dan telt er niets:
-- geen werkdagteller, geen factuurmoment, geen belronde. Dat is de bedoeling —
-- een periode die niet gestart is, loopt niet.
--
-- Deze migratie zet daarom voor elke klant zonder startdatum de datum die de
-- code tot nu toe zou hebben gekozen. Het gedrag blijft dus precies hetzelfde op
-- het moment van draaien; wat verandert is dat de datum vanaf nu blijft staan
-- tot jij hem verzet.
--
-- Veilig om vóór de deploy te draaien: onder de oude code is het resultaat
-- identiek aan wat er al werd afgeleid.
--
-- Alleen campagnespoor 1 telt mee bij het zoeken van de laatste factuur; dat is
-- het spoor waar het centrale overzicht op boekt.
--
-- Eén statement per regel, geen DO-blokken — de SQL-editor van Supabase knipt
-- statements op regeleinden.
-- =============================================================================

UPDATE public.clients SET cycle_start_date = (SELECT MAX(m.invoice_date) FROM public.client_invoice_marks m WHERE m.client_id = clients.id AND COALESCE(m.campaign_track, 1) = 1) WHERE cycle_start_date IS NULL AND EXISTS (SELECT 1 FROM public.client_invoice_marks m WHERE m.client_id = clients.id AND COALESCE(m.campaign_track, 1) = 1);

UPDATE public.clients SET cycle_start_date = go_live_date WHERE cycle_start_date IS NULL AND go_live_date IS NOT NULL;
