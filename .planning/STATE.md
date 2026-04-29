# Project State

## Project Reference

See: .planning/PROJECT.md (updated 2026-04-29)

**Core value:** Clients can see their campaign performance and reply to positive leads directly from their branded dashboard — keeping the entire outreach workflow in one place.

**Current focus:** v1.1 News Broadcasting — operator-broadcast multilingual announcements with overlay-on-open + sidebar archive

## Current Position

Phase: 9 — News Authoring & Schema
Plan: 2/6 complete
Status: Wave 1 complete — 09-01 (migration file) and 09-02 (Zod schemas + uploadNewsImage helper + operator.news.* i18n keys for nl/en/hi) both landed. DB push still deferred to 09-06. Wave 2 plan 09-03 (server actions: create/update/publish/withdraw) is unblocked and can start now.
Last activity: 2026-04-29 — 09-02 written: `src/lib/validations/news.ts` (created), `src/lib/supabase/storage.ts` (uploadNewsImage + deleteNewsImage), `src/lib/i18n/translations/{nl,en,hi}.ts` (operator namespace with 35 keys per language)

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

### Pending Todos

None.

### Blockers/Concerns

No active blockers.

**Known items carried from v1.0 for future milestones:**
- CSV processing at scale (20k+ rows) relies on client-side PapaParse — monitor for edge cases
- Instantly API rate limits (500ms inter-campaign delay) may need tuning under heavier load
- Custom Access Token Hook requires manual Supabase Dashboard setup per deployment

## Session Continuity

Last session: 2026-04-29 — Plan 09-02 executed (Zod schemas + uploadNewsImage/deleteNewsImage helpers + operator.news.* i18n keys for nl/en/hi). Three task commits: `1b2baba`, `a6d42db`, `6f70694`.
Stopped at: Wave 1 complete (09-01 + 09-02 both landed). Wave 2 plan 09-03 (server actions: create/update/publish/withdraw + image upload wrapper) ready to start; it can import newsDraftSchema/newsPublishSchema from `@/lib/validations/news` and uploadNewsImage from `@/lib/supabase/storage` immediately.
Next action: Execute plan 09-03 (server actions for news_items: create/update/publish/withdraw with Zod safeParse + admin-client writes + uploadNewsImage on file submission).

---
*Milestone switched: 2026-04-29 — v1.0 (shipped) → v1.1 News Broadcasting*
*Last updated: 2026-04-29 after plan 09-02 (Zod schemas + uploadNewsImage + operator i18n namespace)*
