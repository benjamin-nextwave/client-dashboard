---
phase: 02-operator-admin-core
plan: 01
subsystem: database, api, validation
tags: [zod, react-hook-form, instantly-api, supabase-storage, rls, migration]

# Dependency graph
requires:
  - phase: 01-foundation-multi-tenancy
    provides: "clients/profiles tables, RLS patterns, admin client, auth types"
provides:
  - "client_campaigns junction table with RLS"
  - "client-logos storage bucket with operator-only upload"
  - "Profile INSERT/UPDATE RLS policies for operators"
  - "Zod validation schemas for client forms (Dutch error messages)"
  - "Instantly API v2 campaign listing wrapper"
  - "Storage upload/delete helpers for client logos"
  - "TypeScript interfaces for Client, ClientCampaign, ClientWithCampaigns"
affects: [02-02, 02-03, 02-04, 04-instantly-integration, 05-reply-management]

# Tech tracking
tech-stack:
  added: [zod@3.25, react-hook-form@7.71, @hookform/resolvers@3.10]
  patterns: ["Zod schemas with Dutch validation messages", "Instantly API v2 Bearer auth", "Admin client for storage operations"]

key-files:
  created:
    - supabase/migrations/20260216000001_client_campaigns_and_storage.sql
    - src/lib/validations/client.ts
    - src/lib/instantly/client.ts
    - src/lib/instantly/types.ts
    - src/lib/supabase/storage.ts
    - src/types/database.ts
  modified:
    - next.config.ts
    - package.json

key-decisions:
  - "Admin client (service_role) for storage uploads -- operators call from Server Actions, bypasses storage RLS safely"
  - "Dutch validation messages in Zod schemas -- consistent with Dutch UI labels from Phase 1"
  - "cache: no-store on Instantly API calls -- operators need fresh campaign data"

patterns-established:
  - "Zod schema pattern: base schema + omit/extend for edit variants"
  - "Instantly API pattern: Bearer token auth, server-side only, no NEXT_PUBLIC_ prefix"
  - "Storage pattern: admin client upload with upsert, folder-per-client structure"

# Metrics
duration: 2min
completed: 2026-02-15
---

# Phase 2 Plan 1: Foundation Utilities Summary

**client_campaigns junction table, Zod validation schemas with Dutch messages, Instantly API v2 wrapper, and storage upload helpers using admin client**

## Performance

- **Duration:** 2 min
- **Started:** 2026-02-15T15:58:37Z
- **Completed:** 2026-02-15T16:00:33Z
- **Tasks:** 2
- **Files modified:** 10

## Accomplishments
- Database migration with client_campaigns table, storage bucket, and 8 RLS policies (operator CRUD + client SELECT patterns)
- Zod validation schemas for client create/edit forms with Dutch error messages and type exports
- Instantly API v2 campaign listing wrapper with pagination support (server-side only)
- Storage upload/delete helpers with file type and size validation using admin client
- TypeScript interfaces for Client, ClientCampaign, and ClientWithCampaigns

## Task Commits

Each task was committed atomically:

1. **Task 1: Install packages and create database migration** - `3e1d646` (feat)
2. **Task 2: Create shared library utilities** - `a31c85f` (feat)

## Files Created/Modified
- `supabase/migrations/20260216000001_client_campaigns_and_storage.sql` - Junction table, storage bucket, 8 RLS policies
- `src/lib/validations/client.ts` - Zod schemas for client create/edit with Dutch messages
- `src/lib/instantly/client.ts` - Instantly API v2 campaign listing
- `src/lib/instantly/types.ts` - InstantlyCampaign and InstantlyListResponse interfaces
- `src/lib/supabase/storage.ts` - Logo upload/delete with validation
- `src/types/database.ts` - Client, ClientCampaign, ClientWithCampaigns types
- `next.config.ts` - Added 3MB server action body size limit
- `package.json` - Added zod, react-hook-form, @hookform/resolvers

## Decisions Made
- Used admin client (service_role) for storage uploads -- appropriate since only operators trigger this from Server Actions
- Dutch validation messages to match Phase 1 UI language convention
- cache: 'no-store' on Instantly API calls since operators need fresh campaign data

## Deviations from Plan

None - plan executed exactly as written.

## Issues Encountered

None.

## User Setup Required

**External services require manual configuration:**
- `INSTANTLY_API_KEY` environment variable needed for campaign listing (Instantly.ai Dashboard -> Settings -> Integrations -> API -> Create API Key, requires Growth plan with campaigns:read scope)

## Next Phase Readiness
- All shared utilities ready for client creation form (02-02)
- Migration ready for deployment to Supabase
- Instantly API wrapper ready but requires API key configuration before use

## Self-Check: PASSED

- All 6 created files verified present
- Commit `3e1d646` (Task 1) verified
- Commit `a31c85f` (Task 2) verified
- TypeScript compilation clean (`npx tsc --noEmit`)

---
*Phase: 02-operator-admin-core*
*Completed: 2026-02-15*
