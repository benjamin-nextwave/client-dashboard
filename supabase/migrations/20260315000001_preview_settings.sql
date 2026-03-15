-- Preview settings table for operator-configured client preview data
CREATE TABLE public.preview_settings (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  client_id UUID NOT NULL REFERENCES public.clients(id) ON DELETE CASCADE,
  contact_count INTEGER,
  job_titles JSONB NOT NULL DEFAULT '[]',
  industries JSONB NOT NULL DEFAULT '[]',
  locations JSONB NOT NULL DEFAULT '[]',
  launch_date DATE,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  UNIQUE(client_id)
);

-- RLS
ALTER TABLE public.preview_settings ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Operators full access to preview_settings"
  ON public.preview_settings
  FOR ALL
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM public.profiles
      WHERE profiles.id = auth.uid()
      AND profiles.user_role = 'operator'
    )
  );

CREATE POLICY "Clients can view own preview_settings"
  ON public.preview_settings
  FOR SELECT
  TO authenticated
  USING (
    client_id::TEXT = (auth.jwt() -> 'app_metadata' ->> 'client_id')
  );
