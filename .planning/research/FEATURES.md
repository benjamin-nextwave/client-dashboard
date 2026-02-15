# Feature Research

**Domain:** Multi-tenant B2B client dashboard for cold email outreach agency
**Researched:** 2026-02-15
**Confidence:** MEDIUM (based on training data knowledge of Instantly.ai ecosystem, cold email agency tooling, and B2B portal patterns; WebSearch/WebFetch unavailable for live verification)

## Feature Landscape

### Table Stakes (Users Expect These)

Features clients assume exist. Missing these = product feels incomplete or unprofessional.

| Feature | Why Expected | Complexity | Notes |
|---------|--------------|------------|-------|
| Campaign statistics overview | Clients pay for outreach, they need to see what they are getting. Emails sent, open rates, reply rates, lead counts are the bare minimum. | MEDIUM | Pull from Instantly.ai API. Need data sync strategy (cron vs on-demand). The "Overzicht" page. |
| Positive lead inbox | The whole point of cold email is generating replies. Clients must see and act on positive leads immediately. | HIGH | Requires Instantly API for fetching replies, sentiment filtering (Instantly provides this), and sending replies via original sender account with proper threading headers. |
| Reply functionality from dashboard | If clients can see leads but must switch to a separate email client to reply, the portal is half-finished. Reply-from-dashboard is table stakes for an agency portal. | HIGH | Must send via Instantly API using original sender mailbox. In-Reply-To / References headers required for proper threading. This is the hardest table-stakes feature. |
| White-label branding (logo + primary color) | Clients expect the portal to feel like "their" tool, not a generic third-party product. Agencies that do not white-label look less professional. | LOW | Logo upload + primary color per tenant. CSS custom properties make this straightforward. |
| Role-based access (operator vs client) | Operators must see everything; clients must see only their own data. Data leakage between tenants is a trust-killer. | MEDIUM | Supabase auth + RLS policies. Two roles: operator (admin) and client. Simple but must be bulletproof. |
| Do-not-contact (DNC) list management | Clients always have people/companies they do not want contacted. Legal compliance (GDPR in NL/EU) and client trust require this. | MEDIUM | Manual entry, domain blocking, CSV import. Must filter against DNC before any CSV export for campaigns. |
| Upcoming contacts preview (7-day) | Clients want to see who will be contacted next so they can remove inappropriate contacts. Standard in agency portals. | MEDIUM | Pull from Instantly or from imported CSV queue. Client-side removal means a "skip" or "remove" action per contact. |
| Sent emails view (read-only) | Clients want to verify what was sent on their behalf. Trust and transparency feature. | LOW | Read-only list of sent emails with recipient, subject, timestamp, body preview. Pull from Instantly API. |
| CSV import/export for operators | Operators import prospect lists and export filtered lists. This is the core operational workflow replacing spreadsheets. | MEDIUM | Must preserve all original columns (JSONB), apply DNC filtering on export, handle various column name formats. |
| Secure authentication | Clients log in to see sensitive business data (leads, contacts, email content). Basic auth with secure sessions is non-negotiable. | LOW | Supabase Auth handles this. Email/password login per client. |
| Meeting scheduling link | Clients need a way to book meetings with generated leads. Even a simple redirect to Calendly/Cal.com is expected. | LOW | External URL redirect per client. Operator configures URL. Minimal implementation. |
| Data isolation between tenants | A client must never see another client's data. Even a single data leak destroys trust and may violate GDPR. | MEDIUM | Supabase RLS with client_id on every table. Must be enforced at DB level, not just application level. |

### Differentiators (Competitive Advantage)

Features that set the product apart from competitors. Not expected by default, but create real value.

| Feature | Value Proposition | Complexity | Notes |
|---------|-------------------|------------|-------|
| Contact detail richness (LinkedIn, job title, company, vacancy URL) | Most agency portals show email + name. Showing full ICP data (especially vacancy URLs for recruitment clients) makes leads immediately actionable. | LOW | Data already exists in imported CSVs. Just surface it in the UI alongside inbox items and contact previews. |
| ICP breakdown charts | Visual charts showing industry, job title, company size distribution gives clients confidence that targeting is correct. Competitors rarely offer this. | MEDIUM | Static charts (recharts/chart.js) built from CSV import data. v1 does not need AI analysis -- aggregated bar/pie charts are enough. |
| Operator error monitoring dashboard | Proactive error detection (API sync failures, bounced emails, import errors) prevents client complaints before they happen. Most agency tools lack this. | MEDIUM | Dedicated operator view showing sync failures, API errors, import issues. Log-based with severity levels. |
| Dutch-language client UI | For a Netherlands-based agency, a fully Dutch interface (not just translated labels but proper Dutch UX copy) creates a polished, local feel that English-only competitors cannot match. | LOW | Hardcoded Dutch strings (no i18n framework needed for v1 since only one client language). Operator UI can stay English. |
| Per-client campaign grouping | Clients with multiple campaigns see them grouped logically rather than as a flat list. Provides clarity for clients running parallel campaigns (e.g., different ICPs). | LOW | Group by campaign in overview stats. Instantly API provides campaign-level data. |
| CSV column preservation through round-trip | Operators import CSVs with varied schemas, the system stores all original columns, and exports include them intact after DNC filtering. Most tools normalize and lose custom columns. | MEDIUM | JSONB storage for raw CSV data. Export reconstructs original columns. Key differentiator for operator workflow. |
| Branded login page per client | Each client gets a login page with their logo and colors, not a generic portal login. Creates an "own product" feeling. | LOW | Dynamic login page based on client slug/subdomain. Pulls branding from client config. Small effort, big perception impact. |
| Lead status tracking | Allow clients to mark leads as "contacted", "meeting booked", "not interested", "deal closed". Turns the inbox from a notification feed into a lightweight CRM. | MEDIUM | Status enum per lead. Filter/sort by status. Simple but very useful for client workflow. |

### Anti-Features (Commonly Requested, Often Problematic)

Features that seem good but create complexity, maintenance burden, or user confusion disproportionate to their value.

| Feature | Why Requested | Why Problematic | Alternative |
|---------|---------------|-----------------|-------------|
| Real-time websocket updates | "I want to see new leads appear instantly" | Adds infrastructure complexity (websocket server, connection management, state sync) for a dashboard that clients check a few times per day. Supabase Realtime adds cost and complexity. | Polling on page load or manual refresh button. Data freshness of 15-30 minutes is perfectly acceptable for this use case. |
| Full email client (threads, attachments, CC/BCC) | "Can we make it like Gmail?" | Building email client features is a bottomless pit. Threading alone is complex; attachments, CC/BCC, drafts, and forwarding each add weeks. The goal is replying to positive leads, not replacing Gmail. | Simple reply-to-lead with plain text. One reply box per lead. If conversation gets complex, it moves to real email. |
| AI-powered lead scoring / ICP analysis | "Can AI tell us which leads are best?" | Requires ML pipeline, training data, ongoing tuning. For 15 clients with varied ICPs, the model would be too generic to be useful. High cost, low accuracy at this scale. | Static ICP breakdown charts + Instantly's built-in sentiment classification. Operators manually flag high-quality leads if needed. |
| Client self-service onboarding | "Let clients sign up themselves" | This is an agency with 15 clients acquired through sales, not a SaaS with self-serve. Self-service onboarding adds complexity (approval flows, plan selection, billing) with no demand. | Operator creates client accounts manually. At 15 clients with slow growth, this takes minutes per month. |
| Full theme customization (fonts, multiple colors, layouts) | "Each client should have a completely custom look" | Exponential testing surface. Every theme combination can break layouts. CSS conflicts, dark mode interactions, accessibility issues multiply. | Logo + single primary color. This covers 95% of brand differentiation needs. Use Tailwind CSS variables. |
| Automated campaign creation from dashboard | "Let clients launch their own campaigns" | Clients are paying for the agency's expertise in campaign strategy, copy, and targeting. Self-service campaigns bypass the agency's value and create quality control issues. | Operators create campaigns in Instantly.ai directly. Dashboard is for visibility and lead management only. |
| Mobile native app | "Can we get a mobile app?" | Doubles development effort. Client dashboard usage is primarily desktop during work hours. React Native or Flutter adds a separate codebase, deployment pipeline, and app store management. | Responsive web design. The dashboard works on mobile browsers. PWA if push notifications are ever needed (they are not in v1). |
| Multi-language support (i18n framework) | "What if we get non-Dutch clients?" | i18n frameworks (next-intl, react-i18next) add complexity to every component. With 15 Dutch clients and no international expansion plans, this is premature abstraction. | Hardcode Dutch strings. If international expansion happens, add i18n then. Extracting strings later is a well-understood refactor. |
| Billing / invoicing integration | "Can clients see their invoices in the portal?" | Requires payment provider integration, invoice generation, tax handling (Dutch BTW rules). Completely separate domain from campaign dashboards. | Keep billing in existing invoicing tool (Moneybird, Exact, or whatever the agency uses). Link to external invoice portal if needed. |
| Granular operator permissions | "Different operators should have different access levels" | Only 3 operators, all trusted. RBAC for operators adds middleware complexity, permission checking on every endpoint, and admin UI for managing roles. | All operators are equal admins. Revisit if team grows beyond 5-10 people. |

## Feature Dependencies

```
[Authentication + Multi-tenancy]
    |
    +--requires--> [Role-based access (operator vs client)]
    |                  |
    |                  +--requires--> [Data isolation / RLS policies]
    |
    +--enables--> [Client Dashboard Shell]
                      |
                      +--requires--> [White-label branding]
                      |
                      +--enables--> [Campaign Statistics Overview]
                      |                 |
                      |                 +--enhances--> [ICP Breakdown Charts]
                      |                 +--enhances--> [Per-client Campaign Grouping]
                      |
                      +--enables--> [Sent Emails View]
                      |
                      +--enables--> [Upcoming Contacts Preview]
                      |                 |
                      |                 +--requires--> [CSV Import (operator side)]
                      |                 +--requires--> [DNC List Management]
                      |
                      +--enables--> [Positive Lead Inbox]
                                        |
                                        +--requires--> [Instantly API Integration (replies)]
                                        +--enables--> [Reply from Dashboard]
                                        |                 |
                                        |                 +--requires--> [Instantly API (send as original sender)]
                                        +--enhances--> [Lead Status Tracking]

[Operator Admin Panel]
    |
    +--requires--> [Authentication + Multi-tenancy]
    |
    +--enables--> [Client Account CRUD]
    |                 +--enables--> [White-label Config per Client]
    |                 +--enables--> [Meeting URL Config per Client]
    |
    +--enables--> [CSV Import/Export Workflow]
    |                 +--requires--> [DNC List Management]
    |                 +--enables--> [Upcoming Contacts Preview (client side)]
    |
    +--enables--> [Error Monitoring Dashboard]
                      +--requires--> [Instantly API Integration (operational)]
```

### Dependency Notes

- **Reply from Dashboard requires Instantly API send capability:** This is the highest-risk dependency. Must verify Instantly API supports sending replies with proper headers via their API. If not, this feature needs a workaround (SMTP direct send).
- **Upcoming Contacts Preview requires both CSV Import and DNC Management:** Contacts come from CSV imports, and the preview must exclude DNC entries. These three features form a tight cluster.
- **ICP Breakdown Charts require CSV Import data:** Charts are built from prospect metadata in imported CSVs. No CSV data = no charts.
- **Lead Status Tracking enhances Inbox:** This is optional and can be added after inbox is working. No hard dependency on other systems.
- **Error Monitoring requires Instantly API integration:** Can only monitor errors once the API connection exists and sync jobs are running.

## MVP Definition

### Launch With (v1)

Minimum viable product -- what is needed to replace the current spreadsheet-based workflow.

- [ ] **Authentication + multi-tenancy** -- foundation for everything else
- [ ] **Operator admin panel (client CRUD, branding config)** -- operators must create and manage client accounts
- [ ] **Campaign statistics overview ("Overzicht")** -- core value: clients see what they are paying for
- [ ] **Positive lead inbox with reply** -- core value: clients act on leads without leaving the portal
- [ ] **DNC list management** -- legal compliance (GDPR) and client trust, cannot defer
- [ ] **Upcoming contacts 7-day preview with removal** -- clients need veto power before emails go out
- [ ] **Sent emails view** -- transparency, easy to build, high trust value
- [ ] **CSV import/export with DNC filtering** -- replaces spreadsheet workflow for operators
- [ ] **White-label branding (logo + primary color)** -- professional appearance from day one
- [ ] **Meeting page (external redirect)** -- trivial to implement, rounds out the navigation

### Add After Validation (v1.x)

Features to add once core is working and clients are actively using the platform.

- [ ] **ICP breakdown charts** -- add once there is enough imported data to make charts meaningful
- [ ] **Lead status tracking** -- add once clients are actively using the inbox and request workflow improvements
- [ ] **Branded login page per client** -- polish feature, add once the product is stable
- [ ] **Per-client campaign grouping** -- add when clients with multiple active campaigns request it
- [ ] **Error monitoring dashboard** -- add once sync reliability patterns emerge (what fails, how often)

### Future Consideration (v2+)

Features to defer until product-market fit is established.

- [ ] **Client self-service password reset** -- out of scope per PROJECT.md, add when support burden justifies it
- [ ] **Email notification on new positive leads** -- useful but requires email sending infrastructure beyond Instantly
- [ ] **Exportable PDF reports** -- some clients may want periodic reports for their management
- [ ] **Audit log for operators** -- track who imported what, who modified DNC lists, for accountability
- [ ] **API for client integrations** -- if clients want to pull lead data into their own CRM

## Feature Prioritization Matrix

| Feature | User Value | Implementation Cost | Priority |
|---------|------------|---------------------|----------|
| Authentication + multi-tenancy | HIGH | MEDIUM | P1 |
| Operator admin panel | HIGH | MEDIUM | P1 |
| Campaign statistics overview | HIGH | MEDIUM | P1 |
| Positive lead inbox | HIGH | HIGH | P1 |
| Reply from dashboard | HIGH | HIGH | P1 |
| DNC list management | HIGH | MEDIUM | P1 |
| Upcoming contacts preview | HIGH | MEDIUM | P1 |
| Sent emails view | MEDIUM | LOW | P1 |
| CSV import/export | HIGH | MEDIUM | P1 |
| White-label branding | MEDIUM | LOW | P1 |
| Meeting page redirect | LOW | LOW | P1 |
| ICP breakdown charts | MEDIUM | MEDIUM | P2 |
| Lead status tracking | MEDIUM | LOW | P2 |
| Branded login page | LOW | LOW | P2 |
| Per-client campaign grouping | MEDIUM | LOW | P2 |
| Error monitoring dashboard | MEDIUM | MEDIUM | P2 |
| Client password reset | LOW | LOW | P3 |
| Email notifications | MEDIUM | MEDIUM | P3 |
| PDF report export | LOW | MEDIUM | P3 |
| Operator audit log | LOW | MEDIUM | P3 |

**Priority key:**
- P1: Must have for launch -- without these, the platform does not replace the spreadsheet workflow
- P2: Should have, add in first iterations after launch
- P3: Nice to have, consider when client feedback demands it

## Competitor Feature Analysis

| Feature | Instantly.ai (native) | Smartlead | Woodpecker | Our Approach |
|---------|----------------------|-----------|------------|--------------|
| Client dashboard | Basic analytics in Instantly dashboard, no dedicated client portal | White-label client portal available on higher plans | Agency dashboard with client views | Fully branded per-client portal with Dutch UI -- more polished than built-in tools |
| Lead inbox | Unified inbox (unibox) with sentiment tags | Lead management with tags | Reply detection + inbox | Filtered positive-only inbox. Simpler but focused on what clients care about |
| Reply from portal | Yes (native inbox) | Yes (native inbox) | Yes (native inbox) | Yes, via Instantly API. Key table-stakes parity feature |
| DNC management | Basic blocklist | Blocklist per campaign | Blocklist + company exclude | Full DNC: manual, domain, CSV import. Filters on export. More robust than most |
| Contact preview | No pre-send preview for clients | No client-facing preview | No client-facing preview | 7-day preview with removal. Genuine differentiator -- no competitor offers this |
| White-labeling | Limited (higher plans only) | White-label on agency plans | No white-label | Full white-label from day one. Logo + primary color per client |
| CSV workflow | Basic CSV import | CSV import with mapping | CSV import | Round-trip CSV with JSONB column preservation. Handles varied schemas gracefully |
| ICP analytics | Campaign-level stats only | Basic analytics | Open/reply analytics | ICP breakdown charts from prospect metadata. Richer than competitors |
| Meeting scheduling | No native integration | No native integration | No native integration | External redirect per client. Simple but present in navigation |

**Key competitive insight:** The 7-day contact preview with client-side removal is a genuine differentiator. No major cold email platform offers clients a pre-send review with veto power. This is a trust-building feature unique to agency portals.

## Sources

- Instantly.ai feature set and API capabilities (training data, MEDIUM confidence -- Instantly.ai is well-documented in training data up to early 2025, features may have expanded)
- Smartlead.ai agency features (training data, MEDIUM confidence)
- Woodpecker.co agency features (training data, MEDIUM confidence)
- B2B SaaS client portal patterns (training data, HIGH confidence -- well-established patterns)
- Multi-tenancy and white-labeling patterns (training data, HIGH confidence -- mature domain)
- GDPR/DNC compliance requirements for Netherlands (training data, HIGH confidence -- regulatory requirements are stable)
- Cold email agency operational workflows (training data, MEDIUM confidence -- based on common patterns, validated against PROJECT.md specifics)

**Note:** WebSearch and WebFetch were unavailable during this research session. Competitor features should be verified against current product pages before finalizing the roadmap. Instantly.ai API capabilities for sending replies (especially with proper In-Reply-To headers from original sender accounts) is the highest-risk assumption and should be validated with the Instantly API documentation in a dedicated research pass.

---
*Feature research for: NextWave Solutions Client Dashboard Platform*
*Researched: 2026-02-15*
