---
phase: 10-client-news-delivery-archive
plan: 05
subsystem: client-news-dashboard-wiring
tags: [next-app-router, server-component, supabase, rls, two-query-pattern, i18n, storage-public-url, integration]

# Dependency graph
requires:
  - phase: 10-client-news-delivery-archive
    provides: "NewsOverlay client component + NewsOverlayItem type (10-03 — `67df8cc`)"
  - phase: 10-client-news-delivery-archive
    provides: "NewsMegaphoneButton + NewsSidebar client components + NewsSidebarItem type (10-04 — `26b67f8` + `11763d3` + `83bd57e`)"
  - phase: 10-client-news-delivery-archive
    provides: "client.news.* i18n namespace consumed via useT() inside child components (10-01 — `2e807fd`)"
  - phase: 10-client-news-delivery-archive
    provides: "dismissNewsItem server action consumed by NewsOverlay (10-02 — `56d9a1d`)"
  - phase: 09-news-authoring-schema
    provides: "news_items + news_dismissals tables + news-images bucket + RLS policies (09-01 — applied via 09-06)"
provides:
  - "Server-rendered query pipeline that produces unread queue + full archive arrays from news_items + news_dismissals"
  - "Pre-localized title/body server-side (per profiles.language with NL fallback) so client components stay purely presentational"
  - "Server-resolved image_url via supabase.storage.from('news-images').getPublicUrl(image_path) — clients never see image_path (T-3 mitigation)"
  - "Header flex container with NewsMegaphoneButton immediately left of RefreshButton (ARCH-01)"
  - "NewsOverlay mounted as last child of dashboard page (DELIVER-01)"
affects: [10-06]

# Tech tracking
tech-stack:
  added: []
  patterns:
    - "Two-query pattern over subquery-string interpolation (D-17 calibration): fetch all published rows + user's dismissals separately, filter unread set in TS via Set lookup — avoids any string-interpolation hazard and keeps query plan simple"
    - "Pre-localization in server component: ternary chain on Locale ('en' | 'hi' | 'nl' fallback) with NL safety-net or-fallback — keeps overlay/sidebar purely presentational (no language prop)"
    - "Server-side image URL resolution per row via getPublicUrl — clients receive only the resolved URL string (T-3 mitigation)"
    - "Conditional Promise.all branch via ternary: dismissalsQuery is either a real query (auth'd user) or a synthetic resolved Promise with empty data — preserves Promise.all type-shape without an if/else around the destructure"
    - "archiveRows.slice().reverse() to derive oldest-first overlay queue from recent-first archive — single source of truth for the underlying ordering, transformed at usage site without mutating the original"

key-files:
  created: []
  modified:
    - src/app/(client)/dashboard/page.tsx

key-decisions:
  - "Two-query pattern (D-17) chosen over the subquery-string-interpolation alternative the planner offered — string interpolation of UUIDs into a `.not('id', 'in', `(select ...)`)` template literal is brittle and harder to reason about; two RLS-bound queries + a TS Set filter is mechanically equivalent, type-safe, and readable"
  - "Combined `import type { Locale, Translator } from '@/lib/i18n'` into a single named-imports line (the original file had two separate `import type` lines for the same module) — purely cosmetic, no functional impact, keeps the import block compact"
  - "Used the request-scoped `createClient()` exclusively — explicitly NOT `createAdminClient()` — so RLS gates SELECT on news_items (status='published') and news_dismissals (user_id = auth.uid()) act as the security backstop on every render (T-1/T-4 mitigation; reuses 10-02's calibration that the client surface uses RLS-bound clients only)"
  - "Server-side image URL resolution lives in a closure-scoped `rowToImageUrl(row)` helper inside the page function (not a top-level export) so it has natural access to the request-scoped supabase client without prop-drilling — calls `supabase.storage.from('news-images').getPublicUrl(row.image_path)` per row, returns null when image_path is null"
  - "archiveRows is the single source of truth for ordering: queried recent-first (`order('published_at', { ascending: false })` per ARCH-02), passed through to archiveItems as-is, and `.slice().reverse()` produces the oldest-first overlay queue without mutating the original — same data, two presentations"
  - "NewsOverlay mounted as the LAST child of the outer `<div>` even though its `fixed inset-0` styling means DOM position doesn't affect rendered layout — placed last so the JSX tree reads top-to-bottom in display order (header → dashboard → overlay-as-side-effect)"
  - "Defensive `published_at ?? new Date(0).toISOString()` in archiveItems mapping — published_at is non-null per RLS (only status='published' rows are returned and the publish gate sets the timestamp), but the type is `string | null` from the column definition; the epoch fallback would only fire if a published row somehow had null published_at (DB constraint violation), in which case the relative-time hook in NewsSidebar gracefully renders 'X weeks ago' rather than crashing"
  - "`getLocale` and `supabase.auth.getUser()` are awaited sequentially before the Promise.all (not bundled in) — they share the auth session/cookies under the hood; sequencing avoids any race on the same auth context, matching the order used by getClientBranding earlier in the function"

patterns-established:
  - "Pattern: When a route's data fetch needs both 'all rows' and 'user-specific subset' from related tables, a two-query + Set-filter pattern is preferable to a subquery-string interpolation (especially when RLS already restricts both queries) — the TS Set filter is O(n), reads cleanly, and avoids any string-interpolation concern"
  - "Pattern: Pre-localize content server-side in the dashboard page; pass already-resolved per-locale strings to client components — keeps the rendering layer purely presentational and avoids shipping all 3 language variants over the wire"
  - "Pattern: Resolve Supabase Storage public URLs server-side once per row in a closure helper that has natural access to the request-scoped client — clients receive the public URL string only"

requirements-completed: [DELIVER-01, DELIVER-02, DELIVER-04, DELIVER-05, ARCH-01, ARCH-02, ARCH-03]

# Metrics
duration: ~2min
completed: 2026-04-30
---

# Phase 10 Plan 05: Dashboard Page Wiring Summary

**Wired the three Wave-2 client components into `src/app/(client)/dashboard/page.tsx` via two server-side Supabase queries (full archive + current user's dismissals) with TS-side unread-set computation, server-resolved image URLs, and per-locale title/body pre-localization — `<NewsMegaphoneButton>` now sits immediately left of `<RefreshButton>` in the header flex, and `<NewsOverlay>` is mounted as a sibling so it overlays the entire page when unread items exist.**

## Performance

- **Duration:** ~2 min
- **Started:** 2026-04-30T17:48:16Z
- **Completed:** 2026-04-30T17:50:09Z
- **Tasks:** 1 / 1 completed
- **Files modified:** 1 (`src/app/(client)/dashboard/page.tsx`, +134 / −3 lines)

## Accomplishments

- Modified `src/app/(client)/dashboard/page.tsx` with two new server-side queries (archive + dismissals), pre-localization helper, image URL resolution closure, and three new JSX renderings — the existing OverzichtDashboard / getOverviewStats / getDailyStats / date-range / dynamic = 'force-dynamic' / metadata logic remains entirely untouched
- Added imports: `getLocale`, `createClient`, `Locale` (type), `NewsOverlay` + `NewsOverlayItem` (value + type), `NewsMegaphoneButton`, `NewsSidebarItem` (type-only — sidebar is rendered transitively via the megaphone button)
- Added `NewsRow` interface (private to the file) modeling the 9 columns selected from `news_items`
- Added `localizeRow(row, locale)` pure helper — switches per locale with NL or-fallback (Phase 9's publish gate guarantees the fallback rarely fires; defensive only)
- Added inline `rowToImageUrl(row)` closure in the page function — resolves `image_path` to the resolved public URL per row via `supabase.storage.from('news-images').getPublicUrl`; returns null when image_path is null
- Built `archiveItems: NewsSidebarItem[]` from archiveRows (recent-first per ARCH-02) — pre-localized title/body, resolved image_url, defensive epoch fallback for published_at
- Built `unreadItems: NewsOverlayItem[]` from archiveRows filtered against dismissalIds, then `.slice().reverse()` to flip recent-first → oldest-first per DELIVER-01 / D-17 acceptance
- Wrapped the existing bare `<RefreshButton />` in a `flex items-center gap-3` container with `<NewsMegaphoneButton unreadCount={unreadItems.length} archiveItems={archiveItems} />` immediately to its left (ARCH-01)
- Added `<NewsOverlay items={unreadItems} />` as the last child of the outer page `<div>` — the overlay self-mounts as `fixed inset-0` so DOM position doesn't affect layout (DELIVER-01)
- TypeScript build remains green: `npx tsc --noEmit` passes silently project-wide

## Task Commits

1. **Task 1: Wire dashboard/page.tsx with news queries + components** — `c117cbb` (feat)

**Plan metadata commit:** _to be added after this SUMMARY is written_

## Files Modified

- `src/app/(client)/dashboard/page.tsx` — From 84 lines → 215 lines. Added 7 imports (3 new, 4 mixed value+type or type-only), 1 private interface (NewsRow), 1 module-level helper (localizeRow), inline page-scoped helper (rowToImageUrl), 2 server queries assembled into a Promise.all, 2 derived arrays (archiveItems, unreadItems), and 3 new JSX renderings (megaphone button, header flex wrapper, overlay sibling). All existing logic — getDateRange, getOverviewStats(client.id, …), getDailyStats(client.id, …), OverzichtDashboard rendering, dynamic = 'force-dynamic', metadata export, getClientBranding redirect — preserved verbatim.

## Decisions Made

- **Combined type imports** — The original file had `import { getTranslator } from '@/lib/i18n/server'` and `import type { Translator } from '@/lib/i18n'` on separate lines. The plan template added `import type { Locale } from '@/lib/i18n'` and `import type { Translator } from '@/lib/i18n'` as two separate type-imports for the same module. I combined them into a single `import type { Locale, Translator } from '@/lib/i18n'` line for cleanliness. No functional impact; matches the project's existing import-grouping style.
- **Two-query pattern over subquery interpolation** — D-17 explicitly allowed either pattern; chose the two-query approach because it avoids template-string UUID interpolation and the TS Set filter is type-safe and O(n). Documented with an inline block comment so future contributors know the choice was deliberate.
- **Closure-scoped `rowToImageUrl`** — Lives inside the page function rather than as a top-level helper because it needs access to the request-scoped `supabase` instance. Kept it tight and local; both archiveItems and unreadItems mappings call it.
- **Defensive `published_at ?? new Date(0).toISOString()`** — Even though Phase 9's publish gate guarantees published rows have non-null published_at, the column type is nullable. The epoch fallback keeps the type-narrowing simple at the consumer (`NewsSidebarItem.published_at: string`) without forcing a non-null assertion.
- **Sequential await for `getLocale()` and `supabase.auth.getUser()` BEFORE the Promise.all** — Both touch the auth session/cookies under the hood; running them serially before the two news queries (which are independent of auth state in the same render — RLS uses the auth context already established) keeps the auth read-flow deterministic. The two news queries DO run in parallel via Promise.all.

## Deviations from Plan

None — the plan executed exactly as written. The only style adjustment was combining two duplicate `import type { ... } from '@/lib/i18n'` lines into one, which preserves identical behavior and is purely cosmetic.

**Total deviations:** 0
**Impact on plan:** None — every executable assertion in the plan body (two queries, two-query pattern not subquery, pre-localization, image URL resolution server-side, megaphone-left-of-refresh placement, overlay-as-last-child, all existing logic preserved) matches the planner's intent strictly.

## Issues Encountered

None.

## User Setup Required

None — this plan modifies only `src/app/(client)/dashboard/page.tsx`. No new dependencies, no migration, no environment variables. The next plan (10-06) is the manual smoke verification across operator + client roles.

## Threat Model Compliance

- **T-10-16 (≡ T-3) — Open-redirect / SSRF via image_url** — mitigated. `image_url` is built server-side via `supabase.storage.from('news-images').getPublicUrl(image_path)`. The client never receives `image_path`; the public URL is constrained to the news-images bucket (Supabase Storage CDN host). Verified by grep gate (`from('news-images').getPublicUrl` count = 1).
- **T-10-17 (≡ T-4) — Information leak (withdrawn / dismissed items leak to client)** — mitigated. Both queries hit `news_items` with explicit `.eq('status', 'published')` filter; RLS adds the same filter as a backstop for clients. The overlay queue further excludes ids in the user's dismissal set (computed via TS Set lookup). Verified by grep gate (`.eq('status', 'published')` count = 1; `from('news_dismissals')` count = 1).
- **T-10-18 — Privilege escalation via admin client in client-facing query** — mitigated. The page uses `createClient()` (request-scoped, RLS-bound), NOT `createAdminClient()`. Verified by grep gate (`createAdminClient|@/lib/supabase/admin` count = 0).
- **T-10-19 — Tampering via JWT to read another tenant's news** — accepted. News is global broadcast (no client_id on news_items); RLS allows any authenticated user to read status='published' regardless of tenant. By design (Phase 9 — global broadcast, deferred to v1.2 TARGET-01).
- **T-10-20 — DoS via large news_items table** — accepted. News volume is small (a handful per month — D-20). Both queries use the existing `idx_news_items_published_at` index from Phase 9 migration. No caching layer needed.
- **T-10-21 (≡ T-2) — XSS via stored title/body** — mitigated transitively. Title/body are localized to plain strings server-side and rendered by NewsContentRenderer (Phase 9) as React text nodes. No HTML is ever evaluated.

## Threat Flags

None — this plan introduces no new network endpoints, no new auth paths, no new file-access patterns, and no schema changes. The image URL resolution uses an existing Supabase Storage bucket (`news-images`) that was provisioned in Phase 9. All threats are inherited from the threat models of 10-02 (action), 10-03 (overlay), 10-04 (sidebar/megaphone), and Phase 9 (storage + RLS).

## Verification

All 17 acceptance grep gates from the plan pass strictly:

| Gate | Expected | Actual |
|------|----------|--------|
| `NewsOverlay` count | ≥3 | 3 (import value + import type + JSX) |
| `NewsMegaphoneButton` count | ≥2 | 2 (import + JSX) |
| `NewsSidebarItem` count | ≥2 | 2 (type import + helper return type) |
| `from '@/lib/supabase/server'` count | 1 | 1 |
| `createAdminClient\|@/lib/supabase/admin` count (T-1/T-4 RLS) | 0 | 0 |
| `from('news_items')` count | ≥1 | 1 |
| `from('news_dismissals')` count | ≥1 | 1 |
| `.eq('status', 'published')` count (DELIVER-05) | ≥1 | 1 |
| `select news_item_id from\|.not('id', 'in'` count (D-17 negative) | 0 | 0 |
| `.reverse()` count (DELIVER-01 oldest-first) | ≥1 | 1 |
| `order('published_at', { ascending: false })` count (ARCH-02) | 1 | 1 |
| `from('news-images').getPublicUrl` count (T-3) | ≥1 | 1 |
| `localizeRow\|getLocale` count (D-18) | ≥2 | 5 |
| `<NewsOverlay` count | 1 | 1 |
| `getOverviewStats(client.id` count (existing logic preserved) | 1 | 1 |
| `getDailyStats(client.id` count (existing logic preserved) | 1 | 1 |
| `OverzichtDashboard` count (existing logic preserved) | ≥2 | 2 |
| `force-dynamic` count (existing logic preserved) | 1 | 1 |
| `NewsMegaphoneButton` line BEFORE `<RefreshButton` line in JSX (ARCH-01) | yes | yes (megaphone L196 → refresh L200) |
| `npx tsc --noEmit` | passes | passes |

## Self-Check: PASSED

- File `src/app/(client)/dashboard/page.tsx` exists and contains the new wiring ✓
- Commit `c117cbb` exists in `git log --oneline --all` ✓
- All 19+ grep acceptance gates pass strictly (see Verification table above) ✓
- `npx tsc --noEmit` passes project-wide silently ✓
- Modifies only `src/app/(client)/dashboard/page.tsx` — no other source files touched ✓

## What Wave 4 (10-06) Can Now Do

Plan 10-06 (manual smoke verification) can now exercise the full feature against the live DB across two roles:

**Operator role (existing Phase 9 surface):**
- Visit `/admin/news`, create + publish a news item with NL/EN/HI variants
- Withdraw a previously-published item

**Client role (the new Phase 10 surface):**
- Visit `/dashboard` with a published, undismissed news item — overlay should appear with the user-locale title/body/image, dismissable only via the brand-color "Ik heb het gelezen" button
- Click the megaphone button (immediately left of "Ververs data") — sidebar slides in from the right with all currently-published items, recent-first, each showing title + 120-char preview + relative date
- Click a sidebar item — same panel transitions to detail view with full image + title + body (NewsContentRenderer); "Terug naar overzicht" returns to the list
- Reload after dismissing an overlay item — that item should NOT reappear in the overlay (still appears in the sidebar archive)
- Reload after operator withdraws an item — that item should be GONE from both overlay queue and sidebar
- Verify tri-locale: with `profiles.language='en'` the overlay renders English; `'hi'` renders Hindi devanagari; null falls back to Dutch
- Verify RLS sanity: a logged-in client cannot SELECT another user's dismissal rows (RLS check); the megaphone badge unreadCount is per-user

## Next Plan

**10-06** — End-to-end manual smoke verification (autonomous: false). Closes out Phase 10 and milestone v1.1.
