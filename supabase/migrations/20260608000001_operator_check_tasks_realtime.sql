-- =============================================================================
-- REALTIME OP operator_check_tasks
-- =============================================================================
-- Zet Supabase Realtime aan voor de takenlijst zodat wijzigingen (aangemaakt,
-- afgevinkt, verwijderd) live naar alle abonnees worden gepusht — zowel het
-- admin-dashboard als een extern project dat dezelfde tabel deelt.
--
-- REPLICA IDENTITY FULL is nodig zodat het oude record (en dus de `assignee`-
-- waarde) meekomt in UPDATE/DELETE-events; anders kan een client-side filter
-- op `assignee=eq.<persona>` deze events niet matchen.
--
-- Idempotent: de publication-toevoeging staat in een DO-block met existence-
-- check zodat herdraaien geen fout geeft.
-- =============================================================================

ALTER TABLE public.operator_check_tasks REPLICA IDENTITY FULL;

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_publication_tables
    WHERE pubname = 'supabase_realtime'
      AND schemaname = 'public'
      AND tablename = 'operator_check_tasks'
  ) THEN
    ALTER PUBLICATION supabase_realtime ADD TABLE public.operator_check_tasks;
  END IF;
END $$;
