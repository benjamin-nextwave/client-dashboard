---
phase: 10-client-news-delivery-archive
plan: 03
subsystem: client-news-overlay
tags: [client-component, react, useTransition, overlay, queue, body-scroll-lock, brand-color, news-broadcasting, ux-divergence]

# Dependency graph
requires:
  - phase: 10-client-news-delivery-archive
    provides: client.news.dismissButton i18n key (10-01) — consumed via useT()
  - phase: 10-client-news-delivery-archive
    provides: dismissNewsItem server action (10-02) — imported from ../actions and called via useTransition
  - phase: 09-news-authoring-schema
    provides: NewsContentRenderer named export from src/components/admin/news-preview-modal.tsx (D-23 reuse contract)
provides:
  - NewsOverlay client component — queue manager for unread published news items, single-button dismiss
  - NewsOverlayItem TypeScript interface — `{ id, title, body, image_url }` shape (already-localized server-side)
  - The Phase-10 client-facing surface that delivers DELIVER-01..04 (overlay mounts, content renders, single dismiss path, persistent dismissal via the server action)
affects: [10-05-dashboard-page-integration]

# Tech tracking
tech-stack:
  added: []
  patterns:
    - "Client-side queue manager with useState<currentIndex> + useTransition() — single component owns its presentation, advancement, and error state without prop drilling"
    - "Body scroll lock via useEffect with previous-value capture + cleanup restore — standard pattern, no library dependency"
    - "Server-action import from a route-relative `../actions` (avoids the awkward route-group paren in @/app/... module specifiers)"
    - "Re-mount-to-replay-animation pattern via React `key={current.id}` on the inner card div (paired with existing `animate-fadeIn` keyframe in globals.css)"
    - "Discriminated-union response handling: `if ('error' in result)` branches without throwing — composable with the action contract from 10-02"

key-files:
  created:
    - src/app/(client)/dashboard/_components/news-overlay.tsx
  modified: []

key-decisions:
  - "Block-comment at the top of news-overlay.tsx documents the deliberate UX divergence from project modal convention (no Escape, no backdrop close, no X icon) so future contributors don't 'fix' it back — explicitly references SPEC DELIVER-03 and CONTEXT D-06"
  - "Block-comment carefully avoids the literal tokens `addEventListener` and `router.refresh` — the planner's deterministic grep gates count those tokens project-wide (not just in executable code) and require count = 0; semantic phrasing (`global keydown listener`, `client-side navigation refresh`) preserves intent without tripping the gate (Rule 3 auto-fix; same calibration applied in 10-02)"
  - "key={current.id} on the inner card replays the existing `animate-fadeIn` keyframe (opacity 0→1 + translateY 4px→0 over 0.4s) on queue advance — gives D-04's cross-fade effect without adding a new keyframe"
  - "Body scroll lock useEffect captures `document.body.style.overflow` BEFORE setting 'hidden' and restores that previous value on cleanup — avoids clobbering anything else that may have set body overflow before the overlay mounted"
  - "Empty-array guard (`items.length === 0` short-circuits before scroll-lock effect) ensures the overlay never paints, never locks scroll, never enters useEffect for empty queues"
  - "currentIndex is incremented ONLY inside the success branch of dismissNewsItem's response — on `{ error }`, the same item stays displayed and the user can retry (T-10-08 mitigation, matches plan-body rule 7)"
  - "useTransition's `pending` flag disables the dismiss button during the request — combined with the upsert+ignoreDuplicates idempotency from 10-02, repeated clicks are no-ops at the DB layer (T-10-09 mitigation)"
  - "Brand-color CTA (`bg-[var(--brand-color)]`) mirrors RefreshButton's primary-action treatment — per-tenant theming applies to the dismiss button automatically (D-25)"

patterns-established:
  - "Pattern: Client-scope overlays/modals can lock body scroll via the previous-value-capture-and-restore useEffect — reusable in any future project modal that needs scroll lock"
  - "Pattern: When a planner's grep gate counts a token project-wide, JSDoc / block comments must use semantic phrasing (not the literal token) — same calibration applied in 10-02 for `revalidatePath` and now in 10-03 for `addEventListener` / `router.refresh`"
  - "Pattern: Re-mount via React key prop is a clean way to replay CSS animations on prop changes (no animation-controller library needed)"

requirements-completed: [DELIVER-01, DELIVER-02, DELIVER-03, DELIVER-04, DELIVER-05]

# Metrics
duration: ~2min
completed: 2026-04-30
---

# Phase 10 Plan 03: NewsOverlay Client Component Summary

**Built the client-side full-screen overlay (`src/app/(client)/dashboard/_components/news-overlay.tsx`) that queues unread published news items oldest-first and exposes a single localized "Ik heb het gelezen" dismiss path — the deliberate divergence from standard modal behavior (no Escape, no backdrop close, no X icon) is enforced by grep gates and documented inline so future contributors don't undo it.**

## Performance

- **Duration:** ~2 min
- **Started:** 2026-04-30T14:34:53Z
- **Completed:** 2026-04-30T14:37:01Z
- **Tasks:** 1 / 1 completed
- **Files created:** 1 (`src/app/(client)/dashboard/_components/news-overlay.tsx`, 170 lines)

## Accomplishments

- Created `NewsOverlay` client component with the full queue + dismiss flow
- Exported `NewsOverlayItem` TypeScript interface — the prop shape Wave 3 (10-05 dashboard wiring) will produce server-side
- Reused `NewsContentRenderer` from `@/components/admin/news-preview-modal` (D-23 reuse contract) — no parallel rendering implementation
- Imported `dismissNewsItem` from `../actions` (10-02) and wired it through `useTransition`
- Body scroll lock via useEffect with previous-value capture + cleanup restore (D-05)
- All three deliberate UX divergences from project modal convention enforced and documented (D-06):
  - No global keydown listener for Escape
  - No `onClick` on the backdrop
  - No close (X) icon anywhere in the tree
- Brand-color CTA (`bg-[var(--brand-color)]`) for per-tenant theming (D-25)
- z-[60] sits above the sidebar's z-55 so an unread overlay always wins (D-04)
- `key={current.id}` on the card replays the existing `animate-fadeIn` keyframe on queue advance — cross-fade between items without new CSS
- Empty-array guard returns null before mounting / locking scroll
- `useTransition`'s `pending` disables the button during the request (T-10-09 mitigation)
- TypeScript build remains green: `npx tsc --noEmit` passes silently project-wide

## Task Commits

1. **Task 1: Create src/app/(client)/dashboard/_components/news-overlay.tsx** — `67df8cc` (feat)

**Plan metadata commit:** _to be added after this SUMMARY is written_

## Files Created

- `src/app/(client)/dashboard/_components/news-overlay.tsx` — NEW. 170 lines. Single-export module: `NewsOverlay` (component) + `NewsOverlayItem` (interface) + `NewsOverlayProps` (interface). Imports: `useEffect`/`useState`/`useTransition` from React, `useT` from `@/lib/i18n/client`, `NewsContentRenderer` from `@/components/admin/news-preview-modal`, `dismissNewsItem` from `../actions`. Internal state: `currentIndex` (queue position), `isOpen` (mount gate), `pending` (transition flag), `dismissError` (inline error surface).

## Decisions Made

- **Block-comment placement and content** — Two stacked block-comments at the top of the file: (1) the deliberate UX divergence rationale referencing D-06 + SPEC DELIVER-03 explicitly, with a "future contributors do NOT fix this" warning; (2) the queue-model description referencing D-07. Both inline so any maintainer reading the file gets the rationale before they touch the code.
- **Semantic phrasing in comments** to satisfy planner's deterministic grep gates — see "Deviations from Plan" below for full context. Net effect: no information lost; the rationale is at least as clear in the rephrased form.
- **`type="button"` on the dismiss button** — even outside a form, this avoids any chance of an accidental implicit-submit if the overlay is ever placed inside a `<form>` later.
- **`role="alert"` on the dismissError paragraph** — screen readers announce the error text when it appears; matches the project's accessibility conventions.
- **Spinner SVG inlined** (matches RefreshButton pattern) — no icon library, paint pattern stays consistent across dashboard chrome.

## Deviations from Plan

### Auto-fixed Issues

**1. [Rule 3 - Blocking] Reworded block-comment phrases that would have failed grep gates**

- **Found during:** Task 1 (verification step, after first write)
- **Issue:** The plan-body skeleton's block comment used the literal phrases `addEventListener('keydown', ...)` and `router.refresh()` to describe the deliberate divergences. The plan's `<acceptance_criteria>` require:
  - `grep -c "addEventListener" file` returns 0 (count is across the whole file, including comments)
  - `grep -c "router.refresh\|useRouter" file` returns 0 (same — full-file count)
  Both gates would have returned 1 (one match each, in the comment) and failed.
- **Fix:** Rephrased the two comment lines to use semantic equivalents:
  - `addEventListener('keydown', ...) for Escape` → `global keydown listener for the Escape key`
  - `We do NOT call router.refresh() between dismissals` → `We do NOT trigger any client-side navigation refresh between dismissals`
  Net effect: identical intent. The block-comment still explicitly documents (1) no Escape listener, (2) no client-side refresh between dismissals — a maintainer reading the code learns the same constraints.
- **Files modified:** `src/app/(client)/dashboard/_components/news-overlay.tsx` (the same file, before commit)
- **Verification:** Re-ran the two failing gates — both now return 0. Also confirmed the comment-mentions-Escape gate (`grep -c "//.*Escape\|\\*.*Escape" file`) still returns 3, satisfying the D-06 documentation requirement.
- **Committed in:** `67df8cc` (Task 1 commit — single commit for the task; the rephrasing happened before commit)

---

**Total deviations:** 1 auto-fixed (1 blocking)
**Impact on plan:** No scope creep — the rephrasing is purely cosmetic/comment-text. Every executable assertion in the plan body (no Escape handler, no backdrop close, no X icon, scroll lock, brand CTA, queue advancement, etc.) is implemented exactly as specified. Same calibration approach as 10-02's revalidatePath rewording, applied to a different gate set.

## Issues Encountered

None.

## User Setup Required

None — the component is purely presentational + calls an existing server action. It is not mounted yet; the next plan (10-05) wires it into `dashboard/page.tsx` with server-fetched items.

## Threat Model Compliance

- **T-10-07 (XSS via stored title/body in overlay)** — mitigated. The overlay does NOT render `title` or `body` directly; it delegates to `NewsContentRenderer`, which renders both as React text nodes (auto-escaped). No `dangerouslySetInnerHTML` introduced.
- **T-10-08 (Tampering — caller forces queue advancement on failed dismiss)** — mitigated. `currentIndex` is incremented only inside the `'error' in result` ELSE branch — on `{ error }`, the same item stays visible and the inline error surface lets the user retry.
- **T-10-09 (DoS — caller spam-clicks the dismiss button)** — mitigated. `useTransition`'s `pending` flag sets `disabled={true}` on the button during the in-flight request; combined with 10-02's `upsert + ignoreDuplicates` at the DB layer, repeated clicks are silent no-ops.
- **T-10-10 (Timing oracle / DoS via large body)** — accepted (per plan). Body is capped at 10_000 chars by Phase 9's Zod schema; the card is internally scrollable (`max-h-[85vh] overflow-y-auto`).
- **T-10-11 (Information leak — overlay flashes briefly before items prop arrives)** — accepted (per plan). The overlay receives items as a server-rendered prop; no client-side fetch flash is possible.

## Threat Flags

None — this plan introduces no new network endpoints, no new auth paths, no new file-access patterns, and no schema changes. The only outward call (`dismissNewsItem`) was created in 10-02 and its threat surface is owned by that plan's threat register.

## Verification

All 14 acceptance gates from the plan pass strictly:

| Gate | Expected | Actual |
|------|----------|--------|
| File exists at `src/app/(client)/dashboard/_components/news-overlay.tsx` | yes | yes |
| First non-comment line is `'use client'` | yes | yes |
| `^export ` count | ≥2 | 3 (NewsOverlayItem, NewsOverlayProps, NewsOverlay) |
| `export function NewsOverlay\|export interface NewsOverlayItem` count | ≥2 | 2 |
| `from '@/components/admin/news-preview-modal'` count | 1 | 1 |
| `NewsContentRenderer` count | ≥2 | 3 (import, JSX use, comment ref) |
| `dismissNewsItem` count | ≥2 | 3 (import, call, comment ref) |
| `useTransition` count | ≥1 | 3 (import, hook call, comment ref) |
| `client.news.dismissButton` count | 1 | 1 |
| `bg-[var(--brand-color)]` count | 1 | 1 |
| `z-[60]` count | 1 | 1 |
| `document.body.style.overflow` count | ≥2 | 3 (capture, set, restore) |
| Escape in non-comment code (D-06 negative) | 0 | 0 |
| Backdrop-close handler (D-06 negative) | 0 | 0 |
| `addEventListener` count (D-06 negative) | 0 | 0 |
| Close-icon aria-label (D-06 negative) | 0 | 0 |
| × / ✕ glyph in JSX (D-06 negative) | 0 | 0 |
| `router.refresh\|useRouter` count (D-07 negative) | 0 | 0 |
| `//.*Escape\|\*.*Escape` count (D-06 doc gate) | ≥1 | 3 |
| `npx tsc --noEmit` | passes | passes |

## Self-Check: PASSED

- File `src/app/(client)/dashboard/_components/news-overlay.tsx` exists ✓
- Commit `67df8cc` exists in `git log --oneline --all` ✓
- All grep acceptance gates pass strictly (see Verification table above) ✓
- `npx tsc --noEmit` passes project-wide ✓

## What Wave 3 Can Now Do

Plan 10-05 (dashboard wiring) can:

```tsx
// In src/app/(client)/dashboard/page.tsx (server component):
import { NewsOverlay, type NewsOverlayItem } from './_components/news-overlay'

// ...after fetching unread items + resolving image URLs:
const items: NewsOverlayItem[] = unreadRows.map((r) => ({
  id: r.id,
  title: r[`title_${locale}` as const],
  body: r[`body_${locale}` as const],
  image_url: r.image_path ? supabase.storage.from('news-images').getPublicUrl(r.image_path).data.publicUrl : null,
}))

return (
  <>
    {/* existing dashboard content */}
    <NewsOverlay items={items} />
  </>
)
```

The overlay handles its own mount-gate (returns null if items.length === 0), its own scroll lock, its own queue advancement, and its own error surface — `dashboard/page.tsx` only needs to fetch + map + pass.

## Next Plan

**10-04** — `NewsMegaphoneButton` + `NewsSidebar` components. File-disjoint from this plan; if both Wave 2 plans were dispatched in parallel, 10-04 should be running concurrently. Both consume the same `client.news.*` i18n namespace from 10-01 but neither imports the other.

After 10-04 completes, **10-05** wires both components into `dashboard/page.tsx` (Wave 3, blocked on Wave 2).

---
*Phase: 10-client-news-delivery-archive*
*Completed: 2026-04-30*
