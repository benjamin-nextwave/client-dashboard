# Milestones

## v1.0 MVP (Shipped: 2026-02-15)

**Phases completed:** 8 phases, 25 plans, 51 tasks
**Timeline:** 2026-02-15 (single-day build, ~81 min total execution)
**Requirements:** 38/38 v1 requirements shipped

**Delivered:** Multi-tenant white-label dashboard platform for NextWave Solutions enabling 15+ B2B clients to view campaign performance and reply to positive leads from branded portals.

**Key accomplishments:**
1. Multi-tenant foundation with RLS policies, JWT claims injection, and pgTAP isolation tests
2. Operator admin panel for full client CRUD with Instantly.ai campaign association
3. White-labeled client dashboards with per-tenant CSS variable theming (logo + primary color)
4. Instantly.ai sync engine with campaign analytics and Overzicht dashboard (charts, KPI cards)
5. Gmail-style inbox with email threading, reply/compose, and cached conversation threads
6. End-to-end CSV workflow with DNC management, filtering, export, and auto-cleanup

**Tech stack:** Next.js 15 (App Router), TypeScript, Tailwind CSS, Supabase (PostgreSQL + Auth + Storage), Recharts, PapaParse

---

## v1.1 News Broadcasting (Shipped: 2026-04-30)

**Phases completed:** 2 phases (9 + 10), 12 plans
**Timeline:** 2026-04-29 to 2026-04-30 (two-day cycle)
**Requirements:** 15/15 v1.1 requirements shipped (NEWS-01..06 + DELIVER-01..05 + ARCH-01..04)

**Delivered:** Operator-broadcast multilingual news system. Operators can author news items with image + NL/EN/Hindi variants, publish them globally, and withdraw at will. Clients see new published items as a full-screen overlay-on-open at /dashboard with persistent per-user dismissal, and can revisit any currently-published news from a megaphone-button-triggered slide-in sidebar.

**Key accomplishments:**
1. New schema: `news_items` (multilingual content + status lifecycle: draft/published/withdrawn) + `news_dismissals` (per-user composite-PK dismissal tracking)
2. New `news-images` Supabase Storage bucket (2MB, png/jpeg/webp; SVG explicitly excluded for XSS surface reduction)
3. Operator admin section at `/admin/news` with card-grid list + 3-tab create/edit form (NL/EN/Hindi) + preview modal + status-aware actions (publish requires all 3 languages; soft-delete withdraw)
4. Client-side overlay queue with single dismiss path ("Ik heb het gelezen" — no Escape, no backdrop, no X) and body scroll lock
5. Megaphone-button slide-in sidebar (right-side, 420px, slideInFromRight keyframe) showing full archive with list ↔ detail navigation; reuses presentational `NewsContentRenderer` from operator preview modal
6. Server-authoritative publish gate (DB re-read in publishNewsItem; cannot bypass via crafted FormData)
7. RLS policies: operators full CRUD; clients SELECT only published rows; per-user `news_dismissals` write enforced by `WITH CHECK (user_id = auth.uid())`

**Notable bug surfaces & fixes:**
- `'use server'` files cannot export types — `export type { Locale }` from `src/lib/i18n/actions.ts` produced a runtime ReferenceError on the client dashboard once Phase 9 forced a re-bundle. Removed (commit `040a936`).
- React 19 + Next.js 15 + RHF + soft-nav redirect: form `defaultValues` from `useForm()` did not populate inputs reliably after `redirect()` from a server action; fixed by adding explicit JSX `defaultValue` on each input + a `key={row.id}` on the form to force fresh mount (commit `0bdedb2`).
- Pre-existing migration drift on the linked Supabase project surfaced when `supabase db push --linked` was attempted — 20 unrelated migrations (April 10 onwards) had been applied via Studio without `db push`. Phase 9 worked around by deploying the migration via Studio + `migration repair --status applied 20260429000002`. The other 20 migrations remain drift-y; out of scope for v1.1.

**Tech stack:** Unchanged from v1.0 (Next.js 15 + TypeScript + Tailwind 4 + Supabase). New keyframe added to globals.css (`slideInFromRight` for sidebar animation); no new dependencies.

---
