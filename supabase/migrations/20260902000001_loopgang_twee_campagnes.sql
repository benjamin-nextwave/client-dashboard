-- =============================================================================
-- LOOPGANG — twee campagnes naast elkaar bij dezelfde klant
-- =============================================================================
-- Sommige klanten draaien twee campagnes tegelijk met een eigen factuurritme en
-- een eigen evaluatiemeeting. Dat is geen tweede klant: het blijft één
-- client_id, met alles eraan gelinkt zoals het altijd was. Alleen wat je
-- vastlegt krijgt er een label bij: hoort dit bij campagne 1 of campagne 2.
--
-- Bewust géén tweede klantrecord en géén koppeling per Instantly-campagne. Het
-- onderscheid is voor de operator, niet voor de techniek: leads, mails en
-- commissies blijven bij dezelfde klant binnenkomen.
--
-- campaign_track staat overal op 1 met een default, dus bestaande rijen en de
-- 39 klanten die één campagne draaien merken hier niets van. De toggle
-- verschijnt alleen bij campaign_track_count = 2.
--
-- De unieke sleutels krijgen het spoor erbij. Zonder dat zou een factuur op
-- dezelfde dag voor campagne 2 de factuur van campagne 1 overschrijven.
--
-- Elk statement op één regel — de SQL-editor knipt statements op regeleinden.
-- =============================================================================


-- Stap 1. Hoeveel campagnes een klant draait, en hoe ze heten.

ALTER TABLE public.clients ADD COLUMN IF NOT EXISTS campaign_track_count SMALLINT NOT NULL DEFAULT 1;

ALTER TABLE public.clients DROP CONSTRAINT IF EXISTS clients_campaign_track_count_check;

ALTER TABLE public.clients ADD CONSTRAINT clients_campaign_track_count_check CHECK (campaign_track_count IN (1, 2));

ALTER TABLE public.clients ADD COLUMN IF NOT EXISTS campaign_track_1_name TEXT;

ALTER TABLE public.clients ADD COLUMN IF NOT EXISTS campaign_track_2_name TEXT;


-- Stap 2. Het label op alles wat per campagne verschilt.

ALTER TABLE public.client_invoice_marks ADD COLUMN IF NOT EXISTS campaign_track SMALLINT NOT NULL DEFAULT 1;

ALTER TABLE public.client_lead_reports ADD COLUMN IF NOT EXISTS campaign_track SMALLINT NOT NULL DEFAULT 1;

ALTER TABLE public.client_evaluation_meetings ADD COLUMN IF NOT EXISTS campaign_track SMALLINT NOT NULL DEFAULT 1;

ALTER TABLE public.client_campaign_pause_events ADD COLUMN IF NOT EXISTS campaign_track SMALLINT NOT NULL DEFAULT 1;

ALTER TABLE public.client_invoice_marks DROP CONSTRAINT IF EXISTS client_invoice_marks_track_check;

ALTER TABLE public.client_invoice_marks ADD CONSTRAINT client_invoice_marks_track_check CHECK (campaign_track IN (1, 2));

ALTER TABLE public.client_lead_reports DROP CONSTRAINT IF EXISTS client_lead_reports_track_check;

ALTER TABLE public.client_lead_reports ADD CONSTRAINT client_lead_reports_track_check CHECK (campaign_track IN (1, 2));

ALTER TABLE public.client_evaluation_meetings DROP CONSTRAINT IF EXISTS client_evaluation_meetings_track_check;

ALTER TABLE public.client_evaluation_meetings ADD CONSTRAINT client_evaluation_meetings_track_check CHECK (campaign_track IN (1, 2));

ALTER TABLE public.client_campaign_pause_events DROP CONSTRAINT IF EXISTS client_campaign_pause_events_track_check;

ALTER TABLE public.client_campaign_pause_events ADD CONSTRAINT client_campaign_pause_events_track_check CHECK (campaign_track IN (1, 2));


-- Stap 3. De unieke sleutels met het spoor erbij.
-- De oude sleutel eerst weg, anders blokkeert die campagne 2 op dezelfde dag.

ALTER TABLE public.client_invoice_marks DROP CONSTRAINT IF EXISTS client_invoice_marks_client_id_invoice_date_key;

DROP INDEX IF EXISTS public.client_invoice_marks_client_track_date_key;

CREATE UNIQUE INDEX IF NOT EXISTS client_invoice_marks_client_track_date_key ON public.client_invoice_marks(client_id, campaign_track, invoice_date);

ALTER TABLE public.client_lead_reports DROP CONSTRAINT IF EXISTS client_lead_reports_client_id_report_date_key;

DROP INDEX IF EXISTS public.client_lead_reports_client_track_date_key;

CREATE UNIQUE INDEX IF NOT EXISTS client_lead_reports_client_track_date_key ON public.client_lead_reports(client_id, campaign_track, report_date);

ALTER TABLE public.client_evaluation_meetings DROP CONSTRAINT IF EXISTS client_evaluation_meetings_client_id_cycle_anchor_key;

DROP INDEX IF EXISTS public.client_evaluation_meetings_client_track_anchor_key;

CREATE UNIQUE INDEX IF NOT EXISTS client_evaluation_meetings_client_track_anchor_key ON public.client_evaluation_meetings(client_id, campaign_track, cycle_anchor);
