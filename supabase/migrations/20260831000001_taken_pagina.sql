-- =============================================================================
-- Takenpagina — Kix als derde persoon, "namens wie" en een AI-beschrijving
-- =============================================================================
-- Externe dashboards lezen operator_check_tasks rechtstreeks. Daarom staat hier
-- uitsluitend uitbreiding: geen kolom wordt hernoemd, verwijderd of van type
-- veranderd, en `description` blijft precies wat het was — de taakregel zelf.
-- De nieuwe kolommen zijn nullable zonder default, dus bestaande lezers en
-- schrijvers merken er niets van.
--
-- LET OP voor de externe kant: `assignee` kan vanaf nu ook 'kix' bevatten.
-- Een extern dashboard dat filtert op ('benjamin','merlijn') laat Kix-taken
-- weg. Dat is de enige gedragsverandering in deze migratie.
--
-- Idempotent via IF NOT EXISTS / existence-checks.
-- =============================================================================

-- -----------------------------------------------------------------------------
-- 1) assignee: 'kix' toestaan
-- -----------------------------------------------------------------------------
DO $$
BEGIN
  IF EXISTS (
    SELECT 1 FROM pg_constraint
    WHERE conname = 'operator_check_tasks_assignee_check'
  ) THEN
    ALTER TABLE public.operator_check_tasks
      DROP CONSTRAINT operator_check_tasks_assignee_check;
  END IF;

  ALTER TABLE public.operator_check_tasks
    ADD CONSTRAINT operator_check_tasks_assignee_check
    CHECK (assignee IN ('benjamin', 'merlijn', 'kix'));
END $$;

-- -----------------------------------------------------------------------------
-- 2) requested_by — namens wie de taak is aangemaakt
-- -----------------------------------------------------------------------------
-- Nullable en zonder backfill: van bestaande taken weten we dit niet, en een
-- verzonnen waarde zou in de externe dashboards als feit binnenkomen.
ALTER TABLE public.operator_check_tasks
  ADD COLUMN IF NOT EXISTS requested_by TEXT;

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint
    WHERE conname = 'operator_check_tasks_requested_by_check'
  ) THEN
    ALTER TABLE public.operator_check_tasks
      ADD CONSTRAINT operator_check_tasks_requested_by_check
      CHECK (requested_by IS NULL OR requested_by IN ('benjamin', 'merlijn', 'kix'));
  END IF;
END $$;

-- -----------------------------------------------------------------------------
-- 3) details — de door de AI opgeschoonde beschrijving
-- -----------------------------------------------------------------------------
-- Bewust een aparte kolom en niet in `description`: dat veld is wat de externe
-- dashboards als taakregel tonen, en dat blijft ongewijzigd. Hier komt alleen
-- de bullet-lijst die het model van de ingetypte toelichting maakt; de ruwe
-- ingetypte tekst wordt nergens bewaard.
ALTER TABLE public.operator_check_tasks
  ADD COLUMN IF NOT EXISTS details TEXT;
