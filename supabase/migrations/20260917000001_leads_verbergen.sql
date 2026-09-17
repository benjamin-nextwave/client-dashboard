-- =============================================================================
-- LEADS VERBERGEN — een lead tijdelijk uit het klantdashboard halen
-- =============================================================================
-- Soms klopt er iets niet aan een lead en wil je hem onderzoeken voordat de
-- klant hem ziet. Zet dan in de Table Editor `hidden` op true; terug op false
-- en hij staat er weer. Standaard false, dus alle bestaande leads blijven
-- zichtbaar.
--
-- Het filter zit op twee plekken, omdat de lead-inbox met het token van de
-- klant leest (RLS) en de campagne-leads/CRM met de service-role (code).
-- Operators en Make blijven alles zien.
--
-- Eén statement per regel, geen DO-blokken — de SQL-editor van Supabase knipt
-- statements op regeleinden.
-- =============================================================================

ALTER TABLE public.leads ADD COLUMN IF NOT EXISTS hidden BOOLEAN NOT NULL DEFAULT false;

DROP POLICY IF EXISTS "Clients can view own leads" ON public.leads;
CREATE POLICY "Clients can view own leads" ON public.leads FOR SELECT TO authenticated USING (customer_id = current_lead_inbox_customer_id() AND hidden = false);

DROP POLICY IF EXISTS "Clients can update own leads" ON public.leads;
CREATE POLICY "Clients can update own leads" ON public.leads FOR UPDATE TO authenticated USING (customer_id = current_lead_inbox_customer_id() AND hidden = false) WITH CHECK (customer_id = current_lead_inbox_customer_id());

DROP POLICY IF EXISTS "Clients can delete own leads" ON public.leads;
CREATE POLICY "Clients can delete own leads" ON public.leads FOR DELETE TO authenticated USING (customer_id = current_lead_inbox_customer_id() AND hidden = false);
