-- =============================================================================
-- Antwoord-assistent voor de lead inbox — instellingen per klant
-- =============================================================================
-- De assistent stelt een antwoord voor op een binnengekomen lead-reactie. Hij
-- verstuurt nooit zelf; de klant drukt altijd op Verzenden.
--
-- Eén rij per klant:
--   enabled        de schakelaar rechtsboven in de inbox
--   knowledge      vrije tekst die de klant zelf bijhoudt (prijzen, veelgestelde
--                  vragen, wat we juist niet beloven)
--   traits         gekozen eigenschappen uit de vaste lijst, als id's. Alleen
--                  id's, want de formulering van een eigenschap moet kunnen
--                  wijzigen zonder migratie.
--   custom_traits  zelfgeschreven eigenschappen: [{ id, label }]
--
-- Geen aparte tabel per eigenschap: het is een korte, ongeordende verzameling
-- die altijd in zijn geheel wordt gelezen en geschreven.
--
-- Idempotent via IF NOT EXISTS / existence-checks.
-- =============================================================================

CREATE TABLE IF NOT EXISTS public.lead_inbox_ai_settings (
  client_id UUID PRIMARY KEY REFERENCES public.clients(id) ON DELETE CASCADE,
  enabled BOOLEAN NOT NULL DEFAULT FALSE,
  knowledge TEXT NOT NULL DEFAULT '',
  traits JSONB NOT NULL DEFAULT '[]'::jsonb,
  custom_traits JSONB NOT NULL DEFAULT '[]'::jsonb,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

COMMENT ON TABLE public.lead_inbox_ai_settings IS
  'Instellingen van de antwoord-assistent in de lead inbox, één rij per klant.';

ALTER TABLE public.lead_inbox_ai_settings ENABLE ROW LEVEL SECURITY;

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies
    WHERE schemaname = 'public'
      AND tablename = 'lead_inbox_ai_settings'
      AND policyname = 'Operators full access to lead_inbox_ai_settings'
  ) THEN
    CREATE POLICY "Operators full access to lead_inbox_ai_settings"
      ON public.lead_inbox_ai_settings
      FOR ALL
      TO authenticated
      USING ((SELECT auth.jwt() ->> 'user_role') = 'operator')
      WITH CHECK ((SELECT auth.jwt() ->> 'user_role') = 'operator');
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM pg_policies
    WHERE schemaname = 'public'
      AND tablename = 'lead_inbox_ai_settings'
      AND policyname = 'Clients manage own lead_inbox_ai_settings'
  ) THEN
    CREATE POLICY "Clients manage own lead_inbox_ai_settings"
      ON public.lead_inbox_ai_settings
      FOR ALL
      TO authenticated
      USING (client_id::text = (SELECT auth.jwt() ->> 'client_id'))
      WITH CHECK (client_id::text = (SELECT auth.jwt() ->> 'client_id'));
  END IF;
END $$;
