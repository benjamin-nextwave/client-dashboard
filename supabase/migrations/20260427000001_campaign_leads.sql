-- Campaign leads: leads die handmatig door de operator worden toegevoegd
-- vanuit lopende campagnes. De klant ziet ze read-only op
-- /dashboard/campagne-leads, gegroepeerd per week en gecategoriseerd per label.
--
-- Verschil met `synced_leads`: dit is operator-curated input (bv. uit
-- LinkedIn-replies of telefoongesprekken), niet de Instantly auto-sync.

CREATE TABLE public.campaign_leads (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  client_id UUID NOT NULL REFERENCES public.clients(id) ON DELETE CASCADE,

  -- Lead identificatie
  lead_email TEXT NOT NULL,
  lead_name TEXT,
  lead_company TEXT,

  -- Verzonden mail (campagnemail die naar de lead ging)
  sent_subject TEXT,
  sent_body TEXT,
  sent_at TIMESTAMPTZ,

  -- Positieve reactie van de lead
  reply_subject TEXT,
  reply_body TEXT,
  received_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),

  -- Categorisatie
  label TEXT NOT NULL CHECK (label IN (
    'meeting_voorstel',
    'geinteresseerd',
    'telefonisch_voorstel',
    'komt_erop_terug',
    'doorverwezen',
    'later_mogelijk',
    'geen_interesse'
  )),

  notes TEXT,

  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX idx_campaign_leads_client_received
  ON public.campaign_leads(client_id, received_at DESC);

CREATE INDEX idx_campaign_leads_label
  ON public.campaign_leads(client_id, label);

ALTER TABLE public.campaign_leads ENABLE ROW LEVEL SECURITY;

-- Operators: full access overal
CREATE POLICY "Operators full access to campaign_leads"
  ON public.campaign_leads
  FOR ALL
  TO authenticated
  USING ((SELECT auth.jwt() ->> 'user_role') = 'operator')
  WITH CHECK ((SELECT auth.jwt() ->> 'user_role') = 'operator');

-- Klanten: read-only op eigen rijen
CREATE POLICY "Clients can view own campaign_leads"
  ON public.campaign_leads
  FOR SELECT
  TO authenticated
  USING (client_id::TEXT = (SELECT auth.jwt() ->> 'client_id'));

-- Auto-update van updated_at
CREATE OR REPLACE FUNCTION public.tg_campaign_leads_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER campaign_leads_set_updated_at
  BEFORE UPDATE ON public.campaign_leads
  FOR EACH ROW
  EXECUTE FUNCTION public.tg_campaign_leads_updated_at();
