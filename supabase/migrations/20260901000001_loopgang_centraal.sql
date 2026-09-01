-- =============================================================================
-- LOOPGANG CENTRAAL — één overzicht voor alle klanten tegelijk
-- =============================================================================
-- De bestaande loopgang staat per klant (/admin/clients/[id]/loopgang) en kan
-- twee dingen: pauzeren/hervatten en een dag markeren als "factuur verstuurd".
-- Daar komt een centrale pagina bij die van elke klant tegelijk laat zien of
-- hij draait, hoeveel hij vandaag heeft verstuurd, en wat er administratief
-- open staat.
--
-- Het anker van de cyclus is de laatste factuurdatum, of de livegang als er nog
-- geen factuur is. Vanaf dat anker tellen werkdagen: op werkdag 10 moet er een
-- evaluatiemeeting worden ingepland, op werkdag 20 moet er gefactureerd worden.
-- Die momenten worden afgeleid, niet opgeslagen — anders loopt de administratie
-- uit de pas zodra er een factuur bijkomt of een datum wordt gecorrigeerd.
--
-- Wat wél wordt opgeslagen is alles wat niet af te leiden valt: het bedrag van
-- een factuur, of hij betaald is, de PDF's, en de uitkomst van de maandelijkse
-- evaluatiemeeting.
--
-- SCHRIJFWIJZE — elk statement staat op één regel. Geen DO-blokken (de
-- SQL-editor van Supabase struikelt over dollar-quoting), en ook geen
-- statements over meerdere regels: de editor knipt die op het regeleinde,
-- waardoor een `CHECK (...)` als los statement binnenkomt en de boel afbreekt.
-- Lelijk om te lezen, maar het draait in één keer door.
--
-- Alles is opnieuw te draaien: IF NOT EXISTS bij het toevoegen, DROP ... IF
-- EXISTS vóór elke constraint en policy.
--
-- LET OP — handmatige stap na afloop: maak in Supabase Storage een publieke
-- bucket `loopgang-docs` aan. Daar komen de factuur- en leadrapportage-PDF's in.
-- =============================================================================


-- -----------------------------------------------------------------------------
-- Stap 1. Gewenst verzendvolume per klant.
-- -----------------------------------------------------------------------------
-- 900 mails per werkdag is de norm, maar een klant met meer campagnes of een
-- kleiner bestand hoort een eigen streefgetal te kunnen krijgen. Default 900,
-- zodat bestaande klanten meteen kloppen zonder backfill.

ALTER TABLE public.clients ADD COLUMN IF NOT EXISTS daily_send_target INTEGER NOT NULL DEFAULT 900;

ALTER TABLE public.clients DROP CONSTRAINT IF EXISTS clients_daily_send_target_check;

ALTER TABLE public.clients ADD CONSTRAINT clients_daily_send_target_check CHECK (daily_send_target > 0);


-- -----------------------------------------------------------------------------
-- Stap 2. Facturen — client_invoice_marks wordt een volwaardige factuurregel.
-- -----------------------------------------------------------------------------
-- De tabel bestond al als losse dagmarkering zonder bedrag. Uitbreiden in plaats
-- van vervangen: de kalender op de klantpagina leest deze rijen en blijft zo
-- ongewijzigd werken. Bestaande markeringen houden een leeg bedrag; dat is
-- eerlijk, want dat bedrag is nooit ingevoerd.
--
-- amount_cents in centen, exclusief btw. paid_at is de dag waarop het geld
-- binnenkwam; NULL betekent open. De betaaltermijn (14 dagen) staat niet in de
-- database maar in de code, zodat hij op één plek te veranderen is.
--
-- pdf_path staat naast pdf_url omdat verwijderen uit de bucket alleen op pad
-- kan, en een URL terugrekenen naar een pad is vragen om fouten.

ALTER TABLE public.client_invoice_marks ADD COLUMN IF NOT EXISTS amount_cents INTEGER;

ALTER TABLE public.client_invoice_marks ADD COLUMN IF NOT EXISTS paid_at DATE;

ALTER TABLE public.client_invoice_marks ADD COLUMN IF NOT EXISTS pdf_url TEXT;

ALTER TABLE public.client_invoice_marks ADD COLUMN IF NOT EXISTS pdf_path TEXT;

ALTER TABLE public.client_invoice_marks DROP CONSTRAINT IF EXISTS client_invoice_marks_amount_check;

ALTER TABLE public.client_invoice_marks ADD CONSTRAINT client_invoice_marks_amount_check CHECK (amount_cents IS NULL OR amount_cents >= 0);


-- -----------------------------------------------------------------------------
-- Stap 3. Leadrapportages — dezelfde methodiek als facturen.
-- -----------------------------------------------------------------------------
-- Bewust een eigen tabel en niet client_weekly_reports: alles wat daarin staat
-- verschijnt direct op de klantpagina Rapporten. Deze rapportages zijn eerst van
-- de operator; ze naar de klant doorzetten is een aparte beslissing.

CREATE TABLE IF NOT EXISTS public.client_lead_reports (id UUID PRIMARY KEY DEFAULT gen_random_uuid(), client_id UUID NOT NULL REFERENCES public.clients(id) ON DELETE CASCADE, report_date DATE NOT NULL, note TEXT, pdf_url TEXT, pdf_path TEXT, created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(), UNIQUE (client_id, report_date));

CREATE INDEX IF NOT EXISTS idx_lead_reports_client_date ON public.client_lead_reports(client_id, report_date DESC);

ALTER TABLE public.client_lead_reports ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Operators full access to lead reports" ON public.client_lead_reports;

CREATE POLICY "Operators full access to lead reports" ON public.client_lead_reports FOR ALL TO authenticated USING ((SELECT auth.jwt() ->> 'user_role') = 'operator') WITH CHECK ((SELECT auth.jwt() ->> 'user_role') = 'operator');


-- -----------------------------------------------------------------------------
-- Stap 4. Evaluatiemeetings — de uitkomst van de maandelijkse afspraak.
-- -----------------------------------------------------------------------------
-- cycle_anchor is de datum waar de cyclus vanaf telt (laatste factuur, of de
-- livegang). Die staat erbij zodat een afgehandelde meeting bij één cyclus hoort:
-- komt er een nieuwe factuur, dan schuift het anker op en begint de meeting-
-- herinnering opnieuw, zonder dat de vorige uitkomst wordt weggegooid.
--
-- outcome:
--   planned  — meeting staat, meeting_date is gevuld
--   stop     — geen meeting, klant stoppen (puur registratie, raakt Instantly niet)
--   continue — geen meeting, klant doorpakken

CREATE TABLE IF NOT EXISTS public.client_evaluation_meetings (id UUID PRIMARY KEY DEFAULT gen_random_uuid(), client_id UUID NOT NULL REFERENCES public.clients(id) ON DELETE CASCADE, cycle_anchor DATE NOT NULL, outcome TEXT NOT NULL CHECK (outcome IN ('planned', 'stop', 'continue')), meeting_date DATE, note TEXT, handled_at TIMESTAMPTZ NOT NULL DEFAULT NOW(), created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(), UNIQUE (client_id, cycle_anchor));

CREATE INDEX IF NOT EXISTS idx_evaluation_meetings_client_anchor ON public.client_evaluation_meetings(client_id, cycle_anchor DESC);

CREATE INDEX IF NOT EXISTS idx_evaluation_meetings_date ON public.client_evaluation_meetings(meeting_date) WHERE meeting_date IS NOT NULL;

ALTER TABLE public.client_evaluation_meetings ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Operators full access to evaluation meetings" ON public.client_evaluation_meetings;

CREATE POLICY "Operators full access to evaluation meetings" ON public.client_evaluation_meetings FOR ALL TO authenticated USING ((SELECT auth.jwt() ->> 'user_role') = 'operator') WITH CHECK ((SELECT auth.jwt() ->> 'user_role') = 'operator');
