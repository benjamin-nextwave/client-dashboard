-- =============================================================================
-- Loopgang & Doelgroep — twee nieuwe klantpagina's in het admin dashboard
-- =============================================================================
-- LOOPGANG
-- De kalender leidt "stond deze klant die dag live?" af uit de dagcijfers van
-- Instantly (verstuurde mails per campagne per dag). Wat Instantly níet geeft
-- is een geschiedenis van pauzeermomenten, en dagcijfers zeggen niets over een
-- weekend of een dag zonder verzending. Daarom loggen we onze eigen pauzeer- en
-- hervat-acties: dat is de enige bron die "bewust stilgezet" kan onderscheiden
-- van "toevallig niets verstuurd".
--
-- De factuurmarkeringen zijn losse dagen; er staat bewust geen bedrag bij.
-- Eén knop per dag, meer is het niet.
--
-- DOELGROEP
-- Eén rij per klant. Alle lijstvelden staan als JSON-array in één kolom: ze
-- worden altijd in hun geheel geladen en opgeslagen, en zo kan er een veld bij
-- zonder migratie.
--
-- Alleen het admin dashboard leest en schrijft dit; de klant ziet het niet.
--
-- Idempotent via IF NOT EXISTS / existence-checks.
-- =============================================================================

-- -----------------------------------------------------------------------------
-- Pauzeer- en hervat-acties
-- -----------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS public.client_campaign_pause_events (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  client_id UUID NOT NULL REFERENCES public.clients(id) ON DELETE CASCADE,
  action TEXT NOT NULL CHECK (action IN ('pause', 'resume')),
  occurred_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  -- Welke Instantly-campagnes deze actie heeft geraakt, plus per campagne of de
  -- API-aanroep lukte. Nodig om achteraf te zien of een pauze half is doorgekomen.
  campaigns JSONB NOT NULL DEFAULT '[]'::jsonb,
  note TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_pause_events_client_time
  ON public.client_campaign_pause_events(client_id, occurred_at DESC);

ALTER TABLE public.client_campaign_pause_events ENABLE ROW LEVEL SECURITY;

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies
    WHERE schemaname = 'public'
      AND tablename = 'client_campaign_pause_events'
      AND policyname = 'Operators full access to pause events'
  ) THEN
    CREATE POLICY "Operators full access to pause events"
      ON public.client_campaign_pause_events
      FOR ALL
      TO authenticated
      USING ((SELECT auth.jwt() ->> 'user_role') = 'operator')
      WITH CHECK ((SELECT auth.jwt() ->> 'user_role') = 'operator');
  END IF;
END $$;

-- -----------------------------------------------------------------------------
-- Factuur verstuurd — één markering per dag per klant
-- -----------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS public.client_invoice_marks (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  client_id UUID NOT NULL REFERENCES public.clients(id) ON DELETE CASCADE,
  invoice_date DATE NOT NULL,
  note TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  UNIQUE (client_id, invoice_date)
);

CREATE INDEX IF NOT EXISTS idx_invoice_marks_client_date
  ON public.client_invoice_marks(client_id, invoice_date DESC);

ALTER TABLE public.client_invoice_marks ENABLE ROW LEVEL SECURITY;

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies
    WHERE schemaname = 'public'
      AND tablename = 'client_invoice_marks'
      AND policyname = 'Operators full access to invoice marks'
  ) THEN
    CREATE POLICY "Operators full access to invoice marks"
      ON public.client_invoice_marks
      FOR ALL
      TO authenticated
      USING ((SELECT auth.jwt() ->> 'user_role') = 'operator')
      WITH CHECK ((SELECT auth.jwt() ->> 'user_role') = 'operator');
  END IF;
END $$;

-- -----------------------------------------------------------------------------
-- Doelgroep — één rij per klant
-- -----------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS public.client_target_audience (
  client_id UUID PRIMARY KEY REFERENCES public.clients(id) ON DELETE CASCADE,
  sectors_included JSONB NOT NULL DEFAULT '[]'::jsonb,
  sectors_excluded JSONB NOT NULL DEFAULT '[]'::jsonb,
  keywords JSONB NOT NULL DEFAULT '[]'::jsonb,
  locations JSONB NOT NULL DEFAULT '[]'::jsonb,
  job_titles JSONB NOT NULL DEFAULT '[]'::jsonb,
  notes TEXT,
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

ALTER TABLE public.client_target_audience ENABLE ROW LEVEL SECURITY;

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies
    WHERE schemaname = 'public'
      AND tablename = 'client_target_audience'
      AND policyname = 'Operators full access to target audience'
  ) THEN
    CREATE POLICY "Operators full access to target audience"
      ON public.client_target_audience
      FOR ALL
      TO authenticated
      USING ((SELECT auth.jwt() ->> 'user_role') = 'operator')
      WITH CHECK ((SELECT auth.jwt() ->> 'user_role') = 'operator');
  END IF;
END $$;
