-- =============================================================================
-- OPERATOR CONTROLE — PERSONA SPLIT + MAANDDATA
-- =============================================================================
-- Drie wijzigingen:
--   1. operator_check_tasks krijgt een 'assignee' kolom (benjamin | merlijn).
--      Bestaande taken zonder toewijzing worden naar 'benjamin' geschreven
--      zodat ze niet uit beeld raken in de gefilterde takenlijst.
--   2. operator_client_checks krijgt dezelfde 'assignee' kolom zodat de
--      geschiedenis per persoon zichtbaar gemaakt kan worden. Voor
--      bestaande rijen blijft de waarde NULL.
--   3. Nieuwe tabel operator_client_monthly_data voor de statische velden
--      die per klant per maand worden ingevoerd (contacten te benaderen,
--      startdatum maand, einddatum maand, klantcontract). Eén rij per
--      (client_id, year, month) — UPSERT-vriendelijk via UNIQUE-constraint.
--
-- Volledig idempotent: alle DDL gebruikt IF NOT EXISTS of een DO-block
-- met expliciete existence-check, zodat herdraaien geen kapotte staat
-- oplevert.
-- =============================================================================

-- 1) Tasks: assignee kolom + backfill
ALTER TABLE public.operator_check_tasks
  ADD COLUMN IF NOT EXISTS assignee TEXT;

UPDATE public.operator_check_tasks
  SET assignee = 'benjamin'
  WHERE assignee IS NULL;

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint
    WHERE conname = 'operator_check_tasks_assignee_check'
  ) THEN
    ALTER TABLE public.operator_check_tasks
      ADD CONSTRAINT operator_check_tasks_assignee_check
      CHECK (assignee IN ('benjamin', 'merlijn'));
  END IF;
END $$;

CREATE INDEX IF NOT EXISTS idx_operator_check_tasks_assignee
  ON public.operator_check_tasks(assignee);


-- 2) Checks: assignee kolom (nullable, geen backfill — oudere historie
--    blijft zichtbaar zonder persona-attributie).
ALTER TABLE public.operator_client_checks
  ADD COLUMN IF NOT EXISTS assignee TEXT;

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint
    WHERE conname = 'operator_client_checks_assignee_check'
  ) THEN
    ALTER TABLE public.operator_client_checks
      ADD CONSTRAINT operator_client_checks_assignee_check
      CHECK (assignee IN ('benjamin', 'merlijn'));
  END IF;
END $$;

CREATE INDEX IF NOT EXISTS idx_operator_client_checks_assignee
  ON public.operator_client_checks(assignee);


-- 3) Maandelijkse statische data per klant
CREATE TABLE IF NOT EXISTS public.operator_client_monthly_data (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  client_id UUID NOT NULL REFERENCES public.clients(id) ON DELETE CASCADE,
  year INTEGER NOT NULL CHECK (year BETWEEN 2024 AND 2100),
  month INTEGER NOT NULL CHECK (month BETWEEN 1 AND 12),
  contacts_to_approach INTEGER,
  start_date DATE,
  end_date DATE,
  contract_basis TEXT,
  created_by UUID REFERENCES auth.users(id) ON DELETE SET NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  UNIQUE (client_id, year, month)
);

CREATE INDEX IF NOT EXISTS idx_operator_client_monthly_data_client
  ON public.operator_client_monthly_data(client_id, year DESC, month DESC);

ALTER TABLE public.operator_client_monthly_data ENABLE ROW LEVEL SECURITY;

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies
    WHERE schemaname = 'public'
      AND tablename = 'operator_client_monthly_data'
      AND policyname = 'Operators full access to operator_client_monthly_data'
  ) THEN
    CREATE POLICY "Operators full access to operator_client_monthly_data"
      ON public.operator_client_monthly_data
      FOR ALL
      TO authenticated
      USING ((SELECT auth.jwt() ->> 'user_role') = 'operator')
      WITH CHECK ((SELECT auth.jwt() ->> 'user_role') = 'operator');
  END IF;
END $$;
