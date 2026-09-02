-- =============================================================================
-- TWEE CAMPAGNES PER KLANT — het label op alle inhoud van de klantpagina's
-- =============================================================================
-- Een klant kan twee campagnes naast elkaar draaien. De schakelaar rechtsboven
-- op de klantpagina's wisselt ertussen, en alles op die pagina's hoort dan een
-- eigen invulling te hebben: eigen mails, eigen flow, eigen doelgroep,
-- eigen rapporten.
--
-- Het blijft één klant met één client_id. Er komt geen tweede klantrecord en er
-- verandert niets aan de koppelingen: leads, commissies en de loopgang zien de
-- campagnes als van dezelfde klant.
--
-- campaign_track staat overal op 1 met een default. Alle bestaande rijen komen
-- dus op campagne 1 en voor de klanten die er één draaien verandert er niets.
--
-- LET OP — het klantdashboard leest mail_variants, campaign_flows en
-- campaign_form_submissions. Die pagina's blijven campagne 1 tonen, zodat de
-- klant precies ziet wat hij nu ziet.
--
-- Elk statement op één regel — de SQL-editor knipt statements op regeleinden.
-- =============================================================================


-- Stap 1. Het label op elke tabel met inhoud van een klantpagina.

ALTER TABLE public.mail_variants ADD COLUMN IF NOT EXISTS campaign_track SMALLINT NOT NULL DEFAULT 1;

ALTER TABLE public.campaign_flows ADD COLUMN IF NOT EXISTS campaign_track SMALLINT NOT NULL DEFAULT 1;

ALTER TABLE public.client_target_audience ADD COLUMN IF NOT EXISTS campaign_track SMALLINT NOT NULL DEFAULT 1;

ALTER TABLE public.client_weekly_reports ADD COLUMN IF NOT EXISTS campaign_track SMALLINT NOT NULL DEFAULT 1;

ALTER TABLE public.client_kix_pages ADD COLUMN IF NOT EXISTS campaign_track SMALLINT NOT NULL DEFAULT 1;

ALTER TABLE public.campaign_form_submissions ADD COLUMN IF NOT EXISTS campaign_track SMALLINT NOT NULL DEFAULT 1;

ALTER TABLE public.client_updates ADD COLUMN IF NOT EXISTS campaign_track SMALLINT NOT NULL DEFAULT 1;

ALTER TABLE public.operator_client_commission_categories ADD COLUMN IF NOT EXISTS campaign_track SMALLINT NOT NULL DEFAULT 1;


-- Stap 2. Overal dezelfde beperking: alleen campagne 1 of 2.

ALTER TABLE public.mail_variants DROP CONSTRAINT IF EXISTS mail_variants_track_check;

ALTER TABLE public.mail_variants ADD CONSTRAINT mail_variants_track_check CHECK (campaign_track IN (1, 2));

ALTER TABLE public.campaign_flows DROP CONSTRAINT IF EXISTS campaign_flows_track_check;

ALTER TABLE public.campaign_flows ADD CONSTRAINT campaign_flows_track_check CHECK (campaign_track IN (1, 2));

ALTER TABLE public.client_target_audience DROP CONSTRAINT IF EXISTS client_target_audience_track_check;

ALTER TABLE public.client_target_audience ADD CONSTRAINT client_target_audience_track_check CHECK (campaign_track IN (1, 2));

ALTER TABLE public.client_weekly_reports DROP CONSTRAINT IF EXISTS client_weekly_reports_track_check;

ALTER TABLE public.client_weekly_reports ADD CONSTRAINT client_weekly_reports_track_check CHECK (campaign_track IN (1, 2));

ALTER TABLE public.client_kix_pages DROP CONSTRAINT IF EXISTS client_kix_pages_track_check;

ALTER TABLE public.client_kix_pages ADD CONSTRAINT client_kix_pages_track_check CHECK (campaign_track IN (1, 2));

ALTER TABLE public.campaign_form_submissions DROP CONSTRAINT IF EXISTS campaign_form_submissions_track_check;

ALTER TABLE public.campaign_form_submissions ADD CONSTRAINT campaign_form_submissions_track_check CHECK (campaign_track IN (1, 2));

ALTER TABLE public.client_updates DROP CONSTRAINT IF EXISTS client_updates_track_check;

ALTER TABLE public.client_updates ADD CONSTRAINT client_updates_track_check CHECK (campaign_track IN (1, 2));

ALTER TABLE public.operator_client_commission_categories DROP CONSTRAINT IF EXISTS operator_client_commission_categories_track_check;

ALTER TABLE public.operator_client_commission_categories ADD CONSTRAINT operator_client_commission_categories_track_check CHECK (campaign_track IN (1, 2));


-- Stap 3. De doelgroep had één rij per klant als primaire sleutel.
-- Met twee campagnes horen daar twee rijen te kunnen staan.

ALTER TABLE public.client_target_audience DROP CONSTRAINT IF EXISTS client_target_audience_pkey;

ALTER TABLE public.client_target_audience ADD CONSTRAINT client_target_audience_pkey PRIMARY KEY (client_id, campaign_track);


-- Stap 4. Zoeken op klant én campagne is wat elke pagina straks doet.

CREATE INDEX IF NOT EXISTS idx_mail_variants_client_track ON public.mail_variants(client_id, campaign_track);

CREATE INDEX IF NOT EXISTS idx_campaign_flows_client_track ON public.campaign_flows(client_id, campaign_track);

CREATE INDEX IF NOT EXISTS idx_client_weekly_reports_client_track ON public.client_weekly_reports(client_id, campaign_track);

CREATE INDEX IF NOT EXISTS idx_client_kix_pages_client_track ON public.client_kix_pages(client_id, campaign_track);

CREATE INDEX IF NOT EXISTS idx_client_updates_client_track ON public.client_updates(client_id, campaign_track);
