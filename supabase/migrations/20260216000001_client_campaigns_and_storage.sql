-- Phase 2: Client campaigns junction table, storage bucket, and profile RLS additions
-- Depends on: 20260215000001_initial_schema.sql

-- =============================================================================
-- CLIENT_CAMPAIGNS JUNCTION TABLE
-- =============================================================================

CREATE TABLE public.client_campaigns (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  client_id UUID NOT NULL REFERENCES public.clients(id) ON DELETE CASCADE,
  campaign_id TEXT NOT NULL,
  campaign_name TEXT NOT NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  UNIQUE(client_id, campaign_id)
);

ALTER TABLE public.client_campaigns ENABLE ROW LEVEL SECURITY;

CREATE INDEX idx_client_campaigns_client_id ON public.client_campaigns(client_id);

-- Operators can manage campaign associations
CREATE POLICY "Operators can manage campaign associations" ON public.client_campaigns
  FOR ALL TO authenticated
  USING ((SELECT auth.jwt() ->> 'user_role') = 'operator')
  WITH CHECK ((SELECT auth.jwt() ->> 'user_role') = 'operator');

-- Clients can view their own campaign associations
CREATE POLICY "Clients can view own campaigns" ON public.client_campaigns
  FOR SELECT TO authenticated
  USING (client_id::TEXT = (SELECT auth.jwt() ->> 'client_id'));

-- =============================================================================
-- STORAGE BUCKET: client-logos
-- =============================================================================

INSERT INTO storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
VALUES (
  'client-logos',
  'client-logos',
  TRUE,
  2097152,
  ARRAY['image/png', 'image/jpeg', 'image/svg+xml', 'image/webp']
);

-- Operators can upload logos
CREATE POLICY "Operators can upload client logos" ON storage.objects
  FOR INSERT TO authenticated
  WITH CHECK (
    bucket_id = 'client-logos'
    AND (SELECT auth.jwt() ->> 'user_role') = 'operator'
  );

-- Operators can update logos
CREATE POLICY "Operators can update client logos" ON storage.objects
  FOR UPDATE TO authenticated
  USING (
    bucket_id = 'client-logos'
    AND (SELECT auth.jwt() ->> 'user_role') = 'operator'
  );

-- Operators can delete logos
CREATE POLICY "Operators can delete client logos" ON storage.objects
  FOR DELETE TO authenticated
  USING (
    bucket_id = 'client-logos'
    AND (SELECT auth.jwt() ->> 'user_role') = 'operator'
  );

-- Authenticated users can view logos (clients need to see their own)
CREATE POLICY "Authenticated users can view client logos" ON storage.objects
  FOR SELECT TO authenticated
  USING (bucket_id = 'client-logos');

-- =============================================================================
-- PROFILE RLS ADDITIONS
-- =============================================================================

-- Operators can insert profiles (needed for client creation flow)
CREATE POLICY "Operators can insert profiles" ON public.profiles
  FOR INSERT TO authenticated
  WITH CHECK ((SELECT auth.jwt() ->> 'user_role') = 'operator');

-- Operators can update profiles
CREATE POLICY "Operators can update profiles" ON public.profiles
  FOR UPDATE TO authenticated
  USING ((SELECT auth.jwt() ->> 'user_role') = 'operator')
  WITH CHECK ((SELECT auth.jwt() ->> 'user_role') = 'operator');
