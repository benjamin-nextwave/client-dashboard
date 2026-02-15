-- RLS Tenant Isolation Tests
-- Verifies that row-level security policies enforce strict tenant isolation
-- across all tables (clients, profiles) for all roles (operator, client, anon).
--
-- Run via: supabase test db

BEGIN;

-- =============================================================================
-- SETUP
-- =============================================================================

CREATE EXTENSION IF NOT EXISTS pgtap WITH SCHEMA extensions;

SELECT plan(17);

-- Insert test clients
INSERT INTO public.clients (id, company_name, primary_color, is_recruitment) VALUES
  ('aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa', 'Client A Corp', '#3B82F6', FALSE),
  ('bbbbbbbb-bbbb-bbbb-bbbb-bbbbbbbbbbbb', 'Client B Corp', '#10B981', TRUE);

-- Insert test users into auth.users
INSERT INTO auth.users (id, instance_id, email, encrypted_password, email_confirmed_at, aud, role, raw_app_meta_data, raw_user_meta_data, created_at, updated_at, confirmation_token, recovery_token) VALUES
  ('11111111-1111-1111-1111-111111111111', '00000000-0000-0000-0000-000000000000', 'operator@test.com', crypt('password123', gen_salt('bf')), NOW(), 'authenticated', 'authenticated', '{"provider":"email","providers":["email"]}'::JSONB, '{}'::JSONB, NOW(), NOW(), '', ''),
  ('22222222-2222-2222-2222-222222222222', '00000000-0000-0000-0000-000000000000', 'clienta@test.com', crypt('password123', gen_salt('bf')), NOW(), 'authenticated', 'authenticated', '{"provider":"email","providers":["email"]}'::JSONB, '{}'::JSONB, NOW(), NOW(), '', ''),
  ('33333333-3333-3333-3333-333333333333', '00000000-0000-0000-0000-000000000000', 'clientb@test.com', crypt('password123', gen_salt('bf')), NOW(), 'authenticated', 'authenticated', '{"provider":"email","providers":["email"]}'::JSONB, '{}'::JSONB, NOW(), NOW(), '', '');

-- Insert test profiles
INSERT INTO public.profiles (id, user_role, client_id, display_name) VALUES
  ('11111111-1111-1111-1111-111111111111', 'operator', NULL, 'Operator Admin'),
  ('22222222-2222-2222-2222-222222222222', 'client', 'aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa', 'Client A User'),
  ('33333333-3333-3333-3333-333333333333', 'client', 'bbbbbbbb-bbbb-bbbb-bbbb-bbbbbbbbbbbb', 'Client B User');

-- =============================================================================
-- CLIENT A ISOLATION TESTS
-- =============================================================================

-- Authenticate as Client A
SET LOCAL role = 'authenticated';
SET LOCAL request.jwt.claims = '{"sub":"22222222-2222-2222-2222-222222222222","user_role":"client","client_id":"aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa"}';

-- Test 1: Client A can SELECT their own client record
SELECT results_eq(
  $$SELECT company_name FROM public.clients ORDER BY company_name$$,
  $$VALUES ('Client A Corp'::TEXT)$$,
  'Client A can SELECT their own client record'
);

-- Test 2: Client A CANNOT SELECT Client B''s record
SELECT is_empty(
  $$SELECT * FROM public.clients WHERE id = 'bbbbbbbb-bbbb-bbbb-bbbb-bbbbbbbbbbbb'$$,
  'Client A CANNOT SELECT Client B''s client record'
);

-- Test 3: Client A CANNOT UPDATE Client B''s record
SELECT is_empty(
  $$UPDATE public.clients SET company_name = 'Hacked' WHERE id = 'bbbbbbbb-bbbb-bbbb-bbbb-bbbbbbbbbbbb' RETURNING id$$,
  'Client A CANNOT UPDATE Client B''s client record'
);

-- Test 4: Client A CANNOT DELETE Client B''s record
SELECT is_empty(
  $$DELETE FROM public.clients WHERE id = 'bbbbbbbb-bbbb-bbbb-bbbb-bbbbbbbbbbbb' RETURNING id$$,
  'Client A CANNOT DELETE Client B''s client record'
);

-- Test 5: Client A CANNOT INSERT a new client record
SELECT throws_ok(
  $$INSERT INTO public.clients (company_name) VALUES ('Evil Corp')$$,
  42501,
  NULL,
  'Client A CANNOT INSERT a new client record'
);

-- Test 6: Client A can SELECT their own profile
SELECT results_eq(
  $$SELECT display_name FROM public.profiles WHERE id = '22222222-2222-2222-2222-222222222222'$$,
  $$VALUES ('Client A User'::TEXT)$$,
  'Client A can SELECT their own profile'
);

-- Test 7: Client A CANNOT SELECT Client B''s profile
SELECT is_empty(
  $$SELECT * FROM public.profiles WHERE id = '33333333-3333-3333-3333-333333333333'$$,
  'Client A CANNOT SELECT Client B''s profile'
);

-- =============================================================================
-- CLIENT B ISOLATION TESTS
-- =============================================================================

-- Authenticate as Client B
SET LOCAL request.jwt.claims = '{"sub":"33333333-3333-3333-3333-333333333333","user_role":"client","client_id":"bbbbbbbb-bbbb-bbbb-bbbb-bbbbbbbbbbbb"}';

-- Test 8: Client B can SELECT only their own client record
SELECT results_eq(
  $$SELECT company_name FROM public.clients ORDER BY company_name$$,
  $$VALUES ('Client B Corp'::TEXT)$$,
  'Client B can SELECT only their own client record'
);

-- Test 9: Client B CANNOT access Client A''s data
SELECT is_empty(
  $$SELECT * FROM public.clients WHERE id = 'aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa'$$,
  'Client B CANNOT SELECT Client A''s client record'
);

-- Test 10: Client B CANNOT SELECT Client A''s profile
SELECT is_empty(
  $$SELECT * FROM public.profiles WHERE id = '22222222-2222-2222-2222-222222222222'$$,
  'Client B CANNOT SELECT Client A''s profile'
);

-- =============================================================================
-- OPERATOR TESTS
-- =============================================================================

-- Authenticate as Operator
SET LOCAL request.jwt.claims = '{"sub":"11111111-1111-1111-1111-111111111111","user_role":"operator","client_id":null}';

-- Test 11: Operator can SELECT all client records
SELECT results_eq(
  $$SELECT COUNT(*)::INT FROM public.clients$$,
  2,
  'Operator can SELECT all client records (count = 2)'
);

-- Test 12: Operator can INSERT a new client
SELECT lives_ok(
  $$INSERT INTO public.clients (company_name) VALUES ('New Corp')$$,
  'Operator can INSERT a new client'
);

-- Test 13: Operator can UPDATE a client
SELECT lives_ok(
  $$UPDATE public.clients SET company_name = 'Updated Corp' WHERE id = 'aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa'$$,
  'Operator can UPDATE a client'
);

-- Test 14: Operator can SELECT all profiles
SELECT results_eq(
  $$SELECT COUNT(*)::INT FROM public.profiles$$,
  3,
  'Operator can SELECT all profiles (count = 3)'
);

-- =============================================================================
-- ANON (UNAUTHENTICATED) TESTS
-- =============================================================================

-- Switch to anonymous role
SET LOCAL role = 'anon';
SET LOCAL request.jwt.claims = '{}';

-- Test 15: Anon user CANNOT SELECT from clients
SELECT is_empty(
  $$SELECT * FROM public.clients$$,
  'Anon user CANNOT SELECT from clients'
);

-- Test 16: Anon user CANNOT SELECT from profiles
SELECT is_empty(
  $$SELECT * FROM public.profiles$$,
  'Anon user CANNOT SELECT from profiles'
);

-- Test 17: Anon user CANNOT INSERT into clients
SELECT throws_ok(
  $$INSERT INTO public.clients (company_name) VALUES ('Anon Corp')$$,
  42501,
  NULL,
  'Anon user CANNOT INSERT into clients'
);

-- =============================================================================
-- TEARDOWN
-- =============================================================================

SELECT * FROM finish();

ROLLBACK;
