-- =============================================================================
-- Takenpagina: Kix als derde persoon, namens-wie en een AI-beschrijving
-- =============================================================================
-- Externe dashboards lezen operator_check_tasks rechtstreeks. Daarom staat hier
-- uitsluitend uitbreiding: geen kolom wordt hernoemd, verwijderd of van type
-- veranderd, en description blijft precies wat het was, namelijk de taakregel
-- zelf. De nieuwe kolommen zijn nullable zonder default, dus bestaande lezers
-- en schrijvers merken er niets van.
--
-- LET OP voor de externe kant: assignee kan vanaf nu ook kix bevatten. Een
-- extern dashboard dat filtert op benjamin en merlijn laat Kix-taken weg. Dat
-- is de enige gedragsverandering in deze migratie.
--
-- Bewust zonder DO-blokken geschreven: de SQL-editor van Supabase struikelt
-- over dollar-quoting. DROP CONSTRAINT IF EXISTS gevolgd door ADD CONSTRAINT
-- doet hetzelfde en is net zo goed opnieuw te draaien.
-- =============================================================================


-- Stap 1. assignee: kix toestaan naast benjamin en merlijn.

ALTER TABLE public.operator_check_tasks
  DROP CONSTRAINT IF EXISTS operator_check_tasks_assignee_check;

ALTER TABLE public.operator_check_tasks
  ADD CONSTRAINT operator_check_tasks_assignee_check
  CHECK (assignee IN ('benjamin', 'merlijn', 'kix'));


-- Stap 2. requested_by: namens wie de taak is aangemaakt.
-- Nullable en zonder backfill: van bestaande taken weten we dit niet, en een
-- verzonnen waarde zou in de externe dashboards als feit binnenkomen.

ALTER TABLE public.operator_check_tasks
  ADD COLUMN IF NOT EXISTS requested_by TEXT;

ALTER TABLE public.operator_check_tasks
  DROP CONSTRAINT IF EXISTS operator_check_tasks_requested_by_check;

ALTER TABLE public.operator_check_tasks
  ADD CONSTRAINT operator_check_tasks_requested_by_check
  CHECK (requested_by IS NULL OR requested_by IN ('benjamin', 'merlijn', 'kix'));


-- Stap 3. details: de door het model opgeschoonde beschrijving.
-- Bewust een aparte kolom en niet in description: dat veld is wat de externe
-- dashboards als taakregel tonen, en dat blijft ongewijzigd. Hier komt alleen
-- de puntenlijst die het model van de ingetypte toelichting maakt; de ruwe
-- ingetypte tekst wordt nergens bewaard.

ALTER TABLE public.operator_check_tasks
  ADD COLUMN IF NOT EXISTS details TEXT;
