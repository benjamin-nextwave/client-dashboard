-- =============================================================================
-- FEEDBACK REQUESTS
-- =============================================================================

CREATE TABLE public.feedback_requests (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  client_id UUID NOT NULL REFERENCES public.clients(id) ON DELETE CASCADE,
  user_id UUID NOT NULL REFERENCES auth.users(id),
  category TEXT NOT NULL CHECK (category IN ('bug', 'new_feature', 'optimization', 'other')),
  title TEXT NOT NULL,
  description TEXT NOT NULL,
  status TEXT NOT NULL DEFAULT 'new' CHECK (status IN ('new', 'in_progress', 'thinking', 'denied', 'applied')),
  operator_response TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

ALTER TABLE public.feedback_requests ENABLE ROW LEVEL SECURITY;

CREATE INDEX idx_feedback_requests_client_id ON public.feedback_requests(client_id);
CREATE INDEX idx_feedback_requests_status ON public.feedback_requests(status);

-- =============================================================================
-- RLS POLICIES
-- =============================================================================

-- Clients can read their own feedback
CREATE POLICY "Clients can view own feedback" ON public.feedback_requests
  FOR SELECT TO authenticated
  USING (client_id::TEXT = (SELECT auth.jwt() ->> 'client_id'));

-- Clients can insert their own feedback
CREATE POLICY "Clients can insert own feedback" ON public.feedback_requests
  FOR INSERT TO authenticated
  WITH CHECK (client_id::TEXT = (SELECT auth.jwt() ->> 'client_id'));

-- Operators can view all feedback
CREATE POLICY "Operators can view all feedback" ON public.feedback_requests
  FOR SELECT TO authenticated
  USING ((SELECT auth.jwt() ->> 'user_role') = 'operator');

-- Operators can update feedback (status + response)
CREATE POLICY "Operators can update feedback" ON public.feedback_requests
  FOR UPDATE TO authenticated
  USING ((SELECT auth.jwt() ->> 'user_role') = 'operator')
  WITH CHECK ((SELECT auth.jwt() ->> 'user_role') = 'operator');
