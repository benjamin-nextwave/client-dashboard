---
phase: 09-news-authoring-schema
plan: 03
subsystem: server-actions
tags: [next, server-actions, supabase, useActionState, news, multilingual]

# Dependency graph
requires:
  - phase: 09-news-authoring-schema
    provides: src/lib/validations/news.ts (newsDraftSchema, newsPublishSchema) + src/lib/supabase/storage.ts (uploadNewsImage, deleteNewsImage) — both landed in 09-02
  - phase: 02-operator-admin-core
    provides: src/lib/supabase/admin.ts (createAdminClient) + src/app/(operator)/admin/clients/actions.ts (canonical analog for create/update/delete server actions)
provides:
  - createNewsItem(prevState, formData) — inserts a row with status='draft', optional image upload via post-INSERT image_path UPDATE; redirects to /admin/news/{id}/edit
  - updateNewsItem(newsItemId, prevState, formData) — mutates ONLY the 6 lang content columns; never touches status, published_at, withdrawn_at, image_path (except via the post-update upload flow)
  - publishNewsItem(newsItemId) — re-reads row from DB (T-09-15), runs newsPublishSchema.safeParse, transitions draft→published with published_at=NOW()
  - withdrawNewsItem(newsItemId) — only published rows can transition to 'withdrawn' (with withdrawn_at=NOW()); row is NOT deleted (soft delete)
  - deleteNewsItem(newsItemId) — hard delete with best-effort deleteNewsImage cleanup; ON DELETE CASCADE on news_dismissals handles dismissal rows
affects: [09-04-components, 09-05-pages, phase-10-news-delivery]

# Tech tracking
tech-stack:
  added: []
  patterns:
    - "Server-authoritative publish gate: publishNewsItem re-reads the row from the DB before validating, never trusts FormData (T-09-15) — diverges from createNewsItem/updateNewsItem which read from FormData because those operations are draft-permissive (no all-fields gate)"
    - "Narrow-column UPDATE statement: updateNewsItem's UPDATE lists exactly the 6 content columns by name — status/published_at/withdrawn_at/image_path/created_by/created_at can ONLY be touched via the dedicated transition functions (T-09-16)"
    - "Server-managed image_path: readRawFromFormData reads only the 6 lang fields; image arrives as a File under name='image' and the action sets image_path via post-upload UPDATE — operators cannot forge image_path via crafted FormData (T-09-30)"
    - "Two-step image upload: insert row with image_path=null, then conditional follow-up UPDATE with the bucket-relative path returned by uploadNewsImage — non-fatal upload failure leaves the row intact (matches createClient pattern)"
    - "useActionState-shaped (prevState, formData) signatures for create/update; bare-id signatures for publish/withdraw/delete (called via .bind(null, id) from form action attributes or via useTransition)"
    - "Status-precondition guards: publishNewsItem checks row.status === 'draft' before validating; withdrawNewsItem checks row.status === 'published' before transitioning — prevents confusing UI states (e.g., re-publishing a withdrawn item via crafted POST)"

key-files:
  created:
    - src/app/(operator)/admin/news/actions.ts
  modified: []

key-decisions:
  - "publishNewsItem re-reads the news_items row from the DB before applying newsPublishSchema — the FormData payload is NOT the gate input. Operators cannot bypass the all-3-langs requirement by crafting a FormData with all fields filled for a row whose DB columns are still partial (T-09-15)."
  - "updateNewsItem's UPDATE explicitly lists only the 6 content columns. Status transitions are reachable ONLY via publishNewsItem and withdrawNewsItem, each with their own DB read + precondition check (T-09-16)."
  - "readRawFromFormData reads ONLY the 6 language fields. The form sends the image as a File under name='image'; the action manages news_items.image_path entirely server-side via the uploadNewsImage flow (T-09-30)."
  - "createNewsItem inserts with image_path=null FIRST, then conditionally UPDATEs image_path after a successful upload. This guarantees the row exists even if image upload fails (matches the createClient/uploadClientLogo non-fatal pattern)."
  - "createNewsItem redirects to /admin/news/{id}/edit (NOT /admin/news) — operators land on the edit page so they can fill the other languages without re-navigating. Pages plan 09-05 must NOT add an extra redirect."
  - "updateNewsItem returns { error: '' } on success (does NOT redirect) — the form stays on the edit page for live editing; useActionState rebinds with empty error."
  - "publishNewsItem and withdrawNewsItem are NOT useActionState-shaped — they take a single id and return { error?: string }. The card and edit-page button handlers in 09-04 will call them via <form action={publishNewsItem.bind(null, id)}> or via useTransition + plain function call."
  - "getOperatorProfileId returns null deliberately for Phase 9 — the news_items.created_by column is nullable and the operator panel is gated by route layout. Per-operator audit attribution is a future-phase concern."
  - "Status-precondition guards (publish requires status='draft', withdraw requires status='published') prevent crafted re-publish or re-withdraw POSTs from producing weird state — UI in 09-04 only renders the right button per status, but these are belt-and-suspenders."

patterns-established:
  - "Server-authoritative state-transition gate pattern: when a server action enforces a precondition (e.g., 'all 6 fields filled' or 'must be in status X'), it reads the current state from the DB INSIDE the action and re-validates — never trusts request payload for transition gates. Reusable for any future status machine (e.g., campaign approval, mail-client lifecycle)."
  - "Two-step create+upload pattern: insert the parent row with the file path NULL, then conditionally UPDATE the path on successful upload. Avoids orphaned uploads on insert failure and orphaned rows on transient upload failure — the row always represents what's persisted, the upload is non-fatal."
  - "Narrow-column UPDATE: explicitly list every column being updated by name (no spread, no whitelist) — makes 'this UPDATE cannot touch status' a code-review-able guarantee rather than a runtime check."

requirements-completed: [NEWS-01, NEWS-02, NEWS-03, NEWS-04]

# Metrics
duration: 1m53s
completed: 2026-04-29
---

# Phase 9 Plan 3: News Server Actions Summary

**Five server actions in `src/app/(operator)/admin/news/actions.ts` — `createNewsItem`/`updateNewsItem`/`publishNewsItem`/`withdrawNewsItem`/`deleteNewsItem` — wired against the Wave-1 Zod schemas and storage helpers, with server-authoritative publish gate, narrow-column UPDATEs, and server-managed `image_path`. The action contracts that 09-04 (form/card/preview) and 09-05 (pages) will consume.**

## Performance

- **Duration:** 1m53s
- **Started:** 2026-04-29T20:42:31Z
- **Completed:** 2026-04-29T20:44:24Z
- **Tasks:** 1 (all auto-mode, no checkpoints)
- **Files created:** 1

## Accomplishments

- **`createNewsItem(prevState, formData)`** — readRawFromFormData → newsDraftSchema.safeParse → INSERT into news_items with status='draft' + image_path=null + created_by=null → optional uploadNewsImage → conditional follow-up UPDATE patching image_path → revalidatePath + redirect to /admin/news/{id}/edit. Non-fatal upload failure (logged, row preserved).
- **`updateNewsItem(id, prevState, formData)`** — readRawFromFormData → newsDraftSchema.safeParse → UPDATE narrowly listing the 6 lang columns ONLY → optional uploadNewsImage → conditional follow-up UPDATE patching image_path → revalidatePath /admin/news + /admin/news/{id}/edit → returns { error: '' } (no redirect; form stays on edit page).
- **`publishNewsItem(id)`** — admin-client SELECT of the 7 relevant columns → row.status === 'draft' precondition guard → newsPublishSchema.safeParse on DB-read fields (NOT FormData) → UPDATE status='published' + published_at=NOW() → revalidatePath. Returns the refine error message (Dutch) on gate failure, with status preserved.
- **`withdrawNewsItem(id)`** — admin-client SELECT of status → row.status === 'published' precondition guard → UPDATE status='withdrawn' + withdrawn_at=NOW() → revalidatePath. Row is NOT deleted (soft delete, NEWS-04).
- **`deleteNewsItem(id)`** — best-effort deleteNewsImage (non-fatal, try/catch) → admin-client DELETE on news_items.id (ON DELETE CASCADE on news_dismissals handles dismissal cleanup) → revalidatePath /admin/news.
- **All 5 actions** use `createAdminClient()` (D-18) — service-role bypass of RLS for operator writes. Auth is enforced upstream by the (operator) route group layout (existing project pattern, T-09-14).
- **`readRawFromFormData`** reads ONLY the 6 lang fields — explicitly NOT image_path. Image arrives as a File under name='image'; image_path is set entirely server-side via the uploadNewsImage flow (T-09-30).

## Task Commits

1. **Task 1: Create src/app/(operator)/admin/news/actions.ts with all 5 server actions** — `426b44a` (feat)

## Files Created/Modified

- `src/app/(operator)/admin/news/actions.ts` (created) — 276 lines. Single new file, single new directory (`src/app/(operator)/admin/news/` did not exist before this plan). Imports `createAdminClient` from `@/lib/supabase/admin`, `newsDraftSchema`/`newsPublishSchema` from `@/lib/validations/news`, `uploadNewsImage`/`deleteNewsImage` from `@/lib/supabase/storage`, `revalidatePath` from `next/cache`, `redirect` from `next/navigation`.

## Decisions Made

All decisions in this plan came from CONTEXT.md (D-17, D-18, D-21, D-22) and the plan's own action body — no new in-execution decisions were required. The implementation matches the action body in 09-03-PLAN.md verbatim:
- Server-action structure from D-17 (5 named exports, useActionState-shaped or id-shaped per usage)
- Admin client for writes from D-18 (createAdminClient bypasses RLS for operator actions)
- Zod safeParse + { error } return shape from D-21/D-22
- All hardening notes from the plan's `<action>` block (server-authoritative publish gate, narrow-column UPDATE, server-managed image_path) implemented exactly as prescribed

## Deviations from Plan

### TDD frontmatter mismatch (1 deviation, no code impact)

**1. [Rule 4-adjacent — proceeded without escalating because it does not affect correctness] Task 1 declared `tdd="true"` but the project has no test framework**
- **Found during:** Task 1 startup
- **Issue:** 09-03-PLAN.md sets `tdd="true"` on Task 1, but the project's `package.json` has no test runner installed (no jest, vitest, mocha, node:test setup). The analog file (`src/app/(operator)/admin/clients/actions.ts`) has NO accompanying tests in the codebase. The plan's own `<verify>` block specifies `npx tsc --noEmit` (compile-only) and the `<output>` lists only the single source file. This is the same condition documented in 09-02-SUMMARY.md deviation #2 — a planner-template artifact, not a missing piece of work.
- **Fix:** Followed the plan's stated `<verify>` and `<acceptance_criteria>` (TypeScript compile + grep gates). Did NOT install a test framework (would have been a Rule 4 architectural decision the user has not requested for this plan; the rest of the codebase is TypeScript-validated only).
- **Files modified:** None (no test files created — none specified by plan output, none would be runnable without a runner)
- **Verification:** All `<acceptance_criteria>` and `<verify>` gates pass.
- **Committed in:** N/A.

### Acceptance-gate text — `redirect` count

**2. [Verification-only note, no code impact] Acceptance criterion `grep -c "redirect" returns 1` is structurally `2` because of the import statement**
- **Found during:** Post-write verification
- **Issue:** The plan's acceptance criteria says `grep -c "redirect" src/app/(operator)/admin/news/actions.ts` returns `1` (only createNewsItem redirects). Literal grep returns `2` because the file has both `import { redirect } from 'next/navigation'` (line 4) AND the call site `redirect(\`/admin/news/${newRow.id}/edit\`)` (line 98). The intent of the gate ("only createNewsItem has a redirect call") is fully satisfied — there is exactly 1 call-site, in `createNewsItem`. This matches the analog `clients/actions.ts` which has 1 import + 2 call sites = 3 total grep matches.
- **Fix:** Documented the structural reality. The intent of the gate is satisfied; the literal count differs because the planner counted call sites, not import statements.
- **Files modified:** None (documentation only)
- **Verification:** `grep -n "^  redirect("` returns exactly 1 line (line 98 in createNewsItem). No call site in updateNewsItem, publishNewsItem, withdrawNewsItem, or deleteNewsItem.
- **Committed in:** N/A.

---

**Total deviations:** 2 documented (both verification-only — no code impact)
**Impact on plan:** Zero on shipped artifacts. The plan's intended outcome (1 file with 5 named exports, TypeScript compiles, all hardening contracts honored) is fully satisfied.

## Issues Encountered

- Git printed an LF→CRLF warning on the staged file (Windows line-ending conversion warning, not an error). Commit succeeded.
- No other issues. `npx tsc --noEmit` passed first time (clean — no output).

## Threat Model Coverage

All 5 threats from the plan's `<threat_model>` are addressed by the shipped code:

| Threat ID | Mitigation present | Verification |
|-----------|--------------------|--------------|
| T-09-14 (non-operator hitting the action) | Auth enforced upstream by (operator) route group layout (existing project pattern); admin client only runs once auth passes — Phase-9 plan does NOT add a new auth path | Pattern reuse from clients/actions.ts; no new auth surface |
| T-09-15 (publish bypass via crafted FormData) | publishNewsItem re-reads the row from the DB BEFORE validating with newsPublishSchema — request payload is not the gate input | Code inspection: SELECT 7 columns by id, then safeParse the DB row, not the FormData |
| T-09-16 (UpdateNewsItem mutating status/published_at) | UPDATE in updateNewsItem explicitly lists exactly the 6 content columns; status transitions are reachable ONLY via publish/withdraw, each with their own preconditions | Code inspection: UPDATE statement column list; grep `status: 'published'`/`status: 'withdrawn'` returns 1 each (only in publish/withdraw) |
| T-09-17 (DoS via operator spamming create) | accepted (3 internal operators only, no public surface, ASVS L1 acceptable per plan) | Documented |
| T-09-18 (XSS via stored content) | transferred to Phase 10 (rendering safety); Phase 9 stores plain text; Zod `body_*.max(10_000)` caps payload size | Schema landed in 09-02; no rendering in Phase 9 |
| T-09-30 (operator forging image_path via FormData) | readRawFromFormData reads ONLY the 6 lang fields; the only writes to image_path are server-side post-upload UPDATEs using the path returned by uploadNewsImage (UUID-prefixed, time-suffixed) | grep `formData.get('image_path')` returns 0 |

No new threat surface was introduced beyond the registered set — no flags for the verifier.

## Threat Flags

None. All security-relevant additions are inside the threat-model registered surface (server-authoritative publish gate, narrow-column UPDATE, server-managed image_path). No new endpoints, no new auth paths, no new schema (DB schema lives in 09-01; helpers + types live in 09-02).

## Known Stubs

`getOperatorProfileId()` returns `null` deliberately for Phase 9 — this is documented in CONTEXT.md as an explicit design decision (`news_items.created_by` is nullable per D-08, the operator panel is gated by route layout, and Phase 9 has no per-operator audit UI). Future phases can wire this up by reading the request-scoped server client. This is NOT a stub blocking plan completion — it is an explicit decision; the column accepts NULL and the action's behavior is fully correct.

No other stubs. All 5 actions execute real DB writes against the migration text from 09-01 (which becomes live when 09-06 runs `supabase db push`); the Zod validators and storage helpers are real (not mocked); error paths return real Dutch user-facing messages.

## Next Phase Readiness

- **09-04 components** can now build `news-form.tsx` against `createNewsItem` (useActionState shape) and `updateNewsItem.bind(null, id)` (also useActionState shape after partial application). The form's `<form action={...}>` wires directly. The image input uses `name="image"` (File). The 6 text fields use `name="title_nl"|"title_en"|"title_hi"|"body_nl"|"body_en"|"body_hi"` — these are the field names readRawFromFormData reads.
- **09-04 components** can also build `news-card.tsx` with publish/withdraw buttons that call `publishNewsItem.bind(null, id)` and `withdrawNewsItem.bind(null, id)` from a `<form>` action attribute, OR call the bare functions via `useTransition` for inline button handlers.
- **09-05 pages** can wire the routes (`/admin/news`, `/admin/news/new`, `/admin/news/[id]/edit`) without circular dependency on 09-04 — the actions are already importable as `import { createNewsItem, updateNewsItem, publishNewsItem, withdrawNewsItem, deleteNewsItem } from '@/app/(operator)/admin/news/actions'`.
- **DB push (09-06)** is still the BLOCKING wave — the actions reference `news_items` table and `news-images` storage bucket which only exist in code today, not in the live database. End-to-end manual smoke verification happens after 09-06.
- No blockers. Wave 3 plan 09-04 (form/card/preview components) is unblocked and can start now.

## Self-Check: PASSED

Verified post-write:
- File created: FOUND `src/app/(operator)/admin/news/actions.ts` (276 lines, TypeScript compiles cleanly)
- Commit exists: FOUND `426b44a` (`feat(09-03): add news server actions (create/update/publish/withdraw/delete)`)
- All grep gates from acceptance_criteria pass (with deviation #2 documented for the `redirect` count being structurally `2` not `1`):
  - `createAdminClient` count = 7 (≥5 required)
  - `newsPublishSchema` count = 3 (≥1 required)
  - `newsDraftSchema` count = 3 (≥2 required)
  - `uploadNewsImage` count = 4 (≥2 required)
  - `status: 'draft'` count = 1 (≥1 required)
  - `status: 'published'` count = 1 (≥1 required)
  - `status: 'withdrawn'` count = 1 (≥1 required)
  - `revalidatePath('/admin/news'` count = 5 (≥4 required)
  - `redirect` count = 2 (1 import + 1 call); call-site count = 1 (only in createNewsItem) — intent satisfied
  - `formData.get('image_path')` count = 0 (must be 0 — no FormData read of image_path anywhere)
  - `image_path` count = 8 (all in server-managed code paths: insert with null, post-upload UPDATE, narrow-UPDATE comment block, etc. — verified by inspection that no occurrence READS image_path from FormData)
- All 5 named exports present: `createNewsItem`, `updateNewsItem`, `publishNewsItem`, `withdrawNewsItem`, `deleteNewsItem` (verified at lines 46, 104, 159, 215, 252)
- First line is `'use server'` (verified)
- Master gate `npx tsc --noEmit` passes (clean — no output)
- No file deletions in the task commit (`git diff --diff-filter=D HEAD~1 HEAD` empty)
- No untracked files left behind (`git status --short | grep '^??'` empty after the commit)

---
*Phase: 09-news-authoring-schema*
*Completed: 2026-04-29*
