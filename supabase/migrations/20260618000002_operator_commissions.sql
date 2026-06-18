-- =============================================================================
-- OPERATOR CONTROLE — COMMISSIES
-- =============================================================================
-- Twee nieuwe tabellen:
--   1. operator_client_commission_categories
--      Per klant instelbare commissie-categorieën met een prijs per lead
--      (in centen). De standaardcategorieën (Meeting verzoek, etc.) worden
--      niet automatisch toegevoegd; de operator kiest ze in de UI en zet er
--      een prijs bij, of maakt een eigen categorie aan.
--   2. operator_commission_entries
--      Per (klant, campagne, dag, categorie) het aantal leads dat die dag is
--      ontvangen, met een snapshot van de categorienaam en prijs. Ingevuld
--      tijdens de avondcontrole. Eén rij per combinatie (UPSERT).
--
-- De vaste dagkosten van €20 per klant per werkdag worden NIET opgeslagen;
-- ze worden afgeleid in de overzichten (€20 × aantal dagen met entries).
--
-- Idempotent via IF NOT EXISTS / existence-checks.
-- =============================================================================

-- 1) Categorieën per klant -----------------------------------------------------
CREATE TABLE IF NOT EXISTS public.operator_client_commission_categories (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  client_id UUID NOT NULL REFERENCES public.clients(id) ON DELETE CASCADE,
  name TEXT NOT NULL,
  price_cents INTEGER NOT NULL DEFAULT 0 CHECK (price_cents >= 0),
  position INTEGER NOT NULL DEFAULT 0,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  UNIQUE (client_id, name)
);

CREATE INDEX IF NOT EXISTS idx_commission_categories_client
  ON public.operator_client_commission_categories(client_id, position);

ALTER TABLE public.operator_client_commission_categories ENABLE ROW LEVEL SECURITY;

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies
    WHERE schemaname = 'public'
      AND tablename = 'operator_client_commission_categories'
      AND policyname = 'Operators full access to commission categories'
  ) THEN
    CREATE POLICY "Operators full access to commission categories"
      ON public.operator_client_commission_categories
      FOR ALL
      TO authenticated
      USING ((SELECT auth.jwt() ->> 'user_role') = 'operator')
      WITH CHECK ((SELECT auth.jwt() ->> 'user_role') = 'operator');
  END IF;
END $$;


-- 2) Dag-entries per categorie -------------------------------------------------
CREATE TABLE IF NOT EXISTS public.operator_commission_entries (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  client_id UUID NOT NULL REFERENCES public.clients(id) ON DELETE CASCADE,
  campaign_name TEXT NOT NULL,
  entry_date DATE NOT NULL,
  category_id UUID REFERENCES public.operator_client_commission_categories(id) ON DELETE SET NULL,
  category_name TEXT NOT NULL,
  unit_price_cents INTEGER NOT NULL DEFAULT 0,
  lead_count INTEGER NOT NULL DEFAULT 0 CHECK (lead_count >= 0),
  check_id UUID REFERENCES public.operator_client_checks(id) ON DELETE SET NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  UNIQUE (client_id, campaign_name, entry_date, category_id)
);

CREATE INDEX IF NOT EXISTS idx_commission_entries_client_date
  ON public.operator_commission_entries(client_id, entry_date);

CREATE INDEX IF NOT EXISTS idx_commission_entries_date
  ON public.operator_commission_entries(entry_date);

ALTER TABLE public.operator_commission_entries ENABLE ROW LEVEL SECURITY;

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies
    WHERE schemaname = 'public'
      AND tablename = 'operator_commission_entries'
      AND policyname = 'Operators full access to commission entries'
  ) THEN
    CREATE POLICY "Operators full access to commission entries"
      ON public.operator_commission_entries
      FOR ALL
      TO authenticated
      USING ((SELECT auth.jwt() ->> 'user_role') = 'operator')
      WITH CHECK ((SELECT auth.jwt() ->> 'user_role') = 'operator');
  END IF;
END $$;
