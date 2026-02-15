# Roadmap: NextWave Solutions Client Dashboard Platform

## Overview

This roadmap delivers a multi-tenant white-label dashboard platform enabling NextWave Solutions to provide 15+ B2B clients with self-service campaign visibility and lead management. The journey begins with bulletproof multi-tenant security foundation, progresses through operator admin tools and Instantly.ai integration for campaign data, and culminates with client-facing inbox, CSV workflows, and transparency features. The platform replaces manual spreadsheet-based tracking and fragmented email management with a unified dashboard where clients see performance and reply to positive leads directly from their branded portal.

## Phases

**Phase Numbering:**
- Integer phases (1, 2, 3): Planned milestone work
- Decimal phases (2.1, 2.2): Urgent insertions (marked with INSERTED)

Decimal phases appear between their surrounding integers in numeric order.

- [x] **Phase 1: Foundation & Multi-tenancy** - Secure authentication and tenant isolation
- [x] **Phase 2: Operator Admin Core** - Client account creation and management
- [x] **Phase 3: Client Dashboard Shell & Branding** - White-labeled UI foundation
- [ ] **Phase 4: Instantly.ai Integration & Campaign Stats** - External API integration and statistics display
- [ ] **Phase 5: Inbox & Reply Functionality** - Lead management and email replies
- [ ] **Phase 6: CSV Import/Export & DNC Management** - Data workflows and filtering
- [ ] **Phase 7: Contact Preview & Sent Emails** - Transparency and control features
- [ ] **Phase 8: Polish & Error Monitoring** - Quality of life and production monitoring

## Phase Details

### Phase 1: Foundation & Multi-tenancy
**Goal**: Operators and clients can securely authenticate with role-based access, and all data is strictly isolated per tenant with no cross-client leakage possible

**Depends on**: Nothing (first phase)

**Requirements**: AUTH-01, AUTH-02, AUTH-03, AUTH-04

**Success Criteria** (what must be TRUE):
  1. Operator can log in with admin credentials and access the operator dashboard
  2. Client can log in with client credentials and access only their own dashboard
  3. All database queries enforce client_id filtering via Row Level Security policies
  4. User session persists across browser refresh without requiring re-authentication
  5. Integration tests verify Client A cannot access Client B data through any query path

**Plans:** 3 plans

Plans:
- [x] 01-01-PLAN.md -- Project scaffolding, Supabase init, database migrations (schema + RLS + hook + seed)
- [x] 01-02-PLAN.md -- Auth infrastructure, login page, middleware, role-based route groups
- [x] 01-03-PLAN.md -- pgTAP tenant isolation test suite

---

### Phase 2: Operator Admin Core
**Goal**: Operators can create and manage client accounts with full branding configuration and campaign associations

**Depends on**: Phase 1

**Requirements**: OADM-01, OADM-02, OADM-03

**Success Criteria** (what must be TRUE):
  1. Operator can create a new client with company name, credentials, recruitment toggle, primary color, logo, and meeting URL
  2. Operator can select one or more Instantly.ai campaigns to associate with a client
  3. Operator can edit existing client settings (branding, credentials, campaigns, recruitment toggle, meeting URL)
  4. Client branding assets (logos) are stored securely with tenant-scoped paths preventing cross-tenant access

**Plans:** 3 plans

Plans:
- [x] 02-01-PLAN.md -- Database migration (client_campaigns, storage bucket, RLS), install packages, shared lib utilities (Zod, Instantly client, storage helpers)
- [x] 02-02-PLAN.md -- Client list page, create client form with all fields, transactional createClient server action
- [x] 02-03-PLAN.md -- Edit client page with pre-populated form, updateClient server action, human verification checkpoint

---

### Phase 3: Client Dashboard Shell & Branding
**Goal**: Clients see their branded dashboard layout with company logo, primary color theming, and Dutch-language navigation

**Depends on**: Phase 2

**Requirements**: BRND-01, BRND-02, BRND-03

**Success Criteria** (what must be TRUE):
  1. Client dashboard displays the client's company logo in the navigation
  2. Client dashboard applies the client's primary color as the brand color throughout the UI
  3. All client-facing pages display text in Dutch (Nederlands)
  4. Each client sees only their own branding (no leakage of other clients' logos or colors)
  5. Dashboard layout includes navigation to all feature pages (Overzicht, Inbox, Verzonden, Voorkeuren, DNC, Afspraken)

**Plans:** 2 plans

Plans:
- [x] 03-01-PLAN.md -- Tailwind @theme inline theming, getClientBranding helper, sidebar nav components, branded layout rewrite
- [x] 03-02-PLAN.md -- Placeholder pages for all 6 routes, human verification of branded shell

---

### Phase 4: Instantly.ai Integration & Campaign Stats
**Goal**: Clients see aggregated campaign statistics from their associated Instantly.ai campaigns without knowing campaign names or technical details

**Depends on**: Phase 3

**Requirements**: INST-01, INST-02, INST-03, INST-04, STAT-01, STAT-02, STAT-03, STAT-04, STAT-05, STAT-06, STAT-07, STAT-08, STAT-09, STAT-10

**Success Criteria** (what must be TRUE):
  1. System successfully syncs campaign data from Instantly.ai API for each client's associated campaigns
  2. Client sees "Reactie vereist" alert showing count of unanswered positive replies
  3. Client sees monthly statistics (total replies, positive leads, sent emails)
  4. Client sees "Contacten in database" with modal showing full contact list
  5. Client sees contact status chart (emailed, not yet emailed, replied, bounced)
  6. Client sees ICP breakdown charts (industry distribution, job title distribution, patterns among positive leads)
  7. All campaign data is aggregated across associated campaigns — client never sees campaign names or count
  8. System tracks which sender account was used for each contact to enable proper reply routing

**Plans:** 5 plans

Plans:
- [ ] 04-01-PLAN.md -- Database migration (synced_leads, campaign_analytics tables with RLS), extend Instantly API client, create sync module
- [ ] 04-02-PLAN.md -- Cron sync endpoint, dashboard data aggregation query helpers
- [ ] 04-03-PLAN.md -- Install Recharts/date-fns, stats cards component, contact list modal component
- [ ] 04-04-PLAN.md -- Chart components (contact status, ICP charts), wire up Overzicht page with all components
- [ ] 04-05-PLAN.md -- Build verification and visual checkpoint of complete dashboard

---

### Phase 5: Inbox & Reply Functionality
**Goal**: Clients can view positive leads, read conversation threads, and reply directly from the dashboard with proper email threading

**Depends on**: Phase 4

**Requirements**: INBX-01, INBX-02, INBX-03, INBX-04, INBX-05, INBX-06

**Success Criteria** (what must be TRUE):
  1. Client sees a Gmail-style inbox showing only positive replies with sender name, company, subject, preview text, and date/time
  2. Client can click a reply to open full conversation thread with all contact details (name, company, job title, email, LinkedIn)
  3. Client can reply to a lead directly from the dashboard, sent from the original sender account
  4. Replies appear in the same email thread in recipient's inbox (proper In-Reply-To and References headers)
  5. Client can compose a new outbound email to any positive lead via "Nieuwe Email" button
  6. Each lead displays status label: "Nieuwe lead" (unanswered) or "In gesprek" (conversation ongoing)
  7. For recruitment clients, inbox contact details include the vacancy/job posting URL

**Research Flag**: NEEDS RESEARCH — Email threading header support (Message-ID, In-Reply-To, References) in Instantly.ai API must be verified.

**Plans**: TBD

Plans:
- [ ] TBD (to be planned)

---

### Phase 6: CSV Import/Export & DNC Management
**Goal**: Operators can upload CSVs for 7-day preview, apply DNC filtering, and export cleaned CSVs while clients manage their do-not-contact lists

**Depends on**: Phase 5

**Requirements**: OADM-04, OADM-05, OADM-06, DNC-01, DNC-02, DNC-03, DNC-04, DNC-05

**Success Criteria** (what must be TRUE):
  1. Operator can upload a CSV for a client's 7-day preview, preserving all original columns in JSONB
  2. Operator can apply one-click DNC filtering that removes client-removed contacts, DNC email matches, and DNC domain matches
  3. Operator can export a cleaned CSV with all original columns intact after DNC filtering
  4. Client can manually add individual email addresses to their do-not-contact list
  5. Client can add entire domains (e.g., @domein.nl) to block all emails to that company
  6. Client can upload a CSV with an "Email" column to bulk-add addresses to the DNC list
  7. Client can view their current DNC list (emails and domains) and remove entries
  8. CSV upload handles 20k+ row files without Vercel timeout or memory issues

**Plans**: TBD

Plans:
- [ ] TBD (to be planned)

---

### Phase 7: Contact Preview & Sent Emails
**Goal**: Clients can preview upcoming contacts with 7-day window and removal capability, plus view all sent campaign emails

**Depends on**: Phase 6

**Requirements**: PREV-01, PREV-02, PREV-03, SENT-01, SENT-02, SENT-03

**Success Criteria** (what must be TRUE):
  1. Client sees a 7-day preview table of upcoming contacts with columns: full name, company name, contact date, sector/industry, job title
  2. Client can remove individual contacts from the preview with a delete button
  3. Removed contacts are flagged and excluded during operator's DNC filtering export
  4. Client sees a read-only sent mailbox view of all outgoing campaign emails
  5. Client can click a sent email to view full details (recipient, subject, body, date/time)
  6. Sent emails page has no reply, forward, or compose actions (read-only only)

**Plans**: TBD

Plans:
- [ ] TBD (to be planned)

---

### Phase 8: Polish & Error Monitoring
**Goal**: Operators have error monitoring dashboard and clients have meetings page redirect functionality

**Depends on**: Phase 7

**Requirements**: OADM-07, MEET-01, MEET-02

**Success Criteria** (what must be TRUE):
  1. Operator can view an error monitoring dashboard showing API failures, import errors, and sync issues
  2. Error dashboard displays client name, error type, timestamp, and resolution status
  3. Client meetings page redirects to the external URL configured per client by the operator
  4. If no custom meeting URL is set, meetings page redirects to the default NextWave meetings URL
  5. All pages have proper loading states and error boundaries for production readiness

**Plans**: TBD

Plans:
- [ ] TBD (to be planned)

---

## Progress

**Execution Order:**
Phases execute in numeric order: 1 -> 2 -> 3 -> 4 -> 5 -> 6 -> 7 -> 8

| Phase | Plans Complete | Status | Completed |
|-------|----------------|--------|-----------|
| 1. Foundation & Multi-tenancy | 3/3 | Complete | 2026-02-15 |
| 2. Operator Admin Core | 3/3 | Complete | 2026-02-15 |
| 3. Client Dashboard Shell & Branding | 2/2 | Complete | 2026-02-15 |
| 4. Instantly.ai Integration & Campaign Stats | 0/5 | In progress | - |
| 5. Inbox & Reply Functionality | 0/TBD | Not started | - |
| 6. CSV Import/Export & DNC Management | 0/TBD | Not started | - |
| 7. Contact Preview & Sent Emails | 0/TBD | Not started | - |
| 8. Polish & Error Monitoring | 0/TBD | Not started | - |

---
*Roadmap created: 2026-02-15*
*Last updated: 2026-02-15 (Phase 4 planned)*
