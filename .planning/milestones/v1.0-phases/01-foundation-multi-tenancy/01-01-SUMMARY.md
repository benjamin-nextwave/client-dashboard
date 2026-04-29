---
phase: 01-foundation-multi-tenancy
plan: 01
subsystem: database, infra
tags: [next.js, supabase, typescript, tailwind, rls, jwt, postgresql, multi-tenancy]

# Dependency graph
requires: []
provides:
  - "Next.js 15 project scaffold with TypeScript, Tailwind CSS v4, ESLint"
  - "Supabase CLI initialized with config.toml"
  - "@supabase/supabase-js 2.95.3 and @supabase/ssr 0.8.0 installed"
  - "clients table with RLS policies (operator full access, client view-own)"
  - "profiles table with RLS policies (operator view-all, user view-own, auth admin read)"
  - "Custom access token hook injecting user_role and client_id into JWT claims"
  - "Seed data with 2 test clients, 3 test users, 3 profiles"
  - "Environment variable template (.env.local.example)"
affects: [01-02, 01-03, all-subsequent-phases]

# Tech tracking
tech-stack:
  added: [next.js 15.5.12, react 19.1.0, typescript 5.x, tailwindcss 4.x, @supabase/supabase-js 2.95.3, @supabase/ssr 0.8.0, supabase-cli]
  patterns:
    - "RLS policies with (SELECT auth.jwt()) wrapper for performance"
    - "Custom access token hook for JWT claims injection"
    - "Two-role model: operator (admin) and client (tenant-scoped)"

key-files:
  created:
    - "package.json"
    - "tsconfig.json"
    - "next.config.ts"
    - ".env.local.example"
    - "supabase/config.toml"
    - "supabase/migrations/20260215000001_initial_schema.sql"
    - "supabase/migrations/20260215000002_custom_access_token_hook.sql"
    - "supabase/seed.sql"
  modified: []

key-decisions:
  - "Used Next.js 15.5.12 (not 16) for proven Supabase compatibility"
  - "Tailwind CSS v4 included by create-next-app (latest stable)"
  - "All RLS policies use (SELECT auth.jwt()) wrapper to prevent per-row re-evaluation"

patterns-established:
  - "RLS policy pattern: (SELECT auth.jwt() ->> 'user_role') = 'operator' for role checks"
  - "RLS policy pattern: id::TEXT = (SELECT auth.jwt() ->> 'client_id') for tenant isolation"
  - "Custom access token hook pattern: PL/pgSQL STABLE function with GRANT/REVOKE for auth admin only"
  - "Seed data pattern: deterministic UUIDs (aaaaaaaa-..., 11111111-...) for test data"

# Metrics
duration: ~15min
completed: 2026-02-15
---

# Phase 1 Plan 1: Project Init & Database Schema Summary

**Next.js 15 project with Supabase multi-tenant schema: clients + profiles tables, RLS policies with JWT claims, and custom access token hook for role/tenant injection**

## Performance

- **Duration:** ~15 min
- **Tasks:** 3 (2 auto + 1 checkpoint)
- **Files created:** 8 key files

## Accomplishments
- Next.js 15.5.12 project initialized with TypeScript, Tailwind CSS v4, ESLint, and App Router (src/ directory)
- Supabase CLI initialized and @supabase/supabase-js 2.95.3 + @supabase/ssr 0.8.0 installed
- Database schema with clients and profiles tables, both with RLS enabled and role-based policies
- Custom access token hook function ready to inject user_role and client_id into every JWT
- Seed data for local development: 2 test clients (Acme Corp, Beta Industries), 3 test users (1 operator, 2 clients)

## Task Commits

Each task was committed atomically:

1. **Task 1: Initialize Next.js project and install Supabase dependencies** - `f59cf11` (feat)
2. **Task 2: Create database migrations, RLS policies, access token hook, and seed data** - `295b699` (feat)
3. **Task 3: Human verification checkpoint** - approved by user

## Files Created/Modified
- `package.json` - Project dependencies including Next.js 15, Supabase packages
- `tsconfig.json` - TypeScript configuration with path aliases
- `next.config.ts` - Next.js configuration
- `.env.local.example` - Environment variable template (3 Supabase vars)
- `.gitignore` - Configured to exclude .env files but include .env.local.example
- `supabase/config.toml` - Supabase local development configuration
- `supabase/migrations/20260215000001_initial_schema.sql` - clients + profiles tables, RLS policies, indexes
- `supabase/migrations/20260215000002_custom_access_token_hook.sql` - JWT claims injection function + permissions
- `supabase/seed.sql` - Test data for local development

## Decisions Made
- **Next.js 15.5.12 over 16:** Better Supabase compatibility per research recommendation
- **Tailwind CSS v4:** Included by create-next-app latest stable; no issues
- **(SELECT auth.jwt()) wrappers:** All 5 RLS policies use subselect wrappers for 95%+ performance improvement per Supabase best practices

## Deviations from Plan

### Auto-fixed Issues

**1. [Rule 3 - Blocking] Fixed directory name capital letter conflict with npm**
- **Found during:** Task 1 (project initialization)
- **Issue:** `create-next-app` refused to create project in directory named "Dashboards" due to npm naming restrictions (no capital letters)
- **Fix:** Created project in temporary directory, copied files over, renamed package to "dashboards"
- **Files modified:** package.json (name field)
- **Verification:** `npm run build` succeeds
- **Committed in:** f59cf11 (Task 1 commit)

**2. [Rule 3 - Blocking] Fixed .gitignore excluding .env.local.example**
- **Found during:** Task 1 (env template creation)
- **Issue:** Default `.gitignore` pattern `.env*` also excluded `.env.local.example` which should be tracked
- **Fix:** Added `!.env.local.example` negation to `.gitignore`
- **Files modified:** .gitignore
- **Verification:** `git status` shows `.env.local.example` as untracked (not ignored)
- **Committed in:** f59cf11 (Task 1 commit)

---

**Total deviations:** 2 auto-fixed (2 blocking)
**Impact on plan:** Both auto-fixes necessary for task completion. No scope creep.

## Issues Encountered
None beyond the auto-fixed deviations above.

## User Setup Required

External services require manual configuration:
- **Environment variables:** Copy `.env.local.example` to `.env.local` and fill in Supabase project URL, anon key, and service role key from Supabase Dashboard -> Project Settings -> API
- **Custom Access Token Hook:** After deploying migrations, enable in Supabase Dashboard -> Authentication -> Hooks -> Enable 'Custom Access Token Hook' -> Select function: `custom_access_token_hook`
- **Local development:** Run `npx supabase start` to test locally with seed data

## Next Phase Readiness
- Project scaffold complete -- ready for Plan 01-02 (Supabase client utilities, middleware, route protection)
- Database schema in place -- clients and profiles tables with RLS ready for data access
- No blockers for next plan

---
*Phase: 01-foundation-multi-tenancy*
*Completed: 2026-02-15*
