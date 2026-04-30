---
phase: 09-news-authoring-schema
plan: 01
subsystem: database
tags: [supabase, postgres, rls, storage, migration, news, multilingual]

# Dependency graph
requires:
  - phase: 01-foundation-multitenancy
    provides: profiles table + auth.users + RLS subselect pattern (auth.jwt() ->> 'user_role')
  - phase: 02-operator-admin-core
    provides: Storage bucket creation + storage.objects policy pattern (client-logos analog)
provides:
  - public.news_items table (multilingual title_*/body_* columns, status lifecycle, image_path nullable, FK to profiles)
  - public.news_dismissals table (composite PK user_id+news_item_id, ON DELETE CASCADE FKs)
  - news-images Supabase Storage bucket (public, 2 MB, png/jpeg/webp — no SVG)
  - RLS policies for news_items (operator full CRUD; client SELECT published-only)
  - RLS policies for news_dismissals (user SELECT/INSERT own; operator SELECT all)
  - Storage policies for news-images (operator INSERT/UPDATE/DELETE; authenticated SELECT)
  - Indexes: idx_news_items_status, partial idx_news_items_published_at WHERE status='published', idx_news_dismissals_user_id
affects: [09-02-zod-storage-i18n, 09-03-server-actions, 09-06-db-push, phase-10-news-delivery, phase-10-archive]

# Tech tracking
tech-stack:
  added: []
  patterns:
    - "Multilingual content columns on the row (title_nl/en/hi, body_nl/en/hi) instead of i18n table — keeps news content separate from UI chrome strings (D-24)"
    - "Status as VARCHAR + CHECK constraint instead of Postgres ENUM type (matches profiles.user_role and profiles.language pattern, D-10)"
    - "Composite PRIMARY KEY (user_id, news_item_id) on dismissals for natural idempotency via INSERT ... ON CONFLICT DO NOTHING"
    - "Partial index WHERE status='published' for client read-path optimization"
    - "MIME whitelist excluding image/svg+xml on content-image bucket (deliberate divergence from client-logos which allows SVG, T-09-07)"

key-files:
  created:
    - supabase/migrations/20260429000002_news_broadcasting.sql
  modified: []

key-decisions:
  - "Migration timestamp 20260429000002 — same date as profile_language migration, sequential ordering preserved"
  - "news-images bucket excludes image/svg+xml even though client-logos allows it — content images are raster and SVG widens XSS surface (T-09-07)"
  - "news_dismissals.user_id references auth.users(id) directly (not profiles.id) per D-09 — dismissals are per individual user, not per tenant"
  - "Operators SELECT all news_dismissals policy added for support/debugging — no Phase 9 UI consumes it"
  - "Partial index on news_items(published_at DESC) WHERE status='published' added to accelerate the Phase-10 client query"
  - "CHECK constraint on status (not ENUM type) per D-10 — matches established profiles.user_role / profiles.language pattern"

patterns-established:
  - "Per-user write-protected dismissal: WITH CHECK (user_id = (SELECT auth.uid())) prevents one user forging dismissals for another (T-09-02 mitigation pattern, reusable for any user-scoped action table)"
  - "Global broadcast read policy: SELECT policy with role check + status check, no tenant client_id filter (template for any future system-wide announcement tables)"

requirements-completed: [NEWS-01, NEWS-02, NEWS-03, NEWS-04, NEWS-05]

# Metrics
duration: 1m22s
completed: 2026-04-29
---

# Phase 9 Plan 1: News Broadcasting Migration Summary

**`news_items` + `news_dismissals` tables, `news-images` Storage bucket (2 MB, png/jpeg/webp), and full RLS + storage policies — schema groundwork for v1.1 News Broadcasting with operator-only writes and client read gated to status='published'.**

## Performance

- **Duration:** 1m22s
- **Started:** 2026-04-29T20:27:13Z
- **Completed:** 2026-04-29T20:28:35Z
- **Tasks:** 1
- **Files modified:** 1 (1 created, 0 modified)

## Accomplishments
- `public.news_items` table: 6 multilingual content columns (title_nl/en/hi, body_nl/en/hi), nullable image_path, status lifecycle CHECK constraint (`draft`/`published`/`withdrawn`), and 4 timestamps (`created_at`, `created_by`, `published_at`, `withdrawn_at`)
- `public.news_dismissals` table: composite PK `(user_id, news_item_id)` with ON DELETE CASCADE FKs to both `auth.users` and `news_items` — Phase-10-ready, schema-only in Phase 9
- `news-images` Supabase Storage bucket created with strict 2 MB limit and raster-only MIME whitelist (no SVG)
- Operator full CRUD on news_items via `(SELECT auth.jwt() ->> 'user_role') = 'operator'`
- Client read gated to `user_role = 'client' AND status = 'published'` — drafts and withdrawn rows are unreachable from a client JWT
- Per-user dismissal writes hardened with `WITH CHECK (user_id = (SELECT auth.uid()))`
- Storage write policies on the bucket gate INSERT/UPDATE/DELETE to operators only; SELECT is open to any authenticated user (clients need to render images)

## Task Commits

1. **Task 1: Write the news_broadcasting migration (tables + bucket + RLS + storage policies)** — `1943223` (feat)

**Plan metadata:** `3faa8bc` (docs: complete news_broadcasting migration plan — SUMMARY + STATE + ROADMAP)

## Files Created/Modified
- `supabase/migrations/20260429000002_news_broadcasting.sql` (created) — Full DDL for news_items + news_dismissals, Storage bucket creation for news-images, all RLS policies on both tables, and all storage.objects policies for the bucket. Forward-only DDL — no DROP statements, no seed data, no backfill.

## Decisions Made

All decisions in this plan came from CONTEXT.md (D-08 through D-16) — no new in-execution decisions were required. The migration was written against the locked spec and analog patterns:
- Column types from D-08 (news_items) and D-09 (news_dismissals)
- Status as CHECK constraint (D-10) — matches profiles.user_role pattern
- Bucket name + size + MIME (D-11/D-12/D-13) — explicit SVG exclusion documented inline (T-09-07)
- RLS shapes (D-14/D-15) — operator full + client published-only on news_items; user own + operator all on news_dismissals
- Storage policies (D-16) — operator INSERT/UPDATE/DELETE; authenticated SELECT

## Deviations from Plan

None — plan executed exactly as written. The migration matches the action body in 09-01-PLAN.md verbatim (column types, constraints, policy logic, header comment, ordering).

## Issues Encountered

None. The plan was a single atomic write of one migration file. Git printed an LF→CRLF warning on the staged file (Windows line-ending conversion warning, not an error). All grep gates from acceptance_criteria passed on the first write.

## Threat Model Coverage

All 8 threats from the plan's `<threat_model>` were addressed by the file as written:

| Threat ID | Mitigation present | Verification |
|-----------|--------------------|--------------|
| T-09-01 | Client SELECT policy includes `AND status = 'published'` | grep on policy text |
| T-09-02 | INSERT policy has `WITH CHECK (user_id = (SELECT auth.uid()))` | grep on policy |
| T-09-03 | Only operator-role policy permits INSERT/UPDATE/DELETE on news_items; default-deny for clients | grep on FOR ALL operator policy + absence of client write policy |
| T-09-04 | Storage INSERT/UPDATE/DELETE policies require `(SELECT auth.jwt() ->> 'user_role') = 'operator'` | 3 distinct CREATE POLICY + bucket_id check |
| T-09-05 | User-SELECT uses `user_id = (SELECT auth.uid())` | grep on USING clause |
| T-09-06 | `file_size_limit = 2097152` enforced by Supabase Storage | grep on bucket INSERT |
| T-09-07 | `allowed_mime_types` excludes `image/svg+xml` | `grep -c "image/svg"` returns 0 |
| T-09-08 | accept (out-of-scope per PROJECT.md) — `created_by` + `created_at` provide minimal traceability | column present |

No new threat surface was introduced beyond the registered set — no flags for the verifier.

## Next Phase Readiness

- Schema groundwork complete. Plan 09-02 (Wave 1, parallel) can now define matching Zod schemas + storage helper + i18n keys without waiting on a DB push.
- Migration is FORWARD-ONLY DDL and is committed to the working tree. **The DB is NOT yet updated** — `supabase db push` is deliberately deferred to plan 09-06 (BLOCKING wave 5) so all Phase 9 code (server actions, components, routes) is wired against the migration text first, then a single push lands the schema before manual smoke verification.
- Downstream Phase 10 has no schema dependency — both `news_items` and `news_dismissals` are now defined; Phase 10 only needs to add INSERT-from-client wiring against the existing dismissal RLS policy.

## Self-Check: PASSED

Verified post-write:
- File exists: FOUND `supabase/migrations/20260429000002_news_broadcasting.sql`
- Commit exists: FOUND `1943223` (`feat(09-01): add news_broadcasting migration ...`)
- All grep gates from acceptance_criteria pass:
  - `CREATE TABLE public.news_items|CREATE TABLE public.news_dismissals|news-images` → 10 (≥3 required by verify gate)
  - `news-images` count → 8 (≥5 required)
  - `image/svg` count → 0 (must be 0)
  - `PRIMARY KEY (user_id, news_item_id)` → 1 (composite PK present)
  - `CHECK (status IN ('draft', 'published', 'withdrawn'))` → 1 (status constraint present)
  - 3× `VARCHAR(200) NOT NULL DEFAULT ''` for title_nl/en/hi
  - 3× `TEXT NOT NULL DEFAULT ''` for body_nl/en/hi
  - 3× FK references (profiles, auth.users CASCADE, news_items CASCADE)
  - 2× `ENABLE ROW LEVEL SECURITY` (one per table)
- No file deletions in commit (`git diff --diff-filter=D HEAD~1 HEAD` empty)

---
*Phase: 09-news-authoring-schema*
*Completed: 2026-04-29*
