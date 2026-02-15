# Phase 1: Foundation & Multi-tenancy - Research

**Researched:** 2026-02-15
**Domain:** Supabase Auth + Row Level Security + Next.js App Router multi-tenancy
**Confidence:** HIGH

## Summary

This phase establishes the entire project foundation: Next.js App Router project initialization with TypeScript and Tailwind CSS, Supabase integration for authentication, and Row Level Security (RLS) policies for strict multi-tenant data isolation. The authentication model has two roles -- operator (admin) and client -- with operators able to access all client data and clients restricted to their own tenant's data only.

The current standard approach uses `@supabase/ssr` (replacing the deprecated `@supabase/auth-helpers`) with cookie-based session management and Next.js middleware for token refresh. Role and tenant information should be injected into JWTs via a Custom Access Token Hook (a PostgreSQL function that runs before every token issuance), enabling RLS policies to read role and client_id directly from `auth.jwt()` claims without additional database lookups. This is the most performant and secure pattern for multi-tenant Supabase applications.

Testing RLS policies is critical for this phase. Supabase provides pgTAP (a PostgreSQL unit testing framework) with test helpers that allow authenticating as different users and verifying that cross-tenant data access is impossible. These tests run via `supabase test db` and can be integrated into CI/CD pipelines.

**Primary recommendation:** Use `@supabase/ssr` with cookie-based auth, a Custom Access Token Hook to inject `user_role` and `client_id` into JWTs, and RLS policies that read these claims via `(SELECT auth.jwt() ->> 'user_role')` and `(SELECT auth.jwt() ->> 'client_id')` with proper indexes on all `client_id` columns.

## Standard Stack

### Core
| Library | Version | Purpose | Why Standard |
|---------|---------|---------|--------------|
| Next.js | 15.x (stable) | App Router framework with SSR/RSC | Project constraint; production-stable with App Router |
| TypeScript | 5.x | Type safety | Project constraint |
| Tailwind CSS | 3.x | Utility-first CSS | Project constraint |
| @supabase/supabase-js | 2.95.x | Supabase client (DB, auth, storage) | Official Supabase JS client |
| @supabase/ssr | 0.8.x | Server-side auth with cookie management | Replaces deprecated auth-helpers; official SSR package |

### Supporting
| Library | Version | Purpose | When to Use |
|---------|---------|---------|-------------|
| supabase (CLI) | latest | Local dev, migrations, testing | Development workflow, running pgTAP tests |
| basejump-supabase_test_helpers | latest | pgTAP test utilities for auth context | Testing RLS policies with user switching |

### Alternatives Considered
| Instead of | Could Use | Tradeoff |
|------------|-----------|----------|
| @supabase/ssr | @supabase/auth-helpers-nextjs | auth-helpers is deprecated; ssr is the replacement |
| Custom Access Token Hook | app_metadata set via admin API | Hook runs on every token issuance (always fresh); app_metadata requires manual updates |
| pgTAP for RLS tests | Playwright/Jest integration tests | pgTAP tests RLS at the database level directly, faster and more thorough |

**Installation:**
```bash
# Project initialization
npx create-next-app@latest dashboard --typescript --tailwind --eslint --app --src-dir

# Supabase packages
npm install @supabase/supabase-js @supabase/ssr

# Supabase CLI (for local dev + migrations)
npm install -D supabase

# Initialize Supabase in project
npx supabase init
```

## Architecture Patterns

### Recommended Project Structure
```
src/
├── app/
│   ├── (auth)/
│   │   ├── login/page.tsx           # Login page (shared for operator + client)
│   │   └── layout.tsx               # Auth layout (no sidebar)
│   ├── (operator)/
│   │   ├── admin/
│   │   │   └── page.tsx             # Operator dashboard landing
│   │   └── layout.tsx               # Operator layout with admin nav
│   ├── (client)/
│   │   ├── dashboard/
│   │   │   └── page.tsx             # Client dashboard landing
│   │   └── layout.tsx               # Client layout with client nav
│   ├── layout.tsx                    # Root layout
│   └── page.tsx                      # Redirect based on role
├── lib/
│   ├── supabase/
│   │   ├── client.ts                # Browser client (createBrowserClient)
│   │   ├── server.ts                # Server client (createServerClient)
│   │   └── admin.ts                 # Admin client (service_role, server-only)
│   └── auth/
│       └── guards.ts                # Role-checking utilities
├── middleware.ts                      # Token refresh + route protection
└── types/
    ├── supabase.ts                   # Generated database types
    └── auth.ts                       # Custom JWT claim types
supabase/
├── config.toml                       # Supabase local config
├── migrations/
│   ├── 20260215000001_create_profiles.sql
│   ├── 20260215000002_create_clients.sql
│   └── 20260215000003_enable_rls.sql
├── seed.sql                          # Test data for local dev
└── tests/
    └── rls_policies.test.sql         # pgTAP tests for tenant isolation
```

### Pattern 1: Supabase Client Creation (Three Variants)
**What:** Separate client instances for browser, server, and admin contexts
**When to use:** Every Supabase interaction

**Browser Client (Client Components):**
```typescript
// src/lib/supabase/client.ts
// Source: https://supabase.com/docs/guides/auth/server-side/nextjs
import { createBrowserClient } from '@supabase/ssr'

export function createClient() {
  return createBrowserClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
  )
}
```

**Server Client (Server Components, Route Handlers, Server Actions):**
```typescript
// src/lib/supabase/server.ts
// Source: https://supabase.com/docs/guides/auth/server-side/nextjs
import { createServerClient } from '@supabase/ssr'
import { cookies } from 'next/headers'

export async function createClient() {
  const cookieStore = await cookies()

  return createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    {
      cookies: {
        getAll() {
          return cookieStore.getAll()
        },
        setAll(cookiesToSet) {
          try {
            cookiesToSet.forEach(({ name, value, options }) =>
              cookieStore.set(name, value, options)
            )
          } catch {
            // The `setAll` method was called from a Server Component.
            // This can be ignored if you have middleware refreshing sessions.
          }
        },
      },
    }
  )
}
```

**Admin Client (Server-side only, bypasses RLS):**
```typescript
// src/lib/supabase/admin.ts
// Source: https://supabase.com/docs/reference/javascript/admin-api
import { createClient } from '@supabase/supabase-js'

// NEVER import this in client components
// NEVER expose SUPABASE_SERVICE_ROLE_KEY to the browser
export function createAdminClient() {
  return createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!,
    {
      auth: {
        autoRefreshToken: false,
        persistSession: false,
      },
    }
  )
}
```

### Pattern 2: Middleware for Session Refresh + Route Protection
**What:** Next.js middleware that refreshes auth tokens and protects routes based on role
**When to use:** Every request

```typescript
// src/middleware.ts
// Source: https://supabase.com/docs/guides/auth/server-side/nextjs
import { createServerClient } from '@supabase/ssr'
import { NextResponse, type NextRequest } from 'next/server'

export async function middleware(request: NextRequest) {
  let supabaseResponse = NextResponse.next({ request })

  const supabase = createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    {
      cookies: {
        getAll() {
          return request.cookies.getAll()
        },
        setAll(cookiesToSet) {
          cookiesToSet.forEach(({ name, value, options }) =>
            request.cookies.set(name, value)
          )
          supabaseResponse = NextResponse.next({ request })
          cookiesToSet.forEach(({ name, value, options }) =>
            supabaseResponse.cookies.set(name, value, options)
          )
        },
      },
    }
  )

  // IMPORTANT: Use getUser(), not getSession()
  // getUser() validates the token with Supabase Auth server
  const { data: { user } } = await supabase.auth.getUser()

  // Redirect unauthenticated users to login
  if (!user && !request.nextUrl.pathname.startsWith('/login')) {
    const url = request.nextUrl.clone()
    url.pathname = '/login'
    return NextResponse.redirect(url)
  }

  // Role-based route protection
  if (user) {
    const userRole = user.app_metadata?.user_role
    const path = request.nextUrl.pathname

    // Operators trying to access client routes or vice versa
    if (path.startsWith('/admin') && userRole !== 'operator') {
      return NextResponse.redirect(new URL('/dashboard', request.url))
    }
    if (path.startsWith('/dashboard') && userRole === 'operator') {
      return NextResponse.redirect(new URL('/admin', request.url))
    }
  }

  return supabaseResponse
}

export const config = {
  matcher: [
    '/((?!_next/static|_next/image|favicon.ico|.*\\.(?:svg|png|jpg|jpeg|gif|webp)$).*)',
  ],
}
```

### Pattern 3: Custom Access Token Hook for JWT Claims
**What:** PostgreSQL function that injects `user_role` and `client_id` into every JWT
**When to use:** Set up once during initial migration, runs automatically on every auth token issuance

```sql
-- Source: https://supabase.com/docs/guides/database/postgres/custom-claims-and-role-based-access-control-rbac
-- Source: https://supabase.com/docs/guides/auth/auth-hooks/custom-access-token-hook

-- User profiles table linking auth.users to roles and tenants
CREATE TABLE public.profiles (
  id UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  user_role TEXT NOT NULL CHECK (user_role IN ('operator', 'client')),
  client_id UUID REFERENCES public.clients(id) ON DELETE SET NULL,
  display_name TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- The Custom Access Token Hook function
CREATE OR REPLACE FUNCTION public.custom_access_token_hook(event JSONB)
RETURNS JSONB
LANGUAGE plpgsql
STABLE
AS $$
DECLARE
  claims JSONB;
  profile RECORD;
BEGIN
  -- Get the user's profile
  SELECT user_role, client_id INTO profile
  FROM public.profiles
  WHERE id = (event->>'user_id')::UUID;

  claims := event->'claims';

  -- Inject user_role into JWT
  IF profile.user_role IS NOT NULL THEN
    claims := jsonb_set(claims, '{user_role}', to_jsonb(profile.user_role));
  ELSE
    claims := jsonb_set(claims, '{user_role}', 'null');
  END IF;

  -- Inject client_id into JWT (NULL for operators)
  IF profile.client_id IS NOT NULL THEN
    claims := jsonb_set(claims, '{client_id}', to_jsonb(profile.client_id::TEXT));
  ELSE
    claims := jsonb_set(claims, '{client_id}', 'null');
  END IF;

  event := jsonb_set(event, '{claims}', claims);
  RETURN event;
END;
$$;

-- Grant necessary permissions
GRANT USAGE ON SCHEMA public TO supabase_auth_admin;
GRANT EXECUTE ON FUNCTION public.custom_access_token_hook TO supabase_auth_admin;
REVOKE EXECUTE ON FUNCTION public.custom_access_token_hook FROM authenticated, anon, public;
GRANT ALL ON TABLE public.profiles TO supabase_auth_admin;

-- Policy to allow auth admin to read profiles
CREATE POLICY "Allow auth admin to read profiles" ON public.profiles
  AS PERMISSIVE FOR SELECT
  TO supabase_auth_admin
  USING (true);
```

### Pattern 4: RLS Policies Using JWT Claims
**What:** Row Level Security policies that enforce tenant isolation via JWT claims
**When to use:** Every table that contains tenant-scoped data

```sql
-- Source: https://supabase.com/docs/guides/database/postgres/row-level-security

-- Example: clients table
CREATE TABLE public.clients (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  company_name TEXT NOT NULL,
  primary_color TEXT DEFAULT '#3B82F6',
  logo_url TEXT,
  meeting_url TEXT,
  is_recruitment BOOLEAN DEFAULT FALSE,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

ALTER TABLE public.clients ENABLE ROW LEVEL SECURITY;

-- Index for RLS policy performance
CREATE INDEX idx_clients_id ON public.clients(id);

-- Operators can see all clients
CREATE POLICY "Operators can view all clients" ON public.clients
  FOR SELECT TO authenticated
  USING ((SELECT auth.jwt() ->> 'user_role') = 'operator');

-- Clients can only see their own record
CREATE POLICY "Clients can view own client" ON public.clients
  FOR SELECT TO authenticated
  USING (id::TEXT = (SELECT auth.jwt() ->> 'client_id'));

-- Only operators can insert/update/delete clients
CREATE POLICY "Operators can manage clients" ON public.clients
  FOR ALL TO authenticated
  USING ((SELECT auth.jwt() ->> 'user_role') = 'operator')
  WITH CHECK ((SELECT auth.jwt() ->> 'user_role') = 'operator');
```

### Pattern 5: Operator-Provisioned User Creation
**What:** Server-side user creation using the admin API (service_role key)
**When to use:** When operators create new client accounts

```typescript
// In a Server Action or Route Handler
// Source: https://supabase.com/docs/reference/javascript/auth-admin-createuser
import { createAdminClient } from '@/lib/supabase/admin'

async function createClientUser(
  email: string,
  password: string,
  clientId: string,
  displayName: string
) {
  const supabase = createAdminClient()

  // Create the auth user
  const { data: authUser, error: authError } = await supabase.auth.admin.createUser({
    email,
    password,
    email_confirm: true, // Skip email verification for operator-provisioned accounts
    app_metadata: {
      user_role: 'client',
      client_id: clientId,
    },
  })

  if (authError) throw authError

  // Create the profile record (triggers hook on next token refresh)
  const { error: profileError } = await supabase
    .from('profiles')
    .insert({
      id: authUser.user.id,
      user_role: 'client',
      client_id: clientId,
      display_name: displayName,
    })

  if (profileError) throw profileError

  return authUser
}
```

### Anti-Patterns to Avoid
- **Application-level filtering instead of RLS:** Never rely on `WHERE client_id = X` in application code alone. RLS enforces at the database level and cannot be bypassed by API calls.
- **Using `getSession()` in Server Components:** Always use `getUser()` which validates the token with the Supabase Auth server. `getSession()` reads from cookies without validation and can be spoofed.
- **Exposing service_role key to the browser:** The service_role key bypasses ALL RLS. It must only be used in server-side code (Route Handlers, Server Actions). Never import the admin client in Client Components.
- **Missing `(SELECT ...)` wrapper in RLS policies:** Always wrap `auth.uid()` and `auth.jwt()` in a subselect like `(SELECT auth.uid())`. This prevents re-evaluation per row and gives 95%+ performance improvement.
- **Forgetting to enable RLS on new tables:** Any table in the `public` schema without RLS enabled is fully accessible via the Supabase API. Enable RLS on every table, even if it needs a permissive policy.

## Don't Hand-Roll

| Problem | Don't Build | Use Instead | Why |
|---------|-------------|-------------|-----|
| Authentication | Custom JWT/session system | Supabase Auth + @supabase/ssr | Token refresh, cookie management, PKCE flow handled automatically |
| Row-level data isolation | Application-level WHERE clauses | PostgreSQL RLS policies | Database-level enforcement cannot be bypassed; covers API, direct SQL, and edge functions |
| User creation with roles | Custom signup flow | supabase.auth.admin.createUser() | Sets app_metadata atomically with user creation |
| Session persistence | localStorage token management | @supabase/ssr cookie-based sessions | Handles httpOnly cookies, token refresh in middleware, SSR compatibility |
| Role injection into JWT | Manual token modification | Custom Access Token Hook (PL/pgSQL) | Runs on every token issuance, always fresh, no client-side manipulation |
| Database migrations | Manual SQL in dashboard | Supabase CLI migrations (`supabase/migrations/`) | Version controlled, repeatable, team-friendly |
| RLS policy testing | Manual API testing | pgTAP + supabase-test-helpers | Tests at database level, verifiable in CI/CD, covers all access paths |

**Key insight:** Supabase's integrated auth + RLS model means authentication, authorization, and data isolation are handled at the infrastructure level. Hand-rolling any of these creates security gaps that RLS would have prevented.

## Common Pitfalls

### Pitfall 1: Using getSession() Instead of getUser() in Server Code
**What goes wrong:** Session data read from cookies can be tampered with. A malicious user could modify their session cookie to claim a different role or client_id.
**Why it happens:** `getSession()` is convenient and faster (no network call), but it reads unvalidated data from cookies.
**How to avoid:** Always use `supabase.auth.getUser()` in middleware and Server Components. It makes a request to the Supabase Auth server to validate the token.
**Warning signs:** Using `getSession()` anywhere in server-side code.

### Pitfall 2: Forgetting RLS on New Tables
**What goes wrong:** Any table in the `public` schema without RLS enabled is fully readable/writable via the Supabase REST API by anyone with the anon key.
**Why it happens:** Supabase exposes the `public` schema via PostgREST automatically. Without RLS, there is no access control.
**How to avoid:** Every migration that creates a table MUST include `ALTER TABLE ... ENABLE ROW LEVEL SECURITY` and at least one policy. Make this a checklist item in every migration file.
**Warning signs:** Tables without `ENABLE ROW LEVEL SECURITY` in migration files.

### Pitfall 3: Missing Indexes on RLS Policy Columns
**What goes wrong:** RLS policies that reference `client_id` without an index cause full table scans on every query, degrading performance as data grows.
**Why it happens:** RLS policies are evaluated for every row, and without indexes the database cannot efficiently filter.
**How to avoid:** Add an index on every column referenced in RLS policies: `CREATE INDEX idx_tablename_client_id ON tablename(client_id);`
**Warning signs:** Slow queries that worked fine in development with small datasets.

### Pitfall 4: Not Wrapping auth Functions in SELECT
**What goes wrong:** `auth.uid()` and `auth.jwt()` are re-evaluated for every row if not wrapped, causing significant performance degradation.
**Why it happens:** PostgreSQL evaluates the function per-row in a `USING` clause unless the planner can optimize it.
**How to avoid:** Always write `(SELECT auth.jwt() ->> 'client_id')` instead of `auth.jwt() ->> 'client_id'` in RLS policies.
**Warning signs:** RLS policies without `SELECT` wrappers around auth functions.

### Pitfall 5: Custom Access Token Hook Not Enabled in Dashboard
**What goes wrong:** The SQL function exists but never runs, so JWTs don't contain role or client_id claims, breaking all RLS policies.
**Why it happens:** Creating the function is not enough -- it must be enabled in the Supabase Dashboard under Authentication > Hooks.
**How to avoid:** After deploying the hook function, manually enable it in the Supabase Dashboard. Document this as a required setup step.
**Warning signs:** JWT claims missing `user_role` and `client_id` after login.

### Pitfall 6: Middleware Not Returning supabaseResponse
**What goes wrong:** Auth cookies are not properly forwarded to the browser, causing sessions to expire unexpectedly or users to be logged out on every page navigation.
**Why it happens:** The middleware creates a modified response with updated cookies but the developer returns NextResponse.next() instead of the modified supabaseResponse.
**How to avoid:** Always return the `supabaseResponse` object that was created with the cookie handlers, not a new NextResponse.
**Warning signs:** Users getting logged out on refresh or navigation despite valid sessions.

## Code Examples

### Database Schema: Initial Migration
```sql
-- supabase/migrations/20260215000001_initial_schema.sql
-- Source: Supabase docs + multi-tenant best practices

-- Clients table (tenant registry)
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

-- User profiles linking auth.users to roles and tenants
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

-- RLS Policies for clients table
CREATE POLICY "Operators can do everything with clients" ON public.clients
  FOR ALL TO authenticated
  USING ((SELECT auth.jwt() ->> 'user_role') = 'operator')
  WITH CHECK ((SELECT auth.jwt() ->> 'user_role') = 'operator');

CREATE POLICY "Clients can view own client record" ON public.clients
  FOR SELECT TO authenticated
  USING (id::TEXT = (SELECT auth.jwt() ->> 'client_id'));

-- RLS Policies for profiles table
CREATE POLICY "Operators can view all profiles" ON public.profiles
  FOR SELECT TO authenticated
  USING ((SELECT auth.jwt() ->> 'user_role') = 'operator');

CREATE POLICY "Users can view own profile" ON public.profiles
  FOR SELECT TO authenticated
  USING (id = (SELECT auth.uid()));

-- Allow supabase_auth_admin to read profiles (for the hook)
CREATE POLICY "Auth admin reads profiles" ON public.profiles
  AS PERMISSIVE FOR SELECT
  TO supabase_auth_admin
  USING (true);
```

### pgTAP Test: Tenant Isolation Verification
```sql
-- supabase/tests/rls_tenant_isolation.test.sql
-- Source: https://supabase.com/docs/guides/local-development/testing/overview

BEGIN;
CREATE EXTENSION IF NOT EXISTS pgtap WITH SCHEMA extensions;
SELECT plan(6);

-- Setup: Create test clients
INSERT INTO public.clients (id, company_name) VALUES
  ('aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa', 'Client A Corp'),
  ('bbbbbbbb-bbbb-bbbb-bbbb-bbbbbbbbbbbb', 'Client B Corp');

-- Setup: Create test users in auth.users
INSERT INTO auth.users (id, email) VALUES
  ('11111111-1111-1111-1111-111111111111', 'operator@nextwavesolutions.com'),
  ('22222222-2222-2222-2222-222222222222', 'clienta@clienta.com'),
  ('33333333-3333-3333-3333-333333333333', 'clientb@clientb.com');

-- Setup: Create profiles
INSERT INTO public.profiles (id, user_role, client_id, display_name) VALUES
  ('11111111-1111-1111-1111-111111111111', 'operator', NULL, 'Operator Admin'),
  ('22222222-2222-2222-2222-222222222222', 'client', 'aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa', 'Client A User'),
  ('33333333-3333-3333-3333-333333333333', 'client', 'bbbbbbbb-bbbb-bbbb-bbbb-bbbbbbbbbbbb', 'Client B User');

-- Test 1: Authenticate as Client A
SET LOCAL role authenticated;
SET LOCAL request.jwt.claims = '{"sub":"22222222-2222-2222-2222-222222222222","user_role":"client","client_id":"aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa"}';

SELECT results_eq(
  'SELECT company_name FROM public.clients ORDER BY company_name',
  ARRAY['Client A Corp'],
  'Client A can only see their own client record'
);

-- Test 2: Client A cannot see Client B data
SELECT is_empty(
  $$SELECT * FROM public.clients WHERE id = 'bbbbbbbb-bbbb-bbbb-bbbb-bbbbbbbbbbbb'$$,
  'Client A cannot access Client B record'
);

-- Test 3: Client A cannot update Client B
SELECT is_empty(
  $$UPDATE public.clients SET company_name = 'Hacked' WHERE id = 'bbbbbbbb-bbbb-bbbb-bbbb-bbbbbbbbbbbb' RETURNING id$$,
  'Client A cannot update Client B record'
);

-- Test 4: Authenticate as Client B
SET LOCAL request.jwt.claims = '{"sub":"33333333-3333-3333-3333-333333333333","user_role":"client","client_id":"bbbbbbbb-bbbb-bbbb-bbbb-bbbbbbbbbbbb"}';

SELECT results_eq(
  'SELECT company_name FROM public.clients ORDER BY company_name',
  ARRAY['Client B Corp'],
  'Client B can only see their own client record'
);

-- Test 5: Authenticate as Operator
SET LOCAL request.jwt.claims = '{"sub":"11111111-1111-1111-1111-111111111111","user_role":"operator","client_id":null}';

SELECT results_eq(
  'SELECT count(*)::integer FROM public.clients',
  ARRAY[2],
  'Operator can see all client records'
);

-- Test 6: Operator can manage clients
SELECT lives_ok(
  $$INSERT INTO public.clients (company_name) VALUES ('Client C Corp')$$,
  'Operator can create new clients'
);

SELECT * FROM finish();
ROLLBACK;
```

### Login Page (Server Action Pattern)
```typescript
// src/app/(auth)/login/actions.ts
'use server'

import { revalidatePath } from 'next/cache'
import { redirect } from 'next/navigation'
import { createClient } from '@/lib/supabase/server'

export async function login(formData: FormData) {
  const supabase = await createClient()

  const { data, error } = await supabase.auth.signInWithPassword({
    email: formData.get('email') as string,
    password: formData.get('password') as string,
  })

  if (error) {
    return { error: error.message }
  }

  // Role-based redirect
  const userRole = data.user.app_metadata?.user_role
  revalidatePath('/', 'layout')

  if (userRole === 'operator') {
    redirect('/admin')
  } else {
    redirect('/dashboard')
  }
}
```

## State of the Art

| Old Approach | Current Approach | When Changed | Impact |
|--------------|------------------|--------------|--------|
| @supabase/auth-helpers-nextjs | @supabase/ssr | 2024 | Single package for all SSR frameworks; cookie-based sessions |
| getSession() for auth checks | getUser() for server-side auth | 2024 | getUser() validates with auth server; getSession() is insecure in server code |
| app_metadata via admin API | Custom Access Token Hook | 2024 | Hook runs on every token issuance; always fresh claims in JWT |
| Manual RLS policy testing | pgTAP + supabase test db | 2024 | Built-in CI/CD testing for database policies |
| Next.js Pages Router | Next.js App Router | 2023 | Server Components, Server Actions, route groups for auth layouts |

**Deprecated/outdated:**
- `@supabase/auth-helpers-nextjs`: Deprecated. Use `@supabase/ssr` instead.
- `getSession()` in server code: Insecure. Use `getUser()` which validates the token.
- `supabase.auth.session()`: Removed in supabase-js v2. Use `getUser()` or `getSession()`.

## Open Questions

1. **Next.js 15 vs 16 for project initialization**
   - What we know: Next.js 16 is available but very recent (late 2025). Next.js 15 is stable and well-documented with Supabase.
   - What's unclear: Whether @supabase/ssr 0.8.x has been fully tested with Next.js 16.
   - Recommendation: Use Next.js 15 (latest stable 15.x) to avoid bleeding-edge issues. The upgrade path to 16 is straightforward later.

2. **Custom Access Token Hook: Dashboard vs SQL-only enablement**
   - What we know: The hook function is created via SQL migration, but must be enabled via the Supabase Dashboard under Authentication > Hooks.
   - What's unclear: Whether this can be automated in the migration/deployment process or requires manual dashboard configuration.
   - Recommendation: Document dashboard enablement as a manual setup step. Include it in project setup README.

3. **Operator seeding: First operator chicken-and-egg**
   - What we know: Operators create client users via admin API. But who creates the first operator?
   - What's unclear: Whether to seed via migration, use Supabase Dashboard, or create a setup script.
   - Recommendation: Use `supabase/seed.sql` for local dev. For production, create the first operator via Supabase Dashboard or a one-time setup script using the service_role key.

## Sources

### Primary (HIGH confidence)
- [Supabase Server-Side Auth for Next.js](https://supabase.com/docs/guides/auth/server-side/nextjs) - SSR setup, middleware, client creation
- [Supabase Row Level Security](https://supabase.com/docs/guides/database/postgres/row-level-security) - RLS policies, performance tips, auth functions
- [Supabase Custom Claims & RBAC](https://supabase.com/docs/guides/database/postgres/custom-claims-and-role-based-access-control-rbac) - Auth hook, role management, RLS integration
- [Supabase Custom Access Token Hook](https://supabase.com/docs/guides/auth/auth-hooks/custom-access-token-hook) - Hook function format, claims modification
- [Supabase Testing Overview](https://supabase.com/docs/guides/local-development/testing/overview) - pgTAP setup, RLS testing, CI/CD integration
- [Supabase Admin API - createUser](https://supabase.com/docs/reference/javascript/auth-admin-createuser) - Server-side user creation
- [@supabase/supabase-js npm](https://www.npmjs.com/package/@supabase/supabase-js) - Version 2.95.x confirmed
- [@supabase/ssr npm](https://www.npmjs.com/package/@supabase/ssr) - Version 0.8.x confirmed

### Secondary (MEDIUM confidence)
- [Basejump Supabase Test Helpers](https://usebasejump.com/blog/testing-on-supabase-with-pgtap) - Test helper functions for auth context switching
- [Supabase RLS Best Practices (MakerKit)](https://makerkit.dev/blog/tutorials/supabase-rls-best-practices) - Multi-tenant RLS patterns
- [Supabase Database Migrations](https://supabase.com/docs/guides/deployment/database-migrations) - Migration file structure and naming

### Tertiary (LOW confidence)
- None -- all findings verified with official sources

## Metadata

**Confidence breakdown:**
- Standard stack: HIGH - All packages verified via npm and official docs with current versions
- Architecture: HIGH - Patterns sourced directly from Supabase official documentation
- Pitfalls: HIGH - Documented in official Supabase troubleshooting guides and confirmed by multiple sources
- RLS testing: HIGH - pgTAP approach documented in official Supabase testing docs with full examples

**Research date:** 2026-02-15
**Valid until:** 2026-03-15 (30 days -- Supabase and Next.js stable, no major breaking changes expected)
