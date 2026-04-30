---
phase: 09-news-authoring-schema
plan: 05
subsystem: routes
tags: [next, app-router, server-component, client-component, news, multilingual, operator-admin]

# Dependency graph
requires:
  - phase: 09-news-authoring-schema
    provides: src/app/(operator)/admin/news/actions.ts (createNewsItem + updateNewsItem + publishNewsItem + withdrawNewsItem + deleteNewsItem) — landed in 09-03
  - phase: 09-news-authoring-schema
    provides: src/components/admin/news-form.tsx (NewsForm) + src/components/admin/news-card.tsx (NewsCard, NewsCardItem) — landed in 09-04
  - phase: 09-news-authoring-schema
    provides: src/lib/i18n/translations/{nl,en,hi}.ts (operator.news.* + operator.nav.news) — landed in 09-02
  - phase: 02-operator-admin-core
    provides: src/lib/supabase/admin.ts (createAdminClient) + src/app/(operator)/admin/clients/{new,[clientId]/edit}/page.tsx (canonical analogs)
  - phase: 02-operator-admin-core
    provides: src/app/(operator)/_components/operator-header.tsx (NAV array shape and active-state matcher)
provides:
  - /admin/news (list page) — server-rendered card grid of all news_items, force-dynamic, builds image URLs server-side via getPublicUrl
  - /admin/news/new (create page) — server component rendering <NewsForm action={createNewsItem}/>; createNewsItem redirects to the edit page on success
  - /admin/news/[id]/edit (edit page) — server component fetches the row, passes it to NewsForm with bound updateNewsItem, plus a status-aware NewsItemActionPanel (Publish/Withdraw/Delete) with router.refresh / router.push behaviors
  - NewsListChrome — client component owning the page header, create CTA, and empty-state for the list page (D-23: chrome strings live in i18n)
  - NewNewsHeader / EditNewsHeader — client components owning the new/edit page hero blocks
  - NewsItemActionPanel — client component wrapping publishNewsItem / withdrawNewsItem / deleteNewsItem via useTransition + useRouter
  - Localized "Nieuws" entry in the operator header NAV (D-19)
affects: [phase-10-news-delivery]

# Tech tracking
tech-stack:
  added: []
  patterns:
    - "Server-component list pages with chrome carved into a client child: the server page does the data fetch (createAdminClient + getPublicUrl) and renders the cards; the client child owns the i18n-localized chrome (header + create CTA + empty state). Lets a single page mix server-side data with client-side useT()."
    - "Empty-state lives inside the chrome client component (not as a hardcoded server-component EmptyState): renders conditionally on itemCount===0 inside NewsListChrome so it can use the same translator. Keeps the i18n surface in one place per D-23."
    - "Co-located page-header chrome: NewNewsHeader and EditNewsHeader share src/app/(operator)/admin/news/_components/news-page-headers.tsx — single import surface, two named exports, both client components using useT()."
    - "Status-aware action panel via useTransition: id-keyed server actions (publishNewsItem/withdrawNewsItem/deleteNewsItem from 09-03) are called via startTransition; success path uses router.refresh() (publish/withdraw, so the server-rendered status badge updates) or router.push('/admin/news') (delete, so the operator returns to the list)."
    - "Localized nav entry in a previously-hardcoded NAV: moved the NAV array from module scope into the OperatorHeader function so the news entry can use t('operator.nav.news') while existing entries stay hardcoded Dutch (D-19: only the new entry is localized; existing labels are out-of-scope to refactor)."

key-files:
  created:
    - src/app/(operator)/admin/news/page.tsx
    - src/app/(operator)/admin/news/new/page.tsx
    - src/app/(operator)/admin/news/[id]/edit/page.tsx
    - src/app/(operator)/admin/news/_components/news-list-chrome.tsx
    - src/app/(operator)/admin/news/_components/news-page-headers.tsx
    - src/app/(operator)/admin/news/_components/news-item-action-panel.tsx
  modified:
    - src/app/(operator)/_components/operator-header.tsx

key-decisions:
  - "Empty-state owned by NewsListChrome (not a hardcoded server-component EmptyState): the server page renders the cards grid only when itemCount > 0 and delegates the empty-state UI to the chrome client component. NewsListChrome reads operator.news.listEmpty + operator.news.createButton from i18n, so the empty state is consistent with the rest of the chrome (D-23)."
  - "image_path is NOT in the edit page's NewsForm defaultValues — passing it would mismatch the NewsDraftValues shape (the form's RHF state owns only the 6 lang fields). The existing image is shown via the form's currentImageUrl prop instead. Plan body listed image_path in defaults; that line was dropped because it would have been a TypeScript compile error against the form's actual props (T-09-30: image_path is server-managed, not part of form state)."
  - "useT() invoked as a function t('operator.news.<key>'), not as property access t.operator.news.<key>: the project's actual Translator type is a string-key function, and 09-04 already deviated to function-call form. The plan's skeleton showed property access; this is a calibration to the real API (matching 09-04's deviation #1 for consistency across the news subsystem)."
  - "Status label in EditNewsHeader is computed server-side as a stable Dutch literal (Concept/Gepubliceerd/Ingetrokken) and passed in as a prop. The header is a client component (uses useT for the rest of the chrome) but the label itself is not in operator.news.* yet — this is a v1.1 corner case label (3 internal operators), comparable to the (zonder titel) literal in NewsCard (09-04 deviation)."
  - "NAV array moved INSIDE OperatorHeader function so the news entry can call t() — existing labels stay hardcoded Dutch (out of scope to refactor in Phase 9). Verified that no external consumer imports the NAV symbol from operator-header.tsx; the only import is the OperatorHeader component itself in (operator)/layout.tsx."
  - "News nav entry positioned between Overzicht and Fouten (per D-19 'between /admin and /admin/errors, or an order that makes sense'). Groups content/announcements before operational tabs (Fouten/Feedback/Bezwaren/Mailen). Match predicate uses startsWith('/admin/news') so subroutes (/new, /[id]/edit) light up active state."
  - "Action panel shows Delete unconditionally (drafts/published/withdrawn) with a confirm() prompt as the safety gate. Phase 9 SPEC does not forbid deleting published items, and operator flexibility outweighs the marginal safety risk for 3 internal operators."
  - "router.refresh() (not full reload) after publish/withdraw success: re-runs the server component data fetch so the status badge in EditNewsHeader updates without losing scroll position. After delete success, router.push('/admin/news') sends the operator back to the list (the row is gone, no useful state on the edit page)."

patterns-established:
  - "Server-page + client-chrome split: when a Next.js server component needs both data fetching AND chrome that uses useT(), carve the chrome into a small client component child and keep the server component focused on the fetch. Empty-states belong with the chrome (not duplicated server-side) so they share the same translator."
  - "Co-located page-header components: when an operator section has multiple page variants (new + edit) that share visual vocabulary but vary content, group their headers in a single file as named exports. Single import surface, easier to keep visually consistent."
  - "Localized + hardcoded NAV mixing: when a NAV array transitions from fully-hardcoded to partially-localized, move it inside the component function (so t() is in scope), localize only the new entry, leave the old entries hardcoded. Avoids a phase-scope-creep refactor that would touch every operator label without changing behavior."

requirements-completed: [NEWS-01, NEWS-02, NEWS-03, NEWS-04, NEWS-05]

# Metrics
duration: 4m43s
completed: 2026-04-29
---

# Phase 9 Plan 5: News Route Pages + Operator Nav Integration Summary

**Three Next.js route pages (`/admin/news` list, `/admin/news/new` create, `/admin/news/[id]/edit` edit) plus three small client-component chrome files (NewsListChrome, NewNewsHeader/EditNewsHeader, NewsItemActionPanel) wire 09-03 (server actions) and 09-04 (NewsForm/NewsCard) into a complete operator authoring flow. Operator header gets a localized "Nieuws" nav entry. End-to-end build compiles; live verification waits on 09-06 (DB push).**

## Performance

- **Duration:** 4m43s
- **Started:** 2026-04-29T21:02:32Z
- **Completed:** 2026-04-29T21:07:15Z
- **Tasks:** 4 (all auto-mode, no checkpoints)
- **Files created:** 6
- **Files modified:** 1

## Accomplishments

- **`/admin/news` list page (Task 1):** Server component (`force-dynamic`) fetches all `news_items` via `createAdminClient`, ordered by `created_at desc`. Builds public image URLs server-side via `supabase.storage.from('news-images').getPublicUrl(image_path)` (T-09-26: image URLs are server-controlled, never user-supplied). Renders a 1/2/3-column responsive `NewsCard` grid. Empty state lives in `NewsListChrome` (D-23) with `operator.news.listEmpty` + `operator.news.createButton` localized strings.
- **`NewsListChrome` (Task 1):** Client component owning the page header (item-count badge, page title, description, create CTA) and the empty-state UI. All chrome strings come from `useT()` — no hardcoded Dutch in the list page or chrome.
- **`/admin/news/new` create page (Task 2):** Server component renders `<NewsForm action={createNewsItem}/>` — `createNewsItem` (09-03) redirects to `/admin/news/{id}/edit` on success per its existing contract. No extra redirect added at the page level.
- **`NewNewsHeader` + `EditNewsHeader` (Tasks 2/3):** Co-located in `news-page-headers.tsx`. Both client components using `useT()`. `EditNewsHeader` accepts a `statusLabel` prop computed server-side (Concept/Gepubliceerd/Ingetrokken).
- **`/admin/news/[id]/edit` edit page (Task 3):** Server component fetches the row by id (selecting all 12 columns including `image_path`), builds `currentImageUrl` via `getPublicUrl`, binds `updateNewsItem(rowId)` for the form action. Passes all 6 language fields as `defaultValues`. `notFound()` on missing rows.
- **`NewsItemActionPanel` (Task 3):** Client component wrapping `publishNewsItem`/`withdrawNewsItem`/`deleteNewsItem` via `useTransition` + `useRouter`. Visibility per D-06: Publish only on drafts, Withdraw only on published, Delete always (with confirm prompt). On publish/withdraw success → `router.refresh()` (server component re-runs, status badge updates without scroll loss). On delete success → `router.push('/admin/news')`.
- **Operator header (Task 4):** Moved `NAV` from module scope into the `OperatorHeader` function so the news entry can use `t('operator.nav.news')`. Inserted between Overzicht and Fouten. `match` predicate uses `p.startsWith('/admin/news')` so all subroutes light up active state. All other entries (Klanten, Overzicht, Fouten, Feedback, Bezwaren, Mailen) unchanged.

## Task Commits

1. **Task 1: news list page + NewsListChrome** — `066915a` (feat)
2. **Task 2: news create page + page-headers** — `4f2b019` (feat)
3. **Task 3: news edit page + action panel** — `bd5f949` (feat)
4. **Task 4: operator-header Nieuws nav link** — `cddffb8` (feat)

## Files Created/Modified

- `src/app/(operator)/admin/news/page.tsx` (created) — 58 lines. Server component, `force-dynamic`. Imports `createAdminClient`, `NewsCard`/`NewsCardItem`, `NewsListChrome`. No `'use client'`.
- `src/app/(operator)/admin/news/new/page.tsx` (created) — 22 lines. Server component. Imports `NewsForm`, `createNewsItem`, `NewNewsHeader`. Hardcoded "Terug naar overzicht" back-link (matches `clients/new/page.tsx` pattern).
- `src/app/(operator)/admin/news/[id]/edit/page.tsx` (created) — 88 lines. Server component, `force-dynamic`. Imports `createAdminClient`, `notFound`, `NewsForm`, `updateNewsItem`, `EditNewsHeader`, `NewsItemActionPanel`.
- `src/app/(operator)/admin/news/_components/news-list-chrome.tsx` (created) — 56 lines. `'use client'`, exports `NewsListChrome`. Uses `useT()` for 4 i18n keys (pageTitle, pageDescription, createButton, listEmpty).
- `src/app/(operator)/admin/news/_components/news-page-headers.tsx` (created) — 41 lines. `'use client'`, exports `NewNewsHeader` + `EditNewsHeader`. Uses `useT()` for 3 i18n keys (createButton ×2 + sectionContentDescription + pageTitle).
- `src/app/(operator)/admin/news/_components/news-item-action-panel.tsx` (created) — 105 lines. `'use client'`, exports `NewsItemActionPanel`. Imports `publishNewsItem`/`withdrawNewsItem`/`deleteNewsItem`, uses `useTransition` + `useRouter`.
- `src/app/(operator)/_components/operator-header.tsx` (modified) — +18 / -9 lines. Added `useT` import; moved `NAV` array inside `OperatorHeader` function; inserted news entry between Overzicht and Fouten.

## Decisions Made

All decisions in this plan came from CONTEXT.md (D-06, D-19, D-23) and the planner's own action body. The implementation matches the action body essentially verbatim, with two notable concrete choices made during execution:

1. **`useT()` is called as a function `t('operator.news.<key>')`, not as a property access `t.operator.news.<key>`** — the planner's skeleton showed property access (`t.operator.news.pageTitle`), but the actual `Translator` type is a string-key function. All existing call sites in the codebase use the function-call form, including 09-04's components (which deviated for the same reason in deviation #1 of 09-04). Switched to function-call form for consistency. Caught at compile time during typing the chrome components — TypeScript narrows `'operator.news.pageTitle'` to `TranslationKey`, proving the string is valid. (Out-of-scope of CLAUDE.md / threat model — purely a planner-skeleton calibration.)

2. **`image_path` removed from edit-page `defaultValues`** — the plan body lists `image_path: row.image_path ?? ''` in `defaultValues`, but `NewsDraftValues` (the type the form accepts) only declares the 6 language fields. Adding `image_path` would be a TypeScript compile error against the form's actual props. The existing image is shown via `currentImageUrl` (built from `getPublicUrl(image_path)`) which is the form's correct contract for "show this image as the current upload". Per T-09-30, `image_path` is server-managed and is not part of form state. This is a Rule 3 (blocking issue) auto-fix applied silently — the alternative would have been a build-breaking TypeScript error.

## Deviations from Plan

### Rule 3 (blocking issue) — silent fix

**1. [Rule 3 - Blocking] `image_path` removed from edit page's `NewsForm` defaultValues**

- **Found during:** Task 3 (edit page authoring)
- **Issue:** Plan body's `defaultValues={{ ... image_path: row.image_path ?? '' }}` would not compile — `NewsDraftValues` (the form's RHF schema type) declares only the 6 language fields. The form receives the existing image via the separate `currentImageUrl` prop, which is the explicit contract (T-09-30: `image_path` is server-managed, not part of form state).
- **Fix:** Dropped the `image_path` key from `defaultValues`. The existing image still shows in the form's image preview because `currentImageUrl` is passed (built via `getPublicUrl(row.image_path)`). No behavioral difference from the plan's intended outcome — the operator still sees the current image, the file input still allows replacing it, and `updateNewsItem` still gets the image as a `File` under `name="image"` if replaced.
- **Files modified:** `src/app/(operator)/admin/news/[id]/edit/page.tsx` (1 line dropped from the plan body)
- **Verification:** `npx tsc --noEmit` passes; the form's existing 09-04 contract (read 6 lang fields from RHF state, read image as a `File` from `formData.get('image')`) is preserved.
- **Committed in:** Task 3's commit (`bd5f949`).

### Verification-only (no code impact)

**2. [Verification-only] `useT` count is 2, not 1** — same shape as 09-04's deviation #2 ("useActionState count is 2 not 1 because of the import line"). Acceptance gate text reads "useT count returns at least 2", and the actual count IS 2 (1 import + 1 call), so the gate passes. Documented for traceability.

**3. [Verification-only] `/admin/news` count in operator-header is 3, not 2** — the gate requires "at least 2" (href + match) and the actual count is 3 because of an inline comment line that mentions `/admin/news` while explaining the match predicate. Gate passes with margin; comment retained because it documents the intent of the predicate for future reviewers.

**4. [Verification-only] `router.refresh()` count is 3, not 2** — the gate requires "at least 2", actual is 3 because `grep -c` matches a comment line mentioning `router.refresh()` in the action panel header docstring. The two actual call sites are in `onPublish` and `onWithdraw`. Gate passes.

---

**Total deviations:** 4 documented (1 silent Rule 3 auto-fix + 3 verification-only — no functional/security/correctness impact)
**Impact on plan:** Zero on shipped artifacts. All 4 tasks committed; all acceptance gates pass; TypeScript compiles cleanly; the operator authoring flow is wired end-to-end.

## Issues Encountered

- Git printed LF→CRLF line-ending warnings on each staged source file (Windows working tree warning, not an error). All 4 commits succeeded.
- Plan body listed `image_path` in the edit page's `defaultValues` — would have been a TypeScript compile error against `NewsDraftValues` (Deviation #1). Caught and corrected silently as a Rule 3 blocking-issue fix.
- No other issues. `npx tsc --noEmit` passed first time on each task.

## Threat Model Coverage

All 4 threats from the plan's `<threat_model>` (T-09-23, T-09-24, T-09-25, T-09-26) are addressed:

| Threat ID | Mitigation present | Verification |
|-----------|--------------------|--------------|
| T-09-23 (Information Disclosure: list page exposes drafts/withdrawn to anyone) | Route lives under `(operator)` route group, which has the project-wide auth middleware. No new auth surface added in Phase 9. | The new pages are inside `src/app/(operator)/admin/news/` — same route-group layout that already gates `clients`, `errors`, `feedback`, `bezwaren`, `mail-client`. |
| T-09-24 (Tampering: direct hit to /edit by unauth user) | Same `(operator)` layout gate. The edit page itself does no further authz check — by design, consistent with `clients/[clientId]/edit/page.tsx`. | Code inspection: no `redirect('/login')` or `auth.getUser()` in the edit page. Layout-level enforcement is the contract (T-09-14, established in 09-03). |
| T-09-25 (XSS via title rendered in NewsCard) | NewsCard (09-04) renders `{displayTitle}` as a React text node — auto-escaped. No `dangerouslySetInnerHTML` anywhere in the news subsystem. | Verified in 09-04; this plan only consumes `NewsCard`, no rendering changes. |
| T-09-26 (XSS via image_url) | `image_url` is built server-side via `supabase.storage.getPublicUrl(image_path)` where `image_path` is operator-controlled (not user-supplied). The bucket is `news-images` (only operators write to it per T-09-04). React renders the URL as an attribute value (no script execution). | List page (this plan) builds image URLs via `supabase.storage.from('news-images').getPublicUrl(row.image_path)`. Edit page does the same. No client-side `image_url` parsing. |

No new threat surface introduced beyond the registered set.

## Threat Flags

None. All security-relevant additions are inside the threat-model registered surface:
- New routes live under the existing `(operator)` route-group auth gate.
- Image URLs are built server-side via `getPublicUrl` (server-controlled, not user-supplied).
- Action panel calls existing 09-03 server actions which carry their own status-precondition guards and server-authoritative publish gate.
- No new auth paths, no new schema (DB schema lives in 09-01, helpers in 09-02), no new endpoints.

## Known Stubs

None. All shipped pages and components are wired:

- The list page reads `news_items` via the live admin client (real query against the migration text from 09-01, which becomes live after 09-06).
- The new page renders the real `NewsForm` bound to the real `createNewsItem` server action.
- The edit page renders the real `NewsForm` with real `defaultValues` from the row, real `currentImageUrl` from `getPublicUrl`, and a real bound `updateNewsItem`.
- The action panel calls real server actions (`publishNewsItem`/`withdrawNewsItem`/`deleteNewsItem` from 09-03).
- The operator-header NAV entry uses real i18n keys (`operator.nav.news` from 09-02).

The "Concept" / "Gepubliceerd" / "Ingetrokken" status-label literals in the edit page are NOT stubs — they are inline data-fallback labels (matching the "(zonder titel)" literal pattern from 09-04, which was also accepted as a v1.1 quality-bar label for 3 internal operators). These labels are stable Dutch corner-case strings; promoting them to the i18n namespace is a v1.2 polish task.

## Next Phase Readiness

- **09-06 (BLOCKING DB push)** is the FINAL plan in Phase 9. After it runs, the entire flow becomes live:
  1. Visit `/admin/news` → empty list with create CTA (renders the empty state from `NewsListChrome`).
  2. Click "Nieuw nieuwsbericht" (`operator.news.createButton`) → `/admin/news/new` form.
  3. Fill NL fields, click Save → `createNewsItem` inserts a draft row, redirects to `/admin/news/{id}/edit`.
  4. Edit page renders `NewsForm` with NL pre-populated, EditNewsHeader shows "Concept" status.
  5. Fill EN + Hindi tabs, click Save → `updateNewsItem` patches the 6 lang fields.
  6. Click Publish in the action panel → `publishNewsItem` re-reads the row, validates all 6 fields filled, transitions to `published`, `router.refresh()` updates the status badge.
  7. Click Withdraw → `withdrawNewsItem` transitions to `withdrawn`, `router.refresh()` updates the badge.
  8. Click Delete (any status) → confirm prompt, then `deleteNewsItem` hard-deletes + best-effort image cleanup, `router.push('/admin/news')`.
- **Phase 10 client delivery** is unaffected by this plan — it will `import { NewsContentRenderer } from '@/components/admin/news-preview-modal'` (09-04 export) and consume the live `news_items` schema (09-01/09-06).
- No blockers. Wave 5 plan 09-06 is the only remaining Phase 9 work; it is a 1-task manual plan (`supabase db push`) that lands the migration from 09-01.

## Self-Check: PASSED

Verified post-write:

- Files created (all 6 found):
  - FOUND `src/app/(operator)/admin/news/page.tsx` (58 lines)
  - FOUND `src/app/(operator)/admin/news/new/page.tsx` (22 lines)
  - FOUND `src/app/(operator)/admin/news/[id]/edit/page.tsx` (88 lines)
  - FOUND `src/app/(operator)/admin/news/_components/news-list-chrome.tsx` (56 lines)
  - FOUND `src/app/(operator)/admin/news/_components/news-page-headers.tsx` (41 lines)
  - FOUND `src/app/(operator)/admin/news/_components/news-item-action-panel.tsx` (105 lines)
- File modified: `src/app/(operator)/_components/operator-header.tsx` (+18/-9 lines)
- Commits exist:
  - FOUND `066915a` (`feat(09-05): add news list page + NewsListChrome client component`)
  - FOUND `4f2b019` (`feat(09-05): add news create page + NewNewsHeader/EditNewsHeader`)
  - FOUND `bd5f949` (`feat(09-05): add news edit page + status-aware action panel`)
  - FOUND `cddffb8` (`feat(09-05): add localized Nieuws nav link to operator header`)
- Master gate `npx tsc --noEmit` passes (clean — no output)
- All grep gates from acceptance_criteria pass (with deviations #2/#3/#4 documented above for verification-only count differences):
  - Task 1: function EmptyState in page.tsx = 0 ✓; operator.news.listEmpty in chrome = 1 ✓; force-dynamic in page = 1 ✓; from('news_items') = 1 ✓; ascending: false = 1 ✓; getPublicUrl(row.image_path) = 1 ✓; NewsCard import = 1 ✓; chrome useT count = 3 (≥2 import + ≥1 call) ✓; no hardcoded Dutch in chrome strings ✓
  - Task 2: NewsForm import = 1 ✓; createNewsItem import = 1 ✓; `<NewsForm action={createNewsItem}` = 1 ✓; both header exports present (NewNewsHeader + EditNewsHeader) ✓; `'use client'` on line 1 ✓
  - Task 3: edit page NOT a client component (line 1 = `import Link from 'next/link'`) ✓; `updateNewsItem.bind(null, row.id)` = 1 ✓; defaultValues field count = 6 ✓; `getPublicUrl(row.image_path)` = 1 ✓; action-panel imports all 3 actions = 6 (3 named imports × 2 = imports + uses) ✓; useTransition = 3 (1 import + 1 destructure + comment) ✓; useRouter = 2 ✓; router.refresh() = 3 (≥2 required, see deviation #4) ✓; `status === 'draft'` = 1 ✓; `status === 'published'` = 1 ✓
  - Task 4: useT count = 2 ✓; /admin/news count = 3 (≥2 required, see deviation #3) ✓; `t('operator.nav.news')` = 1 ✓; in-component `const NAV = [` at line 21 ✓; no top-level `^const NAV = [` ✓; all 6 existing labels (Klanten/Overzicht/Fouten/Feedback/Bezwaren/Mailen) unchanged ✓; external NAV consumers = 0 ✓
- No file deletions in any of the 4 task commits (each `git diff --diff-filter=D --name-only HEAD~1 HEAD` empty)
- No untracked files left behind (`git status --short | grep '^??'` empty after each commit)
- Stub scan: 0 placeholders / TODOs / hardcoded mock data flowing to UI

---
*Phase: 09-news-authoring-schema*
*Completed: 2026-04-29*
