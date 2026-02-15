---
phase: 01-foundation-multi-tenancy
plan: 02
subsystem: auth, routing
tags: [supabase, ssr, next.js, middleware, jwt, cookies, role-based-routing, server-actions]

# Dependency graph
requires:
  - phase: 01-foundation-multi-tenancy/01
    provides: "Next.js 15 project scaffold, Supabase packages, database schema with profiles/clients tables, custom access token hook"
provides:
  - "Browser Supabase client (createBrowserClient) at src/lib/supabase/client.ts"
  - "Server Supabase client with async cookie management at src/lib/supabase/server.ts"
  - "Admin Supabase client (service_role, bypasses RLS) at src/lib/supabase/admin.ts"
  - "Auth type definitions (UserRole, JWTClaims, UserProfile) at src/types/auth.ts"
  - "Next.js middleware for token refresh and role-based route protection"
  - "Login page with server action and role-based redirect"
  - "Operator route group (auth)/layout with logout"
  - "Client route group (client)/layout with logout"
  - "Root page role-based redirect"
affects: [01-03, 02-all, 03-all, all-subsequent-phases]

# Tech tracking
tech-stack:
  added: []
  patterns:
    - "Three Supabase client variants: browser (client.ts), server (server.ts), admin (admin.ts)"
    - "Server client uses await cookies() for Next.js 15 async cookie API"
    - "Middleware pattern: getUser() for token validation, return supabaseResponse for cookie propagation"
    - "Server actions with 'use server' for form handling and auth"
    - "Route groups: (auth) for login, (operator) for admin, (client) for dashboard"
    - "Dutch UI labels: Inloggen, Uitloggen, Welkom, E-mailadres, Wachtwoord"

key-files:
  created:
    - "src/lib/supabase/client.ts"
    - "src/lib/supabase/server.ts"
    - "src/lib/supabase/admin.ts"
    - "src/types/auth.ts"
    - "src/middleware.ts"
    - "src/app/(auth)/layout.tsx"
    - "src/app/(auth)/login/page.tsx"
    - "src/app/(auth)/login/actions.ts"
    - "src/app/(operator)/layout.tsx"
    - "src/app/(operator)/admin/page.tsx"
    - "src/app/(client)/layout.tsx"
    - "src/app/(client)/dashboard/page.tsx"
  modified:
    - "src/app/page.tsx"
    - "src/app/globals.css"
    - "src/app/layout.tsx"

key-decisions:
  - "useActionState for login form state management (React 19 pattern)"
  - "Middleware redirects authenticated users away from /login to prevent stuck state"
  - "Dutch UI labels throughout (Inloggen, Uitloggen, Welkom) per project requirements"

patterns-established:
  - "Supabase server client import pattern: import { createClient } from '@/lib/supabase/server'"
  - "Server action pattern: 'use server' + createClient() + Supabase auth call + redirect"
  - "Layout pattern: header with nav/logout, main content area with max-w-7xl"
  - "Role check pattern: user.app_metadata?.user_role for JWT claim access"

# Metrics
duration: ~3min
completed: 2026-02-15
---

# Phase 1 Plan 2: Auth Flow & Route Protection Summary

**Cookie-based auth flow with Supabase SSR clients, Next.js middleware for token refresh and role-based route protection, Dutch login page with server actions, and operator/client route groups**

## Performance

- **Duration:** ~3 min
- **Started:** 2026-02-15T15:37:41Z
- **Completed:** 2026-02-15T15:40:41Z
- **Tasks:** 2
- **Files modified:** 15

## Accomplishments
- Three Supabase client utilities (browser, server, admin) following official SSR patterns
- Auth type definitions for role-based access (UserRole, JWTClaims, UserProfile)
- Next.js middleware with getUser() token validation, cookie propagation, and role-based route protection
- Login page with Dutch UI, useActionState for error handling, signInWithPassword server action
- Operator and client route groups with layouts (header + logout) and placeholder dashboard pages
- Root page redirect based on auth state and role
- Cleaned up default Next.js boilerplate (globals.css, metadata)

## Task Commits

Each task was committed atomically:

1. **Task 1: Create Supabase client utilities and auth types** - `7256ef8` (feat)
2. **Task 2: Create middleware, login page, and role-based route structure** - `a5d6ea1` (feat)

## Files Created/Modified
- `src/lib/supabase/client.ts` - Browser Supabase client using createBrowserClient
- `src/lib/supabase/server.ts` - Server Supabase client with async cookies() and cookie handlers
- `src/lib/supabase/admin.ts` - Admin Supabase client with service_role key (server-only)
- `src/types/auth.ts` - UserRole, JWTClaims, UserProfile type definitions
- `src/middleware.ts` - Token refresh via getUser() + role-based route protection
- `src/app/(auth)/layout.tsx` - Centered layout for auth pages
- `src/app/(auth)/login/page.tsx` - Login form with Dutch labels and error display
- `src/app/(auth)/login/actions.ts` - Server action: signInWithPassword + role-based redirect
- `src/app/(operator)/layout.tsx` - Operator layout with NextWave Admin header and logout
- `src/app/(operator)/admin/page.tsx` - Operator dashboard placeholder
- `src/app/(client)/layout.tsx` - Client layout with Dashboard header and logout
- `src/app/(client)/dashboard/page.tsx` - Client dashboard placeholder (Dutch content)
- `src/app/page.tsx` - Root redirect based on auth state and role
- `src/app/globals.css` - Cleaned to only Tailwind import
- `src/app/layout.tsx` - Updated metadata title/description

## Decisions Made
- **useActionState for login form:** React 19 pattern for server action state management, replacing older useFormState
- **Middleware handles authenticated /login visits:** Redirects already-logged-in users to their dashboard to prevent stuck state
- **Dutch UI labels:** Inloggen, Uitloggen, Welkom, E-mailadres, Wachtwoord -- consistent with project language requirements

## Deviations from Plan

None - plan executed exactly as written.

## Issues Encountered
None

## User Setup Required

External services configured in Plan 01-01 are still required:
- **Environment variables:** `.env.local` with Supabase project URL, anon key, and service role key
- **Custom Access Token Hook:** Must be enabled in Supabase Dashboard for JWT claims injection
- **Test users:** Created via seed.sql (requires `npx supabase start` or deployed migrations)

## Next Phase Readiness
- Auth flow complete -- ready for Plan 01-03 (RLS testing / pgTAP)
- All three Supabase client utilities available for data access patterns
- Route groups established for future page additions
- No blockers for next plan

---
*Phase: 01-foundation-multi-tenancy*
*Completed: 2026-02-15*
