---
phase: 08-polish-error-monitoring
plan: 01
subsystem: monitoring
tags: [error-logging, supabase, rls, server-actions, admin-dashboard]

requires:
  - phase: 01-foundation-multi-tenancy
    provides: clients table, RLS patterns, admin client
  - phase: 02-operator-admin-core
    provides: operator layout, admin pages with force-dynamic
  - phase: 04-instantly-ai-integration-campaign-stats
    provides: sync.ts with catch blocks to instrument
provides:
  - error_logs table with RLS operator-only policy
  - logError utility for silent error logging via admin client
  - sync.ts instrumented with 5 logError calls
  - /admin/errors dashboard with resolve functionality
  - operator nav links (Klanten, Fouten)
affects: [future-error-sources, import-flows, api-integrations]

tech-stack:
  added: []
  patterns: [silent-error-logging, expandable-table-rows, useTransition-for-mutations]

key-files:
  created:
    - supabase/migrations/20260219000001_error_logs.sql
    - src/lib/errors/log-error.ts
    - src/lib/data/error-logs.ts
    - src/lib/actions/error-log-actions.ts
    - src/app/(operator)/admin/errors/page.tsx
    - src/app/(operator)/admin/errors/_components/error-log-table.tsx
  modified:
    - src/lib/instantly/sync.ts
    - src/app/(operator)/layout.tsx

key-decisions:
  - "Admin client for error inserts: service_role bypasses RLS, consistent with existing admin data patterns"
  - "Await logError instead of fire-and-forget: serverless safety per research findings"
  - "Grid-based table rows with colSpan for expandable details: single td wraps clickable row + expandable section"

patterns-established:
  - "logError pattern: import from @/lib/errors/log-error, call after console.error in catch blocks"
  - "Expandable table rows: click row to toggle details section below"

duration: 4min
completed: 2026-02-15
---

# Phase 8 Plan 1: Error Monitoring Summary

**Error logging infrastructure with error_logs table, logError utility, sync instrumentation, and operator dashboard at /admin/errors with resolve functionality**

## Performance

- **Duration:** 4 min
- **Started:** 2026-02-15T21:14:54Z
- **Completed:** 2026-02-15T21:18:24Z
- **Tasks:** 2
- **Files modified:** 8

## Accomplishments
- error_logs table with operator-only RLS policy and 3 indexes (client_id, created_at DESC, partial unresolved)
- logError utility that silently logs errors via admin client, never crashes parent operations
- All 5 catch blocks in sync.ts instrumented with logError calls for automatic error tracking
- Operator error monitoring dashboard at /admin/errors with expandable details and resolve buttons
- Operator layout header updated with Klanten/Fouten navigation links

## Task Commits

Each task was committed atomically:

1. **Task 1: Error logs migration, logError utility, and sync instrumentation** - `e618e30` (feat)
2. **Task 2: Error monitoring dashboard page with resolve functionality** - `9f2c862` (feat)

## Files Created/Modified
- `supabase/migrations/20260219000001_error_logs.sql` - error_logs table with RLS and indexes
- `src/lib/errors/log-error.ts` - logError utility function
- `src/lib/instantly/sync.ts` - Instrumented 5 catch blocks with logError calls
- `src/lib/data/error-logs.ts` - getErrorLogs query with client join
- `src/lib/actions/error-log-actions.ts` - resolveError server action
- `src/app/(operator)/admin/errors/page.tsx` - Error monitoring dashboard page
- `src/app/(operator)/admin/errors/_components/error-log-table.tsx` - Interactive error log table
- `src/app/(operator)/layout.tsx` - Added Klanten/Fouten nav links

## Decisions Made
- Admin client for error inserts: service_role bypasses RLS, consistent with existing admin data patterns
- Await logError instead of fire-and-forget: serverless safety per research findings
- Grid-based table rows with colSpan for expandable details: single td wraps clickable row + expandable section
- Dutch date formatting with nl-NL locale including time for error timestamps

## Deviations from Plan

None - plan executed exactly as written.

## Issues Encountered

None.

## User Setup Required

None - no external service configuration required. The error_logs migration will be applied automatically with `supabase db push`.

## Next Phase Readiness
- Error monitoring infrastructure complete and ready for use
- logError can be imported by any future server-side code to log errors
- Additional error types can be added to the CHECK constraint if needed

## Self-Check: PASSED

- All 7 created files verified present
- Commit e618e30 (Task 1) verified in git log
- Commit 9f2c862 (Task 2) verified in git log
- TypeScript compilation passes
- Build succeeds with /admin/errors route listed

---
*Phase: 08-polish-error-monitoring*
*Completed: 2026-02-15*
