# NextWave Solutions — Client Dashboard Platform

## What This Is

A multi-tenant white-label dashboard platform for NextWave Solutions, a B2B cold email outreach agency. The platform has two sides: an internal operator dashboard for managing client accounts, campaign data, CSV workflows, and error monitoring; and white-labeled client dashboards where each client views their campaign statistics, manages their inbox, previews upcoming contacts, views sent emails, and controls their do-not-contact lists. All client-facing pages are in Dutch (Nederlands).

## Core Value

Clients can see their campaign performance and reply to positive leads directly from their branded dashboard — keeping the entire outreach workflow in one place.

## Requirements

### Validated

- ✓ Multi-tenant client dashboards with white-label branding (logo + primary color) — v1.0
- ✓ Operator admin panel for creating/managing client dashboards — v1.0
- ✓ Overview page ("Overzicht") with campaign statistics, contact charts, and ICP breakdown — v1.0
- ✓ Professional inbox for viewing and replying to positive leads from original sender accounts — v1.0
- ✓ 7-day preview of upcoming contacts with client-side removal — v1.0
- ✓ Sent emails read-only view — v1.0
- ✓ Do-not-contact management (manual entry, domain blocking, CSV import) — v1.0
- ✓ CSV import/export workflow with automatic DNC filtering for operators — v1.0
- ✓ Error monitoring dashboard for operators — v1.0
- ✓ Instantly.ai API integration for campaign data, replies, and email sending — v1.0
- ✓ Role-based authentication (operator vs. client) — v1.0
- ✓ Meetings page (external URL redirect per client) — v1.0

### Active

(None yet — define with `/gsd:new-milestone`)

### Out of Scope

- Client self-service password changes — deferred to post-v1
- Full theme customization (fonts, multiple colors) — primary color + logo is sufficient
- Mobile-native app — web responsive is enough
- Operator permission levels — all 3 operators are equal admins
- Automated ICP analysis with AI insights — v1 uses static chart breakdowns
- Real-time notifications/websockets — standard page loads sufficient
- Offline mode — web-only platform

## Context

Shipped v1.0 with Next.js 15 (App Router), TypeScript, Tailwind CSS, Supabase (PostgreSQL + Auth + Storage), Recharts, PapaParse.
Deployed on Vercel. Instantly.ai API for all campaign data and email operations.
8 phases, 25 plans, 51 tasks completed in ~81 minutes.
38/38 v1 requirements shipped.
Platform serves 15+ B2B clients with 3 operator admins (Merlijn, Kix, Benjamin).

## Constraints

- **Tech stack:** Next.js (App Router) + TypeScript + Tailwind CSS — non-negotiable
- **Database:** Supabase (PostgreSQL) — chosen for integrated auth, storage, and realtime capabilities
- **Deployment:** Vercel — Next.js native hosting
- **Email API:** Instantly.ai API — all campaign data and email sending goes through Instantly
- **Email threading:** Replies from the dashboard use Instantly's reply_to_uuid mechanism for proper threading
- **Data isolation:** Strict multi-tenancy with client_id foreign keys and RLS across all tables
- **CSV fidelity:** Full original CSV columns stored in JSONB, exported intact after filtering

## Key Decisions

| Decision | Rationale | Outcome |
|----------|-----------|---------|
| Supabase over Neon | Integrated auth + storage + Postgres in one platform | ✓ Good — single platform for auth, storage, DB |
| Vercel for deployment | Native Next.js support, easy CI/CD | ✓ Good |
| Primary color + logo only for branding | Keeps white-labeling simple, sufficient for client differentiation | ✓ Good — CSS variable per-tenant theming works well |
| Instantly handles sentiment | Avoids building our own NLP, Instantly already classifies replies | ✓ Good — no custom NLP needed |
| Static ICP charts for v1 | Automated pattern detection is complex, charts + manual interpretation works for now | ✓ Good — Recharts delivers clean visuals |
| All operators are equal admins | Only 3 operators, no need for granular permissions | ✓ Good |
| Dutch client UI, flexible operator UI | Clients are Dutch businesses, operators are internal team | ✓ Good |
| Next.js 15.5.12 over 16 | Better Supabase compatibility per research | ✓ Good |
| RLS SELECT auth.jwt() wrappers | All policies use subselect for 95%+ performance improvement | ✓ Good |
| useActionState for forms | React 19 pattern for server action state management | ✓ Good |
| Admin client for service operations | service_role bypasses RLS for admin writes (storage, cache, errors) | ✓ Good — consistent pattern across all phases |
| TypeScript-side aggregation | Supabase JS client lacks GROUP BY; aggregate in TS for manageable datasets | ✓ Good |
| 5-min TTL email cache | Balances Instantly API rate limits with data freshness | ✓ Good |
| reply_to_uuid for threading | Instantly API v2 handles threading natively, no custom SMTP headers | ✓ Good |
| PapaParse client-side parsing | Handles 20k+ row CSVs without Vercel timeout | ✓ Good |
| Soft-delete via is_excluded | Preserves data, integrates with DNC filter | ✓ Good |
| Await logError (not fire-and-forget) | Serverless safety — ensures error is written before function exits | ✓ Good |

---
*Last updated: 2026-02-15 after v1.0 milestone*
