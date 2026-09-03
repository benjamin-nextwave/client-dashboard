-- =============================================================================
-- KLANT IS GESTOPT
-- =============================================================================
-- Een klant die stopt verdween tot nu toe niet uit de loopgang, en bleef daar
-- meetellen alsof zijn periode nog liep: werkdagteller, belronde voor de
-- evaluatiemeeting, een factuurdeadline op werkdag 20. Allemaal onzin zodra de
-- campagne uit staat.
--
-- Uit de loopgang halen is geen optie zolang er nog geld openstaat. Armora is
-- daar het voorbeeld van: gestopt op 21 augustus, maar met een factuur van
-- € 1.345 die nog betaald moet worden. Die moet je blijven zien.
--
-- Vandaar deze twee kolommen in plaats van een vinkje "verbergen". stopped_on is
-- de laatste dag dat de campagne liep; die wordt de einddag van de periode. Wat
-- daarna wegvalt is alles rond de campagne — wat blijft is de betaling.
--
-- Meteen ook de gegevens van Armora rechtgezet. Zijn cyclusstart stond op
-- 27 augustus omdat de backfill die uit zijn laatste factuurdatum afleidde,
-- terwijl de periode op 3 augustus begon en op 21 augustus eindigde. Die factuur
-- van 27 augustus dekt precies die periode.
--
-- Eén statement per regel, geen DO-blokken — de SQL-editor van Supabase knipt
-- statements op regeleinden.
-- =============================================================================

ALTER TABLE public.clients ADD COLUMN IF NOT EXISTS stopped_on DATE;

ALTER TABLE public.clients ADD COLUMN IF NOT EXISTS stopped_note TEXT;

CREATE INDEX IF NOT EXISTS idx_clients_stopped ON public.clients(stopped_on) WHERE stopped_on IS NOT NULL;

UPDATE public.clients SET cycle_start_date = '2026-08-03', stopped_on = '2026-08-21' WHERE company_name = 'Armora' AND loopgang_visible = TRUE;
