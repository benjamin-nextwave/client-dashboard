---
phase: 04-instantly-ai-integration-campaign-stats
plan: 01
subsystem: database, api
tags: [instantly, supabase, rls, sync, leads, analytics, api-client]

# Dependency graph
requires:
  - phase: 01-foundation-multi-tenancy
    provides: "clients table, RLS pattern with (SELECT auth.jwt()) subselect"
  - phase: 02-operator-admin-core
    provides: "client_campaigns junction table, Instantly API client with listCampaigns, admin client"
provides:
  - "synced_leads table for lead data storage"
  - "campaign_analytics table for daily analytics snapshots"
  - "getCampaignAnalyticsOverview, getCampaignDailyAnalytics, listLeads API functions"
  - "syncClientData and syncAllClients orchestration functions"
affects: [04-02, 04-03, 05-inbox-reply-system]

# Tech tracking
tech-stack:
  added: []
  patterns: [cursor-pagination-sync, icp-field-normalization, batch-upsert, rate-limit-sequential]

key-files:
  created:
    - "supabase/migrations/20260216000002_synced_leads_and_analytics.sql"
    - "src/lib/instantly/sync.ts"
  modified:
    - "src/lib/instantly/client.ts"
    - "src/lib/instantly/types.ts"

key-decisions:
  - "getHeaders() function instead of module-level const for Bearer token (evaluated at call time, not import time)"
  - "90-day rolling window for analytics sync (covers 3 months of campaign data)"
  - "500ms delay between campaigns for rate limit safety"
  - "Batch upserts of 500 leads to avoid payload size limits"

patterns-established:
  - "ICP normalization: case-insensitive field lookup with EN+NL variants"
  - "Lead status derivation: replied > bounced > emailed > not_yet_emailed priority"
  - "Sequential campaign processing with inter-request delays for rate limiting"

# Metrics
duration: 2min
completed: 2026-02-15
---

# Phase 4 Plan 1: Database Tables & Instantly Sync Infrastructure Summary

**synced_leads + campaign_analytics tables with RLS, extended Instantly API client (analytics + leads), and sync module with ICP normalization and cursor pagination**

## Performance

- **Duration:** 2 min
- **Started:** 2026-02-15T17:00:08Z
- **Completed:** 2026-02-15T17:01:59Z
- **Tasks:** 2
- **Files modified:** 4

## Accomplishments
- synced_leads and campaign_analytics tables with RLS SELECT-only policies for clients and operators
- Instantly API client extended with getCampaignAnalyticsOverview, getCampaignDailyAnalytics, and listLeads
- Sync module with full orchestration: per-client campaign iteration, daily analytics upsert, lead pagination, ICP field normalization from payload custom variables
- Lead status derivation logic and sender_account tracking for reply routing

## Task Commits

Each task was committed atomically:

1. **Task 1: Database migration for synced_leads and campaign_analytics** - `2f90422` (feat)
2. **Task 2: Extend Instantly API client and create sync module** - `d49c9be` (feat)

## Files Created/Modified
- `supabase/migrations/20260216000002_synced_leads_and_analytics.sql` - Two tables with RLS, indexes, unique constraints
- `src/lib/instantly/types.ts` - Added InstantlyCampaignAnalytics, InstantlyDailyAnalytics, InstantlyLead interfaces
- `src/lib/instantly/client.ts` - Added 3 new API functions, extracted shared BASE_URL and getHeaders()
- `src/lib/instantly/sync.ts` - syncClientData and syncAllClients with ICP normalization, batch upserts, rate limiting

## Decisions Made
- **getHeaders() function over module-level const**: Bearer token is read at call time, not module import time, ensuring env var is always available in server-side contexts
- **90-day rolling sync window**: Covers sufficient historical data without overloading API
- **500ms inter-campaign delay**: Conservative rate limiting since exact Instantly rate limits are undocumented
- **Batch upserts of 500**: Prevents Supabase payload size limits on large lead sets

## Deviations from Plan

### Auto-fixed Issues

**1. [Rule 2 - Missing Critical] Added batch upserts for leads**
- **Found during:** Task 2 (sync module)
- **Issue:** Upserting thousands of leads in a single call could exceed Supabase request payload limits
- **Fix:** Added BATCH_SIZE of 500 with loop to upsert in chunks
- **Files modified:** src/lib/instantly/sync.ts
- **Verification:** TypeScript compiles cleanly
- **Committed in:** d49c9be (Task 2 commit)

---

**Total deviations:** 1 auto-fixed (1 missing critical)
**Impact on plan:** Essential for reliability with large lead sets. No scope creep.

## Issues Encountered
None

## User Setup Required
None - no external service configuration required (INSTANTLY_API_KEY already configured in Phase 2).

## Next Phase Readiness
- Tables ready for synced data from Instantly API
- Sync module ready to be called from cron endpoint or server action
- Next plan (04-02) can build cron route handler and dashboard UI with aggregation queries
- campaign_id remains internal-only; all RLS policies enforce client data isolation

---
*Phase: 04-instantly-ai-integration-campaign-stats*
*Completed: 2026-02-15*
