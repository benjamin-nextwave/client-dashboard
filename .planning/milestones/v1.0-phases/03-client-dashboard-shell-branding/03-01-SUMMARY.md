---
phase: 03-client-dashboard-shell-branding
plan: 01
subsystem: ui
tags: [tailwind-v4, css-variables, next-image, sidebar, branding, dutch-ui]

# Dependency graph
requires:
  - phase: 01-foundation-multi-tenancy
    provides: "Supabase auth, RLS policies, clients table with primary_color and logo_url"
  - phase: 02-operator-admin-core
    provides: "Client CRUD with logo upload and color picker"
provides:
  - "Branded client dashboard shell with sidebar navigation"
  - "Per-tenant CSS variable theming (--brand-color -> Tailwind bg-brand, text-brand)"
  - "getClientBranding() cached server helper"
  - "ClientLogo, NavItem, SidebarNav reusable components"
  - "next/image configured for Supabase Storage"
affects: [04-inbox-reply, 05-sent-leads, 06-dnc-csv, 07-preferences-appointments]

# Tech tracking
tech-stack:
  added: []
  patterns: ["@theme inline for runtime CSS variables", "React cache() for request deduplication", "CSS variable scoping on wrapper div (not :root)"]

key-files:
  created:
    - src/lib/client/get-client-branding.ts
    - src/components/client/client-logo.tsx
    - src/components/client/nav-item.tsx
    - src/components/client/sidebar-nav.tsx
  modified:
    - src/app/globals.css
    - src/app/layout.tsx
    - next.config.ts
    - src/app/(client)/layout.tsx

key-decisions:
  - "Inline SVG icons instead of icon library -- zero extra dependencies"
  - "signOutAction passed as prop to client component -- keeps server action in server layout"

patterns-established:
  - "@theme inline for CSS variable -> Tailwind utility bridging"
  - "Per-tenant branding via wrapper div CSS variable (not :root)"
  - "React cache() for deduplicating server-side data fetches"

# Metrics
duration: 2min
completed: 2026-02-15
---

# Phase 3 Plan 1: Client Dashboard Shell & Branding Summary

**Branded sidebar layout with per-tenant CSS variable theming, 6 Dutch nav links, logo display with fallback, and Tailwind v4 @theme inline integration**

## Performance

- **Duration:** 2 min
- **Started:** 2026-02-15T18:30:14Z
- **Completed:** 2026-02-15T18:32:42Z
- **Tasks:** 2
- **Files modified:** 8

## Accomplishments
- Tailwind v4 brand color system: DB hex -> layout inline style -> @theme inline -> bg-brand/text-brand utilities
- Sidebar navigation with 6 Dutch-labeled links (Overzicht, Inbox, Verzonden, Voorkeuren, DNC, Afspraken) and active state highlighting
- Logo display via next/image with SVG support, or branded initial circle fallback
- Per-client color scoping via CSS variable on wrapper div (no cross-tenant leakage)

## Task Commits

Each task was committed atomically:

1. **Task 1: Theming infrastructure and next/image configuration** - `9ea64ad` (feat)
2. **Task 2: Sidebar components and layout rewrite** - `09bb2be` (feat)

## Files Created/Modified
- `src/app/globals.css` - Added @theme inline block with --color-brand CSS variable
- `src/app/layout.tsx` - Changed lang to "nl" for Dutch accessibility
- `next.config.ts` - Added remotePatterns for Supabase Storage images
- `src/lib/client/get-client-branding.ts` - Server-side cached branding data fetcher
- `src/components/client/client-logo.tsx` - Logo display with initial fallback
- `src/components/client/nav-item.tsx` - Navigation item with usePathname active state
- `src/components/client/sidebar-nav.tsx` - Full sidebar with 6 Dutch nav links and sign-out
- `src/app/(client)/layout.tsx` - Branded dashboard shell with CSS variable injection

## Decisions Made
- Inline SVG icons (Heroicons paths) instead of adding an icon library dependency
- signOutAction passed as prop from server layout to client SidebarNav component

## Deviations from Plan

None - plan executed exactly as written.

## Issues Encountered

None

## User Setup Required

None - no external service configuration required.

## Next Phase Readiness
- Dashboard shell complete with all 6 navigation targets defined
- Feature pages (inbox, verzonden, voorkeuren, dnc, afspraken) ready to be built in subsequent phases
- Brand color system ready for use in all client-facing components

---
*Phase: 03-client-dashboard-shell-branding*
*Completed: 2026-02-15*
