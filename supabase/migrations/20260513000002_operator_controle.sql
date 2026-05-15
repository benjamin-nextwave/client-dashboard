-- =============================================================================
-- OPERATOR DAGELIJKSE CONTROLE
-- =============================================================================
-- Two operator-only tables used by /admin/controle:
--   * operator_client_checks  -- one row per completed check session
--                                (onboarding or live), stores the full
--                                question/answer payload as JSONB for history
--   * operator_check_tasks    -- tasks created during a check session,
--                                shown later in the afternoon task list
--
-- RLS is enabled with operator-only policies. Server actions use the admin
-- (service_role) Supabase client, which bypasses RLS — the policies exist as
-- defense-in-depth so the tables remain unreachable via the anon key.
-- =============================================================================

CREATE TABLE public.operator_client_checks (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  client_id UUID NOT NULL REFERENCES public.clients(id) ON DELETE CASCADE,
  check_type TEXT NOT NULL CHECK (check_type IN ('onboarding', 'live')),
  -- For 'live' checks: how many campaigns the operator chose to walk through.
  -- NULL for onboarding checks.
  num_campaigns INTEGER,
  -- Full question/answer payload. Shape:
  --   { questions: [{ id, label, answer }, ...] }                 for onboarding
  --   { campaigns: [{ index, questions: [{ id, label, answer }] }] } for live
  answers JSONB NOT NULL DEFAULT '{}'::jsonb,
  created_by UUID REFERENCES auth.users(id) ON DELETE SET NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX idx_operator_client_checks_client_created
  ON public.operator_client_checks(client_id, created_at DESC);

CREATE INDEX idx_operator_client_checks_created
  ON public.operator_client_checks(created_at DESC);


CREATE TABLE public.operator_check_tasks (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  check_id UUID REFERENCES public.operator_client_checks(id) ON DELETE CASCADE,
  client_id UUID NOT NULL REFERENCES public.clients(id) ON DELETE CASCADE,
  description TEXT NOT NULL,
  is_completed BOOLEAN NOT NULL DEFAULT FALSE,
  completed_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX idx_operator_check_tasks_created
  ON public.operator_check_tasks(created_at DESC);

CREATE INDEX idx_operator_check_tasks_client
  ON public.operator_check_tasks(client_id, created_at DESC);


-- --- RLS ----------------------------------------------------------------------
ALTER TABLE public.operator_client_checks ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.operator_check_tasks ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Operators full access to operator_client_checks"
  ON public.operator_client_checks
  FOR ALL
  TO authenticated
  USING ((SELECT auth.jwt() ->> 'user_role') = 'operator')
  WITH CHECK ((SELECT auth.jwt() ->> 'user_role') = 'operator');

CREATE POLICY "Operators full access to operator_check_tasks"
  ON public.operator_check_tasks
  FOR ALL
  TO authenticated
  USING ((SELECT auth.jwt() ->> 'user_role') = 'operator')
  WITH CHECK ((SELECT auth.jwt() ->> 'user_role') = 'operator');
