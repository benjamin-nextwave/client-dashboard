---
phase: 05-inbox-reply-functionality
plan: 02
subsystem: ui, api
tags: [next.js, server-actions, zod, date-fns, tailwind, inbox]

# Dependency graph
requires:
  - phase: 05-inbox-reply-functionality
    provides: "getPositiveLeadsForInbox, replyToEmail, listEmails, InboxLead type"
provides:
  - "Gmail-style inbox list page at /dashboard/inbox"
  - "sendReply and composeReply server actions with auth and Instantly API integration"
  - "InboxItem component with status badges (Nieuwe lead / In gesprek)"
affects: [05-03 thread view and reply UI]

# Tech tracking
tech-stack:
  added: []
  patterns: ["Server actions with Zod validation and admin client for writes", "Parallel data fetching in server components"]

key-files:
  created:
    - "src/lib/actions/inbox-actions.ts"
    - "src/app/(client)/dashboard/inbox/_components/inbox-list.tsx"
    - "src/app/(client)/dashboard/inbox/_components/inbox-item.tsx"
  modified:
    - "src/app/(client)/dashboard/inbox/page.tsx"
    - "src/lib/data/inbox-data.ts"

key-decisions:
  - "Separate is_recruitment query instead of modifying shared getClientBranding"
  - "Dutch Zod validation messages consistent with UI convention"

patterns-established:
  - "Server action pattern: Zod validation -> auth check -> RLS ownership verify -> API call -> admin write -> revalidate"
  - "Inbox item visual pattern: status badge left, content middle, date right"

# Metrics
duration: 2min
completed: 2026-02-15
---

# Phase 5 Plan 2: Inbox List Page & Server Actions Summary

**Gmail-style inbox list with status badges (Nieuwe lead/In gesprek) and Zod-validated sendReply/composeReply server actions with Instantly API integration**

## Performance

- **Duration:** 2 min
- **Started:** 2026-02-15T19:37:19Z
- **Completed:** 2026-02-15T19:39:31Z
- **Tasks:** 2
- **Files modified:** 5

## Accomplishments
- Server actions for sendReply and composeReply with full auth validation, Zod input schemas, and Instantly API integration
- Gmail-style inbox list page replacing placeholder, with force-dynamic and parallel data fetching
- InboxItem component showing status badges, sender name, company, subject, preview text, and relative Dutch timestamps
- Empty state handling when no positive leads exist

## Task Commits

Each task was committed atomically:

1. **Task 1: Server actions for reply and compose operations** - `e305bf9` (feat)
2. **Task 2: Inbox list page and components** - `35d5545` (feat)

## Files Created/Modified
- `src/lib/actions/inbox-actions.ts` - sendReply and composeReply server actions with Zod validation
- `src/app/(client)/dashboard/inbox/page.tsx` - Server component with auth, parallel data fetching, empty state
- `src/app/(client)/dashboard/inbox/_components/inbox-list.tsx` - Client component rendering lead rows with dividers
- `src/app/(client)/dashboard/inbox/_components/inbox-item.tsx` - Single inbox row with status badge, name, company, subject, preview, date
- `src/lib/data/inbox-data.ts` - Exported InboxLead type for component consumption

## Decisions Made
- **Separate is_recruitment query**: Queried clients table directly instead of modifying shared getClientBranding function, avoids side effects on other pages
- **Dutch Zod validation messages**: Consistent with established UI convention from Phase 1

## Deviations from Plan

None - plan executed exactly as written.

## Issues Encountered

None.

## User Setup Required

None - no external service configuration required.

## Next Phase Readiness
- Inbox list page ready at /dashboard/inbox with links to /dashboard/inbox/[leadId]
- Server actions (sendReply, composeReply) ready for thread view reply form to consume
- Thread view page ([leadId]) already scaffolded, needs ThreadView and LeadContactCard components (plan 05-03)

## Self-Check: PASSED

- All 5 files found at expected paths
- Both commits verified: e305bf9, 35d5545
- Exports verified: sendReply, composeReply from inbox-actions.ts
- InboxLead type exported from inbox-data.ts
- TypeScript compiles cleanly (no new errors from this plan)

---
*Phase: 05-inbox-reply-functionality*
*Completed: 2026-02-15*
