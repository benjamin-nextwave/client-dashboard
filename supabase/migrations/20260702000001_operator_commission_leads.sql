-- =============================================================================
-- OPERATOR CONTROLE — COMMISSIE-LEADS (commissiecontrole)
-- =============================================================================
-- Vervangt de aggregatie-invoer van operator_commission_entries door losse
-- lead-rijen. Elke rij is één lead die tijdens de commissiecontrole is
-- ingevoerd: mailadres, klant, categorie (met prijs-snapshot), campagne en
-- datum. De commissie is per lead = unit_price_cents (elke lead telt als 1).
--
-- is_checked (groene vink) en is_rejected (rood kruis) zijn onafhankelijke
-- markeringen voor de lead-geschiedenis; beide mogen tegelijk aan staan.
--
-- Er is bewust GEEN UNIQUE-constraint: meerdere leads met hetzelfde mailadres,
-- dezelfde categorie en dag zijn toegestaan (elk blok = 1 lead).
--
-- De vaste dagkosten van €20 per klant per werkdag worden NIET opgeslagen; ze
-- worden afgeleid in de overzichten (€20 × aantal werkdagen met leads per
-- klant; weekenddagen tellen niet mee).
--
-- Idempotent via IF NOT EXISTS / existence-checks.
-- =============================================================================

CREATE TABLE IF NOT EXISTS public.operator_commission_leads (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  client_id UUID NOT NULL REFERENCES public.clients(id) ON DELETE CASCADE,
  lead_email TEXT NOT NULL,
  campaign_name TEXT NOT NULL DEFAULT '',
  entry_date DATE NOT NULL,
  category_id UUID REFERENCES public.operator_client_commission_categories(id) ON DELETE SET NULL,
  category_name TEXT NOT NULL,
  unit_price_cents INTEGER NOT NULL DEFAULT 0 CHECK (unit_price_cents >= 0),
  is_checked BOOLEAN NOT NULL DEFAULT FALSE,
  is_rejected BOOLEAN NOT NULL DEFAULT FALSE,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_commission_leads_client_date
  ON public.operator_commission_leads(client_id, entry_date);

CREATE INDEX IF NOT EXISTS idx_commission_leads_date
  ON public.operator_commission_leads(entry_date);

ALTER TABLE public.operator_commission_leads ENABLE ROW LEVEL SECURITY;

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies
    WHERE schemaname = 'public'
      AND tablename = 'operator_commission_leads'
      AND policyname = 'Operators full access to commission leads'
  ) THEN
    CREATE POLICY "Operators full access to commission leads"
      ON public.operator_commission_leads
      FOR ALL
      TO authenticated
      USING ((SELECT auth.jwt() ->> 'user_role') = 'operator')
      WITH CHECK ((SELECT auth.jwt() ->> 'user_role') = 'operator');
  END IF;
END $$;
