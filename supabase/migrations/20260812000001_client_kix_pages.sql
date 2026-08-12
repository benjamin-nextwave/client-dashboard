-- =============================================================================
-- KIX — vrije notitiepagina's per klant
-- =============================================================================
-- Elke klant krijgt een eigen set pagina's in het admin dashboard, bereikbaar
-- via de KIX-knop op het klantoverzicht. Een pagina is een titel plus een lijst
-- blokken (tekst, checklists, tabellen, tekeningen, ...).
--
-- De blokken staan als JSON in één kolom in plaats van in een aparte
-- blokken-tabel. Reden: een pagina wordt altijd in zijn geheel geladen en in
-- zijn geheel opgeslagen, de volgorde zit al in de array, en zo hoeft een
-- bewerking geen tientallen rijen te synchroniseren. De vorm van een blok mag
-- daardoor meegroeien zonder migratie.
--
-- Alleen het admin dashboard leest en schrijft dit; de klant ziet het niet.
--
-- Idempotent via IF NOT EXISTS / existence-checks.
-- =============================================================================

CREATE TABLE IF NOT EXISTS public.client_kix_pages (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  client_id UUID NOT NULL REFERENCES public.clients(id) ON DELETE CASCADE,
  title TEXT NOT NULL DEFAULT 'Naamloze pagina',
  icon TEXT NOT NULL DEFAULT '📄',
  blocks JSONB NOT NULL DEFAULT '[]'::jsonb,
  position INTEGER NOT NULL DEFAULT 0,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Het overzicht toont de nieuwste bewerking bovenaan, per klant.
CREATE INDEX IF NOT EXISTS idx_client_kix_pages_client_updated
  ON public.client_kix_pages(client_id, updated_at DESC);

ALTER TABLE public.client_kix_pages ENABLE ROW LEVEL SECURITY;

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies
    WHERE schemaname = 'public'
      AND tablename = 'client_kix_pages'
      AND policyname = 'Operators full access to kix pages'
  ) THEN
    CREATE POLICY "Operators full access to kix pages"
      ON public.client_kix_pages
      FOR ALL
      TO authenticated
      USING ((SELECT auth.jwt() ->> 'user_role') = 'operator')
      WITH CHECK ((SELECT auth.jwt() ->> 'user_role') = 'operator');
  END IF;
END $$;
