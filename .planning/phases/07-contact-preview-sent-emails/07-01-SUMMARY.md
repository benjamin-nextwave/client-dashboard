---
phase: 07-contact-preview-sent-emails
plan: 01
subsystem: ui, database
tags: [supabase, rls, next.js, tailwind, date-fns, server-actions]

# Dependency graph
requires:
  - phase: 04-instantly-ai-integration-campaign-stats
    provides: synced_leads table with lead_status and email deduplication patterns
  - phase: 06-csv-import-export-dnc-management
    provides: applyDncFilter function and DNC filtering infrastructure
provides:
  - Preview page at /dashboard/voorvertoning showing not_yet_emailed contacts
  - is_excluded soft-delete column on synced_leads with RLS UPDATE policy
  - excludeContact server action for client-side contact removal
  - DNC filter integration excluding client-removed contacts from CSV export
affects: [07-contact-preview-sent-emails]

# Tech tracking
tech-stack:
  added: []
  patterns: [soft-delete via boolean column with partial index, client-side contact exclusion via RLS UPDATE policy]

key-files:
  created:
    - supabase/migrations/20260218000001_preview_exclusions.sql
    - src/lib/data/preview-data.ts
    - src/lib/actions/preview-actions.ts
    - src/app/(client)/dashboard/voorvertoning/page.tsx
    - src/app/(client)/dashboard/voorvertoning/_components/preview-table.tsx
  modified:
    - src/components/client/sidebar-nav.tsx
    - src/lib/actions/csv-actions.ts

key-decisions:
  - "Soft-delete via is_excluded boolean: avoids data loss, integrates with DNC filter by adding excluded emails to dncEmails Set"
  - "RLS UPDATE policy for client self-service: clients can only exclude their own leads"

patterns-established:
  - "Soft-delete pattern: boolean column + partial index + RLS UPDATE for client-managed exclusions"

# Metrics
duration: 4min
completed: 2026-02-15
---

# Phase 7 Plan 1: Contact Preview Summary

**Preview page at /dashboard/voorvertoning with not_yet_emailed contact table, delete-to-exclude capability, and DNC filter integration**

## Performance

- **Duration:** 4 min
- **Started:** 2026-02-15T20:53:50Z
- **Completed:** 2026-02-15T20:58:20Z
- **Tasks:** 2
- **Files modified:** 7

## Accomplishments
- Preview page showing upcoming contacts with full name, company, date, sector, job title columns
- Client can remove contacts from preview via red "Verwijderen" button (soft-delete with is_excluded flag)
- Excluded contacts automatically filtered out during operator DNC/CSV export
- Sidebar navigation updated with "Voorvertoning" eye icon (7 total items)

## Task Commits

Each task was committed atomically:

1. **Task 1: Database migration, preview data layer, and exclude action** - `b360416` (feat)
2. **Task 2: Preview page UI, sidebar nav update, and DNC filter integration** - `ce4812b` (feat)

## Files Created/Modified
- `supabase/migrations/20260218000001_preview_exclusions.sql` - is_excluded column, partial index, RLS UPDATE policy
- `src/lib/data/preview-data.ts` - getPreviewContacts query with email deduplication
- `src/lib/actions/preview-actions.ts` - excludeContact server action with auth check
- `src/app/(client)/dashboard/voorvertoning/page.tsx` - Preview page server component
- `src/app/(client)/dashboard/voorvertoning/_components/preview-table.tsx` - Interactive table with delete buttons and feedback
- `src/components/client/sidebar-nav.tsx` - Added Voorvertoning nav item with eye icon
- `src/lib/actions/csv-actions.ts` - Extended applyDncFilter to include is_excluded contacts

## Decisions Made
- Soft-delete via is_excluded boolean column rather than hard delete -- preserves data integrity and integrates cleanly with DNC filter
- RLS UPDATE policy allows clients to self-serve exclusions without admin intervention
- Excluded emails added to dncEmails Set in applyDncFilter -- reuses existing matching logic without new filter_reason

## Deviations from Plan

None - plan executed exactly as written.

## Issues Encountered

None.

## User Setup Required

None - no external service configuration required.

## Next Phase Readiness
- Preview page complete, ready for Phase 7 Plan 2 (sent emails view)
- Migration must be applied to Supabase for is_excluded column to take effect

---
*Phase: 07-contact-preview-sent-emails*
*Completed: 2026-02-15*
