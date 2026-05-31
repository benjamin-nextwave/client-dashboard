-- =============================================================================
-- WHEEL_PICKS — willekeurig rad voor operator-mailkeuze
-- =============================================================================
-- Houdt bij welke klanten via het "rad" zijn gekozen. Eén unieke pick per klant
-- tot de operator het rad reset (= alle rows verwijderen). Geen kalender-koppeling,
-- geen taken — puur een fun-selector.
-- =============================================================================

CREATE TABLE IF NOT EXISTS public.wheel_picks (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  client_id UUID NOT NULL REFERENCES public.clients(id) ON DELETE CASCADE,
  picked_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  picked_by UUID REFERENCES auth.users(id),
  UNIQUE (client_id)
);

CREATE INDEX IF NOT EXISTS idx_wheel_picks_picked_at
  ON public.wheel_picks(picked_at DESC);

ALTER TABLE public.wheel_picks ENABLE ROW LEVEL SECURITY;

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies
    WHERE schemaname = 'public'
      AND tablename = 'wheel_picks'
      AND policyname = 'Operators full access to wheel_picks'
  ) THEN
    CREATE POLICY "Operators full access to wheel_picks"
      ON public.wheel_picks
      FOR ALL
      TO authenticated
      USING ((SELECT auth.jwt() ->> 'user_role') = 'operator')
      WITH CHECK ((SELECT auth.jwt() ->> 'user_role') = 'operator');
  END IF;
END $$;
