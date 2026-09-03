-- =============================================================================
-- DAGSTATUS IN DE KALENDER — klokjes, vinkjes en de cap
-- =============================================================================
-- De kalender krijgt per dag een teken dat zegt wat er die dag van je verwacht
-- wordt: een vinkje in de rustweken, een klokje in de weken waarin de meeting
-- geregeld moet worden, rood op de dagen dat Kix moet bellen, groen op de dagen
-- dat je hem die taak ook echt hebt gestuurd.
--
-- Daar zijn twee dingen voor nodig die er nog niet zijn.
--
-- 1. WELKE DAGEN GING EEN TAAK NAAR KIX
-- De takentabel houdt een teller bij en de eerste en laatste verzenddag. Voor
-- een groen klokje op precies de juiste dagen is de hele reeks nodig. sent_dates
-- is die reeks: één datum per verzending, oplopend.
--
-- Bestaande rijen krijgen hun eerste en laatste verzenddag mee. Wat daartussen
-- zat is niet meer te achterhalen — bij een taak die drie keer is verstuurd
-- ontbreekt de middelste dag. Vanaf nu klopt het.
--
-- 2. DE CAP
-- Loopt een klant tegen zijn leadplafond aan vóór werkdag 20, dan eindigt de
-- periode daar en niet op de teller. cap_expected_date is de dag waarop je het
-- plafond verwacht; die vervangt werkdag 20 als einddag van de periode.
--
-- cap_started_on is de dag waarop je dat hebt aangegeven. Vanaf díé dag lopen de
-- klokjes, want het regelen van de meeting begint op het moment dat je het weet
-- — niet op een uitgerekende werkdag. Zonder deze kolom zou de kalender na een
-- herstart niet meer weten wanneer de klokjes moesten beginnen.
--
-- Eén statement per regel, geen DO-blokken — de SQL-editor van Supabase knipt
-- statements op regeleinden.
-- =============================================================================

ALTER TABLE public.loopgang_kix_tasks ADD COLUMN IF NOT EXISTS sent_dates JSONB NOT NULL DEFAULT '[]'::jsonb;

UPDATE public.loopgang_kix_tasks SET sent_dates = to_jsonb(ARRAY(SELECT DISTINCT d FROM unnest(ARRAY[to_char(first_sent_at AT TIME ZONE 'Europe/Amsterdam', 'YYYY-MM-DD'), to_char(last_sent_at AT TIME ZONE 'Europe/Amsterdam', 'YYYY-MM-DD')]) AS d ORDER BY d)) WHERE sent_dates = '[]'::jsonb;

ALTER TABLE public.clients ADD COLUMN IF NOT EXISTS cap_expected_date DATE;

ALTER TABLE public.clients ADD COLUMN IF NOT EXISTS cap_started_on DATE;

ALTER TABLE public.clients ADD COLUMN IF NOT EXISTS cap_note TEXT;
