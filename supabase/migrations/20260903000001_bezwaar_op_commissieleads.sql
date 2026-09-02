-- =============================================================================
-- BEZWAAR OP EEN COMMISSIELEAD
-- =============================================================================
-- De leadpagina van de klant toont voortaan de leads die de operator handmatig
-- in Commissies invoert: datum, e-mailadres, categorie en bedrag. Dat is de
-- factuurbasis, dus daar hoort de klant bezwaar tegen te kunnen maken.
--
-- Er bestond al een bezwaarstroom, maar die hangt aan campaign_leads en aan de
-- lead-inbox. Die tabellen gaan over de mailwisseling, niet over wat er in
-- rekening wordt gebracht — en campaign_leads is inmiddels leeg. Een bezwaar op
-- een bedrag hoort aan de regel te hangen waar dat bedrag op staat.
--
-- Wat de klant voorstelt is een categorie uit zijn eigen prijslijst
-- (operator_client_commission_categories), of "niet in rekening brengen". Dat
-- laatste is geen categorie en krijgt daarom een eigen vlag in plaats van een
-- verzonnen rij in de prijslijst.
--
-- proposed_category_name staat naast proposed_category_id omdat een prijslijst
-- verandert: wordt een categorie hernoemd of verwijderd, dan moet nog steeds te
-- lezen zijn waar het bezwaar over ging.
--
-- Eén bezwaar per lead: de UNIQUE op commission_lead_id. Een tweede ronde is een
-- gesprek, geen nieuw bezwaar.
--
-- Elk statement op één regel, geen DO-blokken — de SQL-editor van Supabase knipt
-- statements op regeleinden en struikelt over dollar-quoting.
-- =============================================================================


CREATE TABLE IF NOT EXISTS public.commission_lead_objections (id UUID PRIMARY KEY DEFAULT gen_random_uuid(), commission_lead_id UUID NOT NULL REFERENCES public.operator_commission_leads(id) ON DELETE CASCADE, client_id UUID NOT NULL REFERENCES public.clients(id) ON DELETE CASCADE, proposed_category_id UUID REFERENCES public.operator_client_commission_categories(id) ON DELETE SET NULL, proposed_category_name TEXT NOT NULL, wants_unbilled BOOLEAN NOT NULL DEFAULT FALSE, reason TEXT NOT NULL, status TEXT NOT NULL DEFAULT 'pending', response TEXT, submitted_at TIMESTAMPTZ NOT NULL DEFAULT NOW(), resolved_at TIMESTAMPTZ, created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(), updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW());

ALTER TABLE public.commission_lead_objections DROP CONSTRAINT IF EXISTS commission_lead_objections_status_check;

ALTER TABLE public.commission_lead_objections ADD CONSTRAINT commission_lead_objections_status_check CHECK (status IN ('pending', 'approved', 'rejected'));

DROP INDEX IF EXISTS public.commission_lead_objections_lead_key;

CREATE UNIQUE INDEX IF NOT EXISTS commission_lead_objections_lead_key ON public.commission_lead_objections(commission_lead_id);

CREATE INDEX IF NOT EXISTS idx_commission_lead_objections_client ON public.commission_lead_objections(client_id, submitted_at DESC);

CREATE INDEX IF NOT EXISTS idx_commission_lead_objections_open ON public.commission_lead_objections(status) WHERE status = 'pending';

ALTER TABLE public.commission_lead_objections ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Operators full access to commission lead objections" ON public.commission_lead_objections;

CREATE POLICY "Operators full access to commission lead objections" ON public.commission_lead_objections FOR ALL TO authenticated USING ((SELECT auth.jwt() ->> 'user_role') = 'operator') WITH CHECK ((SELECT auth.jwt() ->> 'user_role') = 'operator');

DROP POLICY IF EXISTS "Clients read own commission lead objections" ON public.commission_lead_objections;

CREATE POLICY "Clients read own commission lead objections" ON public.commission_lead_objections FOR SELECT TO authenticated USING (client_id::text = (SELECT auth.jwt() -> 'app_metadata' ->> 'client_id'));
