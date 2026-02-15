-- Seed Data for Local Development
-- This file is for local dev only, NOT for production
-- Run via: supabase start (automatically applies seed.sql)

-- =============================================================================
-- TEST CLIENTS
-- =============================================================================

INSERT INTO public.clients (id, company_name, primary_color, logo_url, meeting_url, is_recruitment) VALUES
  ('aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa', 'Acme Corp', '#3B82F6', NULL, 'https://calendly.com/acme-demo', FALSE),
  ('bbbbbbbb-bbbb-bbbb-bbbb-bbbbbbbbbbbb', 'Beta Industries', '#10B981', NULL, 'https://calendly.com/beta-meeting', TRUE);

-- =============================================================================
-- TEST USERS IN auth.users
-- =============================================================================
-- Note: In local Supabase, we can insert directly into auth.users.
-- Passwords are hashed using Supabase's default bcrypt format.
-- All test users use password: 'password123'

INSERT INTO auth.users (
  id,
  instance_id,
  email,
  encrypted_password,
  email_confirmed_at,
  raw_app_meta_data,
  raw_user_meta_data,
  aud,
  role,
  created_at,
  updated_at,
  confirmation_token,
  recovery_token
) VALUES
  (
    '11111111-1111-1111-1111-111111111111',
    '00000000-0000-0000-0000-000000000000',
    'operator@nextwavesolutions.com',
    crypt('password123', gen_salt('bf')),
    NOW(),
    '{"provider":"email","providers":["email"],"user_role":"operator"}'::JSONB,
    '{"display_name":"Operator Admin"}'::JSONB,
    'authenticated',
    'authenticated',
    NOW(),
    NOW(),
    '',
    ''
  ),
  (
    '22222222-2222-2222-2222-222222222222',
    '00000000-0000-0000-0000-000000000000',
    'client-a@acmecorp.com',
    crypt('password123', gen_salt('bf')),
    NOW(),
    '{"provider":"email","providers":["email"],"user_role":"client","client_id":"aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa"}'::JSONB,
    '{"display_name":"Acme Corp User"}'::JSONB,
    'authenticated',
    'authenticated',
    NOW(),
    NOW(),
    '',
    ''
  ),
  (
    '33333333-3333-3333-3333-333333333333',
    '00000000-0000-0000-0000-000000000000',
    'client-b@betaindustries.com',
    crypt('password123', gen_salt('bf')),
    NOW(),
    '{"provider":"email","providers":["email"],"user_role":"client","client_id":"bbbbbbbb-bbbb-bbbb-bbbb-bbbbbbbbbbbb"}'::JSONB,
    '{"display_name":"Beta Industries User"}'::JSONB,
    'authenticated',
    'authenticated',
    NOW(),
    NOW(),
    '',
    ''
  );

-- =============================================================================
-- TEST PROFILES
-- =============================================================================

INSERT INTO public.profiles (id, user_role, client_id, display_name) VALUES
  ('11111111-1111-1111-1111-111111111111', 'operator', NULL, 'Operator Admin'),
  ('22222222-2222-2222-2222-222222222222', 'client', 'aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa', 'Acme Corp User'),
  ('33333333-3333-3333-3333-333333333333', 'client', 'bbbbbbbb-bbbb-bbbb-bbbb-bbbbbbbbbbbb', 'Beta Industries User');
