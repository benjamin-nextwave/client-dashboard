# Roadmap: NextWave Solutions Client Dashboard Platform

## Milestones

- ✅ **v1.0 MVP** — Phases 1-8 (shipped 2026-02-15)
- ✅ **v1.1 News Broadcasting** — Phases 9-10 (shipped 2026-04-30)

## Phases

<details>
<summary>✅ v1.0 MVP (Phases 1-8) — SHIPPED 2026-02-15</summary>

- [x] Phase 1: Foundation & Multi-tenancy (3/3 plans) — completed 2026-02-15
- [x] Phase 2: Operator Admin Core (3/3 plans) — completed 2026-02-15
- [x] Phase 3: Client Dashboard Shell & Branding (2/2 plans) — completed 2026-02-15
- [x] Phase 4: Instantly.ai Integration & Campaign Stats (5/5 plans) — completed 2026-02-15
- [x] Phase 5: Inbox & Reply Functionality (4/4 plans) — completed 2026-02-15
- [x] Phase 6: CSV Import/Export & DNC Management (4/4 plans) — completed 2026-02-15
- [x] Phase 7: Contact Preview & Sent Emails (2/2 plans) — completed 2026-02-15
- [x] Phase 8: Polish & Error Monitoring (2/2 plans) — completed 2026-02-15

Full details: `.planning/milestones/v1.0-ROADMAP.md`

</details>

### v1.1 News Broadcasting (Phases 9-10)

- [x] **Phase 9: News Authoring & Schema** — Operator-side news CRUD with multilingual content + image storage and database groundwork — completed 2026-04-30
- [x] **Phase 10: Client News Delivery & Archive** — Client-side overlay-on-open, persistent dismissal, and megaphone sidebar archive — completed 2026-04-30

## Phase Details

### Phase 9: News Authoring & Schema
**Goal**: Operators can author, manage, and publish multilingual news items, with all schema and storage groundwork in place to serve them to clients
**Depends on**: Phase 1 (multi-tenancy foundation), Phase 2 (operator admin pattern)
**Requirements**: NEWS-01, NEWS-02, NEWS-03, NEWS-04, NEWS-05, NEWS-06
**Justification**: All operator-facing authoring requirements share the same admin UI surface, the same `news_items` table, and the same Supabase Storage bucket for images. Bundling them produces tight cohesion: every requirement directly contributes to "operator can broadcast a multilingual announcement." Splitting would scatter database migrations across phases. The `news_dismissals` table is also created here so Phase 10 has nothing to wait on schema-wise.
**Success Criteria** (what must be TRUE):
  1. An operator can open the operator admin panel, create a news item with an image, and fill in title + body in Dutch, English, and Hindi (devanagari) variants
  2. An operator can edit any field of any language variant of an existing news item and the change persists
  3. An operator can preview a news item in any of its three language variants before publishing
  4. An operator can publish a draft (making it visible to clients) and withdraw a published item (removing it from clients) from the admin list view
  5. The admin list view shows every news item with its status (draft / published / withdrawn) and creation/publish timestamps
**Plans**: 6 plans across 5 waves

**Wave 1** *(parallel — independent)*:
- [x] 09-01-PLAN.md — Migration: news_items + news_dismissals + news-images bucket + RLS + storage policies — completed 2026-04-29 (`1943223`)
- [x] 09-02-PLAN.md — Zod schemas (newsDraftSchema, newsPublishSchema) + uploadNewsImage helper + i18n keys (nl/en/hi) — completed 2026-04-29 (`1b2baba` + `a6d42db` + `6f70694`)

**Wave 2** *(blocked on 09-01, 09-02)*:
- [x] 09-03-PLAN.md — Server actions: create/update/publish/withdraw/delete news items — completed 2026-04-29 (`426b44a`)

**Wave 3** *(blocked on 09-02, 09-03)*:
- [x] 09-04-PLAN.md — Components: news-form (3-tab + image), news-preview-modal (Phase-10 reusable), news-card — completed 2026-04-29 (`24e7653` + `d2ac020` + `8cafddd`)

**Wave 4** *(blocked on 09-03, 09-04)*:
- [x] 09-05-PLAN.md — Routes: /admin/news (list), /new (create), /[id]/edit (edit + action panel) + Nieuws nav link — completed 2026-04-29 (`066915a` + `4f2b019` + `bd5f949` + `cddffb8`)

**Wave 5** *(blocked on Waves 1-4 — autonomous: false, manual smoke verification)*:
- [x] 09-06-PLAN.md — Migration deployed via Supabase Studio (Option B, due to pre-existing migration drift in other files), `migration repair` registered the version. End-to-end smoke verified — all NEWS-01..06 acceptance criteria pass live. Bug surfaced + fixed: `export type { Locale }` from `'use server'` file (`040a936`). — completed 2026-04-30

**Cross-cutting constraints** (truths that appear in 2+ plans):
- Server-authoritative publish gate: all 6 language fields must be non-empty before status transitions to `published` (newsPublishSchema refine + DB re-read in publishNewsItem)
- Soft-delete withdraw: status transitions to `withdrawn` + `withdrawn_at` timestamp; row remains in admin list (NEWS-04, NEWS-05)
- Multilingual content lives on the row (title_nl/en/hi, body_nl/en/hi); operator UI chrome strings live in `operator.news.*` i18n namespace (D-23, D-24)
- Image storage: `news-images` bucket, 2MB, png/jpeg/webp only; `image_path` is server-managed (never read from formData)
- Component reuse: news-preview-modal exports a presentational `NewsContentRenderer` that Phase 10 will reuse for the client overlay (D-05)

### Phase 10: Client News Delivery & Archive
**Goal**: Clients receive published news as a full-screen overlay on dashboard open, can dismiss it permanently per user, and can revisit all current news from a megaphone-button sidebar in the topbar
**Depends on**: Phase 9 (news_items + news_dismissals tables, published news data), Phase 3 (client dashboard shell + topbar)
**Requirements**: DELIVER-01, DELIVER-02, DELIVER-03, DELIVER-04, DELIVER-05, ARCH-01, ARCH-02, ARCH-03, ARCH-04
**Justification**: All client-facing delivery and archive requirements share the same data source (published news_items + per-user news_dismissals), the same client topbar surface, and the same NL/EN/Hindi rendering logic. Overlay and sidebar are two views of the same dataset; building them together avoids duplicating data-fetching code and keeps localization consistent in one phase.
**Success Criteria** (what must be TRUE):
  1. When a client opens their dashboard and there is a published news item they have not yet dismissed, a full-screen overlay appears showing the image, title, and body in the active language, dismissable only via a single localized "Ik heb het gelezen" button
  2. After a client dismisses a news item, that user never sees the same item as an overlay again — even after logout, login, or page reload
  3. A megaphone button appears in the client topbar immediately to the left of the existing "Ververs data" button
  4. Clicking the megaphone opens a sidebar listing all currently-published (non-withdrawn) news items, most-recent first, each showing title + short text preview
  5. Clicking a sidebar item displays the full news content (image + title + body) in the active language; if the operator withdraws an item, it disappears from any active overlay queue and from the sidebar within one page reload
**Plans**: 6 plans across 4 waves

**Wave 1** *(parallel — independent)*:
- [x] 10-01-PLAN.md — i18n keys: extend Translations interface + add `client.news.*` namespace to nl/en/hi — completed 2026-04-30 (`2e807fd`)
- [x] 10-02-PLAN.md — Server action: dismissNewsItem (request-scoped client; reads user_id server-side; idempotent upsert into news_dismissals) — completed 2026-04-30 (`56d9a1d`)

**Wave 2** *(blocked on Wave 1 — file-disjoint, parallel)*:
- [x] 10-03-PLAN.md — Component: NewsOverlay (queue + single-button dismiss; no Esc/backdrop close; body scroll lock; brand-color CTA) — completed 2026-04-30 (`67df8cc`)
- [x] 10-04-PLAN.md — Components: NewsMegaphoneButton + NewsSidebar (outlined icon button with unread badge; right slide-in panel with list↔detail; standard close conventions) — completed 2026-04-30 (`26b67f8` + `11763d3` + `83bd57e`)

**Wave 3** *(blocked on Wave 2)*:
- [x] 10-05-PLAN.md — Wire dashboard/page.tsx: two server-side queries (archive + dismissals), pre-localize per profiles.language, resolve image_url via getPublicUrl, render NewsMegaphoneButton left of RefreshButton + NewsOverlay as sibling — completed 2026-04-30 (`c117cbb`)

**Wave 4** *(blocked on Wave 3 — autonomous: false, manual smoke)*:
- [x] 10-06-PLAN.md — End-to-end manual verification: all 12 smoke steps pass; 3 UX issues surfaced + fixed inline (form data persist via defaultValue + key, megaphone badge removed since overlay-on-open makes it always-zero, megaphone alignment fix items-center → items-start). Bug surfaced + fixed: smoke commit (`0bdedb2`). — completed 2026-04-30

**UI hint**: yes

## Progress

| Phase | Milestone | Plans Complete | Status | Completed |
|-------|-----------|----------------|--------|-----------|
| 1. Foundation & Multi-tenancy | v1.0 | 3/3 | Complete | 2026-02-15 |
| 2. Operator Admin Core | v1.0 | 3/3 | Complete | 2026-02-15 |
| 3. Client Dashboard Shell & Branding | v1.0 | 2/2 | Complete | 2026-02-15 |
| 4. Instantly.ai Integration & Campaign Stats | v1.0 | 5/5 | Complete | 2026-02-15 |
| 5. Inbox & Reply Functionality | v1.0 | 4/4 | Complete | 2026-02-15 |
| 6. CSV Import/Export & DNC Management | v1.0 | 4/4 | Complete | 2026-02-15 |
| 7. Contact Preview & Sent Emails | v1.0 | 2/2 | Complete | 2026-02-15 |
| 8. Polish & Error Monitoring | v1.0 | 2/2 | Complete | 2026-02-15 |
| 9. News Authoring & Schema | v1.1 | 6/6 | Complete | 2026-04-30 |
| 10. Client News Delivery & Archive | v1.1 | 6/6 | Complete | 2026-04-30 |

---
*Roadmap created: 2026-02-15*
*Last updated: 2026-04-30 — Phase 10 Plan 05 (dashboard/page.tsx wiring; Wave 3 complete; only Wave 4 manual smoke remaining)*
