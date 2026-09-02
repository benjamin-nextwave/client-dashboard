-- =============================================================================
-- LOOPGANG — de cyclus telt vanaf een eigen startdatum
-- =============================================================================
-- Het anker van de cyclus was de laatste factuurdatum, of de livegang als er nog
-- niet gefactureerd was. Dat werkt alleen zolang er op tijd gefactureerd wordt.
-- Gaat een factuur twee weken te laat de deur uit, dan schuift het anker mee en
-- schuift de hele volgende cyclus dus ook twee weken op. De achterstand wordt
-- daarmee ingebakken in plaats van gemeld — precies andersom dan de bedoeling.
--
-- Bij BLUEBRD liep dat zo: campagnemaand 2 startte 10 augustus, de factuur over
-- maand 1 ging pas op 21 augustus weg. Met de factuurdatum als anker meldt de
-- loopgang "factureren op 17 september", terwijl de echte deadline 4 september
-- is. Dertien dagen te laat, structureel.
--
-- cycle_start_date is de dag waarop de lopende campagnemaand begon. Staat hij
-- gevuld, dan telt de cyclus daarvandaan; staat hij leeg, dan blijft alles zoals
-- het was (factuurdatum, anders livegang). Bestaande klanten merken er dus
-- niets van tot er bewust een datum wordt gezet.
--
-- Bewust handmatig en niet afgeleid: alleen de operator weet welke periode een
-- factuur dekt. Een lege datum is geen fout, en een datum die blijft staan
-- terwijl de cyclus doorloopt gaat steeds harder piepen in plaats van stil te
-- vallen — dat is de veilige kant om op te falen.
--
-- Eén statement per regel, geen DO-blokken: de SQL-editor van Supabase knipt
-- statements op regeleinden en struikelt over dollar-quoting.
-- =============================================================================

ALTER TABLE public.clients ADD COLUMN IF NOT EXISTS cycle_start_date DATE;

ALTER TABLE public.clients ADD COLUMN IF NOT EXISTS cycle_start_note TEXT;
