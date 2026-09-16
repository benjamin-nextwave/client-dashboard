-- =============================================================================
-- UITGAVES — de kostenlijst die we zelf bijhouden
-- =============================================================================
-- De geboekte uitgaven staan in Rompslomp, maar die administratie loopt achter:
-- er wordt niet op tijd ingevuld, dus een overzicht dat erop leunt klopt pas
-- weken later. Deze tabel is daarom een eigen bron. Hij wordt gevuld vanuit de
-- chat (skill `uitgaves`, script scripts/uitgaves.mjs) en gelezen door
-- /admin/financieel/uitgaves.
--
-- Eén regel is één kostenpost, niet één betaling. Een abonnement van €297 per
-- maand staat hier één keer met cadence='maand'; een losse aankoop staat er met
-- cadence='eenmalig' en de datum in started_on. Zo is "wat kost ons dit per
-- maand" een optelling en geen schatting.
--
-- amount_cents is EXCLUSIEF btw, net als in de Rompslomp-uitlezer en aan de
-- commissiekant. Anders zijn de twee kanten niet vergelijkbaar.
--
-- verdict en action zijn de besparingskant: verdict is het oordeel over de post
-- (goed / kan beter / fout), action is wat we ermee gaan doen. Allebei mogen
-- leeg blijven — dat betekent "nog niet beoordeeld", en daar begint het gesprek.
--
-- external_ref houdt imports idempotent: een CSV die twee keer langskomt maakt
-- geen dubbele regels. Alleen gevuld bij geïmporteerde regels, vandaar een
-- gedeeltelijke unieke index in plaats van een kolom-constraint.
--
-- Eén statement per regel, geen DO-blokken — de SQL-editor van Supabase knipt
-- statements op regeleinden.
-- =============================================================================

CREATE TABLE IF NOT EXISTS public.operator_expenses (id UUID PRIMARY KEY DEFAULT gen_random_uuid(), supplier TEXT NOT NULL, description TEXT NOT NULL DEFAULT '', category TEXT NOT NULL DEFAULT 'overig', amount_cents INTEGER NOT NULL, cadence TEXT NOT NULL DEFAULT 'maand', started_on DATE, ended_on DATE, status TEXT NOT NULL DEFAULT 'actief', verdict TEXT, verdict_reason TEXT, action TEXT, action_note TEXT, client_id UUID REFERENCES public.clients(id) ON DELETE SET NULL, source TEXT NOT NULL DEFAULT 'handmatig', external_ref TEXT, notes TEXT, created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(), updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW());

ALTER TABLE public.operator_expenses DROP CONSTRAINT IF EXISTS operator_expenses_cadence_check;

ALTER TABLE public.operator_expenses ADD CONSTRAINT operator_expenses_cadence_check CHECK (cadence IN ('eenmalig', 'maand', 'kwartaal', 'jaar'));

ALTER TABLE public.operator_expenses DROP CONSTRAINT IF EXISTS operator_expenses_status_check;

ALTER TABLE public.operator_expenses ADD CONSTRAINT operator_expenses_status_check CHECK (status IN ('actief', 'opgezegd', 'gestopt'));

ALTER TABLE public.operator_expenses DROP CONSTRAINT IF EXISTS operator_expenses_verdict_check;

ALTER TABLE public.operator_expenses ADD CONSTRAINT operator_expenses_verdict_check CHECK (verdict IS NULL OR verdict IN ('goed', 'kan_beter', 'fout'));

ALTER TABLE public.operator_expenses DROP CONSTRAINT IF EXISTS operator_expenses_action_check;

ALTER TABLE public.operator_expenses ADD CONSTRAINT operator_expenses_action_check CHECK (action IS NULL OR action IN ('houden', 'opzeggen', 'overstappen', 'verlagen'));

ALTER TABLE public.operator_expenses DROP CONSTRAINT IF EXISTS operator_expenses_source_check;

ALTER TABLE public.operator_expenses ADD CONSTRAINT operator_expenses_source_check CHECK (source IN ('handmatig', 'chat', 'csv'));

ALTER TABLE public.operator_expenses DROP CONSTRAINT IF EXISTS operator_expenses_amount_check;

ALTER TABLE public.operator_expenses ADD CONSTRAINT operator_expenses_amount_check CHECK (amount_cents >= 0);

CREATE UNIQUE INDEX IF NOT EXISTS idx_operator_expenses_external_ref ON public.operator_expenses(external_ref) WHERE external_ref IS NOT NULL;

CREATE INDEX IF NOT EXISTS idx_operator_expenses_status ON public.operator_expenses(status, supplier);

CREATE INDEX IF NOT EXISTS idx_operator_expenses_started ON public.operator_expenses(started_on DESC);

ALTER TABLE public.operator_expenses ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Operators full access to expenses" ON public.operator_expenses;

CREATE POLICY "Operators full access to expenses" ON public.operator_expenses FOR ALL TO authenticated USING ((SELECT auth.jwt() ->> 'user_role') = 'operator') WITH CHECK ((SELECT auth.jwt() ->> 'user_role') = 'operator');
