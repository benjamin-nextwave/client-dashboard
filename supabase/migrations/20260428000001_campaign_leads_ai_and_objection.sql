-- Voegt twee features toe aan campaign_leads:
--   1. AI-onderbouwing voor het toegekende label (label_justification).
--      Wordt op aanvraag door Claude gegenereerd en gecached in deze kolom.
--      Wordt op NULL gezet bij wijziging van label/reactie zodat hij ververst.
--   2. Bezwaar-flow: klant dient bezwaar in, operator keurt goed/af met
--      toelichting. Status null = geen bezwaar.

ALTER TABLE public.campaign_leads
  ADD COLUMN label_justification TEXT,
  ADD COLUMN objection_text TEXT,
  ADD COLUMN objection_submitted_at TIMESTAMPTZ,
  ADD COLUMN objection_status TEXT
    CHECK (objection_status IN ('pending', 'approved', 'rejected')),
  ADD COLUMN objection_response TEXT,
  ADD COLUMN objection_resolved_at TIMESTAMPTZ;

CREATE INDEX idx_campaign_leads_objection_status
  ON public.campaign_leads(objection_status)
  WHERE objection_status IS NOT NULL;
