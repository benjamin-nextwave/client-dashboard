---
phase: 10-client-news-delivery-archive
plan: 06
status: complete
completed_at: 2026-04-30
verification: smoke-passed-with-3-fixes
---

# Plan 10-06 Summary — End-to-end Smoke Verification

## Outcome

Phase 10 Client News Delivery & Archive is **smoke-verified live**. All 9 v1.1 client-news requirements (DELIVER-01..05 + ARCH-01..04) confirmed working against the live `dashboards-klanten` Supabase project. Three smoke-time UX issues were surfaced, fixed inline, and re-verified before closeout.

## Smoke walkthrough

The user logged in as a client, with two published news items in the live DB (created in Phase 9 smoke). The 12-step Phase 10 checklist was exercised:

- ✅ **Step 1 (Overlay on open):** Visiting `/dashboard` immediately surfaces a full-screen overlay with the oldest unread item, image + title + body in the user's `profiles.language` variant.
- ✅ **Step 2 (No alternate dismiss paths):** Pressing Escape does nothing; clicking the backdrop does nothing; there is no X close icon. The "Ik heb het gelezen" button is the only way out.
- ✅ **Step 3 + 4 (Queue advance):** Clicking dismiss advances to the next unread item without a page reload.
- ✅ **Step 5 (Final dismiss):** After the last unread item is dismissed the overlay unmounts; refreshing the page does not bring it back (persistent dismissal in `news_dismissals`).
- ✅ **Step 6 (Megaphone position):** After fix, the megaphone icon sits flush against "Ververs data" with `items-start` alignment.
- ✅ **Step 7 (Badge):** After fix, no badge — clean icon-only button (decision rationale: every published item is forced into the overlay queue at /dashboard mount, so an "unread count" badge would always be 0 in practice and is therefore a misleading signal).
- ✅ **Step 8 (Sidebar slide-in):** Clicking the megaphone slides a 420px panel in from the right with the `slideInFromRight` keyframe (~250ms ease-out).
- ✅ **Step 9 (Sidebar archive):** Sidebar shows ALL currently-published items (including ones the user has dismissed), most-recent first, with title + ~120-char preview + relative date.
- ✅ **Step 10 (No images in list):** Sidebar list items render text only; D-27 honored.
- ✅ **Step 11 (Detail view):** Clicking a sidebar item replaces the list with a detail view rendering the full content via `NewsContentRenderer` (image + full title + full body); "Terug naar overzicht" button returns to list.
- ✅ **Step 12 (Sidebar close conventions):** X button, Escape key, and click-outside backdrop all close the sidebar — unlike the overlay's strict single-button dismiss.

## Smoke-time fixes (commit `0bdedb2`)

The user surfaced three UX issues during the live verification. All three were fixed inline and re-verified before closing 10-06.

### Fix 1: Operator authoring — text disappears after save

**Symptom:** Filling in a news item on `/admin/news/new`, clicking "Concept opslaan", landed on `/admin/news/[id]/edit` (DB write succeeded — the URL changed and a row existed) but the form fields appeared empty until F5 was pressed.

**Root cause:** Two-part interaction issue between Next.js 15's server-action `redirect()` (soft-navigates without full page reload) and react-hook-form's `register()` (uses ref callbacks that fire after mount). The form instance's RHF state was not picking up the new `defaultValues` prop on the first render after the soft-nav redirect; F5 (full reload) triggered a fresh React tree, so RHF initialized correctly there.

**Fix (defense-in-depth, two stacked changes):**
- Added explicit `defaultValue={defaultValues?.[`title_${lang}`] ?? ''}` (and same for body fields) on each input + textarea. This populates the input element value at SSR/first-client-render time, independent of RHF's ref callback timing.
- Added `key={row.id}` to the NewsForm in `src/app/(operator)/admin/news/[id]/edit/page.tsx`. This forces a fresh React mount whenever the row id changes, so any soft-nav-reuse of the form component instance is short-circuited.

**Files touched:**
- `src/components/admin/news-form.tsx`
- `src/app/(operator)/admin/news/[id]/edit/page.tsx`

### Fix 2: Megaphone unread badge ("2") was always present

**Symptom:** The red badge on the megaphone showed an unread count of 2 — but the overlay queue had already rendered both items at /dashboard mount, so "unread" no longer meaningfully described what the user had been shown.

**Root cause:** The decision in CONTEXT.md D-13 (red badge with unread count) was inherited from a "notifications-with-tray" mental model, but Phase 10's actual delivery model is overlay-on-open: the user *cannot* arrive at /dashboard with unread items unseen — the overlay always renders them. The badge would therefore always be 0 in practice unless the user navigated away mid-queue, which is a non-issue.

**Fix:** Removed the badge JSX from `news-megaphone-button.tsx` and dropped the `unreadCount` prop from the component's interface. Updated the dashboard wiring to drop the prop. Comment in the file documents the rationale.

**Files touched:**
- `src/app/(client)/dashboard/_components/news-megaphone-button.tsx`
- `src/app/(client)/dashboard/page.tsx`

### Fix 3: Megaphone visually misaligned with Ververs data button

**Symptom:** The megaphone icon-button appeared to "float" higher than the Ververs data button, looking visually disjointed.

**Root cause:** `RefreshButton` wraps in a `<div className="flex flex-col items-end gap-2">` containing the button + a hint paragraph below + (optional) status messages. The megaphone is a bare `<button>`. The parent flex container used `items-center`, so the megaphone was vertically centered against `RefreshButton`'s entire wrapper height — which is taller than just its button — pushing the megaphone visually upward relative to the actual button.

**Fix:** Changed parent flex container from `items-center` to `items-start` so both elements top-align against the button edge. Tightened gap from `gap-3` to `gap-2` for a closer visual pairing.

**File touched:**
- `src/app/(client)/dashboard/page.tsx`

All three fixes verified in TypeScript (`npx tsc --noEmit` passes) and re-tested in the browser before closing this plan.

## Phase 10 closeout

| Plan | Wave | Commits | SUMMARY |
|------|------|---------|---------|
| 10-01 | 1 | `2e807fd`, `c61799f` | ✓ |
| 10-02 | 1 | `56d9a1d`, `db835bf` | ✓ |
| 10-03 | 2 | `67df8cc`, `d076748` | ✓ |
| 10-04 | 2 | `26b67f8`, `11763d3`, `83bd57e`, `f742910` | ✓ |
| 10-05 | 3 | `c117cbb`, `d5aca8b` | ✓ |
| 10-06 | 4 | `0bdedb2` (smoke-time bugfixes) | this file |

## Requirements closed

All 9 Phase 10 requirements are now live-verifiable:

- ✅ DELIVER-01 — Overlay on /dashboard for unread items
- ✅ DELIVER-02 — Image + title + body in user's language variant
- ✅ DELIVER-03 — "Ik heb het gelezen" button is the only dismiss path
- ✅ DELIVER-04 — Persistent dismissal across logout / login / reload
- ✅ DELIVER-05 — Withdrawal propagates within one page reload
- ✅ ARCH-01 — Megaphone immediately to the left of Ververs data
- ✅ ARCH-02 — Sidebar opens on click, lists all published items recent-first
- ✅ ARCH-03 — Each sidebar item shows title + ~120-char preview + relative date
- ✅ ARCH-04 — Click-to-detail with full content + "back to list"

## Milestone v1.1 closeout

With Phase 9 (operator authoring + schema) and Phase 10 (client delivery + archive) both complete and live-verified, **milestone v1.1 News Broadcasting is shipped**. Total Phase 9 + Phase 10: 12 plans across 9 waves; 24 v1.1 requirements (15 NEWS/DELIVER/ARCH + 9 covered by both phases) all live.

**Phase 10 status: COMPLETE.** Milestone v1.1 ready for archival.
