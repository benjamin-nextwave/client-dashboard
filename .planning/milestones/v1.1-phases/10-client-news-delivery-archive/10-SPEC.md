# Phase 10: Client News Delivery & Archive — Specification

**Created:** 2026-04-30
**Ambiguity score:** 0.18
**Requirements:** 9 locked (DELIVER-01..05 + ARCH-01..04)

## Goal

Clients receive published news as a full-screen overlay when they open `/dashboard` (oldest unread first, dismissed one-by-one), can permanently dismiss each item via a single localized "Ik heb het gelezen" button, and can revisit any currently-published news from a megaphone-button-triggered sidebar that lives next to "Ververs data" in the dashboard chrome.

## Background

Phase 9 delivered the operator-side authoring system, the `news_items` and `news_dismissals` tables, the `news-images` Supabase Storage bucket, RLS policies (clients see only `status='published'` rows; users INSERT/SELECT own dismissal rows), and the presentational `NewsContentRenderer` component (in `src/components/admin/news-preview-modal.tsx`). The client dashboard at `src/app/(client)/dashboard/page.tsx` exists with a `RefreshButton` rendered inline in the page header. There is no news-related UI on the client side today — clients cannot see or dismiss any news, despite all the data and infrastructure being in place.

This phase wires up the client-facing surface: an overlay on dashboard open and a sidebar archive accessible from a new megaphone button next to the existing RefreshButton.

## Requirements

1. **DELIVER-01 — Overlay on dashboard open**: When a client opens `/dashboard` and there is at least one published news item they have not yet dismissed, a full-screen overlay appears showing that item.
   - Current: No overlay exists; the dashboard renders without any news interaction
   - Target: A server-rendered check at page mount queries `news_items WHERE status='published'` LEFT JOIN `news_dismissals` filtered by current `auth.uid()` to find unread items; if any exist, the oldest unread is rendered as a full-screen overlay. The overlay fires ONLY on `/dashboard` (not on `/inbox`, `/voorvertoning`, `/dnc`, `/mijn-campagne`, `/feedback`, etc.) — clients who navigate directly to those routes do not see the overlay until they next visit `/dashboard`
   - Acceptance: A test client with one unread published news item visits `/dashboard` and sees the overlay; the same client visiting `/inbox` first sees no overlay; navigating from `/inbox` back to `/dashboard` shows the overlay (assuming the item is still unread)

2. **DELIVER-02 — Overlay content rendering**: The overlay displays the news image, title, and body in a single language variant.
   - Current: No overlay exists
   - Target: The overlay renders the news using the existing `NewsContentRenderer` (or an equivalent component sharing its props shape: `{ title, body, imageUrl, language }`). The active language is derived from `profiles.language` for the logged-in client (falls back to `nl` if the column is null/unset). Per Phase 9's publish gate, all 3 language variants are guaranteed non-empty for any `status='published'` row, so language fallback is only needed if the user's `profiles.language` is somehow not in `('nl','en','hi')`
   - Acceptance: A client with `profiles.language='en'` sees the English variant in the overlay; a client with `profiles.language='hi'` sees the Hindi variant; a client with `profiles.language=null` sees the Dutch variant

3. **DELIVER-03 — Single-button dismiss action**: The overlay can only be dismissed via a single button labeled with the localized "Ik heb het gelezen" string.
   - Current: No overlay exists
   - Target: The overlay has exactly ONE interactive control inside the modal: a button that displays the localized "Ik heb het gelezen" / "I have read it" / Hindi equivalent. There is NO close (X) icon, NO escape-key handler, NO click-outside-to-dismiss, NO backdrop click handler. Clicking the button INSERTs a row into `news_dismissals (user_id, news_item_id)` and closes the overlay. The body of the page remains scroll-locked while the overlay is open
   - Acceptance: Pressing the Escape key while the overlay is open does NOT close it; clicking the backdrop does NOT close it; clicking the "Ik heb het gelezen" button DOES close it AND inserts the dismissal row; the only way out of the overlay is the button

4. **DELIVER-04 — Persistent dismissal**: Once a client dismisses a news item, that user never sees the same item as an overlay again, across logout, login, and page reload.
   - Current: No dismissal mechanism exists
   - Target: The dismissal row in `news_dismissals` (created by clicking "Ik heb het gelezen") is the source of truth. Subsequent renders of `/dashboard` exclude any item whose `(user_id, news_item_id)` pair already exists in `news_dismissals`. Two clients of the same tenant dismiss independently — dismissal is per-user, not per-tenant or per-client
   - Acceptance: A client dismisses item X, navigates away, logs out, logs back in, and visits `/dashboard` — no overlay appears (assuming X was the only unread item). A different client logging in still sees X if they have not dismissed it themselves

5. **DELIVER-05 — Withdrawal propagation**: A withdrawn news item disappears from any active overlay queue and from the sidebar within one page reload.
   - Current: No client-side news rendering exists
   - Target: The dashboard query and the sidebar query both filter on `status='published'`. When the operator transitions an item to `withdrawn`, the next render of `/dashboard` (or the sidebar) excludes it. There is no real-time push to currently-open clients — the client sees the change on next page reload, not earlier (acceptable per requirement language "within one page reload")
   - Acceptance: Operator withdraws item X while a client has the overlay for X open. Client reloads `/dashboard`. Item X is gone from the overlay queue and gone from the sidebar list. (No requirement for the open overlay to auto-close — only that the next reload reflects the new state.)

6. **ARCH-01 — Megaphone button placement**: The dashboard chrome shows a megaphone button immediately to the left of the existing "Ververs data" RefreshButton.
   - Current: The page header on `/dashboard` (`src/app/(client)/dashboard/page.tsx`, header section near the title) renders `<RefreshButton />` next to the page title; there is no megaphone button anywhere
   - Target: A new megaphone button component is rendered in the same header flex container, placed directly to the left of `<RefreshButton />`. The button has an `aria-label` using a localized string like "Open nieuwsoverzicht" / "Open news overview" / Hindi equivalent. Visual treatment matches the project's existing icon-button conventions (similar size, padding, hover state to RefreshButton)
   - Acceptance: Visiting `/dashboard` shows the megaphone button immediately to the left of "Ververs data" in the page header; the button has an accessible name; on hover the button shows the same hover affordance as RefreshButton

7. **ARCH-02 — Sidebar opens on click**: Clicking the megaphone button opens a sidebar listing all currently-published (non-withdrawn) news items, ordered most-recent first.
   - Current: No sidebar exists
   - Target: Clicking the megaphone toggles a slide-in panel (or equivalent surface) that fetches and displays all `news_items WHERE status='published'` ordered by `published_at DESC` (or `created_at DESC` as a tiebreaker). The sidebar shows EVERY published item — items the client has already dismissed are STILL shown (the sidebar is an archive view, not a list of unread items only). The sidebar can be closed (its own close affordance — close-button, click-outside, or escape-key are all acceptable for the sidebar itself, unlike the overlay)
   - Acceptance: With the live DB containing 3 published items (one dismissed by current user, one not), clicking the megaphone shows a list of all 3 items; the dismissed item is shown alongside the unread one; closing the sidebar via its close affordance restores the underlying dashboard view

8. **ARCH-03 — Sidebar list-item shape**: Each sidebar list item shows the news title and a short text preview.
   - Current: No sidebar exists
   - Target: Each list item displays the title (in user's `profiles.language` variant) and a short text preview (the first ~120 characters of the body in that language, with ellipsis truncation). Optionally the published date / "x days ago" string. The image is NOT shown in the list item — only when the item is opened (per ARCH-04)
   - Acceptance: A sidebar list item with a 600-character body shows the first ~120 characters followed by an ellipsis; an item with a 50-character body shows the full body without truncation; the title is rendered in the user's profile language

9. **ARCH-04 — Click-to-open full content**: Clicking a sidebar item displays the full news content (image + title + body) in the same sidebar panel or in an expanded view.
   - Current: No interaction exists
   - Target: Clicking a sidebar list item opens its full content (image, title, full body) in the same surface — either by replacing the list with a detail view inside the sidebar, OR by expanding the clicked item inline, OR by opening a modal/dialog that uses `NewsContentRenderer`. The exact shape is a Phase 10 implementation decision (not locked in this spec). A "back to list" affordance MUST exist when the user is on the detail view
   - Acceptance: Clicking a sidebar item shows the news image, full title, and full body without truncation; the user can return to the list view via a visible affordance; the detail view uses the same language variant as the list (driven by `profiles.language`)

## Boundaries

**In scope:**
- Server-rendered query on `/dashboard` for unread items (joins `news_items` and `news_dismissals` filtered by `auth.uid()`)
- Full-screen overlay component that renders one news item at a time (queue model — oldest unread first)
- "Ik heb het gelezen" dismiss button that inserts into `news_dismissals` and advances the queue
- Megaphone button rendered in the `/dashboard` page header to the left of `RefreshButton`
- Sidebar component that lists all published items with title + preview + (optional) date
- Sidebar click-to-open detail view (image + title + body using `NewsContentRenderer` or similar)
- i18n strings for new client-facing labels (`client.news.dismissButton`, `client.news.megaphoneAriaLabel`, etc.) added to `src/lib/i18n/translations/{nl,en,hi}.ts`
- Server actions: at minimum `dismissNewsItem(news_item_id)` (INSERT into `news_dismissals` with `user_id = auth.uid()`); idempotent via `ON CONFLICT DO NOTHING` on the composite PK
- Reuse of `NewsContentRenderer` from Phase 9 for content rendering (D-05 reuse hook)

**Out of scope:**
- Real-time push when news is published or withdrawn — clients see updates only on next page reload (per DELIVER-05)
- Overlay on dashboard subroutes (`/inbox`, `/voorvertoning`, `/dnc`, `/mijn-campagne`, `/feedback`) — overlay only fires on the main `/dashboard` route
- Showing the megaphone or sidebar on routes other than `/dashboard` — out of scope unless explicitly part of a shared layout chrome (decision deferred to discuss-phase)
- Email or push notifications when a news item is published — only in-app surfaces
- Per-client targeting — global broadcast only (deferred to v1.2 TARGET-01)
- Read-state analytics for the operator — deferred to v1.2 ENGAGE-01
- Rich text formatting in the overlay or sidebar — plain text body only
- Multiple images per item — one image (locked in Phase 9)
- Overlay queue advancement without page reload — once the queue is exhausted in this session, dismissed (dismissed-permanently)
- "Mark all as read" bulk action — not requested

## Constraints

- **Tech stack:** Next.js 15 App Router + TypeScript + Tailwind + Supabase — non-negotiable
- **Reuse Phase 9 component:** `NewsContentRenderer` (or equivalent content-rendering component built in Phase 9) MUST be used for both the overlay and the sidebar detail view; no parallel rendering implementation
- **i18n source of truth:** User language comes from `profiles.language` (NULL fallback to `nl`); operator UI strings stay in the existing `operator.news.*` namespace, client UI strings go under a new `client.news.*` namespace in `src/lib/i18n/translations/{nl,en,hi}.ts`
- **RLS-driven data:** Client SELECT on `news_items` is already restricted to `status='published'` (from Phase 9 RLS); no new RLS policies required for reads. The dismiss INSERT is gated by `news_dismissals` policy (`user_id = auth.uid()`)
- **Server-rendered overlay decision:** Whether the overlay is an unread item exists is determined at server render time (not client-side polling). The unread query happens on every `/dashboard` page render; clients never see the overlay for an item they have already dismissed
- **Single dismiss path:** No close (X), no Escape, no click-outside on the OVERLAY — only the explicit "Ik heb het gelezen" button. Sidebar may have normal close affordances (close-button / Escape / click-outside)
- **Queue model:** When multiple unread items exist, render the oldest first. After dismissal, immediately render the next oldest unread item without page reload. After the last item is dismissed, the overlay is gone for the rest of the session
- **Body scroll lock:** While the overlay is open, the underlying page scroll is disabled — the client cannot scroll past the overlay

## Acceptance Criteria

- [ ] A client with one unread published item lands on `/dashboard` and a full-screen overlay appears with that item rendered in their `profiles.language` variant
- [ ] Pressing Escape OR clicking the backdrop while the overlay is open does NOT dismiss it
- [ ] Clicking the localized "Ik heb het gelezen" button inserts a row into `news_dismissals` for `(auth.uid(), item_id)` AND closes the overlay (or advances to the next unread item if any)
- [ ] After dismissing all unread items, the overlay does not appear again for that user on subsequent visits to `/dashboard`
- [ ] A new published item from the operator appears as the overlay on the next `/dashboard` page render for users who have not dismissed it
- [ ] Visiting `/inbox` or any other dashboard subroute does NOT trigger the overlay even if unread items exist
- [ ] When the operator withdraws an item, the next `/dashboard` page reload no longer queues that item in the overlay AND no longer shows it in the sidebar
- [ ] A megaphone button is rendered in the `/dashboard` page header immediately to the left of `RefreshButton`, with a localized accessible name
- [ ] Clicking the megaphone opens a sidebar listing all currently-published items, ordered most-recent first
- [ ] The sidebar list shows EVERY published item — including items the user has already dismissed
- [ ] Each sidebar list item displays the title (in user's language) and a short text preview (~120 chars with ellipsis)
- [ ] Clicking a sidebar item displays the full content (image, title, full body) — using the same renderer as the overlay — with a visible "back to list" affordance
- [ ] The sidebar itself can be closed via a normal close affordance (close-button / Escape / click-outside)

## Ambiguity Report

| Dimension          | Score | Min  | Status | Notes                                                                |
|--------------------|-------|------|--------|----------------------------------------------------------------------|
| Goal Clarity       | 0.90  | 0.75 | ✓      | Single sentence outcome covers overlay + sidebar + dismissal         |
| Boundary Clarity   | 0.85  | 0.70 | ✓      | Overlay only on /dashboard; sidebar = full archive; queue model      |
| Constraint Clarity | 0.65  | 0.65 | ✓      | RLS, i18n, NewsContentRenderer reuse, single dismiss path locked     |
| Acceptance Criteria| 0.80  | 0.70 | ✓      | 13 pass/fail criteria — all observable via UI or DB state            |
| **Ambiguity**      | 0.18  | ≤0.20| ✓      | Gate passed — ready for discuss-phase                                |

## Interview Log

| Round | Perspective    | Question summary                            | Decision locked                                                  |
|-------|----------------|---------------------------------------------|------------------------------------------------------------------|
| 1     | Boundary Keeper| Multi-unread overlay behavior?              | Queue oldest-first, dismiss-to-advance, gone after last          |
| 1     | Boundary Keeper| On which dashboard pages does overlay fire? | ONLY /dashboard, NOT /inbox, /voorvertoning, etc.                |
| 1     | Boundary Keeper| Sidebar shows dismissed items?              | YES — sidebar is full archive of all currently-published items   |

Inherited locks (from Phase 9 SPEC.md and CONTEXT.md):
- Global broadcast (no `client_id` on news_items)
- Per-user dismissal keyed on `auth.users.id` via `news_dismissals (user_id, news_item_id)`
- Soft-delete withdraw — `status='withdrawn'` rows excluded from client SELECT via RLS
- Image optional (nullable `image_path`)
- All 3 language variants guaranteed non-empty for published rows (publish gate)
- Reuse `NewsContentRenderer` (D-05) for overlay + sidebar detail rendering

---

*Phase: 10-client-news-delivery-archive*
*Spec created: 2026-04-30*
*Next step: /gsd-discuss-phase 10 — implementation decisions (sidebar slide-in vs side-panel, sidebar detail UI shape, overlay z-index + animation, etc.)*
