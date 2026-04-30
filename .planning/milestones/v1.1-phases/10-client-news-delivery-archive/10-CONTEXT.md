# Phase 10: Client News Delivery & Archive - Context

**Gathered:** 2026-04-30
**Status:** Ready for planning

<domain>
## Phase Boundary

Client-side news delivery: a server-rendered overlay-on-open queue at `/dashboard` that surfaces unread published news items one-at-a-time and inserts a dismissal row on "Ik heb het gelezen" click; plus a megaphone-button-triggered slide-in sidebar that lists ALL currently-published items with click-to-detail navigation. Reuses the `NewsContentRenderer` from Phase 9 for content rendering and the existing i18n + Supabase RLS infrastructure. Does NOT add real-time push, does NOT extend the overlay to dashboard subroutes, does NOT add per-client targeting.

</domain>

<spec_lock>
## Requirements (locked via SPEC.md)

**9 requirements are locked.** See `10-SPEC.md` for full requirements, boundaries, and acceptance criteria.

Downstream agents MUST read `10-SPEC.md` before planning or implementing. Requirements are not duplicated here.

**In scope (from SPEC.md):**
- Server-rendered query on `/dashboard` for unread items (`news_items` LEFT JOIN `news_dismissals` filtered by `auth.uid()`)
- Full-screen overlay component — queue model, oldest unread first, dismiss-to-advance
- "Ik heb het gelezen" button = ONLY dismiss path (no Escape, no backdrop, no X icon)
- Body scroll-locked while overlay is open
- Megaphone button rendered in `/dashboard` page header immediately left of `RefreshButton`
- Slide-in sidebar listing ALL published items (full archive — including dismissed)
- Sidebar list-item: title + ~120-char preview in user's `profiles.language`
- Sidebar detail view (image + title + full body) with "back to list" affordance
- Server action `dismissNewsItem(news_item_id)` — INSERT into `news_dismissals` with `ON CONFLICT DO NOTHING`
- New `client.news.*` i18n namespace in `src/lib/i18n/translations/{nl,en,hi}.ts`
- Reuse of `NewsContentRenderer` from `src/components/admin/news-preview-modal.tsx`

**Out of scope (from SPEC.md):**
- Real-time push (no live updates while overlay/sidebar is open)
- Overlay on `/inbox`, `/voorvertoning`, `/dnc`, `/mijn-campagne`, `/feedback`
- Megaphone button on routes other than `/dashboard`
- Email / push notifications
- Per-client targeting (deferred to v1.2 TARGET-01)
- Read-state analytics (deferred to v1.2 ENGAGE-01)
- Rich text formatting; multiple images per item; mark-all-as-read

</spec_lock>

<decisions>
## Implementation Decisions

The user delegated all implementation choices ("ik vertrouw dat jij de beste keuzes kan maken voor gebruikersvriendelijkheid en een professionele uitstraling"). The decisions below reflect Claude's discretion grounded in: existing project patterns, shared design conventions for dashboard overlays/sidebars, and the goal of making this feel native to the existing dashboard chrome rather than bolted-on.

### Component file layout

- **D-01:** Phase 10 client UI lives at:
  - `src/app/(client)/dashboard/_components/news-overlay.tsx` — full-screen overlay with queue state (client component)
  - `src/app/(client)/dashboard/_components/news-megaphone-button.tsx` — icon button + sidebar trigger (client component)
  - `src/app/(client)/dashboard/_components/news-sidebar.tsx` — slide-in sidebar with list ↔ detail view (client component, controlled by `news-megaphone-button.tsx` via lifted state OR a small Zustand-free `useState` pair)
  - `src/app/(client)/dashboard/actions.ts` (NEW file) — server action `dismissNewsItem(newsItemId: string)` that inserts into `news_dismissals` with `ON CONFLICT DO NOTHING`
- **D-02:** No new shared `src/components/...` files. The `NewsContentRenderer` already lives at `src/components/admin/news-preview-modal.tsx` (named export) and is imported as-is from both Phase 9 admin code and Phase 10 client code. The "admin" path is a naming wart from Phase 9 but the export is provider-agnostic — no rename required for Phase 10. (A future cleanup could move it to `src/components/news/content-renderer.tsx`; out of scope here.)
- **D-03:** The data fetch for the overlay queue happens in the server-component `src/app/(client)/dashboard/page.tsx` itself: query `news_items` LEFT JOIN `news_dismissals` (filter on `auth.uid()`), order by `published_at ASC` (oldest unread first per SPEC requirement), pass the resulting array as a prop to `<NewsOverlay items={...} />`. The data fetch for the sidebar list happens INSIDE `<NewsSidebar>` via a server component or via client-side fetch on first open — see D-08.

### Overlay UX

- **D-04:** The overlay renders as a full-viewport fixed overlay (`fixed inset-0 z-[60]`) with:
  - A semi-transparent backdrop (`bg-black/60 backdrop-blur-sm`)
  - A centered card (max-width ~600px, max-height ~85vh, scrollable internally if content is long)
  - Animation: backdrop fades in (`opacity 0 → 1`), card scales-in (`scale-95 → scale-100` + `opacity 0 → 1`) over ~200ms `ease-out`. On dismiss-to-advance: card cross-fades to next item without backdrop flash. On final dismiss: card scales-out + backdrop fades-out.
- **D-05:** Body scroll is locked while the overlay is open by setting `document.body.style.overflow = 'hidden'` on mount and restoring on unmount (within a `useEffect` cleanup). This is the standard pattern; no library needed.
- **D-06:** Dismiss path: ONLY the localized "Ik heb het gelezen" button. The component does NOT register any keyboard listener for Escape; clicking the backdrop is a no-op (handler explicitly does nothing); there is no close icon. This is a deliberate UX choice (per SPEC) to ensure the user has read the message — every other in-app modal in the project may close on Escape, but this one does not. A code comment in `news-overlay.tsx` notes this divergence so future contributors don't "fix" it.
- **D-07:** Queue advancement: the overlay receives `items: NewsOverlayItem[]` as a prop (server-fetched). Internal `useState<number>` tracks `currentIndex`. On dismiss button click: call `dismissNewsItem(items[currentIndex].id)` via `useTransition()`; on success, increment `currentIndex`. When `currentIndex >= items.length`, set `isOpen=false` and unmount. NO router refresh between dismissals — the queue state stays in memory. After the user navigates AWAY from `/dashboard` and BACK, the next page render re-queries and shows ONLY the still-unread items (the just-dismissed ones are now in `news_dismissals` so they're excluded).

### Sidebar UX

- **D-08:** The sidebar is a right-side slide-in panel:
  - Width: ~420px on desktop, full-width on mobile (`w-full sm:w-[420px]`)
  - Position: `fixed top-0 right-0 h-screen z-[55]` (just below overlay z-index so an unread overlay always wins if both are open)
  - Backdrop: same semi-transparent dark backdrop as overlay (`bg-black/40`) covering the rest of the page; clicking backdrop closes the sidebar
  - Animation: panel slides in from right (`translate-x-full → translate-x-0`) over ~250ms `ease-out`; backdrop fades in
  - Close affordances: close-button (X icon) in the panel header, click-outside (backdrop click), AND Escape key all close the sidebar (unlike the overlay)
- **D-09:** Sidebar fetches its data via a server component pass-through: `<NewsSidebar items={publishedItems} />` where `publishedItems` is fetched in `dashboard/page.tsx` alongside the overlay queue. Both queries hit the live DB once per page render — no client-side fetch. (If we discover later that pre-fetching all items is too heavy, we can switch to lazy-fetch on first open. For typical news volumes — handful of items per month — pre-fetch is fine and avoids a click-then-spinner moment.)
- **D-10:** Sidebar internal state: `useState<{view: 'list'|'detail', activeItemId: string|null}>`. Default is `view: 'list'`. Clicking a list item sets `view: 'detail'` and `activeItemId: item.id`. The detail view renders `<NewsContentRenderer image_url={...} title={...} body={...} />` with a "back to list" button at the top of the detail view. Returning to list resets `activeItemId: null`.
- **D-11:** Sidebar list items show: title (in user's `profiles.language`, fallback `nl`), ~120-char body preview with ellipsis, and a relative date string ("2 dagen geleden" / "2 days ago" / Hindi equivalent). Most-recent first (`published_at DESC`).

### Megaphone button

- **D-12:** Visual treatment: an icon-only outlined button positioned immediately left of `RefreshButton` in `dashboard/page.tsx`. Tailwind classes: `inline-flex items-center justify-center rounded-xl border border-gray-200 bg-white px-3 py-3 text-gray-600 shadow-sm transition-all hover:bg-gray-50 hover:text-gray-900` (deliberately less prominent than the brand-colored RefreshButton — secondary action).
- **D-13:** A small numeric badge appears in the top-right corner of the megaphone icon when there is at least one unread published news item for the current user. The badge is a `<span>` with `bg-red-500 text-white text-[10px]` showing the count (capped at "9+" if more than 9 unread). The unread count is computed server-side in `dashboard/page.tsx` (same query that produces the overlay queue) and passed as a prop. Badge is hidden when count is 0.
- **D-14:** Icon: a megaphone SVG drawn inline (no new icon library dependency). The project already uses inline SVGs throughout (admin pages, refresh-button) — consistent with existing pattern.
- **D-15:** `aria-label` on the button uses `t('client.news.megaphoneAriaLabel')` — localized "Open nieuwsoverzicht" / "Open news overview" / Hindi equivalent.

### Server action — dismissal

- **D-16:** `dismissNewsItem` action in `src/app/(client)/dashboard/actions.ts`:
  ```ts
  'use server'
  import { createClient } from '@/lib/supabase/server'

  export async function dismissNewsItem(newsItemId: string): Promise<{ ok: true } | { error: string }> {
    if (typeof newsItemId !== 'string' || newsItemId.length === 0) {
      return { error: 'invalid id' }
    }
    const supabase = await createClient()
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) return { error: 'unauthenticated' }

    const { error } = await supabase
      .from('news_dismissals')
      .upsert({ user_id: user.id, news_item_id: newsItemId }, { onConflict: 'user_id,news_item_id', ignoreDuplicates: true })

    if (error) return { error: error.message }
    return { ok: true }
  }
  ```
  - Uses the request-scoped client (NOT admin) so RLS enforces `WITH CHECK (user_id = auth.uid())` — defends against forging another user's dismissal even if a malicious client manages to call the action with a different user_id (impossible here since we read user_id server-side, but defensive)
  - `upsert + ignoreDuplicates` makes double-clicks idempotent
  - Returns `{ ok: true }` on success so the client overlay can advance the queue
  - Does NOT call `revalidatePath` — queue state is client-managed during the session; next full page render naturally re-queries

### Overlay query (in dashboard/page.tsx)

- **D-17:** The unread items query — added to `dashboard/page.tsx` server component:
  ```ts
  // Inside the server component, after auth check:
  const { data: { user } } = await supabase.auth.getUser()
  // ...
  const { data: unreadRows } = await supabase
    .from('news_items')
    .select('id, title_nl, title_en, title_hi, body_nl, body_en, body_hi, image_path, published_at')
    .eq('status', 'published')
    .order('published_at', { ascending: true })  // oldest unread first
    .not('id', 'in', `(select news_item_id from news_dismissals where user_id = '${user.id}')`)
  ```
  Or, more robustly, two queries: fetch all published, fetch dismissals for user, filter in JS. The two-query approach is safer because it avoids subquery-string interpolation. Pick the safer pattern in execute (planner can choose).
- **D-18:** Mapped into a typed shape per the user's `profiles.language`:
  ```ts
  type NewsOverlayItem = {
    id: string
    title: string  // already-resolved per locale
    body: string
    image_url: string | null  // resolved via getPublicUrl when image_path is non-null
  }
  ```
  This pre-localization happens server-side so the overlay is purely presentational.

### Sidebar query (in dashboard/page.tsx)

- **D-19:** A second query for the sidebar (all published items, recent first):
  ```ts
  const { data: archiveRows } = await supabase
    .from('news_items')
    .select('id, title_nl, title_en, title_hi, body_nl, body_en, body_hi, image_path, published_at')
    .eq('status', 'published')
    .order('published_at', { ascending: false })
  ```
  Mapped into the same `NewsOverlayItem` shape and passed to `<NewsSidebar items={...} />`.
- **D-20:** Both queries (unread + archive) run inside the server component on every `/dashboard` render. This is fine: published news is small (handful per month) and the queries are indexed (`idx_news_items_published_at` from Phase 9 migration). No caching layer needed.

### i18n strings

- **D-21:** New `client.news.*` namespace added to `src/lib/i18n/translations/{nl,en,hi}.ts`:
  - `dismissButton` — "Ik heb het gelezen" / "I have read it" / Hindi equivalent
  - `megaphoneAriaLabel` — "Open nieuwsoverzicht" / "Open news overview" / Hindi equivalent
  - `sidebarTitle` — "Nieuws" / "News" / Hindi equivalent
  - `sidebarBackToList` — "Terug naar overzicht" / "Back to list" / Hindi equivalent
  - `sidebarEmpty` — "Geen nieuwsberichten." / "No news items." / Hindi equivalent
  - `relativeTimeJustNow` — "zojuist" / "just now" / Hindi equivalent
  - (Other relative-time keys: `relativeTimeMinutes`, `relativeTimeHours`, `relativeTimeDays`, `relativeTimeWeeks` — using the existing `date-fns` formatRelative or custom helper; planner picks)
- **D-22:** The `Translations` interface in `nl.ts` is the compile-time source of truth — adding `client.news.*` keys requires adding identical structure to en.ts and hi.ts (TypeScript will fail otherwise, same pattern as Phase 9's `operator.news.*`).

### Reused component

- **D-23:** `NewsContentRenderer` from `src/components/admin/news-preview-modal.tsx` is imported as-is. Its props are `{ image_url: string | null, title: string, body: string }`. Both the overlay (single item) and the sidebar detail view pass already-localized `title`/`body` strings (no language prop — caller picks).

### Claude's Discretion (additional defaults)

- **D-24:** Body text in overlay and sidebar detail view preserves newlines via CSS `whitespace-pre-line` (so operator-authored line breaks render correctly). No markdown parsing — plain text only per SPEC.
- **D-25:** Overlay button visual treatment matches the brand-color CTA pattern used by `RefreshButton`: `rounded-xl bg-[var(--brand-color)] px-6 py-3 text-base font-semibold text-white shadow-md`. This makes the dismiss action feel like a primary action and respects the per-tenant theming.
- **D-26:** Sidebar list items use a card-like treatment with hover state: `rounded-xl border border-gray-200 bg-white p-4 transition-all hover:border-gray-300 hover:shadow-sm cursor-pointer`. Matches the existing dashboard card aesthetic.
- **D-27:** Image rendering: when `image_url` is non-null, render via `<img src={image_url} alt="" className="...rounded-lg..." />` with `loading="lazy"` and a fixed aspect ratio container to prevent layout shift. The overlay shows the image full-width above the title; the sidebar detail view shows a smaller version. The sidebar list does NOT show images.
- **D-28:** Test the queue behavior with at least 2 unread items in dev — the dismiss-to-advance flow should be visible without jank. (Manual smoke verification, not an automated test.)

</decisions>

<canonical_refs>
## Canonical References

**Downstream agents MUST read these before planning or implementing.**

### Phase contract (locked)
- `.planning/phases/10-client-news-delivery-archive/10-SPEC.md` — Locked requirements, boundaries, acceptance criteria. MUST read before planning.
- `.planning/REQUIREMENTS.md` §v1.1 — REQ-IDs DELIVER-01..05 + ARCH-01..04 with descriptions.
- `.planning/ROADMAP.md` §"Phase 10: Client News Delivery & Archive" — Phase goal, success criteria, dependency on Phases 3 & 9.

### Phase 9 reuse contract (Phase 10 hard-depends on these)
- `.planning/phases/09-news-authoring-schema/09-SPEC.md` — Schema + bucket + RLS contract that Phase 10 reads from.
- `.planning/phases/09-news-authoring-schema/09-CONTEXT.md` D-05 — `NewsContentRenderer` is the Phase-10 reusable rendering surface.
- `.planning/phases/09-news-authoring-schema/09-CONTEXT.md` D-09, D-15 — `news_dismissals (user_id, news_item_id)` schema + RLS that Phase 10 INSERTs into.

### Project-level context
- `.planning/PROJECT.md` §"Constraints" — Tech stack, RLS strategy, multi-tenant via JWT claims.
- `.planning/PROJECT.md` §"Key Decisions" — Existing decisions on RLS subselects, useActionState, admin client for service operations.

### Codebase patterns to reuse
- `src/components/admin/news-preview-modal.tsx` — exports `NewsContentRenderer` (Phase 10 imports it; props `{ image_url, title, body }`).
- `src/app/(client)/dashboard/page.tsx` — current dashboard page; Phase 10 ADDS new queries here (overlay queue + sidebar archive) and renders `<NewsOverlay>` + `<NewsSidebar>` as new children.
- `src/app/(client)/dashboard/_components/refresh-button.tsx` — visual reference for the megaphone button placement and styling pattern (icon button conventions, `useT`, `--brand-color` CSS variable).
- `src/lib/i18n/translations/{nl,en,hi}.ts` — add `client.news.*` namespace; the `Translations` interface in `nl.ts` is compile-time SOT.
- `src/lib/i18n/client.ts` — `useT()` and `useLocale()` hooks for client components.
- `src/lib/i18n/server.ts` — `getLocale()` for server-side locale resolution (used in dashboard/page.tsx to pre-localize content for the overlay/sidebar).
- `src/lib/supabase/server.ts` — `createClient()` for the server-component query (RLS-enforced, NOT admin).
- `src/lib/supabase/storage.ts` — pattern for `getPublicUrl(image_path)` if not already imported in dashboard/page.tsx (the bucket is `news-images`).

### Phase 9 server actions for reference
- `src/app/(operator)/admin/news/actions.ts` — analog server-action shape; Phase 10's `dismissNewsItem` follows the same pattern but uses the request-scoped (RLS) client, not the admin client.

### Migration applied (live DB state)
- `supabase/migrations/20260429000002_news_broadcasting.sql` — applied via Supabase Studio + `migration repair`; live DB has `news_items`, `news_dismissals`, `news-images` bucket, and all RLS policies in place.

</canonical_refs>

<code_context>
## Existing Code Insights

### Reusable Assets
- **`NewsContentRenderer`** (`src/components/admin/news-preview-modal.tsx`): named export with props `{ image_url, title, body }` — Phase 10 imports as-is for both the overlay content area and the sidebar detail view. No new rendering implementation needed.
- **`useT()` + `useLocale()`** (`src/lib/i18n/client.ts`): for `client.news.*` strings and language-aware rendering in client components.
- **`getLocale()`** (`src/lib/i18n/server.ts`): for server-side locale resolution in `dashboard/page.tsx`.
- **`createClient()`** (`src/lib/supabase/server.ts`): RLS-enforced server query helper.
- **`RefreshButton` styling pattern** (`src/app/(client)/dashboard/_components/refresh-button.tsx`): reference for client-side i18n, brand-color theming, and icon-button conventions.

### Established Patterns
- **`'use client'` interactive components**: forms / buttons / sidebars use this pattern with `useState` / `useTransition` for interactivity. The overlay and sidebar are client components; their data is server-fetched and passed in.
- **Server actions module per route group**: `src/app/(operator)/admin/news/actions.ts` is the Phase-9 analog. Phase 10's `dismissNewsItem` lives at `src/app/(client)/dashboard/actions.ts`.
- **i18n namespace structure**: top-level keys like `operator.news.*`, `overview.*`, `dnc.*`, etc. New keys go under `client.news.*`. The Translations interface in `nl.ts` is compile-time enforced across all 3 languages.
- **Brand-color theming**: per-tenant CSS variable `--brand-color` (set in `(client)/layout.tsx`). The dismiss button uses `bg-[var(--brand-color)]` so the CTA color matches each client's brand.
- **Inline SVG icons**: no icon library — every icon is inline JSX. The megaphone icon follows this convention.
- **Hindi devanagari script**: `profiles.language='hi'` users render via `body_hi` / `title_hi` columns with no transliteration; same for any new i18n strings.

### Integration Points
- **`dashboard/page.tsx`**: ADD two new server-side queries (unread news + archive) and render `<NewsOverlay>` and `<NewsSidebar>` as new children. The existing data fetching for overview stats / charts / refresh button stays untouched.
- **`dashboard/page.tsx` header**: ADD `<NewsMegaphoneButton unreadCount={...} archiveItems={...}>` immediately left of `<RefreshButton />` in the same flex container.
- **i18n translation files**: ADD `client.news.*` namespace keys to all 3 language files (Translations interface compile-time SOT in nl.ts).
- **No layout changes**: `(client)/layout.tsx` is untouched. The overlay and sidebar are mounted INSIDE `dashboard/page.tsx` so they only exist on `/dashboard` (per SPEC overlay-scope decision).
- **No new packages**: everything uses existing dependencies (Tailwind, react, react-hook-form not needed here, supabase-js, date-fns is likely already installed for relative-time formatting — planner verifies).

</code_context>

<specifics>
## Specific Ideas

- "Professionele uitstraling" — the user explicitly wanted this to look professional. The decisions above lean on existing dashboard chrome conventions (RefreshButton aesthetic, card-like list items, brand-color CTA) so the new surface feels native rather than bolted on.
- "Gebruikersvriendelijkheid" — the queue model with auto-advance, the explicit single-button dismiss, the body scroll-lock, and the badge with unread count are all chosen for clarity. The user shouldn't have to wonder how to dismiss or whether they missed an item.
- The deliberate divergence from "every other modal in the project closes on Escape" is documented inline in `news-overlay.tsx` so a future contributor doesn't "fix" it back to standard modal behavior. This is the second-most-important UX nuance (after the queue model).

</specifics>

<deferred>
## Deferred Ideas

None — discussion stayed within phase scope.

The following came up earlier and remain documented in REQUIREMENTS.md "Future Requirements" or "Out of Scope":
- Real-time push when news is published — explicitly deferred per SPEC out-of-scope
- Targeting news to specific tenants/clients — TARGET-01 (v1.2)
- Scheduled publish/withdraw — TARGET-02 (v1.2)
- Read/dismiss analytics — ENGAGE-01 (v1.2)
- Call-to-action buttons in news — ENGAGE-02 (v1.2)
- Megaphone / overlay on dashboard subroutes — explicitly deferred per SPEC out-of-scope
- Refactor `NewsContentRenderer` out of `src/components/admin/` to a neutral location — naming wart, post-v1.1 cleanup task

</deferred>

---

*Phase: 10-client-news-delivery-archive*
*Context gathered: 2026-04-30*
