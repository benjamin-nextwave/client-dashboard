-- Initial Schema: clients and profiles tables with RLS policies
-- Part of Phase 1: Foundation & Multi-tenancy

-- =============================================================================
-- CLIENTS TABLE (tenant registry)
-- =============================================================================

CREATE TABLE public.clients (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  company_name TEXT NOT NULL,
  primary_color TEXT NOT NULL DEFAULT '#3B82F6',
  logo_url TEXT,
  meeting_url TEXT,
  is_recruitment BOOLEAN NOT NULL DEFAULT FALSE,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

ALTER TABLE public.clients ENABLE ROW LEVEL SECURITY;

CREATE INDEX idx_clients_id ON public.clients(id);

-- =============================================================================
-- PROFILES TABLE (links auth.users to roles and tenants)
-- =============================================================================

CREATE TABLE public.profiles (
  id UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  user_role TEXT NOT NULL CHECK (user_role IN ('operator', 'client')),
  client_id UUID REFERENCES public.clients(id) ON DELETE SET NULL,
  display_name TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

ALTER TABLE public.profiles ENABLE ROW LEVEL SECURITY;

CREATE INDEX idx_profiles_client_id ON public.profiles(client_id);
CREATE INDEX idx_profiles_user_role ON public.profiles(user_role);

-- =============================================================================
-- RLS POLICIES: clients table
-- =============================================================================

-- Operators can perform all operations on clients
CREATE POLICY "Operators can do everything with clients" ON public.clients
  FOR ALL TO authenticated
  USING ((SELECT auth.jwt() ->> 'user_role') = 'operator')
  WITH CHECK ((SELECT auth.jwt() ->> 'user_role') = 'operator');

-- Clients can only view their own client record
CREATE POLICY "Clients can view own client record" ON public.clients
  FOR SELECT TO authenticated
  USING (id::TEXT = (SELECT auth.jwt() ->> 'client_id'));

-- =============================================================================
-- RLS POLICIES: profiles table
-- =============================================================================

-- Operators can view all profiles
CREATE POLICY "Operators can view all profiles" ON public.profiles
  FOR SELECT TO authenticated
  USING ((SELECT auth.jwt() ->> 'user_role') = 'operator');

-- Users can view their own profile
CREATE POLICY "Users can view own profile" ON public.profiles
  FOR SELECT TO authenticated
  USING (id = (SELECT auth.uid()));

-- Allow supabase_auth_admin to read profiles (required for the custom access token hook)
CREATE POLICY "Auth admin reads profiles" ON public.profiles
  AS PERMISSIVE FOR SELECT
  TO supabase_auth_admin
  USING (true);
