-- Error logs table for tracking API failures, import errors, and sync issues
CREATE TABLE public.error_logs (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  client_id UUID NOT NULL REFERENCES public.clients(id) ON DELETE CASCADE,
  error_type TEXT NOT NULL CHECK (error_type IN ('api_failure', 'import_error', 'sync_error')),
  message TEXT NOT NULL,
  details JSONB,
  is_resolved BOOLEAN NOT NULL DEFAULT FALSE,
  resolved_at TIMESTAMPTZ,
  resolved_by UUID REFERENCES auth.users(id),
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

ALTER TABLE public.error_logs ENABLE ROW LEVEL SECURITY;

-- Indexes
CREATE INDEX idx_error_logs_client_id ON public.error_logs (client_id);
CREATE INDEX idx_error_logs_created_at ON public.error_logs (created_at DESC);
CREATE INDEX idx_error_logs_unresolved ON public.error_logs (is_resolved) WHERE is_resolved = FALSE;

-- Only operators can manage error logs
CREATE POLICY "Operators can manage error_logs"
  ON public.error_logs
  FOR ALL
  TO authenticated
  USING ((SELECT auth.jwt() ->> 'user_role') = 'operator')
  WITH CHECK ((SELECT auth.jwt() ->> 'user_role') = 'operator');
