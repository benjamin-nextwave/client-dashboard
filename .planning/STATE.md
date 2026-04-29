# Project State

## Project Reference

See: .planning/PROJECT.md (updated 2026-04-29)

**Core value:** Clients can see their campaign performance and reply to positive leads directly from their branded dashboard — keeping the entire outreach workflow in one place.

**Current focus:** v1.1 News Broadcasting — operator-broadcast multilingual announcements with overlay-on-open + sidebar archive

## Current Position

Phase: 9 — News Authoring & Schema
Plan: 3/6 complete
Status: Wave 2 complete — 09-03 (server actions for news_items: create/update/publish/withdraw/delete) landed. DB push still deferred to 09-06. Wave 3 plan 09-04 (form/card/preview-modal components) is unblocked and can start now.
Last activity: 2026-04-29 — 09-03 written: `src/app/(operator)/admin/news/actions.ts` (created — 5 named exports: createNewsItem, updateNewsItem, publishNewsItem, withdrawNewsItem, deleteNewsItem; server-authoritative publish gate via DB re-read; narrow-column UPDATE in updateNewsItem; server-managed image_path)

## Milestone v1.0 Outcomes (archived)

**Velocity:**
- Total plans completed: 25
- Average duration: ~3.2 min
- Total execution time: ~81 min
- 38/38 v1 requirements shipped

See `.planning/MILESTONES.md` and `.planning/milestones/v1.0-ROADMAP.md` for full v1.0 history.

## Accumulated Context

### Decisions

Decisions are logged in PROJECT.md Key Decisions table.

**v1.1 roadmap decisions:**
- Two-phase split for News Broadcasting (Phase 9 authoring + schema, Phase 10 delivery + archive) — chosen over one-phase for tighter cohesion and clearer success criteria; each phase delivers an independently verifiable capability
- `news_dismissals` table created in Phase 9 (with `news_items`) so Phase 10 has no schema dependency to wait on

**Phase 9 / Plan 09-01 decisions:**
- Migration timestamp `20260429000002` chosen sequentially after `20260429000001_profile_language.sql` on the same date
- `news-images` Storage bucket excludes `image/svg+xml` (whitelist: png/jpeg/webp only) — deliberate divergence from `client-logos` to reduce XSS surface on operator-authored content (T-09-07)
- Migration is forward-only DDL — DB push deferred to plan 09-06 (BLOCKING wave 5) so all server actions / components / routes in waves 2-4 are written against the migration text before a single push lands the schema
- `news_dismissals` uses composite PK `(user_id, news_item_id)` for natural idempotency on Phase-10 INSERT-ON-CONFLICT writes

**Phase 9 / Plan 09-02 decisions:**
- TITLE_MAX = 200 / BODY_MAX = 10_000 declared as module-private constants in `src/lib/validations/news.ts` — single source of truth, no inline magic numbers (passes the planner's deterministic-grep gate)
- newsPublishSchema = newsDraftSchema.refine(...) with refine path `['_publishGate']` — reserved-name slot for the form-error map; server actions surface a single global error in state.error (D-22)
- uploadNewsImage returns `{ url, path } | { error }` (not just `{ url }`) — extends uploadClientLogo's contract with the bucket-relative path so server actions persist `news_items.image_path` directly without parsing the URL
- ALLOWED_NEWS_TYPES is an `as const` tuple — the type-narrow includes() works because TypeScript narrows the literal-type check; SVG explicitly excluded (T-09-12)
- operator.* namespace added as a NEW top-level Translations key — no existing namespace touched (purely additive across nl/en/hi); Hindi values use devanagari Unicode (no transliteration)
- `Translations` interface in nl.ts is the compile-time source of truth — `tsc --noEmit` verifies en.ts and hi.ts both provide the full operator namespace shape (35 keys + nav.news)

**Phase 9 / Plan 09-03 decisions:**
- publishNewsItem re-reads the news_items row from the DB BEFORE applying newsPublishSchema — the FormData payload is NOT the gate input. Operators cannot bypass the all-3-langs requirement by crafting a FormData with all fields filled for a row whose DB columns are still partial (T-09-15). The two non-gated actions (create + update) read FormData directly because they do not enforce the 6-fields gate.
- updateNewsItem's UPDATE statement explicitly lists exactly the 6 content columns by name (no spread, no whitelist). status/published_at/withdrawn_at/created_at/created_by/image_path are reachable ONLY via the dedicated transition functions (publish/withdraw/delete + the post-upload UPDATE) — makes "this UPDATE cannot touch status" a code-review-able guarantee (T-09-16).
- readRawFromFormData reads ONLY the 6 language fields. The form sends the image as a File under name='image'; image_path is set entirely server-side via the uploadNewsImage flow (T-09-30) — a forged FormData with image_path cannot poison the DB.
- Two-step image upload: insert with image_path=null FIRST, then conditional follow-up UPDATE with the bucket-relative path returned by uploadNewsImage — the row always represents what's persisted, the upload is non-fatal (matches createClient/uploadClientLogo).
- createNewsItem redirects to /admin/news/{id}/edit (NOT /admin/news) so the operator lands on the edit page to keep filling the other languages — pages plan 09-05 must NOT add an extra redirect.
- updateNewsItem returns { error: '' } (does NOT redirect) — the form stays on the edit page for live editing.
- publishNewsItem and withdrawNewsItem are NOT useActionState-shaped — they take a single id and return { error?: string }. 09-04 will call them via `<form action={fn.bind(null, id)}>` or `useTransition`.
- getOperatorProfileId returns null deliberately for Phase 9 — news_items.created_by is nullable (D-08) and operator routes are gated by the (operator) layout. Per-operator audit attribution is a future concern.
- Status-precondition guards (publish requires status='draft', withdraw requires status='published') prevent crafted re-publish or re-withdraw POSTs from producing weird states — UI in 09-04 only renders the right button per status, but these are belt-and-suspenders.

### Pending Todos

None.

### Blockers/Concerns

No active blockers.

**Known items carried from v1.0 for future milestones:**
- CSV processing at scale (20k+ rows) relies on client-side PapaParse — monitor for edge cases
- Instantly API rate limits (500ms inter-campaign delay) may need tuning under heavier load
- Custom Access Token Hook requires manual Supabase Dashboard setup per deployment

## Session Continuity

Last session: 2026-04-29 — Plan 09-03 executed (5 server actions: createNewsItem, updateNewsItem, publishNewsItem, withdrawNewsItem, deleteNewsItem). One task commit: `426b44a`.
Stopped at: Wave 2 complete (09-03 landed). Wave 3 plan 09-04 (form/card/preview-modal components) ready to start; it can import the 5 actions directly from `@/app/(operator)/admin/news/actions` and useActionState-bind createNewsItem + updateNewsItem.bind(null, id).
Next action: Execute plan 09-04 (news-form.tsx with 3 language tabs + image input, news-card.tsx with publish/withdraw button per status, news-preview-modal.tsx with NewsContentRenderer reusable for Phase 10).

---
*Milestone switched: 2026-04-29 — v1.0 (shipped) → v1.1 News Broadcasting*
*Last updated: 2026-04-29 after plan 09-03 (server actions: create/update/publish/withdraw/delete)*
