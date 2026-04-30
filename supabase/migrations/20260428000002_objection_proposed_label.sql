-- Voegt classificatie + toelichting toe aan een bezwaar.
-- Wanneer een klant bezwaar indient, kiest die expliciet welk label volgens
-- haar wél past (single-select uit dezelfde 7 labels) en geeft een korte
-- toelichting. De operator ziet beide bij de beoordeling.

ALTER TABLE public.campaign_leads
  ADD COLUMN objection_proposed_label TEXT
    CHECK (objection_proposed_label IN (
      'meeting_voorstel',
      'geinteresseerd',
      'telefonisch_voorstel',
      'komt_erop_terug',
      'doorverwezen',
      'later_mogelijk',
      'geen_interesse'
    )),
  ADD COLUMN objection_proposed_label_note TEXT;
