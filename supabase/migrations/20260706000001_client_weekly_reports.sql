-- =============================================================================
-- WEEKRAPPORTEN — per klant meerdere PDF-weekrapporten
-- =============================================================================
-- De operator uploadt per klant losse PDF-weekrapporten (Klanten → klant →
-- "Weekrapporten"). De klant ziet ze terug in een uitklapbare lijst onderaan
-- de "Mijn campagne"-pagina en kan ze downloaden.
--
-- Elke rij = één geüpload weekrapport: een weergavenaam (te wijzigen door de
-- operator), het opslagpad in de bucket en de publieke URL. Nieuwste eerst
-- (order by created_at desc).
-- =============================================================================

CREATE TABLE IF NOT EXISTS public.client_weekly_reports (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  client_id UUID NOT NULL REFERENCES public.clients(id) ON DELETE CASCADE,
  name TEXT NOT NULL,
  file_path TEXT NOT NULL,
  file_url TEXT NOT NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_client_weekly_reports_client
  ON public.client_weekly_reports(client_id, created_at DESC);

ALTER TABLE public.client_weekly_reports ENABLE ROW LEVEL SECURITY;

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies
    WHERE schemaname = 'public'
      AND tablename = 'client_weekly_reports'
      AND policyname = 'Operators full access to weekly reports'
  ) THEN
    CREATE POLICY "Operators full access to weekly reports"
      ON public.client_weekly_reports
      FOR ALL
      TO authenticated
      USING ((SELECT auth.jwt() ->> 'user_role') = 'operator')
      WITH CHECK ((SELECT auth.jwt() ->> 'user_role') = 'operator');
  END IF;
END $$;

-- =============================================================================
-- STORAGE BUCKET: weekly-reports
-- =============================================================================

INSERT INTO storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
VALUES (
  'weekly-reports',
  'weekly-reports',
  TRUE,
  20971520, -- 20 MB
  ARRAY['application/pdf']
)
ON CONFLICT (id) DO NOTHING;

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies WHERE schemaname = 'storage' AND tablename = 'objects'
      AND policyname = 'Operators can upload weekly reports'
  ) THEN
    CREATE POLICY "Operators can upload weekly reports" ON storage.objects
      FOR INSERT TO authenticated
      WITH CHECK (
        bucket_id = 'weekly-reports'
        AND (SELECT auth.jwt() ->> 'user_role') = 'operator'
      );
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM pg_policies WHERE schemaname = 'storage' AND tablename = 'objects'
      AND policyname = 'Operators can update weekly reports'
  ) THEN
    CREATE POLICY "Operators can update weekly reports" ON storage.objects
      FOR UPDATE TO authenticated
      USING (
        bucket_id = 'weekly-reports'
        AND (SELECT auth.jwt() ->> 'user_role') = 'operator'
      );
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM pg_policies WHERE schemaname = 'storage' AND tablename = 'objects'
      AND policyname = 'Operators can delete weekly reports'
  ) THEN
    CREATE POLICY "Operators can delete weekly reports" ON storage.objects
      FOR DELETE TO authenticated
      USING (
        bucket_id = 'weekly-reports'
        AND (SELECT auth.jwt() ->> 'user_role') = 'operator'
      );
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM pg_policies WHERE schemaname = 'storage' AND tablename = 'objects'
      AND policyname = 'Authenticated users can view weekly reports'
  ) THEN
    CREATE POLICY "Authenticated users can view weekly reports" ON storage.objects
      FOR SELECT TO authenticated
      USING (bucket_id = 'weekly-reports');
  END IF;
END $$;
