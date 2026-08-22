-- =============================================================================
-- Doorverwijzingen — verstuurde mails naar de doorverwezen persoon
-- =============================================================================
-- Wanneer een lead doorverwijst naar een collega, kan de klant die collega
-- vanuit de lead inbox benaderen. Die mail gaat via een eigen Make-webhook en
-- staat dus niet in outbound_replies: het is geen antwoord in de bestaande
-- thread maar een nieuwe mail aan iemand anders.
--
-- Waarom vastleggen: zonder deze rij weet het scherm na een herlaadbeurt niet
-- meer dat de doorverwijzing al benaderd is, en kan dezelfde persoon een
-- tweede keer een koude mail krijgen.
--
-- Idempotent via IF NOT EXISTS / existence-checks.
-- =============================================================================

CREATE TABLE IF NOT EXISTS public.lead_referral_outreach (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  lead_id UUID NOT NULL REFERENCES public.leads(id) ON DELETE CASCADE,
  client_id UUID NOT NULL REFERENCES public.clients(id) ON DELETE CASCADE,
  to_email TEXT NOT NULL,
  from_email TEXT NOT NULL,
  subject TEXT NOT NULL,
  body TEXT NOT NULL,
  sent_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

COMMENT ON TABLE public.lead_referral_outreach IS
  'Mails aan een doorverwezen contactpersoon, verstuurd vanuit de lead inbox.';

CREATE INDEX IF NOT EXISTS idx_lead_referral_outreach_lead
  ON public.lead_referral_outreach(lead_id, sent_at DESC);

ALTER TABLE public.lead_referral_outreach ENABLE ROW LEVEL SECURITY;

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies
    WHERE schemaname = 'public'
      AND tablename = 'lead_referral_outreach'
      AND policyname = 'Operators full access to lead_referral_outreach'
  ) THEN
    CREATE POLICY "Operators full access to lead_referral_outreach"
      ON public.lead_referral_outreach
      FOR ALL
      TO authenticated
      USING ((SELECT auth.jwt() ->> 'user_role') = 'operator')
      WITH CHECK ((SELECT auth.jwt() ->> 'user_role') = 'operator');
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM pg_policies
    WHERE schemaname = 'public'
      AND tablename = 'lead_referral_outreach'
      AND policyname = 'Clients manage own lead_referral_outreach'
  ) THEN
    CREATE POLICY "Clients manage own lead_referral_outreach"
      ON public.lead_referral_outreach
      FOR ALL
      TO authenticated
      USING (client_id::text = (SELECT auth.jwt() ->> 'client_id'))
      WITH CHECK (client_id::text = (SELECT auth.jwt() ->> 'client_id'));
  END IF;
END $$;
