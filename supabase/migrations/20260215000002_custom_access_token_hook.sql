-- Custom Access Token Hook: injects user_role and client_id into JWT claims
-- Part of Phase 1: Foundation & Multi-tenancy
--
-- IMPORTANT: After deploying this migration, you must manually enable the hook
-- in Supabase Dashboard -> Authentication -> Hooks -> Enable 'Custom Access Token Hook'
-- -> Select function: custom_access_token_hook

-- =============================================================================
-- HOOK FUNCTION
-- =============================================================================

CREATE OR REPLACE FUNCTION public.custom_access_token_hook(event JSONB)
RETURNS JSONB
LANGUAGE plpgsql
STABLE
AS $$
DECLARE
  claims JSONB;
  profile RECORD;
BEGIN
  -- Look up the user's profile to get role and tenant
  SELECT user_role, client_id INTO profile
  FROM public.profiles
  WHERE id = (event->>'user_id')::UUID;

  claims := event->'claims';

  -- Inject user_role into JWT claims
  IF profile.user_role IS NOT NULL THEN
    claims := jsonb_set(claims, '{user_role}', to_jsonb(profile.user_role));
  ELSE
    claims := jsonb_set(claims, '{user_role}', 'null');
  END IF;

  -- Inject client_id into JWT claims (NULL for operators)
  IF profile.client_id IS NOT NULL THEN
    claims := jsonb_set(claims, '{client_id}', to_jsonb(profile.client_id::TEXT));
  ELSE
    claims := jsonb_set(claims, '{client_id}', 'null');
  END IF;

  event := jsonb_set(event, '{claims}', claims);
  RETURN event;
END;
$$;

-- =============================================================================
-- PERMISSIONS
-- =============================================================================

-- Grant supabase_auth_admin access to execute the hook
GRANT USAGE ON SCHEMA public TO supabase_auth_admin;
GRANT EXECUTE ON FUNCTION public.custom_access_token_hook TO supabase_auth_admin;

-- Revoke from all other roles (security: only auth system should call this)
REVOKE EXECUTE ON FUNCTION public.custom_access_token_hook FROM authenticated, anon, public;

-- Grant auth admin read access to profiles (needed by the hook function)
GRANT ALL ON TABLE public.profiles TO supabase_auth_admin;
