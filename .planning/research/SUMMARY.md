# Project Research Summary

**Project:** NextWave Solutions Client Dashboard Platform
**Domain:** Multi-tenant B2B client dashboard for cold email outreach agency
**Researched:** 2026-02-15
**Confidence:** MEDIUM

## Executive Summary

This is a white-label multi-tenant SaaS dashboard enabling NextWave Solutions' cold email agency to provide clients with self-service campaign visibility and lead management. The recommended approach follows established multi-tenant patterns: Next.js 16 App Router for full-stack React with Server Components, Supabase PostgreSQL with Row Level Security for tenant isolation, and server-side API proxying to Instantly.ai for campaign data integration. The 7-day contact preview feature (allowing clients to remove contacts before emails are sent) is a genuine differentiator that no major competitor offers.

The critical success factor is bulletproof tenant isolation. Data leakage between clients (15 current clients, each paying for exclusive lead access) would be catastrophic for trust and potentially violate GDPR. This means RLS policies must be enabled on every table from day one, verified with integration tests, and supplemented with application-level client_id filtering. The second major risk is email threading -- replies sent from the dashboard must appear in the same conversation thread in recipients' inboxes, requiring proper capture and use of Message-ID and References headers from Instantly.ai.

The recommended phase structure starts with foundation (auth, multi-tenancy, RLS, operator admin) before building any client-facing features. Campaign statistics and inbox features depend on the Instantly.ai integration being solid, so API integration should come early. CSV processing with DNC filtering is core to the operator workflow and has performance implications (Vercel timeout/memory limits), so it needs dedicated attention as a standalone phase with chunked/batched processing from the start.

## Key Findings

### Recommended Stack

Next.js 16 with App Router provides the full-stack foundation with Server Components reducing client bundle size and API routes enabling server-side Instantly.ai proxy calls. TypeScript is non-negotiable for multi-tenant apps where data isolation bugs are catastrophic. Supabase (PostgreSQL with RLS) is the backbone of multi-tenant security -- one database, one schema, RLS policies filter by tenant_id. Tailwind CSS v4 with CSS custom properties enables white-label theming without runtime CSS-in-JS conflicts.

**Core technologies:**
- **Next.js 16** + **React 19**: Full-stack framework with Server Components for dashboard pages, API routes for Instantly.ai proxy, middleware for tenant-aware routing
- **Supabase PostgreSQL** with **RLS**: Row Level Security provides multi-tenant data isolation, Realtime subscriptions for live inbox updates, Auth with custom user_metadata for role/client_id claims
- **Tailwind CSS v4** + **shadcn/ui**: Utility-first styling with CSS custom properties for white-label theming, code ownership model (shadcn copies components into codebase for full control)
- **Recharts**: React-native declarative charts for campaign statistics, better fit than Chart.js for Server Components
- **React Hook Form** + **Zod**: Uncontrolled forms for minimal re-renders, runtime validation for CSV imports and API inputs
- **@tanstack/react-query**: Server state caching and background refetching for Instantly.ai data, prevents stale dashboard data
- **nuqs**: Type-safe URL state for dashboard filters and pagination, enables shareable URLs

**Critical "do NOT use" warnings:**
- **@supabase/auth-helpers-nextjs**: Deprecated, use @supabase/ssr instead
- **Prisma**: Bypasses Supabase RLS policies (dangerous for multi-tenant), unnecessary ORM layer
- **Redux/Zustand**: Over-engineering -- server state belongs in React Query, client state is minimal
- **Material UI/MUI**: Opinionated design system makes white-label theming painful, runtime CSS-in-JS conflicts with Server Components

### Expected Features

Research identified a clear three-tier feature hierarchy: table stakes (what clients assume exists), differentiators (competitive advantage), and anti-features (commonly requested but problematic).

**Must have (table stakes):**
- Campaign statistics overview -- clients paying for outreach need to see emails sent, open rates, reply rates, lead counts
- Positive lead inbox with reply capability -- core value proposition, clients must see and act on leads without leaving the portal
- Reply-from-dashboard functionality -- if clients must switch to email client to reply, portal feels half-finished
- Do-not-contact (DNC) list management -- legal compliance (GDPR in NL) and client trust, cannot defer
- 7-day upcoming contacts preview with removal -- clients need veto power before emails go out
- Sent emails view -- transparency and trust, easy to build
- CSV import/export with DNC filtering -- replaces spreadsheet workflow for operators, must preserve all original CSV columns
- White-label branding (logo + primary color) -- professional appearance, clients expect portal to feel like "their" tool
- Role-based access (operator vs client) -- operators see everything, clients see only their data, data leakage destroys trust

**Should have (competitive):**
- 7-day contact preview with client removal -- genuine differentiator, no major cold email platform offers this pre-send review capability
- ICP breakdown charts -- visualize industry, job title, company size distribution from CSV data, competitors rarely offer this
- Contact detail richness -- surface LinkedIn, job title, company, vacancy URL from imported CSVs makes leads immediately actionable
- Dutch-language client UI -- polished local feel for Netherlands-based agency that English-only competitors cannot match
- CSV column preservation through round-trip -- store all original columns in JSONB, reconstruct on export, handles varied schemas gracefully
- Lead status tracking -- allows clients to mark leads as contacted/meeting booked/not interested, turns inbox into lightweight CRM

**Defer (v2+):**
- Real-time websocket updates -- clients check dashboard a few times per day, 15-30 minute data freshness is acceptable
- Full email client features (threads, attachments, CC/BCC) -- goal is replying to positive leads, not replacing Gmail
- AI-powered lead scoring -- requires ML pipeline, training data, ongoing tuning, high cost/low accuracy at 15-client scale
- Client self-service onboarding -- agency has 15 clients acquired through sales, not a SaaS with self-serve
- Multi-language i18n framework -- all clients are Dutch, hardcode Dutch strings for v1, add i18n only if international expansion happens

### Architecture Approach

The architecture follows standard multi-tenant SaaS patterns with tenant isolation via client_id foreign keys + RLS policies, dual Supabase client strategy (user-scoped with RLS for client pages, service-role bypassing RLS for operator admin), and server-side API proxying to prevent Instantly.ai API key exposure. White-label branding uses CSS custom properties set at the layout level, avoiding runtime theming overhead.

**Major components:**
1. **Middleware + Auth Layer** -- Next.js middleware for route protection, Supabase Auth with custom user_metadata (role + client_id), tenant context resolution from session
2. **API/Server Action Layer** -- Campaign stats API (Instantly.ai proxy + local cache), Inbox/Reply API (fetch replies, send via original sender account), CSV Processor (parse, validate, DNC filter), Client Management API (operator CRUD with cross-tenant access)
3. **Data Access Layer** -- User-scoped Supabase client (RLS-enforced) for client pages, Service-role Supabase client (bypasses RLS) for operator admin with explicit client_id filtering, Instantly.ai API client (server-side only, never exposed to browser)
4. **Storage Layer** -- PostgreSQL with RLS on all tables, hybrid column approach (extract commonly-queried fields + JSONB for CSV fidelity), Supabase Storage for logos with tenant-scoped paths

**Key architectural patterns:**
- **Tenant isolation**: Every table has client_id column + RLS policy. Application code also enforces scoping as defense-in-depth. One missed WHERE clause = data leak, RLS is safety net.
- **JSONB-based CSV storage**: Store full CSV row as JSONB alongside normalized columns (email, first_name, last_name). Zero column loss regardless of schema variation, export reconstructs original.
- **White-label via CSS custom properties**: Store primary_color + logo_url in clients table, inject as --brand-primary at layout level, all components reference var(--brand-primary). Zero JS overhead.
- **Server Actions for mutations, Route Handlers for external APIs**: Server Actions for database CRUD (type-safe, progressive enhancement), Route Handlers for Instantly.ai proxy and CSV upload/download (streaming, file processing).

### Critical Pitfalls

The top pitfalls identified all relate to multi-tenant isolation, data processing at scale, and integration correctness. Most are preventable with upfront architecture decisions in the foundation phase.

1. **Tenant data leakage through missing/incomplete RLS policies** -- A query returns Client A data to Client B. Destroys trust, violates GDPR. Happens when RLS is not enabled on every table (Supabase default is RLS disabled), or when server-side code uses service_role key without explicit client_id filters. Prevention: Enable RLS on every table at creation time, integration tests that authenticate as Client A and attempt to read Client B data, database trigger or CI check flagging tables without RLS.

2. **CSV processing timeouts and memory exhaustion on Vercel** -- 50k-row CSV with DNC filtering exceeds Vercel function timeout (10s Hobby, 60s Pro, max 300s Enterprise) or 1GB memory limit. Happens when developers test with 100-row CSVs and never hit limits until production. Prevention: Process CSVs client-side (PapaParse in browser) and send structured JSON in batches (500 rows per request), or upload to Supabase Storage and process via Edge Function. Set Vercel maxDuration to 60s minimum.

3. **Email threading breaks -- replies do not appear in same thread** -- Reply sent from dashboard appears as new email instead of threading under original. Makes agency look unprofessional. Happens when Message-ID, In-Reply-To, and References headers are not captured from Instantly.ai and set on replies, or when reply is sent from different sender account. Prevention: Store message_id, in_reply_to, references headers when syncing emails, set headers correctly on replies, send from exact same sender email address, test threading in Gmail + Outlook + Apple Mail before shipping.

4. **JSONB column bloat destroying query performance** -- CSV rows stored entirely in JSONB (no extracted columns) cause slow queries and table bloat at 100k+ contacts. JSONB is not indexable without explicit GIN indexes or generated columns, queries like `WHERE raw_data->>'email' = 'x'` degrade badly. Prevention: Hybrid approach -- extract commonly-queried fields (email, name, company) into dedicated indexed columns, keep full JSONB as original_csv_data for export fidelity only. Query against dedicated columns, export from JSONB.

5. **White-label branding leaking across tenants** -- Client A sees Client B's logo or colors. Happens when tenant context is derived from stale JWT/URL parameter instead of session, or when SSR caching does not include tenant ID in cache key, or when browser/CDN caching serves cached page for Client A to Client B. Prevention: Derive tenant from authenticated session on every request, set Cache-Control: private no-store on tenant-specific pages, serve logos from Supabase Storage with tenant-scoped paths, use CSS custom properties set dynamically per tenant instead of static CSS files.

## Implications for Roadmap

Based on research, the suggested phase structure prioritizes foundation (auth, multi-tenancy, RLS) before any features, followed by operator admin (required to create clients), then client dashboard shell (enables parallel feature work), with Instantly.ai integration as early as possible to derisk the highest-uncertainty dependency.

### Phase 1: Foundation & Multi-tenancy
**Rationale:** Everything depends on secure auth and tenant isolation. RLS policies cannot be retrofitted -- they must be in the schema from day one. This phase establishes the security backbone.

**Delivers:**
- Supabase project with PostgreSQL schema (all tables with client_id, RLS enabled on every table)
- RLS policies enforcing client-scoped data access
- Next.js project scaffold with route groups (operator, client, auth)
- Middleware for auth + role-based routing
- Supabase client utilities (user-scoped + service-role)
- Integration tests verifying cross-tenant isolation

**Addresses:**
- Role-based access control (table stakes)
- Data isolation between tenants (table stakes)
- Prevents Pitfall #1 (tenant data leakage)

**Avoids:**
- Building features on insecure foundation
- Retrofitting RLS onto existing schema (high-cost migration)

**Research Flag:** SKIP -- Multi-tenant SaaS with Supabase RLS is well-documented with established patterns.

---

### Phase 2: Operator Admin Core
**Rationale:** Operators must create and manage client accounts before any client-facing features can be used. Client CRUD and branding configuration unblocks all downstream client dashboard work.

**Delivers:**
- Operator authentication and admin dashboard shell
- Client CRUD (create, edit, delete clients with branding fields)
- Client user provisioning (create Supabase auth users for clients)
- White-label branding storage (logo upload to Supabase Storage, primary color in clients table)
- Branding resolution helpers (CSS custom properties injection)

**Addresses:**
- White-label branding (table stakes)
- Prevents Pitfall #5 (branding leakage) by establishing tenant-scoped storage patterns

**Avoids:**
- Hardcoding client configs in code (anti-pattern)
- Environment variable branding requiring deploys per client

**Research Flag:** SKIP -- Standard CRUD + file upload patterns.

---

### Phase 3: Client Dashboard Shell & Branding
**Rationale:** With clients in the database, build the client-facing layout with dynamic branding. This provides the UI shell for all feature pages and validates white-label theming works correctly before building features.

**Delivers:**
- Client authentication and dashboard layout
- Branded navigation sidebar (Dutch labels)
- CSS custom properties injection per tenant
- Auth guard for client routes
- Empty feature page stubs (Overzicht, Inbox, etc.)

**Addresses:**
- Dutch-language UI (differentiator)
- White-label branding display
- Prevents Pitfall #5 (branding leakage) with cache headers and tenant context validation

**Avoids:**
- Building features without testing branding first
- Mixed operator/client layout trees (anti-pattern)

**Research Flag:** SKIP -- Standard layout patterns with CSS theming.

---

### Phase 4: Instantly.ai Integration & Campaign Stats
**Rationale:** This is the highest-uncertainty dependency. The Instantly.ai API needs research for exact endpoints, rate limits, authentication, and whether it provides threading headers. Campaign stats are table stakes and depend on this integration, so derisk early.

**Delivers:**
- Instantly.ai API wrapper (server-side client)
- Campaign data sync to PostgreSQL (scheduled via cron or operator-triggered)
- Campaign statistics API (reads from local DB, not live Instantly calls)
- Overzicht page (campaign stats overview with Dutch UI)
- Basic error handling and sync status tracking

**Addresses:**
- Campaign statistics overview (table stakes)
- Prevents Pitfall #7 (API rate limits) by syncing to local DB rather than live-fetching
- Per-client campaign grouping (differentiator)

**Avoids:**
- Live-fetching Instantly data on every page load (anti-pattern)
- Building inbox/reply features before understanding API capabilities

**Research Flag:** NEEDS RESEARCH -- Instantly.ai API specifics (endpoints, rate limits, authentication flow, available fields) have LOW confidence. Phase-specific research required before planning.

---

### Phase 5: Inbox & Reply Functionality
**Rationale:** Depends on Instantly.ai integration established in Phase 4. This is the second table-stakes feature (after campaign stats) and has the highest technical complexity (email threading headers, sending via original sender account).

**Delivers:**
- Positive lead inbox page (filtered for sentiment, shows replies only)
- Reply composer with thread context display
- Email sending via Instantly.ai API from original sender account
- Threading header capture (message_id, in_reply_to, references)
- Reply storage in database

**Addresses:**
- Positive lead inbox (table stakes)
- Reply from dashboard (table stakes)
- Prevents Pitfall #3 (email threading breaks) by capturing and setting headers correctly

**Avoids:**
- Building full email client (anti-feature)
- Client-side Instantly API calls exposing keys (anti-pattern)

**Research Flag:** NEEDS RESEARCH -- Email threading header support in Instantly.ai API needs verification. If API does not provide message_id/references, alternative approach (webhooks, SMTP direct send) needed.

---

### Phase 6: CSV Import/Export & DNC Management
**Rationale:** Core operator workflow replacing spreadsheets. Has performance implications (Vercel timeout/memory limits) requiring chunked/batched processing. DNC filtering is legally required (GDPR) and blocks contact preview feature.

**Delivers:**
- CSV parser with JSONB preservation (all original columns stored)
- CSV import endpoint with batched processing (client-side parse + server-side batches)
- DNC list management (manual entry, domain blocking, CSV import)
- DNC filtering logic (email + domain matching)
- CSV export with full column reconstruction from JSONB
- Progress indication for uploads

**Addresses:**
- CSV import/export (table stakes)
- DNC list management (table stakes)
- CSV column preservation (differentiator)
- Prevents Pitfall #2 (CSV timeout) with batched processing
- Prevents Pitfall #4 (JSONB bloat) with hybrid column approach

**Avoids:**
- Monolithic synchronous upload (anti-pattern)
- Pure JSONB storage without extracted columns (technical debt)

**Research Flag:** SKIP -- CSV processing patterns well-documented, Papa Parse usage established.

---

### Phase 7: Contact Preview & Sent Emails
**Rationale:** Depends on CSV import (Phase 6) for contact data and DNC filtering for preview accuracy. Contact preview is a key differentiator. Sent emails view is low-complexity and rounds out transparency features.

**Delivers:**
- 7-day upcoming contacts preview page
- Contact removal/skip functionality
- Sent emails read-only view
- Contact detail display (LinkedIn, job title, company, vacancy URL from CSV data)

**Addresses:**
- Upcoming contacts preview (table stakes)
- Sent emails view (table stakes)
- 7-day preview with removal (differentiator -- no competitor offers this)
- Contact detail richness (differentiator)

**Avoids:**
- Real-time contact sync (anti-feature, not needed)

**Research Flag:** SKIP -- Straightforward CRUD and filtering.

---

### Phase 8: Polish & Error Monitoring
**Rationale:** With all core features complete, add operator-facing quality-of-life features and production monitoring. ICP charts require enough imported data to be meaningful. Error monitoring requires active sync jobs to monitor.

**Delivers:**
- ICP breakdown charts (industry, job title, company size from CSV data)
- Lead status tracking (contacted, meeting booked, deal closed)
- Operator error monitoring dashboard (API sync failures, import errors)
- Meeting page (external URL redirect)
- Loading states, error boundaries, edge case handling

**Addresses:**
- ICP breakdown charts (differentiator)
- Lead status tracking (differentiator)
- Operator error monitoring (differentiator)
- Meeting scheduling link (table stakes)

**Avoids:**
- AI-powered ICP analysis (anti-feature, over-engineering)

**Research Flag:** SKIP -- Recharts usage well-documented, standard error tracking patterns.

---

### Phase Ordering Rationale

**Sequential dependencies drive order:**
- Foundation (Phase 1) must come first -- RLS cannot be retrofitted, everything depends on secure auth
- Operator admin (Phase 2) must precede client dashboard -- cannot have clients without client records
- Client shell (Phase 3) before features -- validates branding works, provides UI structure
- Instantly.ai integration (Phase 4) early to derisk highest uncertainty -- inbox/reply depend on understanding API
- CSV import (Phase 6) before contact preview (Phase 7) -- preview displays imported contacts

**Parallelization opportunities:**
- After Phase 3 (client shell exists), Phases 4-7 could theoretically run in parallel if resources allow
- However, Phase 5 (inbox) depends on Phase 4 (Instantly integration) understanding
- Phase 7 (contact preview) depends on Phase 6 (CSV import + DNC) data model

**Pitfall avoidance:**
- Phase 1 addresses tenant data leakage (Pitfall #1) before any features can leak data
- Phase 4 addresses API rate limits (anti-pattern) with scheduled sync pattern
- Phase 6 addresses CSV timeout (Pitfall #2) and JSONB bloat (Pitfall #4) with correct architecture

**Feature grouping:**
- Phases 4-5 are "Instantly.ai features" (stats + inbox/reply)
- Phase 6-7 are "CSV workflow features" (import/export + preview)
- Phase 8 is "polish and monitoring"

### Research Flags

**Phases needing deeper research during planning:**
- **Phase 4 (Instantly.ai Integration):** API documentation confidence is LOW. Need phase-specific research for exact endpoints, rate limits, authentication flow, whether threading headers (message_id, in_reply_to, references) are available in API responses, whether API supports sending replies from original sender account with custom headers. Recommended to use `/gsd:research-phase` before planning this phase.
- **Phase 5 (Inbox & Reply):** Depends on Phase 4 findings. If Instantly.ai does not provide threading headers, need research into alternative approaches (webhooks, SMTP direct send, parsing email source). Email threading correctness is critical pitfall.

**Phases with standard patterns (skip research-phase):**
- **Phase 1 (Foundation):** Multi-tenant SaaS with Supabase RLS is well-documented, established patterns
- **Phase 2 (Operator Admin):** Standard CRUD + file upload patterns
- **Phase 3 (Client Shell):** Layout patterns with CSS theming well-understood
- **Phase 6 (CSV Import/Export):** Papa Parse usage documented, batching patterns standard
- **Phase 7 (Contact Preview):** CRUD and filtering patterns
- **Phase 8 (Polish):** Recharts usage documented, standard error tracking

## Confidence Assessment

| Area | Confidence | Notes |
|------|------------|-------|
| Stack | HIGH | Core framework versions verified via npm registry 2026-02-15. Supabase ecosystem versions verified. Recharts over Chart.js is objectively better fit for React. shadcn/ui code ownership model suited for white-label. |
| Features | MEDIUM | Based on training data knowledge of cold email agency tooling and B2B portal patterns. Competitor features (Instantly.ai, Smartlead, Woodpecker) should be verified against current product pages. 7-day contact preview as differentiator has high confidence (no competitor observed offering this). |
| Architecture | MEDIUM | Next.js App Router, Supabase RLS, multi-tenant SaaS patterns are well-established in training data. Specific claims about @supabase/ssr client patterns and Tailwind v4 CSS-first config should be verified against current docs. |
| Pitfalls | HIGH | Tenant data leakage patterns (RLS), PostgreSQL JSONB performance, email threading (RFC 2822), Vercel serverless limits are well-documented. Instantly.ai API specifics (rate limits, exact fields) have LOW confidence and need phase-specific research. |

**Overall confidence:** MEDIUM

**Note:** WebSearch and WebFetch were unavailable during this research session. All findings based on training data (cutoff ~January 2025). The following should be independently verified before implementation:

- Instantly.ai API capabilities (endpoints, rate limits, threading header availability, sending from original sender)
- Tailwind CSS v4 CSS-first config migration from v3 patterns
- next-intl v4 + Next.js 16 specific compatibility
- Vercel current plan limits for function timeout and memory (may have changed)

### Gaps to Address

**Instantly.ai API specifics (CRITICAL GAP):**
- Whether API returns message_id, in_reply_to, references headers needed for threading
- Whether API supports sending replies from original sender account with custom headers
- Exact rate limits and recommended polling/sync frequency
- Authentication flow and API key management (per-client vs agency-wide)
- **How to handle during planning:** Run `/gsd:research-phase` for Phase 4 (Instantly.ai Integration) before planning. If API docs are insufficient, may need to request API sandbox access from Instantly or consult agency's existing API usage.

**CSV processing performance at scale:**
- Exact row count where Vercel timeout becomes problematic (depends on DNC list size, JSONB complexity)
- Whether client-side parsing vs Supabase Edge Function is better for this use case
- **How to handle during planning:** Load test with realistic data (20k-row CSV, 5k DNC entries) on Vercel production early in Phase 6.

**Email threading in practice:**
- Whether threading works reliably across Gmail + Outlook + Apple Mail with Instantly-sent emails
- **How to handle during execution:** Manual testing with real mailboxes during Phase 5 before marking inbox/reply features complete.

**Supabase RLS policy syntax edge cases:**
- Exact syntax for checking user_metadata claims in RLS policies (`auth.jwt() -> 'app_metadata' ->> 'client_id'` vs `auth.jwt() -> 'user_metadata'`)
- **How to handle during execution:** Verify against current Supabase RLS documentation in Phase 1, write integration tests to validate.

## Sources

### Primary (HIGH confidence)
- npm registry (npm view [package] version) -- all version numbers verified 2026-02-15
- PostgreSQL JSONB documentation and performance characteristics -- well-established database behavior
- Email RFC 2822 (threading headers: Message-ID, In-Reply-To, References) -- stable standard
- Next.js App Router documentation and patterns -- training data cutoff January 2025, version 16 established
- Supabase Row Level Security patterns -- training data, well-documented feature

### Secondary (MEDIUM confidence)
- Multi-tenant SaaS architectural patterns -- community consensus across multiple sources
- Tailwind CSS v4 CSS-first config -- major version change from v3, migration patterns may have edge cases
- Vercel serverless function limits -- training data, exact current limits should be verified against current pricing page
- B2B client portal feature expectations -- based on common patterns in agency tooling
- Cold email agency operational workflows -- validated against PROJECT.md specifics

### Tertiary (LOW confidence)
- Instantly.ai API capabilities -- smaller API surface, less training data coverage, needs independent verification
- Competitor feature analysis (Smartlead, Woodpecker) -- features may have expanded since training data cutoff
- next-intl v4 + Next.js 16 compatibility -- version verified to exist but specific compatibility not independently verified

---
*Research completed: 2026-02-15*
*Ready for roadmap: yes*
