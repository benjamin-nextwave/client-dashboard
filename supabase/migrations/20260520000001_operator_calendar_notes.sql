-- =============================================================================
-- OPERATOR KALENDER NOTITIES
-- =============================================================================
-- Vrije notities/evenementen die de operator handmatig op een datum prikt
-- vanuit /admin/controle/kalender. Los van timeline events (die ontstaan
-- automatisch uit klant-acties) en los van operator_check_tasks (die een
-- status hebben).
--
-- Een notitie hoort altijd bij één klant en heeft één event_date. Een
-- vrije tekst-titel en optioneel een langere beschrijving.
--
-- RLS gelijk aan de rest van operator_* tabellen: alleen 'operator' rol.
-- Server actions gebruiken de admin client (bypass RLS) — policies zijn
-- defense-in-depth.
-- =============================================================================

CREATE TABLE IF NOT EXISTS public.operator_calendar_notes (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  client_id UUID NOT NULL REFERENCES public.clients(id) ON DELETE CASCADE,
  event_date DATE NOT NULL,
  title TEXT NOT NULL,
  description TEXT,
  created_by UUID REFERENCES auth.users(id) ON DELETE SET NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_operator_calendar_notes_client_date
  ON public.operator_calendar_notes(client_id, event_date);

CREATE INDEX IF NOT EXISTS idx_operator_calendar_notes_date
  ON public.operator_calendar_notes(event_date);

ALTER TABLE public.operator_calendar_notes ENABLE ROW LEVEL SECURITY;

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies
    WHERE schemaname = 'public'
      AND tablename = 'operator_calendar_notes'
      AND policyname = 'Operators full access to operator_calendar_notes'
  ) THEN
    CREATE POLICY "Operators full access to operator_calendar_notes"
      ON public.operator_calendar_notes
      FOR ALL
      TO authenticated
      USING ((SELECT auth.jwt() ->> 'user_role') = 'operator')
      WITH CHECK ((SELECT auth.jwt() ->> 'user_role') = 'operator');
  END IF;
END $$;
