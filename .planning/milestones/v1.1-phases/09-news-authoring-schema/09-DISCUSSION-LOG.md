# Phase 9: News Authoring & Schema - Discussion Log

> **Audit trail only.** Do not use as input to planning, research, or execution agents.
> Decisions are captured in CONTEXT.md — this log preserves the alternatives considered.

**Date:** 2026-04-29
**Phase:** 9-news-authoring-schema
**Areas discussed:** Authoring UI shape, Preview placement, List view layout

---

## Authoring UI shape

| Option | Description | Selected |
|--------|-------------|----------|
| Tabs in form | One edit page with NL/EN/Hindi tabs that swap title+body fields; image shared above tabs. Compact, matches mental model of "3 variants per item" | ✓ |
| Side-by-side | All 3 languages visible simultaneously in 3 columns. Good for copy-paste, uses lots of horizontal space | |
| Wizard steps | Multi-step: image+meta → NL → EN → Hindi. Structured but slower flow | |

**User's choice:** Tabs in form
**Notes:** Operator authors all 3 variants for one news item — tabs preserve the "single item with 3 variants" mental model, image is shared metadata above the language-specific fields.

---

## Preview placement

| Option | Description | Selected |
|--------|-------------|----------|
| Side panel live | Right of form, updates live per active tab — operator sees rendering in real time | |
| Preview modal | "Preview" button opens full-screen dialog with language switcher — explicit action, no clutter while typing | ✓ |
| No separate preview | Form fields ARE the preview; rely on tabs alone | |

**User's choice:** Preview modal
**Notes:** Operator wants to explicitly check what the client sees, not have a live panel competing for screen space. The modal will reuse the same rendering component that Phase 10 uses for the actual client overlay — Phase 9 builds it as a presentational component.

---

## List view layout

| Option | Description | Selected |
|--------|-------------|----------|
| Standard table | Title / Status / Created / Published / Actions — consistent with /admin clients and /admin/errors | |
| Card grid | One card per item with image thumbnail + title + status badge — visually richer | ✓ |

**User's choice:** Card grid
**Notes:** News items have visual content (image), so cards convey more useful information at a glance than a dense table. Operators will not have hundreds of news items, so density isn't the priority.

---

## Claude's Discretion

The user opted to have Claude decide these areas based on existing project patterns rather than spend interview rounds on them. All defaults are documented in CONTEXT.md `<decisions>` under "Claude's Discretion":

- **Image constraints** — bucket name `news-images`, public bucket, 2MB size limit, MIME whitelist `image/png|jpeg|webp` (no SVG). Mirrors `client-logos`.
- **Database schema details** — UUID PKs, varchar(200) titles, text bodies (max 10_000), CHECK constraint for status (not ENUM type), `created_by` FK to profiles, soft-delete via `withdrawn_at` timestamp.
- **`news_dismissals` schema** — `(user_id, news_item_id)` composite PK with CASCADE on both FKs; `dismissed_at` timestamp.
- **RLS policies** — operator full CRUD + client read-only-when-published on `news_items`; per-user own-rows on `news_dismissals` + operator read-all.
- **Server actions structure** — `actions.ts` colocated with route, exports `createNewsItem`/`updateNewsItem`/`publishNewsItem`/`withdrawNewsItem`/`uploadNewsImage`. Service-role admin client for writes.
- **Operator nav integration** — add "Nieuws" link in `operator-header.tsx`, label via `useT('operator.nav.news')`.
- **Routes & components** — `app/(operator)/admin/news/{page,new/page,[id]/edit/page,actions}.tsx/.ts` plus `components/admin/{news-form,news-preview-modal,news-card}.tsx` plus `lib/validations/news.ts`.
- **Validation** — `newsDraftSchema` (allows empty fields) + `newsPublishSchema` (refines: all 6 lang fields non-empty). Server action picks the right schema per action.
- **i18n strings** — operator-UI chrome strings under `operator.news.*` namespace in `translations/{nl,en,hi}.ts`. News content fields stay in the row, NOT in translation files.

## Deferred Ideas

No new ideas surfaced during discussion — all out-of-scope items were already captured in REQUIREMENTS.md (`Future Requirements` and `Out of Scope` sections):
- TARGET-01: per-tenant/per-client targeting (v1.2)
- TARGET-02: scheduled publish/withdraw (v1.2)
- ENGAGE-01: read/dismiss analytics (v1.2)
- ENGAGE-02: call-to-action button in news item (v1.2)
