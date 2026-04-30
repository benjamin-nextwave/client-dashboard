-- Campagne-flow visualisatie: een operator-geconfigureerd, visueel diagram van
-- de mailcampagne dat de klant ziet onderaan /dashboard/mijn-campagne.
--
-- Volledig los van public.mail_variants (die blijft puur voor de
-- goedkeuringsflow). Hier modelleren we het feitelijke pad per klant:
-- mail-stappen (verticaal) met varianten en uitkomsten (continue / success
-- / dropoff) per stap. Dropoff-uitkomsten dragen een lijst van afhaak-redenen
-- (negatieve reactie, OOO, geen interesse, ...).

-- =============================================================================
-- CAMPAIGN_FLOWS — 1 per klant
-- =============================================================================

CREATE TABLE public.campaign_flows (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  client_id UUID NOT NULL UNIQUE REFERENCES public.clients(id) ON DELETE CASCADE,

  is_published BOOLEAN NOT NULL DEFAULT FALSE,
  published_at TIMESTAMPTZ,

  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

ALTER TABLE public.campaign_flows ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Operators full access to campaign_flows"
  ON public.campaign_flows
  FOR ALL
  TO authenticated
  USING ((SELECT auth.jwt() ->> 'user_role') = 'operator')
  WITH CHECK ((SELECT auth.jwt() ->> 'user_role') = 'operator');

CREATE POLICY "Clients can view own published flow"
  ON public.campaign_flows
  FOR SELECT
  TO authenticated
  USING (
    client_id::TEXT = (SELECT auth.jwt() ->> 'client_id')
    AND is_published = TRUE
  );

CREATE OR REPLACE FUNCTION public.tg_campaign_flows_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER campaign_flows_set_updated_at
  BEFORE UPDATE ON public.campaign_flows
  FOR EACH ROW
  EXECUTE FUNCTION public.tg_campaign_flows_updated_at();

-- =============================================================================
-- CAMPAIGN_FLOW_STEPS — mail-stappen per flow (Mail 1, 2, 3, ...)
-- =============================================================================

CREATE TABLE public.campaign_flow_steps (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  flow_id UUID NOT NULL REFERENCES public.campaign_flows(id) ON DELETE CASCADE,

  step_number INTEGER NOT NULL CHECK (step_number >= 1),
  title TEXT NOT NULL DEFAULT '',
  position INTEGER NOT NULL DEFAULT 0,

  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),

  UNIQUE (flow_id, step_number)
);

CREATE INDEX idx_campaign_flow_steps_flow_pos
  ON public.campaign_flow_steps(flow_id, position);

ALTER TABLE public.campaign_flow_steps ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Operators full access to campaign_flow_steps"
  ON public.campaign_flow_steps
  FOR ALL
  TO authenticated
  USING ((SELECT auth.jwt() ->> 'user_role') = 'operator')
  WITH CHECK ((SELECT auth.jwt() ->> 'user_role') = 'operator');

CREATE POLICY "Clients can view own flow steps"
  ON public.campaign_flow_steps
  FOR SELECT
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM public.campaign_flows f
      WHERE f.id = campaign_flow_steps.flow_id
        AND f.is_published = TRUE
        AND f.client_id::TEXT = (SELECT auth.jwt() ->> 'client_id')
    )
  );

CREATE TRIGGER campaign_flow_steps_set_updated_at
  BEFORE UPDATE ON public.campaign_flow_steps
  FOR EACH ROW
  EXECUTE FUNCTION public.tg_campaign_flows_updated_at();

-- =============================================================================
-- CAMPAIGN_FLOW_STEP_VARIANTS — varianten per stap (≥1)
-- =============================================================================

CREATE TABLE public.campaign_flow_step_variants (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  step_id UUID NOT NULL REFERENCES public.campaign_flow_steps(id) ON DELETE CASCADE,

  label TEXT NOT NULL DEFAULT '',
  subject TEXT NOT NULL DEFAULT '',
  body TEXT NOT NULL DEFAULT '',
  example_body TEXT NOT NULL DEFAULT '',
  position INTEGER NOT NULL DEFAULT 0,

  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX idx_campaign_flow_step_variants_step
  ON public.campaign_flow_step_variants(step_id, position);

ALTER TABLE public.campaign_flow_step_variants ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Operators full access to campaign_flow_step_variants"
  ON public.campaign_flow_step_variants
  FOR ALL
  TO authenticated
  USING ((SELECT auth.jwt() ->> 'user_role') = 'operator')
  WITH CHECK ((SELECT auth.jwt() ->> 'user_role') = 'operator');

CREATE POLICY "Clients can view own flow variants"
  ON public.campaign_flow_step_variants
  FOR SELECT
  TO authenticated
  USING (
    EXISTS (
      SELECT 1
      FROM public.campaign_flow_steps s
      JOIN public.campaign_flows f ON f.id = s.flow_id
      WHERE s.id = campaign_flow_step_variants.step_id
        AND f.is_published = TRUE
        AND f.client_id::TEXT = (SELECT auth.jwt() ->> 'client_id')
    )
  );

CREATE TRIGGER campaign_flow_step_variants_set_updated_at
  BEFORE UPDATE ON public.campaign_flow_step_variants
  FOR EACH ROW
  EXECUTE FUNCTION public.tg_campaign_flows_updated_at();

-- =============================================================================
-- CAMPAIGN_FLOW_STEP_OUTCOMES — uitkomsten per stap (max 3 per stap)
-- =============================================================================
-- kind:
--   'continue' = pad gaat door naar volgende stap (geen reactie)
--   'success'  = positieve dead-end (lead reageerde positief)
--   'dropoff'  = negatieve dead-end (lead is afgehaakt) — bevat reden-lijst

CREATE TABLE public.campaign_flow_step_outcomes (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  step_id UUID NOT NULL REFERENCES public.campaign_flow_steps(id) ON DELETE CASCADE,

  kind TEXT NOT NULL CHECK (kind IN ('continue', 'success', 'dropoff')),
  label TEXT NOT NULL DEFAULT '',
  responsibility TEXT CHECK (responsibility IN ('client', 'nextwave')),
  dropoff_reasons JSONB NOT NULL DEFAULT '[]'::JSONB,
  position INTEGER NOT NULL DEFAULT 0,

  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),

  UNIQUE (step_id, kind)
);

CREATE INDEX idx_campaign_flow_step_outcomes_step
  ON public.campaign_flow_step_outcomes(step_id, position);

ALTER TABLE public.campaign_flow_step_outcomes ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Operators full access to campaign_flow_step_outcomes"
  ON public.campaign_flow_step_outcomes
  FOR ALL
  TO authenticated
  USING ((SELECT auth.jwt() ->> 'user_role') = 'operator')
  WITH CHECK ((SELECT auth.jwt() ->> 'user_role') = 'operator');

CREATE POLICY "Clients can view own flow outcomes"
  ON public.campaign_flow_step_outcomes
  FOR SELECT
  TO authenticated
  USING (
    EXISTS (
      SELECT 1
      FROM public.campaign_flow_steps s
      JOIN public.campaign_flows f ON f.id = s.flow_id
      WHERE s.id = campaign_flow_step_outcomes.step_id
        AND f.is_published = TRUE
        AND f.client_id::TEXT = (SELECT auth.jwt() ->> 'client_id')
    )
  );

CREATE TRIGGER campaign_flow_step_outcomes_set_updated_at
  BEFORE UPDATE ON public.campaign_flow_step_outcomes
  FOR EACH ROW
  EXECUTE FUNCTION public.tg_campaign_flows_updated_at();
