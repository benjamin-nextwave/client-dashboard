# Phase 9: News Authoring & Schema — Specification

**Created:** 2026-04-29
**Ambiguity score:** 0.16
**Requirements:** 6 locked (NEWS-01..06) + 1 schema deliverable for Phase 10

## Goal

Operators can author multilingual news items (image, title, body in NL/EN/Hindi), manage their lifecycle (draft → published → withdrawn), and the underlying database schema and Supabase Storage groundwork is in place for Phase 10 to consume.

## Background

The codebase has no concept of broadcast announcements today. The operator admin panel (`src/app/(operator)/admin/`) currently manages clients, campaigns, errors, feedback, bezwaren, and mail-clients — each follows the same pattern: page.tsx + actions.ts + form component using `useActionState` + Zod.

Multi-language infrastructure already exists from a recent migration (`supabase/migrations/20260429000001_profile_language.sql`): `profiles.language` column with values `nl`/`en`/`hi`, translation files at `src/lib/i18n/translations/{nl,en,hi}.ts`, and a `useT()` hook. The operator UI uses the same i18n.

Supabase Storage is already configured (`src/lib/supabase/storage.ts`) with two buckets — `client-logos` (2MB, image types) and `campaign-pdfs` (20MB). The pattern for new buckets, upload helpers, and public URLs is established.

This phase introduces:
1. Two new tables: `news_items` (content + status) and `news_dismissals` (per-user read tracking — built here so Phase 10 has no schema dependency)
2. A new Supabase Storage bucket for news images
3. A new operator admin section at `/admin/news` (or equivalent) with list view, create/edit form, publish/withdraw actions, and a per-language preview

## Requirements

1. **NEWS-01 — Create news item**: Operator can create a news item with optional image and required title + body in Dutch, English, and Hindi.
   - Current: No news data model exists; operator admin has no news creation UI
   - Target: A `news_items` table exists with separate columns for `title_nl`/`title_en`/`title_hi` and `body_nl`/`body_en`/`body_hi`, plus `image_path` (nullable) and `status` enum. Operator can submit a create form that inserts a row with `status='draft'`
   - Acceptance: Creating a news item via the admin UI inserts exactly one row in `news_items` with status `draft`, all 6 language fields persisted (or empty strings), and `image_path` populated only if an image was uploaded

2. **NEWS-02 — Edit news item**: Operator can edit any field of any language variant of an existing news item.
   - Current: No news editing UI exists
   - Target: Each news item has an edit route. Submitting the edit form updates the corresponding row in `news_items`. Editing is allowed in any status (draft, published, withdrawn)
   - Acceptance: Editing a published news item's English body changes `body_en` in the database without changing other language fields, status, or `image_path`; the change is visible on subsequent admin list refresh

3. **NEWS-03 — Publish news item**: Operator can publish a draft news item, making it visible to clients, only when all three language variants are complete.
   - Current: No publishing flow exists
   - Target: Publish action sets `status='published'` and stamps `published_at`. The action is only allowed when all three `title_*` and all three `body_*` fields are non-empty (a missing translation BLOCKS publishing)
   - Acceptance: Calling publish on an item with only `title_nl`+`body_nl` populated returns a validation error, the row stays at `status='draft'`, and `published_at` is NULL. Calling publish on an item with all six language fields populated transitions it to `status='published'` with `published_at` set to NOW()

4. **NEWS-04 — Withdraw news item**: Operator can withdraw a published news item, making it invisible to clients but retaining the record.
   - Current: No withdrawal flow exists
   - Target: Withdraw action transitions a published item to `status='withdrawn'` and stamps `withdrawn_at`. The row is NOT deleted — it remains in `news_items` and remains visible in the operator admin list view (NEWS-05)
   - Acceptance: Calling withdraw on a published item sets `status='withdrawn'` and `withdrawn_at=NOW()`; the row still exists in the database; querying `news_items WHERE status='withdrawn'` returns the row

5. **NEWS-05 — List news items**: Operator can see a list of all news items showing status and timestamps.
   - Current: No news list view exists
   - Target: A list page renders every row in `news_items` (regardless of status), showing per row: a representative title (NL preferred, fallback to whichever exists), status badge (draft/published/withdrawn), `created_at`, `published_at` (or "—"), and `withdrawn_at` (or "—"). Each row links to the edit page and exposes publish/withdraw action buttons appropriate to the current status
   - Acceptance: The list page renders all 3 statuses correctly when test data contains one item per status; clicking a row navigates to the edit page for that item; the publish button appears only for drafts, the withdraw button only for published items

6. **NEWS-06 — Preview language variant**: Operator can preview a news item rendered in any of its three language variants before publishing.
   - Current: No preview surface exists
   - Target: Within the create/edit form (or a separate preview view linked from it), the operator can switch between NL/EN/Hindi tabs and see the title and body for that language exactly as they will be rendered to a client. If an image is attached, it is shown
   - Acceptance: Switching the preview tab from NL to EN displays the English title+body without saving or refreshing; switching to Hindi displays the Hindi title+body; an attached image is visible across all three tabs

7. **(Schema groundwork for Phase 10) — `news_dismissals` table**: A per-user dismissal-tracking table exists.
   - Current: No dismissal table exists
   - Target: A `news_dismissals` table exists with `(user_id, news_item_id, dismissed_at)`, with `(user_id, news_item_id)` as a composite primary key (or unique constraint), and appropriate RLS policies. Phase 10 will INSERT into this table; Phase 9 only creates and exposes the schema
   - Acceptance: The migration that creates `news_items` also creates `news_dismissals`; a manual INSERT into `news_dismissals` referencing a valid `auth.users.id` and a valid `news_items.id` succeeds and is idempotent (PK collision = no-op or graceful conflict)

## Boundaries

**In scope:**
- Migration creating `news_items` table with: `id`, `title_nl`, `title_en`, `title_hi`, `body_nl`, `body_en`, `body_hi`, `image_path` (nullable), `status` (enum: draft/published/withdrawn), `created_at`, `created_by` (operator profile FK), `published_at` (nullable), `withdrawn_at` (nullable)
- Migration creating `news_dismissals` table — schema only, no Phase 9 reads/writes from this table
- New Supabase Storage bucket for news images, with constraints aligned to existing `client-logos` (size limit + image MIME types)
- Storage helper for news image upload + public URL retrieval (reuses pattern from `src/lib/supabase/storage.ts`)
- RLS policies: only `user_role = 'operator'` can SELECT/INSERT/UPDATE on `news_items`; clients can SELECT only `status = 'published'` rows (for Phase 10 to read); `news_dismissals` allows users to insert/select their own rows
- Operator admin section: list page + create page + edit page + actions.ts file (server actions for create/update/publish/withdraw + image upload)
- Zod validation schemas with publish-time check that all 6 language fields are non-empty
- Per-language preview UI inside the create/edit form (NL/EN/Hindi tabs)

**Out of scope:**
- Client-side rendering of news (overlay, sidebar, dismissal UI) — this is Phase 10
- INSERT-ing into `news_dismissals` from any UI — Phase 10 owns dismissal writes
- Cross-tenant targeting (`client_id` on news_items) — global broadcast only; deferred to v1.2 (TARGET-01)
- Scheduled publish/withdraw — manual operator toggle only; deferred to v1.2 (TARGET-02)
- Rich text formatting (markdown/WYSIWYG) — plain text body only
- Multiple images per news item — one optional image only
- Auto-translation between languages — operator authors all 3 variants manually
- Read/dismiss analytics — no engagement metrics
- Email/push notifications — overlay on dashboard open is the only delivery channel (Phase 10)

## Constraints

- **Tech stack:** Next.js 15 App Router + TypeScript + Tailwind + Supabase — non-negotiable per project constraints
- **Operator admin pattern reuse:** Must follow the existing pattern at `src/app/(operator)/admin/clients/` (page.tsx, actions.ts, form component using `useActionState` + react-hook-form + Zod)
- **i18n reuse:** Must reuse the existing `src/lib/i18n/translations/{nl,en,hi}.ts` system for operator UI strings; news content fields are stored separately per language but the surrounding chrome uses `useT()`
- **Storage pattern reuse:** News image bucket and helper must follow the pattern in `src/lib/supabase/storage.ts` (public bucket, MIME whitelist, size limit, `getPublicUrl` for read)
- **JWT-based auth:** RLS policies must use `(SELECT auth.jwt() ->> 'user_role')` subselect — same pattern as v1.0 tables — for performance and consistency
- **Global scope:** `news_items` has NO `client_id` column — published news is visible to every authenticated client across all tenants
- **Per-user dismissal:** `news_dismissals.user_id` references `auth.users.id` (not `profiles.id` and not `client_id`) — each individual user dismisses for themselves
- **Publish gate:** Server-side validation must enforce all-3-languages-required at publish time (Zod schema, double-checked in the server action) — UI is allowed to disable the button but server is the source of truth
- **Image optional:** Schema and validation must permit `image_path = NULL`

## Acceptance Criteria

- [ ] Migration creates `news_items` table with all required columns and a status check constraint accepting only `draft`/`published`/`withdrawn`
- [ ] Migration creates `news_dismissals` table with `(user_id, news_item_id)` uniqueness
- [ ] New Supabase Storage bucket exists with documented size + MIME constraints; helper for upload + public URL is exported from `src/lib/supabase/storage.ts`
- [ ] RLS policies: operators have full CRUD on `news_items`; clients can SELECT only published rows; clients can INSERT/SELECT own rows in `news_dismissals`
- [ ] Operator admin list page (`/admin/news` or equivalent) renders all news items with status badge + timestamps; verified for at least one item per status
- [ ] Create form submits and inserts a row with `status='draft'`, including only NL filled in (drafts allow partial translation)
- [ ] Edit form mutates a single language variant without affecting other fields, status, or image
- [ ] Publish action returns a validation error when any of the 6 language fields is empty; transitions status to `published` and stamps `published_at` only when all 6 are filled
- [ ] Withdraw action transitions a published item to `withdrawn` and stamps `withdrawn_at`; the row is NOT deleted; the row still appears in the admin list view
- [ ] Preview UI inside the create/edit form switches between NL/EN/Hindi tabs and renders the corresponding title + body without persisting changes
- [ ] Image upload is optional — a news item can be created, published, and withdrawn with `image_path = NULL`

## Ambiguity Report

| Dimension          | Score | Min  | Status | Notes                                                                |
|--------------------|-------|------|--------|----------------------------------------------------------------------|
| Goal Clarity       | 0.90  | 0.75 | ✓      | Operator-side authoring + schema groundwork is precise               |
| Boundary Clarity   | 0.85  | 0.70 | ✓      | Clear split with Phase 10; Phase 10 owns all client-side delivery    |
| Constraint Clarity | 0.80  | 0.65 | ✓      | Global scope + per-user dismissal + soft-delete withdraw all locked  |
| Acceptance Criteria| 0.75  | 0.70 | ✓      | 11 pass/fail criteria covering schema, UI, validation, storage       |
| **Ambiguity**      | 0.16  | ≤0.20| ✓      | Gate passed — ready for discuss-phase                                |

## Interview Log

| Round | Perspective | Question summary                              | Decision locked                                                      |
|-------|-------------|-----------------------------------------------|----------------------------------------------------------------------|
| 1     | Researcher  | News scope + dismissal granularity?           | Global broadcast (no client_id), per-user dismissal (auth.users.id)  |
| 1     | Researcher  | Withdraw semantics?                           | Soft delete — status='withdrawn', row preserved, visible in admin    |
| 1     | Researcher  | Is image required?                            | Optional — image_path nullable                                       |
| 2     | Failure An. | Publish with incomplete translations?         | BLOCK — server validation rejects publish unless all 6 fields filled |

Codebase reuse-decisions (from scout, not the interview):
- Operator admin CRUD pattern from `src/app/(operator)/admin/clients/`
- i18n system from `src/lib/i18n/translations/{nl,en,hi}.ts` (already supports NL/EN/Hindi)
- Storage helper pattern from `src/lib/supabase/storage.ts`
- Form pattern: `useActionState` + react-hook-form + Zod
- RLS pattern: `(SELECT auth.jwt() ->> 'user_role')` subselect

---

*Phase: 09-news-authoring-schema*
*Spec created: 2026-04-29*
*Next step: /gsd-discuss-phase 9 — implementation decisions (table column types, bucket name, preview UI shape, RLS policy details, etc.)*
