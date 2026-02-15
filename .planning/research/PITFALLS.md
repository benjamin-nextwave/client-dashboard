# Pitfalls Research

**Domain:** Multi-tenant B2B client dashboard platform (cold email outreach agency)
**Researched:** 2026-02-15
**Confidence:** MEDIUM (based on training data -- WebSearch/WebFetch unavailable for live verification)

## Critical Pitfalls

Mistakes that cause rewrites or major issues.

### Pitfall 1: Tenant Data Leakage Through Missing or Incomplete RLS Policies

**What goes wrong:**
A query, view, or API route returns data belonging to Client A to Client B. This is the single worst failure mode for a multi-tenant platform -- it destroys client trust instantly and may have legal consequences. In Supabase, this happens when Row Level Security (RLS) policies are not applied to every table, or when a new table is created without RLS enabled, or when server-side operations bypass RLS using the `service_role` key without manually filtering by `client_id`.

**Why it happens:**
- Supabase RLS is opt-in per table. New tables have RLS disabled by default -- any query hits all rows.
- Developers use `supabase.from('table').select('*')` with the service role key in API routes, which bypasses RLS entirely.
- Join queries or views can expose cross-tenant data if the joined table lacks its own RLS policy.
- Edge cases: aggregate queries, search endpoints, or error messages that leak data from other tenants.

**How to avoid:**
1. Enable RLS on every single table at creation time, no exceptions. Create a migration checklist item.
2. Every table that holds tenant-scoped data must have a `client_id` column and a policy like: `USING (client_id = auth.jwt() -> 'app_metadata' ->> 'client_id')`.
3. For server-side API routes, prefer using the anon/user key with RLS rather than service_role. When service_role is necessary (e.g., operator admin actions), always include explicit `WHERE client_id = ?` filters.
4. Write integration tests that authenticate as Client A and attempt to read Client B data. Run these on every table.
5. Create a database trigger or CI check that flags any table without RLS enabled.

**Warning signs:**
- A new table is created without a corresponding RLS policy in the migration.
- API routes use `createClient(url, SERVICE_ROLE_KEY)` without explicit client_id filtering.
- No integration tests exist that verify cross-tenant isolation.
- Queries use `.select('*')` without any `.eq('client_id', ...)` when on service role.

**Phase to address:**
Phase 1 (Foundation/Database Schema). RLS must be baked into the schema from day one. Retrofitting RLS onto an existing schema is painful and error-prone.

---

### Pitfall 2: CSV Processing Timeouts and Memory Exhaustion on Vercel Serverless

**What goes wrong:**
Operators upload CSVs with tens of thousands of rows. The API route that parses the CSV, runs DNC filtering, stores rows in the database, and returns the result exceeds Vercel's function execution timeout (default 10s on Hobby, 60s on Pro, max 300s on Enterprise) or memory limit (1024MB default). The upload silently fails or the user gets a generic 504 error.

**Why it happens:**
- Serverless functions are not designed for long-running, memory-intensive operations.
- Parsing a 50k-row CSV, comparing each row against a DNC list, and inserting into Postgres is both CPU and I/O heavy.
- Developers test with small CSVs (100 rows) and never hit the limits until production.
- Storing full JSONB per row means the insert payload can be very large.

**How to avoid:**
1. Process CSVs client-side using a library like PapaParse in the browser. Parse and validate in the browser, then send structured JSON in batches (e.g., 500 rows per request) to the API.
2. Alternatively, upload the raw CSV to Supabase Storage, then process it via a Supabase Edge Function or a background job that is not constrained by Vercel's timeout.
3. For DNC filtering against the database: batch the lookup (e.g., `WHERE email IN (batch_of_500)`) rather than one-by-one.
4. Show upload progress to the operator -- a progress bar for batch uploads.
5. Set Vercel function `maxDuration` to at least 60s for upload routes (requires Pro plan).

**Warning signs:**
- CSV upload works in development but fails with timeout in production (Vercel).
- No progress indication during upload -- users re-submit, causing duplicate data.
- Testing only uses CSVs with fewer than 100 rows.
- The upload endpoint does parse + filter + insert in a single synchronous operation.

**Phase to address:**
Phase dealing with CSV import/export workflow. Design the chunked/batched approach from the start rather than building a monolithic upload endpoint.

---

### Pitfall 3: Email Threading Breaks -- Replies Do Not Appear in the Same Thread

**What goes wrong:**
When an operator or client replies to a positive lead through the dashboard, the reply appears as a new email in the recipient's inbox instead of threading under the original conversation. This makes the agency look unprofessional and confuses leads.

**Why it happens:**
- Email threading requires three headers: `In-Reply-To` (the Message-ID of the email being replied to), `References` (chain of Message-IDs in the thread), and a matching `Subject` line (with or without `Re:` prefix).
- The Instantly.ai API may or may not expose the original `Message-ID` and `References` headers. If these are not captured and stored when syncing campaign data, they cannot be set on the reply.
- Different email clients use different threading algorithms (Gmail threads by Subject, Outlook uses References/In-Reply-To, Apple Mail uses both).
- Replies must be sent from the exact same email account that sent the original -- if the API sends from a different account, threading breaks in most clients.

**How to avoid:**
1. When syncing emails from Instantly.ai, capture and store the `message_id`, `in_reply_to`, and `references` headers for every email. Store these in the database alongside the email content.
2. When composing a reply, set `In-Reply-To` to the `message_id` of the email being replied to, and `References` to the full chain.
3. Ensure the reply is sent from the same sender account (same email address) as the original campaign email. Store the sender account identifier per campaign/email.
4. Prefix the subject with `Re: ` if not already present.
5. Test threading manually in Gmail, Outlook, and Apple Mail before shipping.

**Warning signs:**
- Email data in the database has no `message_id` or `references` fields.
- The Instantly.ai API integration only stores subject/body/to/from, not threading headers.
- Reply functionality is built without testing in multiple email clients.
- No mapping between campaigns and their sender accounts.

**Phase to address:**
Phase dealing with email/inbox integration. The data model for emails must include threading headers from the start. Retrofitting threading onto an existing email system requires re-syncing all historical data.

---

### Pitfall 4: JSONB Column Bloat Destroying Query Performance

**What goes wrong:**
CSV rows are stored with all original columns in a JSONB field (as required for CSV fidelity). Over time, with 15+ clients and potentially hundreds of thousands of contacts, queries that filter, sort, or aggregate on JSONB fields become extremely slow. The JSONB column also bloats table size because PostgreSQL TOAST storage for large JSONB values fragments I/O.

**Why it happens:**
- JSONB is convenient for flexible schemas but PostgreSQL cannot use standard B-tree indexes on nested JSONB values without explicit GIN indexes or generated columns.
- Developers query like `WHERE raw_data->>'email' = 'x@y.com'` and it works fine with 1,000 rows but degrades at 100k+.
- The JSONB column stores redundant data (email, name, etc.) that is also in dedicated columns, wasting storage.

**How to avoid:**
1. Use a hybrid approach: extract commonly-queried fields (email, first_name, last_name, company_name, job_title) into dedicated indexed columns. Keep the full JSONB as `original_csv_data` for export fidelity only.
2. Create GIN indexes on the JSONB column only if you actually need to query arbitrary keys: `CREATE INDEX ON contacts USING GIN (original_csv_data)`.
3. For DNC filtering, always query against the dedicated `email` column (with a B-tree index), never against `original_csv_data->>'email'`.
4. When exporting CSVs, reconstruct from the JSONB column -- this is a read-once operation and does not need to be fast.
5. Monitor table bloat with `pg_stat_user_tables` and set up regular `VACUUM ANALYZE`.

**Warning signs:**
- Queries filtering on JSONB fields appear in slow query logs.
- Table size grows much faster than expected row count would suggest.
- DNC filtering operations take longer and longer as data grows.
- No dedicated columns exist for frequently-queried fields -- everything goes through JSONB.

**Phase to address:**
Phase 1 (Database Schema). The hybrid column + JSONB approach must be designed into the schema from day one. Migrating from pure-JSONB to extracted columns later requires a data migration across all existing rows.

---

### Pitfall 5: White-Label Branding Leaking Across Tenants

**What goes wrong:**
Client A sees Client B's logo, or the default "NextWave Solutions" branding bleeds through on client-facing pages. This immediately undermines the white-label value proposition. Worse: browser caching causes a logged-in client to briefly see another client's branding after the previous user's session.

**Why it happens:**
- Branding assets (logo URL, primary color) are fetched at page load based on the current tenant context. If the tenant context is not set correctly (e.g., from a stale JWT, a missing middleware check, or a race condition), the wrong branding loads.
- CDN/browser caching of logo images or CSS files that include tenant-specific colors.
- Server-side rendering (SSR) in Next.js caches rendered pages. If the cache key does not include the tenant identifier, a cached page for Client A is served to Client B.

**How to avoid:**
1. Derive the tenant from the authenticated session on every request -- never from URL parameters or cookies alone.
2. Set `Cache-Control: private, no-store` on all tenant-specific pages, or include the tenant ID in the cache key if using ISR/SSR caching.
3. Serve logos from Supabase Storage with paths scoped by client_id (`/logos/{client_id}/logo.png`), and gate access with Storage RLS policies.
4. Use CSS custom properties (`--primary-color`) set dynamically per tenant in a layout wrapper, rather than generating static CSS files per tenant.
5. Add a visual regression test or smoke test that logs in as two different tenants and verifies branding differs.

**Warning signs:**
- Branding is loaded from a global config rather than per-session.
- Next.js pages use `generateStaticParams` or ISR for tenant-specific content without tenant-aware cache keys.
- Logo URLs are publicly accessible without authentication.
- No test exists that verifies branding isolation.

**Phase to address:**
Phase dealing with white-label branding and authentication. Must be solved architecturally before building client-facing pages.

---

### Pitfall 6: Operator Actions Accidentally Scoped to Wrong Client

**What goes wrong:**
An operator is managing Client A's dashboard, switches to Client B's tab, and performs an action (CSV upload, DNC entry, reply to lead) that gets applied to Client A instead of Client B. This is a variant of tenant isolation, but on the operator side where a single user works across multiple tenants.

**Why it happens:**
- The "active client" context for operators is stored in client-side state (React context, URL parameter, or localStorage). Multiple browser tabs can have different active clients, but API calls may use a stale context.
- API routes trust the client_id from the request body or query parameter rather than validating it server-side.
- Operators work fast, switching between clients, and the UI does not make the active client sufficiently obvious.

**How to avoid:**
1. Always include the target `client_id` in every operator API call explicitly (in the request body, not in session state).
2. Server-side: validate that the operator has access to the specified `client_id` on every request.
3. Make the active client visually prominent in the operator UI -- large banner with client name and color, not just a small dropdown.
4. Use the client_id in the URL path (`/operator/clients/{client_id}/contacts`) so each tab is inherently scoped.
5. Add confirmation dialogs for destructive operations that show the client name.

**Warning signs:**
- The operator UI stores active client in global state rather than deriving it from the URL.
- API routes accept client_id but do not verify the operator is authorized for that client.
- No visual indicator of which client context the operator is working in.

**Phase to address:**
Phase dealing with operator dashboard and navigation. The URL-based client scoping pattern must be established before building any operator CRUD features.

---

## Technical Debt Patterns

Shortcuts that seem reasonable but create long-term problems.

| Shortcut | Immediate Benefit | Long-term Cost | When Acceptable |
|----------|-------------------|----------------|-----------------|
| Storing all CSV data in JSONB only (no extracted columns) | Fast to implement, no schema changes per client | Slow queries, no indexes on common fields, painful migration later | Never -- extract core fields from day one |
| Using service_role key everywhere in API routes | Simpler code, no RLS policy debugging | Bypasses all tenant isolation, one bug = data leak | Only for admin-only operations with explicit client_id filters |
| Hardcoding Dutch strings in components | Ships faster than setting up i18n | Cannot add English or other languages later, scattered translations | Acceptable for v1 if all client-facing text is centralized in one constants file |
| Syncing all Instantly.ai data on page load | No background jobs needed | Slow page loads, API rate limits hit, stale data between visits | Only for MVP demo; replace with scheduled sync before production |
| Single Supabase project for all tenants | Simpler setup, lower cost | RLS policy complexity grows, no per-tenant resource limits | Acceptable at 15 clients; revisit at 50+ |

## Integration Gotchas

Common mistakes when connecting to external services.

| Integration | Common Mistake | Correct Approach |
|-------------|----------------|------------------|
| Instantly.ai API | Not handling rate limits -- firing all requests in parallel and getting 429 errors | Implement request queuing with exponential backoff. Cache API responses. Sync on a schedule, not on every page load. |
| Instantly.ai API | Assuming the API returns all email headers needed for threading | Verify exactly which fields the API returns. If message_id/references are missing, investigate webhooks or alternative endpoints. Document API response shape early. |
| Instantly.ai API | Not mapping Instantly campaign IDs to internal client records | Create a mapping table (client_id <-> instantly_campaign_id) during onboarding. One client may have multiple campaigns. |
| Supabase Auth | Using email/password auth without considering that operators and clients share the same auth system | Use a custom claim or `app_metadata.role` field to distinguish operators from clients. Apply RLS policies that check role. |
| Supabase Storage | Uploading logos without tenant-scoped paths or RLS | Use `{client_id}/logo.png` paths with Storage RLS policies that restrict read access to the owning tenant (or make logos public if branding is not sensitive). |
| Vercel | Assuming environment variables are available in client-side code | Only `NEXT_PUBLIC_*` variables are exposed to the browser. Supabase service_role key must NEVER be prefixed with `NEXT_PUBLIC_`. |

## Performance Traps

Patterns that work at small scale but fail as usage grows.

| Trap | Symptoms | Prevention | When It Breaks |
|------|----------|------------|----------------|
| Fetching all contacts for a client in a single query | Page loads slowly, browser tab crashes | Paginate with cursor-based pagination (keyset). Never `SELECT * FROM contacts WHERE client_id = X` without `LIMIT`. | 5,000+ contacts per client |
| DNC filtering with nested loops (for each contact, check each DNC entry) | CSV export takes minutes | Use SQL `NOT IN` or `LEFT JOIN ... IS NULL` with indexed email columns. Do filtering in the database, not in JavaScript. | 1,000+ DNC entries combined with 10,000+ contacts |
| Syncing all campaign data from Instantly.ai on every page load | API rate limits hit, pages time out | Sync on a schedule (cron job via Vercel Cron or Supabase pg_cron). Cache results in database. Show cached data on page load. | 5+ campaigns per client, 15+ clients |
| Storing email body as HTML in JSONB without size limits | Database bloat, slow full-table queries | Store email bodies in a separate table or column with TEXT type. Limit stored body size. Lazy-load body content. | 10,000+ emails total |
| No database connection pooling | "Too many connections" errors in serverless | Use Supabase's built-in connection pooler (PgBouncer on port 6543). Configure Next.js API routes to use the pooled connection string. | 20+ concurrent serverless function invocations |

## Security Mistakes

Domain-specific security issues beyond general web security.

| Mistake | Risk | Prevention |
|---------|------|------------|
| Exposing Supabase service_role key to the client bundle | Full database access bypass -- attacker can read/write all tenants | Never use `NEXT_PUBLIC_SUPABASE_SERVICE_ROLE_KEY`. Audit env vars. Use the anon key on the client. |
| RLS policies that check `auth.uid()` but not `client_id` | A user from Client A who somehow gets a valid JWT could access Client B data if they guess the client_id | RLS must check both `auth.uid()` and `client_id` from JWT claims (`auth.jwt() -> 'app_metadata' ->> 'client_id'`). |
| No rate limiting on the reply-to-lead endpoint | An attacker or bug could send thousands of emails from client accounts, damaging sender reputation | Rate limit email sending: max N replies per minute per client. Log all sent emails. Add confirmation step in UI. |
| CSV export endpoint without proper auth checks | Unauthenticated users could download client contact lists | Ensure export routes verify session, role, and client_id. Never serve exports from a predictable/guessable URL. |
| Instantly.ai API key stored per-client in the database without encryption | Database breach exposes all API keys | Encrypt API keys at rest. Use Supabase Vault or application-level encryption. Never return raw API keys to the client. |
| Client-uploaded logos not validated for content type | XSS via SVG uploads, malicious file execution | Restrict uploads to PNG/JPG only. Validate MIME type server-side. Serve from a separate domain or with `Content-Disposition: inline` and strict CSP. |

## UX Pitfalls

Common user experience mistakes in this domain.

| Pitfall | User Impact | Better Approach |
|---------|-------------|-----------------|
| No feedback during CSV upload/processing | Operators think the upload failed and re-submit, creating duplicates | Show a progress bar with row count. Disable the submit button during processing. Show success/error summary with row counts. |
| DNC filtering results not shown before export | Operators do not know which contacts were filtered out or why | Show a diff view: "X contacts removed (Y email matches, Z domain matches)" before exporting the cleaned CSV. |
| Reply composer does not show the email thread context | Client/operator replies without seeing the conversation history, sends confusing messages | Show the full email thread (original outreach + all replies) above the compose box, similar to Gmail's reply view. |
| Switching between clients has no visual confirmation | Operator accidentally works on the wrong client account | Show a prominent client banner (name + brand color) at the top of every operator page. Animate the transition when switching clients. |
| Dutch translation is inconsistent or uses English technical terms | Client-facing UI feels unprofessional | Create a centralized translation constants file. Have a Dutch speaker review all strings. Avoid anglicisms for common terms (use "Overzicht" not "Dashboard Overview"). |
| Statistics page shows raw numbers without context | Clients cannot tell if their campaign is performing well or poorly | Show trends (week-over-week), benchmarks (industry average response rate), and visual indicators (green/yellow/red). |

## "Looks Done But Isn't" Checklist

Things that appear complete but are missing critical pieces.

- [ ] **RLS policies:** Every table has RLS enabled -- verify with `SELECT tablename, rowsecurity FROM pg_tables WHERE schemaname = 'public'`
- [ ] **CSV import:** Works with 20,000+ row files on Vercel production (not just local dev). Test with real production-size files.
- [ ] **Email threading:** Replies thread correctly in Gmail AND Outlook AND Apple Mail. Test with real mailboxes, not just API responses.
- [ ] **DNC filtering:** Handles both exact email matches AND domain-level blocks. Test: adding `@company.com` to DNC removes all contacts at that domain.
- [ ] **White-label branding:** Log in as Client A, then log in as Client B in the same browser -- verify no cached branding leakage.
- [ ] **CSV export:** Exported CSV contains ALL original columns from the import, including columns not used by the platform. Verify with a CSV that has 20+ custom columns.
- [ ] **Auth:** A client user cannot access the operator dashboard routes. An operator can access all client dashboards. Verify route protection.
- [ ] **Instantly.ai sync:** Campaign data updates within a reasonable time window. If the sync breaks (API key revoked, rate limit), operators get an error notification -- not silent stale data.
- [ ] **Connection pooling:** Verify Supabase connection string uses the pooler endpoint (port 6543), not the direct connection (port 5432), in production.
- [ ] **Dutch translations:** Every single client-facing string is in Dutch. No English fallbacks visible to clients. Have a Dutch speaker click through every page.

## Recovery Strategies

When pitfalls occur despite prevention, how to recover.

| Pitfall | Recovery Cost | Recovery Steps |
|---------|---------------|----------------|
| Tenant data leakage | HIGH | Immediate: disable affected endpoints. Audit all queries. Notify affected clients. Add RLS policies. Run cross-tenant data audit. Consider legal obligations. |
| CSV timeout on Vercel | MEDIUM | Switch to client-side parsing + batched upload. Requires frontend refactor but no data migration. |
| Email threading broken | MEDIUM | Re-sync emails from Instantly.ai to capture missing message_id/references. Update email data model. Existing replies cannot be re-threaded retroactively. |
| JSONB query performance | HIGH | Add dedicated columns via migration. Backfill from JSONB data. Update all queries. Full data migration required. |
| Branding leakage | LOW | Add cache-busting headers. Fix tenant context derivation. Low recovery cost because it is a display issue, not a data issue. |
| Wrong-client operator action | MEDIUM | Depends on the action. CSV upload to wrong client: delete and re-upload. Email sent to wrong client's lead: cannot be unsent. Add confirmation dialogs to prevent recurrence. |

## Pitfall-to-Phase Mapping

How roadmap phases should address these pitfalls.

| Pitfall | Prevention Phase | Verification |
|---------|------------------|--------------|
| Tenant data leakage (RLS) | Database Schema / Foundation | Integration test: auth as Client A, attempt to read Client B data on every table. SQL query to verify all tables have RLS enabled. |
| CSV processing timeout | CSV Import/Export Workflow | Load test: upload 20k-row CSV on Vercel production. Verify completion within timeout. |
| Email threading | Email/Inbox Integration | Manual test: send reply via dashboard, verify threading in Gmail + Outlook. |
| JSONB performance | Database Schema / Foundation | Verify dedicated columns exist for email, name, company. Verify B-tree indexes on those columns. |
| White-label branding leakage | Auth + Branding | Multi-tenant visual test: log in as two different clients, screenshot and compare branding. Verify Cache-Control headers. |
| Operator wrong-client action | Operator Dashboard | Verify client_id is in URL path for all operator routes. Verify API validates client_id on every request. |
| Instantly.ai rate limits | API Integration | Load test: trigger sync for 15 clients simultaneously. Verify no 429 errors. |
| Service role key exposure | Foundation / Security Audit | Audit: search codebase for `NEXT_PUBLIC_.*SERVICE`. Verify service_role key is only used in server-side code. |
| No connection pooling | Database Setup | Verify connection string in production uses port 6543 (pooler). |
| DNC filtering performance | CSV/DNC Workflow | Benchmark: filter 20k contacts against 5k DNC entries. Must complete in under 5 seconds. |

## Sources

- Training data knowledge of Supabase RLS, PostgreSQL JSONB, Next.js App Router, Vercel serverless constraints, email RFC 2822 threading headers (MEDIUM confidence -- WebSearch unavailable for live verification)
- Project context from `.planning/PROJECT.md`
- Common patterns observed in multi-tenant SaaS architectures

**Confidence note:** WebSearch and WebFetch were unavailable during this research session. All findings are based on training data (cutoff ~mid-2025). Specifically:
- Supabase RLS behavior: HIGH confidence (well-documented, stable feature)
- Vercel serverless limits: MEDIUM confidence (exact limits may have changed -- verify current plan limits)
- Instantly.ai API specifics: LOW confidence (smaller API surface, less training data coverage -- verify API docs for exact fields returned, rate limits, and threading header support)
- PostgreSQL JSONB performance: HIGH confidence (well-established database behavior)
- Email threading standards: HIGH confidence (RFC 2822 is stable)

---
*Pitfalls research for: NextWave Solutions multi-tenant B2B client dashboard platform*
*Researched: 2026-02-15*
