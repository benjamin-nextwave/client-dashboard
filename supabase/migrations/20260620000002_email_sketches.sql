-- =============================================================================
-- EMAIL_SKETCHES — "De tekentafel" voor het uitschrijven van mailvarianten
-- =============================================================================
-- Per klant kan de operator losse schetsen ("sketches") bewaren waarin
-- mailvarianten worden uitgetypt. Elke schets heeft een titel en twee
-- tekstvelden: een TEMPLATE (met variabelen) en een VOORBEELD (uitgeschreven).
-- =============================================================================

CREATE TABLE IF NOT EXISTS public.email_sketches (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  client_id UUID NOT NULL REFERENCES public.clients(id) ON DELETE CASCADE,
  title TEXT NOT NULL DEFAULT 'Naamloze schets',
  template_content TEXT NOT NULL DEFAULT '',
  example_content TEXT NOT NULL DEFAULT '',
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_email_sketches_client
  ON public.email_sketches(client_id, updated_at DESC);

ALTER TABLE public.email_sketches ENABLE ROW LEVEL SECURITY;

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies
    WHERE schemaname = 'public'
      AND tablename = 'email_sketches'
      AND policyname = 'Operators full access to email_sketches'
  ) THEN
    CREATE POLICY "Operators full access to email_sketches"
      ON public.email_sketches
      FOR ALL
      TO authenticated
      USING ((SELECT auth.jwt() ->> 'user_role') = 'operator')
      WITH CHECK ((SELECT auth.jwt() ->> 'user_role') = 'operator');
  END IF;
END $$;
