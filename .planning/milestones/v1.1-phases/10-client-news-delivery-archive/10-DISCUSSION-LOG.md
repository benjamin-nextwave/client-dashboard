# Phase 10: Client News Delivery & Archive - Discussion Log

> **Audit trail only.** Do not use as input to planning, research, or execution agents.
> Decisions are captured in CONTEXT.md — this log preserves the alternatives considered.

**Date:** 2026-04-30
**Phase:** 10-client-news-delivery-archive
**Areas discussed:** (user delegated all implementation choices to Claude)

---

## User delegation

The user was offered four discussion areas (Sidebar shape, Sidebar detail view, Overlay animation, Dismiss + queue advance) and chose:

> "Niks, ik vertrouw dat jij de beste keuzes kan maken voor gebruikersvriendelijkheid en een professionele uitstraling"

All implementation decisions were made by Claude based on existing project patterns, dashboard UX conventions, and the goal of making this surface feel native to the existing dashboard chrome.

---

## Claude's Discretion (D-01..D-28)

All 28 decisions documented in CONTEXT.md `<decisions>`. Highlights of the most consequential choices:

### Sidebar shape (D-08, D-10)
| Option | Description | Selected |
|--------|-------------|----------|
| Right slide-in panel | Width ~420px desktop / full-width mobile, fixed top-right, slide-in from right with 250ms ease-out transition, semi-transparent backdrop, closeable via X / Escape / click-outside | ✓ |
| Fixed right panel (always visible) | Persistent — would shift dashboard layout | |
| Centered modal | Less integrated, competes with overlay z-index | |
| Drawer that pushes content | Less common in modern dashboards | |

**Rationale:** Right slide-in is the standard pattern in modern dashboards (Stripe, Linear, etc.). It doesn't disrupt the underlying layout, gives the news content enough space, and matches user mental models for "side info that I can summon and dismiss."

### Sidebar detail view (D-10)
| Option | Description | Selected |
|--------|-------------|----------|
| Replace list with detail in same panel + "back to list" affordance | Cleaner mental model, no nested layers | ✓ |
| Modal on top of sidebar | Two layers of overlay UI — confusing | |
| Inline expand within list item | Awkward for long bodies | |
| Two-pane (list left + detail right) | Sidebar too narrow (420px) for two columns | |

**Rationale:** "Replace + back" matches how email clients, Slack channel info panels, and Linear issue views handle this pattern. Single z-layer, predictable nav.

### Overlay animation (D-04)
| Option | Description | Selected |
|--------|-------------|----------|
| Backdrop fade + content scale-in | Subtle, professional, signals "important content arrived" without being jarring (200ms ease-out, scale-95→100 + opacity 0→1) | ✓ |
| Fade-only | Less presence, item arrival can be missed | |
| Slide-up | More dynamic but distracting; doesn't fit calm dashboard tone | |
| No animation | Jarring; instant overlay feels like a popup ad | |

**Rationale:** Subtle scale-in is the dominant pattern for dialog/modal arrival in modern web UIs (Tailwind UI, shadcn, headless UI examples). Communicates "new content" without competing with the actual message.

### Dismiss + queue advance (D-07, D-16)
| Option | Description | Selected |
|--------|-------------|----------|
| Client-state queue + per-dismiss server action (no router refresh) | Smooth advance through unread items in one session; server action inserts dismissal row idempotently; queue state stays in memory until last dismiss | ✓ |
| Server action with redirect/revalidate per dismiss | Page reload between every item — sluggish | |
| Single bulk-dismiss action | Doesn't match per-item read-receipt semantics | |

**Rationale:** Per-item dismiss + client-side advance gives the smoothest UX while keeping the server as source of truth. The server action uses `upsert ... ignoreDuplicates: true` so double-clicks are safe; RLS enforces `WITH CHECK (user_id = auth.uid())` so a malicious client cannot forge dismissals for other users.

### Other defaults locked
- **File layout (D-01..D-03):** All Phase 10 components in `src/app/(client)/dashboard/_components/`; server action in `src/app/(client)/dashboard/actions.ts`. `NewsContentRenderer` imported from existing Phase 9 location (`src/components/admin/news-preview-modal.tsx`) — no rename / move.
- **Body scroll-lock during overlay (D-05):** standard `document.body.style.overflow = 'hidden'` on mount, restored on unmount.
- **Single dismiss path locked with code comment (D-06):** the deliberate divergence from "every other modal closes on Escape" is documented inline in `news-overlay.tsx` so future contributors don't "fix" it back to standard.
- **Megaphone visual (D-12..D-15):** outlined icon-only button (intentionally less prominent than brand-colored RefreshButton — secondary action). Red badge with unread count when count > 0.
- **Server queries in dashboard/page.tsx (D-17..D-20):** two queries (unread + archive) at server-render time; results pre-localized server-side and passed as props. No client-side fetching during page load.
- **i18n strings (D-21, D-22):** new `client.news.*` namespace; identical structure across nl/en/hi files (Translations interface SOT in nl.ts).
- **Image handling (D-27):** `<img>` with `loading="lazy"` and fixed aspect ratio container; sidebar list does NOT show images (only title + preview + date).

## Deferred Ideas

No new deferred ideas surfaced — the discussion stayed within Phase 10 scope. Pre-existing deferrals remain documented in REQUIREMENTS.md (TARGET-01, TARGET-02, ENGAGE-01, ENGAGE-02) and SPEC.md out-of-scope section.
