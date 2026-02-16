-- Fix: operator login fails because client_id=null doesn't conform to JWT schema
-- Supabase expects string type for client_id claim, not JSON null
-- Solution: use empty string "" instead of null for operators

CREATE OR REPLACE FUNCTION public.custom_access_token_hook(event JSONB)
RETURNS JSONB
LANGUAGE plpgsql
STABLE
AS $$
DECLARE
  claims JSONB;
  profile RECORD;
BEGIN
  SELECT user_role, client_id INTO profile
  FROM public.profiles
  WHERE id = (event->>'user_id')::UUID;

  claims := event->'claims';

  IF profile.user_role IS NOT NULL THEN
    claims := jsonb_set(claims, '{user_role}', to_jsonb(profile.user_role));
  ELSE
    claims := jsonb_set(claims, '{user_role}', '""');
  END IF;

  IF profile.client_id IS NOT NULL THEN
    claims := jsonb_set(claims, '{client_id}', to_jsonb(profile.client_id::TEXT));
  ELSE
    claims := jsonb_set(claims, '{client_id}', '""');
  END IF;

  event := jsonb_set(event, '{claims}', claims);
  RETURN event;
END;
$$;
