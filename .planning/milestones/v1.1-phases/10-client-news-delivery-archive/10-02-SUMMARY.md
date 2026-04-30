---
phase: 10-client-news-delivery-archive
plan: 02
subsystem: api
tags: [server-actions, supabase, rls, idempotency, news-broadcasting, threat-mitigation]

# Dependency graph
requires:
  - phase: 09-news-authoring-schema
    provides: news_dismissals table with composite PK (user_id, news_item_id) and RLS WITH CHECK (user_id = auth.uid())
provides:
  - dismissNewsItem(newsItemId) server action — request-scoped, RLS-enforced, idempotent dismissal write
  - First Phase-10 server-action surface; Wave 2's news-overlay component (10-03) imports this directly
affects: [10-03-news-overlay, 10-05-dashboard-page-integration]

# Tech tracking
tech-stack:
  added: []
  patterns:
    - Request-scoped Supabase client (`@/lib/supabase/server`) for client-facing server actions — not the admin client — so RLS is enforced
    - Server-side user_id read via `supabase.auth.getUser()` instead of trusting caller args (T-1 mitigation pattern reusable in any future client→DB write)
    - upsert with composite-PK `onConflict` + `ignoreDuplicates: true` as the canonical idempotency pattern for v1.1 dismissal writes

key-files:
  created:
    - src/app/(client)/dashboard/actions.ts
  modified: []

key-decisions:
  - "Phase 10 client actions use the request-scoped Supabase client (createClient) — explicitly NOT the admin client used by Phase 9 operator actions — so RLS WITH CHECK acts as a backstop on every dismissal insert"
  - "user_id is read SERVER-SIDE via supabase.auth.getUser() and never accepted from the caller — this is the T-1 (cross-user dismissal forgery) primary mitigation; RLS is the secondary backstop"
  - "Idempotency on double-click handled at the DB layer via upsert(onConflict: 'user_id,news_item_id', ignoreDuplicates: true) — the composite PK makes the second click a silent no-op, keeping the action contract { ok: true } | { error: string } stable"
  - "Action deliberately omits any path-revalidation call — overlay queue state is client-managed during the session; the next /dashboard render naturally re-queries the news_items LEFT JOIN dismissals view"
  - "JSDoc reworded to avoid the literal token `revalidatePath` so the planner's deterministic grep gate (count = 0) passes strictly while preserving the security/intent rationale in prose form"

patterns-established:
  - "Pattern: Client-scope server actions live at src/app/(client)/{route}/actions.ts and use the request-scoped client — operator-scope actions stay under (operator)/admin and use the admin client"
  - "Pattern: Server actions never accept user identifiers from caller args — read them from auth.getUser() server-side; let RLS WITH CHECK be the second line of defense"
  - "Pattern: Phase-10 action signatures return `Promise<{ ok: true } | { error: string }>` — discriminated union lets the caller branch on `'ok' in result` without throwing"

requirements-completed: [DELIVER-04]

# Metrics
duration: ~2min
completed: 2026-04-30
---

# Phase 10 Plan 02: Dismiss News Item Server Action Summary

**Request-scoped, RLS-enforced `dismissNewsItem(newsItemId)` server action — idempotent upsert into news_dismissals, with user_id read server-side from the auth session as the T-1 forgery mitigation.**

## Performance

- **Duration:** ~2 min
- **Started:** 2026-04-30T14:28:25Z
- **Completed:** 2026-04-30T14:30:05Z
- **Tasks:** 1
- **Files modified:** 1 (created)

## Accomplishments
- Created `src/app/(client)/dashboard/actions.ts` exporting exactly one server action: `dismissNewsItem(newsItemId: string): Promise<{ ok: true } | { error: string }>`
- T-1 mitigation in place: user_id is read server-side from `supabase.auth.getUser()` — caller cannot forge another user's dismissal even via DevTools
- Idempotent on double-click: upsert with `onConflict: 'user_id,news_item_id'` + `ignoreDuplicates: true` makes the second submission a silent DB-level no-op (mitigates T-10-05 spam-click DoS at the data layer; useTransition will guard at the UI layer in 10-03)
- Defensive early return for non-string / empty newsItemId (mitigates T-10-04 malformed-UUID tampering)
- All 11 acceptance grep gates pass strictly; `npx tsc --noEmit` passes for the entire project
- Wave 1 of Phase 10 is now complete (10-01 i18n strings ready, 10-02 server action ready) — Wave 2 components (10-03 NewsOverlay, 10-04 NewsMegaphoneButton + NewsSidebar) are unblocked

## Task Commits

Each task was committed atomically:

1. **Task 1: Create src/app/(client)/dashboard/actions.ts with dismissNewsItem server action** — `56d9a1d` (feat)

## Files Created/Modified
- `src/app/(client)/dashboard/actions.ts` — NEW: single-export server-action module containing `dismissNewsItem`. Reads user_id from auth session, upserts into news_dismissals with composite-PK conflict ignore, returns `{ ok: true } | { error: string }`.

## Decisions Made
- **JSDoc reworded to avoid literal token `revalidatePath`** — the plan body's reference snippet (D-16 in CONTEXT.md) included a JSDoc bullet "We deliberately do NOT call revalidatePath", but the plan's acceptance criteria require `grep -c "revalidatePath"` to return 0. Resolved by paraphrasing to "We deliberately do NOT trigger a path revalidation. ... the next /dashboard render naturally re-queries the join" — same intent and equally clear, but no literal grep collision. Same calibration applied to JSDoc references that would have hit `news_dismissals` and `ignoreDuplicates` multiple times — those tokens now appear exactly once each, only in the actual code path. This keeps the planner's deterministic-grep contract (T-1 verification gate) provably enforceable.
- **No type exports** — followed Phase 9's lesson 040a936 (re-exporting types from `'use server'` files breaks the client bundle). The discriminated-union return type is inlined in the function signature; consumers (10-03) will infer it via `ReturnType<typeof dismissNewsItem>` if they need the literal type.
- **No prevState parameter** — matches Phase 9's publishNewsItem/withdrawNewsItem pattern, since 10-03's overlay calls this via `useTransition`, not `useActionState`.

## Deviations from Plan

### Auto-fixed Issues

**1. [Rule 3 - Blocking] Reworded JSDoc tokens that would have failed grep gates**
- **Found during:** Task 1 (verification step)
- **Issue:** The plan body's reference JSDoc included `revalidatePath`, multiple `news_dismissals` references, and a duplicate `ignoreDuplicates` reference — all of which would have failed the strict grep counts in `<acceptance_criteria>` (revalidatePath = 0, news_dismissals = 1, ignoreDuplicates = 1).
- **Fix:** Reworded the JSDoc to use semantic phrasing ("trigger a path revalidation", "the dismissals table", "duplicate inserts are silently ignored") that preserves all intent — security rationale, idempotency note, no-revalidate decision — without re-using the literal tokens that the grep gates require to be unique to the executable code.
- **Files modified:** src/app/(client)/dashboard/actions.ts
- **Verification:** All 11 grep gates from `<acceptance_criteria>` now return their expected counts (0 or 1); `npx tsc --noEmit` passes.
- **Committed in:** 56d9a1d (Task 1 commit)

---

**Total deviations:** 1 auto-fixed (1 blocking)
**Impact on plan:** No scope creep — change is purely a JSDoc rewording to satisfy the planner's deterministic grep contract. All security/idempotency/no-revalidate guarantees in the executable code are unchanged from the plan body.

## Issues Encountered
None.

## User Setup Required
None — no external service configuration required. The `news_dismissals` table and its RLS policies were applied to the live DB during Phase 9's plan 09-06.

## Next Phase Readiness
- **Wave 1 of Phase 10 is fully complete** — 10-01 (i18n strings) ✅ and 10-02 (dismiss server action) ✅
- **Wave 2 unblocked:** 10-03 (`NewsOverlay`) can now `import { dismissNewsItem } from '../actions'` and call it via `useTransition`. The action's `{ ok: true } | { error: string }` shape lets the overlay branch cleanly: on `ok`, advance the queue index; on `error`, surface a one-line message and keep the current item visible.
- **Wave 2 unblocked:** 10-04 (`NewsMegaphoneButton` + `NewsSidebar`) does NOT call dismissNewsItem (sidebar is the "all-published" archive view, not the dismiss path), but benefits from the same i18n keys (`client.news.*`) shipped in 10-01 — both Wave 2 plans can run in parallel.
- **No blockers or concerns.** Threat model T-1 (cross-user forgery), T-10-04 (malformed UUID), T-10-05 (spam-click DoS) are all mitigated as planned. T-10-06 (per-tenant audit) remains explicitly accepted/deferred to v1.2 ENGAGE-01.

## Self-Check: PASSED

- File `src/app/(client)/dashboard/actions.ts` exists ✓
- Commit `56d9a1d` exists in git log ✓
- All 11 acceptance grep gates pass strictly ✓
- `npx tsc --noEmit` passes ✓

---
*Phase: 10-client-news-delivery-archive*
*Completed: 2026-04-30*
