-- =============================================================================
-- CLIENT OVERZICHTSPAGINA — extra velden + updates-thread
-- =============================================================================
-- Voegt vijf bewerkbare velden toe op `clients` die op de nieuwe
-- admin-overzichtspagina als bubbels te zien zijn:
--   - dealbasis (vrije tekst, bv. "Performance € 950 + setup")
--   - inbox_approach ('eigen_workspace' | 'n8n_inbox')
--   - start_date_maand / end_date_maand (lopende-maand periode)
--   - company_summary (vrije tekst, samenvatting bedrijf)
--
-- En een nieuwe tabel `client_updates` voor de "Belangrijke updates"-thread.
-- Berichten zijn afkomstig van een vast trio afzenders (kix/merlijn/benjamin),
-- kunnen als urgent (uitroepteken) gemarkeerd worden en optioneel
-- "verbonden aan samenvatting" — die laatste rendert het bericht ook onder
-- de samenvatting op de overzichtspagina.
--
-- Volledig idempotent. Geen bestaande data wordt aangepast of verwijderd.
-- =============================================================================

-- 1) Extra kolommen op clients
ALTER TABLE public.clients
  ADD COLUMN IF NOT EXISTS dealbasis TEXT,
  ADD COLUMN IF NOT EXISTS inbox_approach TEXT,
  ADD COLUMN IF NOT EXISTS start_date_maand DATE,
  ADD COLUMN IF NOT EXISTS end_date_maand DATE,
  ADD COLUMN IF NOT EXISTS company_summary TEXT;

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint
    WHERE conname = 'clients_inbox_approach_check'
  ) THEN
    ALTER TABLE public.clients
      ADD CONSTRAINT clients_inbox_approach_check
      CHECK (inbox_approach IS NULL OR inbox_approach IN ('eigen_workspace', 'n8n_inbox'));
  END IF;
END $$;


-- 2) Tabel client_updates
CREATE TABLE IF NOT EXISTS public.client_updates (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  client_id UUID NOT NULL REFERENCES public.clients(id) ON DELETE CASCADE,
  author TEXT NOT NULL,
  message TEXT NOT NULL,
  is_urgent BOOLEAN NOT NULL DEFAULT FALSE,
  linked_to_summary BOOLEAN NOT NULL DEFAULT FALSE,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint
    WHERE conname = 'client_updates_author_check'
  ) THEN
    ALTER TABLE public.client_updates
      ADD CONSTRAINT client_updates_author_check
      CHECK (author IN ('kix', 'merlijn', 'benjamin'));
  END IF;
END $$;

CREATE INDEX IF NOT EXISTS idx_client_updates_client_created
  ON public.client_updates(client_id, created_at DESC);

CREATE INDEX IF NOT EXISTS idx_client_updates_linked
  ON public.client_updates(client_id, linked_to_summary)
  WHERE linked_to_summary = TRUE;

ALTER TABLE public.client_updates ENABLE ROW LEVEL SECURITY;

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies
    WHERE schemaname = 'public'
      AND tablename = 'client_updates'
      AND policyname = 'Operators full access to client_updates'
  ) THEN
    CREATE POLICY "Operators full access to client_updates"
      ON public.client_updates
      FOR ALL
      TO authenticated
      USING ((SELECT auth.jwt() ->> 'user_role') = 'operator')
      WITH CHECK ((SELECT auth.jwt() ->> 'user_role') = 'operator');
  END IF;
END $$;
