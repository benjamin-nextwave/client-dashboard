# NextWave Solutions — Client Dashboard Platform

## What This Is

A multi-tenant dashboard platform for NextWave Solutions, a B2B cold email outreach agency. The platform has two sides: an internal operator dashboard for managing client accounts and campaign data, and white-labeled client dashboards where each client views their campaign statistics, manages their inbox, previews upcoming contacts, and controls their do-not-contact lists. All client-facing pages are in Dutch (Nederlands).

## Core Value

Clients can see their campaign performance and reply to positive leads directly from their branded dashboard — keeping the entire outreach workflow in one place.

## Requirements

### Validated

(None yet — ship to validate)

### Active

- [ ] Multi-tenant client dashboards with white-label branding (logo + primary color)
- [ ] Operator admin panel for creating/managing client dashboards
- [ ] Overview page ("Overzicht") with campaign statistics, contact charts, and ICP breakdown
- [ ] Professional inbox for viewing and replying to positive leads from original sender accounts
- [ ] 7-day preview of upcoming contacts with client-side removal
- [ ] Sent emails read-only view
- [ ] Do-not-contact management (manual entry, domain blocking, CSV import)
- [ ] CSV import/export workflow with automatic DNC filtering for operators
- [ ] Error monitoring dashboard for operators
- [ ] Instantly.ai API integration for campaign data, replies, and email sending
- [ ] Role-based authentication (operator vs. client)
- [ ] Meetings page (external URL redirect per client)

### Out of Scope

- Client self-service password changes — deferred to post-v1
- Full theme customization (fonts, multiple colors) — primary color + logo is sufficient
- Mobile-native app — web responsive is enough
- Operator permission levels — all 3 operators are equal admins
- Automated ICP analysis with AI insights — v1 uses static chart breakdowns
- Real-time notifications/websockets — standard page loads sufficient

## Context

- **Agency:** NextWave Solutions is a B2B cold email outreach agency with 15+ active clients
- **Operators:** Three team members (Merlijn, Kix, Benjamin) — all full admin access
- **Instantly.ai:** Active accounts with API keys, campaigns already running. Instantly handles reply sentiment classification (positive/negative/neutral)
- **CSV workflow:** Mostly standardized column names across clients (email, company_name, first_name, last_name, job_title, industry, linkedin_url, etc.) with occasional extra columns per client. All original columns must be preserved through import/export
- **Some clients are recruitment agencies** — these need vacancy/job posting URLs visible in contact details
- **Language:** All client-facing UI in Dutch. Operator dashboard can be English or Dutch
- **Current process:** Manual — this platform replaces spreadsheet-based tracking and fragmented email management

## Constraints

- **Tech stack:** Next.js (App Router) + TypeScript + Tailwind CSS — non-negotiable
- **Database:** Supabase (PostgreSQL) — chosen for integrated auth, storage, and realtime capabilities
- **Deployment:** Vercel — Next.js native hosting
- **Email API:** Instantly.ai API — all campaign data and email sending goes through Instantly
- **Email threading:** Replies from the dashboard must use proper In-Reply-To/References headers and send from the original sender account
- **Data isolation:** Strict multi-tenancy with client_id foreign keys across all tables
- **CSV fidelity:** Full original CSV columns stored in JSONB, exported intact after filtering

## Key Decisions

| Decision | Rationale | Outcome |
|----------|-----------|---------|
| Supabase over Neon | Integrated auth + storage + Postgres in one platform | — Pending |
| Vercel for deployment | Native Next.js support, easy CI/CD | — Pending |
| Primary color + logo only for branding | Keeps white-labeling simple, sufficient for client differentiation | — Pending |
| Instantly handles sentiment | Avoids building our own NLP, Instantly already classifies replies | — Pending |
| Static ICP charts for v1 | Automated pattern detection is complex, charts + manual interpretation works for now | — Pending |
| All operators are equal admins | Only 3 operators, no need for granular permissions | — Pending |
| Dutch client UI, flexible operator UI | Clients are Dutch businesses, operators are internal team | — Pending |

---
*Last updated: 2026-02-15 after initialization*
