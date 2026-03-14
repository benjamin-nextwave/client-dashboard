-- Add onboarding status to clients
ALTER TABLE public.clients
  ADD COLUMN onboarding_status TEXT NOT NULL DEFAULT 'live'
  CHECK (onboarding_status IN ('onboarding', 'live'));

-- Onboarding steps table
CREATE TABLE public.onboarding_steps (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  client_id UUID NOT NULL REFERENCES public.clients(id) ON DELETE CASCADE,
  title TEXT NOT NULL,
  assigned_to TEXT NOT NULL CHECK (assigned_to IN ('client', 'nextwave')),
  sort_order INTEGER NOT NULL,
  is_completed BOOLEAN NOT NULL DEFAULT FALSE,
  completed_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Index for fast lookups
CREATE INDEX idx_onboarding_steps_client ON public.onboarding_steps(client_id, sort_order);

-- RLS
ALTER TABLE public.onboarding_steps ENABLE ROW LEVEL SECURITY;

-- Operators can do everything
CREATE POLICY "Operators full access to onboarding_steps"
  ON public.onboarding_steps
  FOR ALL
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM public.profiles
      WHERE profiles.id = auth.uid()
      AND profiles.user_role = 'operator'
    )
  );

-- Clients can only view their own steps
CREATE POLICY "Clients can view own onboarding_steps"
  ON public.onboarding_steps
  FOR SELECT
  TO authenticated
  USING (
    client_id::TEXT = (auth.jwt() -> 'app_metadata' ->> 'client_id')
  );

-- Insert default onboarding steps function
CREATE OR REPLACE FUNCTION public.insert_default_onboarding_steps(p_client_id UUID)
RETURNS VOID AS $$
BEGIN
  INSERT INTO public.onboarding_steps (client_id, title, assigned_to, sort_order)
  VALUES
    (p_client_id, 'Invulformulier opsturen', 'client', 1),
    (p_client_id, 'Mailopzetjes maken en voorvertoning aanvullen met data', 'nextwave', 2),
    (p_client_id, 'Mailopzetjes en voorvertoning goedkeuren', 'client', 3),
    (p_client_id, 'Livegang', 'nextwave', 4);
END;
$$ LANGUAGE plpgsql;
