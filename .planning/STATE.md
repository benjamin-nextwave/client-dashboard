# Project State

## Project Reference

See: .planning/PROJECT.md (updated 2026-04-29)

**Core value:** Clients can see their campaign performance and reply to positive leads directly from their branded dashboard — keeping the entire outreach workflow in one place.

**Current focus:** v1.1 News Broadcasting — operator-broadcast multilingual announcements with overlay-on-open + sidebar archive

## Current Position

Phase: 9 — News Authoring & Schema
Plan: 1/6 complete
Status: Wave 1 partial — 09-01 migration file written and committed (DB push deferred to 09-06). Wave 1 plan 09-02 (Zod schemas + storage helper + i18n keys) is parallel-eligible and can start now.
Last activity: 2026-04-29 — 09-01 migration file written (`supabase/migrations/20260429000002_news_broadcasting.sql`)

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

### Pending Todos

None.

### Blockers/Concerns

No active blockers.

**Known items carried from v1.0 for future milestones:**
- CSV processing at scale (20k+ rows) relies on client-side PapaParse — monitor for edge cases
- Instantly API rate limits (500ms inter-campaign delay) may need tuning under heavier load
- Custom Access Token Hook requires manual Supabase Dashboard setup per deployment

## Session Continuity

Last session: 2026-04-29 — Plan 09-01 executed (news_broadcasting migration file written and committed `1943223`)
Stopped at: Wave 1 plan 09-01 complete; 09-02 (parallel sibling in Wave 1) ready to start
Next action: Execute plan 09-02 (Zod schemas + uploadNewsImage helper + i18n keys for `operator.news.*`)

---
*Milestone switched: 2026-04-29 — v1.0 (shipped) → v1.1 News Broadcasting*
*Last updated: 2026-04-29 after plan 09-01 (news_broadcasting migration)*
