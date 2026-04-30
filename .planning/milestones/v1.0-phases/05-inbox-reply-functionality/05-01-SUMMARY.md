---
phase: 05-inbox-reply-functionality
plan: 01
subsystem: database, api
tags: [supabase, instantly, email, rls, caching]

# Dependency graph
requires:
  - phase: 04-instantly-ai-integration-campaign-stats
    provides: "synced_leads table, Instantly API client, sync module"
provides:
  - "cached_emails table with RLS for email thread caching"
  - "synced_leads extended with linkedin_url, vacancy_url, client_has_replied, reply_subject, reply_content"
  - "listEmails and replyToEmail Instantly API functions"
  - "getPositiveLeadsForInbox and getLeadThread inbox query functions"
affects: [05-02 inbox UI, 05-03 reply functionality]

# Tech tracking
tech-stack:
  added: []
  patterns: ["5-minute email cache layer over Instantly API", "admin client for cache writes bypassing RLS"]

key-files:
  created:
    - "supabase/migrations/20260216000003_inbox_email_cache.sql"
    - "src/lib/data/inbox-data.ts"
  modified:
    - "src/lib/instantly/types.ts"
    - "src/lib/instantly/client.ts"
    - "src/lib/instantly/sync.ts"

key-decisions:
  - "5-minute TTL for email cache freshness"
  - "Admin client for cache writes to bypass RLS"
  - "Deduplication by email for inbox lead list"

patterns-established:
  - "Email cache pattern: check cached_emails, fetch from Instantly on miss, upsert via admin client"
  - "Payload field extraction for LinkedIn/vacancy URLs with multi-variant key matching"

# Metrics
duration: 2min
completed: 2026-02-15
---

# Phase 5 Plan 1: Inbox Data Foundation Summary

**Cached emails table with RLS, Instantly email API client (list + reply), LinkedIn/vacancy URL sync extraction, and inbox query layer with 5-minute cache**

## Performance

- **Duration:** 2 min
- **Started:** 2026-02-15T19:31:32Z
- **Completed:** 2026-02-15T19:33:37Z
- **Tasks:** 2
- **Files modified:** 5

## Accomplishments
- Migration adds cached_emails table with RLS and 5 new columns on synced_leads for inbox functionality
- Instantly API client extended with listEmails (GET /emails) and replyToEmail (POST /emails/reply)
- Sync module now extracts linkedin_url and vacancy_url from lead payload during sync
- Inbox data layer provides getPositiveLeadsForInbox (deduplicated positive leads) and getLeadThread (cached email thread fetching)

## Task Commits

Each task was committed atomically:

1. **Task 1: Database migration for cached_emails table and synced_leads extensions** - `40b5722` (feat)
2. **Task 2: Instantly email API functions, sync extension, and inbox data queries** - `18b0398` (feat)

## Files Created/Modified
- `supabase/migrations/20260216000003_inbox_email_cache.sql` - cached_emails table, RLS policies, synced_leads column additions
- `src/lib/instantly/types.ts` - InstantlyEmail interface
- `src/lib/instantly/client.ts` - listEmails and replyToEmail API functions
- `src/lib/instantly/sync.ts` - linkedin_url and vacancy_url extraction in lead sync
- `src/lib/data/inbox-data.ts` - getPositiveLeadsForInbox and getLeadThread query functions

## Decisions Made
- **5-minute TTL for email cache**: Balances API rate limits with data freshness for inbox viewing
- **Admin client for cache writes**: cached_emails RLS is SELECT-only for clients; admin client needed for INSERT during cache population
- **Deduplication by email**: Same pattern as getContactList in campaign-stats.ts, keeps most recently updated lead per email

## Deviations from Plan

None - plan executed exactly as written.

## Issues Encountered

None.

## User Setup Required

None - no external service configuration required.

## Next Phase Readiness
- Complete data foundation for inbox UI (plan 05-02) and reply functionality (plan 05-03)
- All query functions export clean interfaces for UI consumption
- Email thread caching prevents excessive Instantly API calls

## Self-Check: PASSED

- All 5 files found at expected paths
- Both commits verified: 40b5722, 18b0398
- Exports verified: listEmails, replyToEmail, getPositiveLeadsForInbox, getLeadThread
- linkedin_url extraction in sync module confirmed
- TypeScript compiles cleanly (npx tsc --noEmit)

---
*Phase: 05-inbox-reply-functionality*
*Completed: 2026-02-15*
