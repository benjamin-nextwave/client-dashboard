# Architecture Research

**Domain:** Multi-tenant B2B client dashboard platform (cold email agency)
**Researched:** 2026-02-15
**Confidence:** MEDIUM (training knowledge only -- WebSearch/WebFetch unavailable for live verification)

## Standard Architecture

### System Overview

```
┌─────────────────────────────────────────────────────────────────────┐
│                      PRESENTATION LAYER                             │
│                                                                     │
│  ┌──────────────────┐     ┌──────────────────────────────────────┐  │
│  │  Operator Admin   │     │         Client Dashboards            │  │
│  │  /admin/*         │     │  /dashboard/[clientSlug]/*           │  │
│  │  (English)        │     │  (Dutch, white-labeled)              │  │
│  └────────┬─────────┘     └──────────────┬───────────────────────┘  │
│           │                              │                          │
├───────────┴──────────────────────────────┴──────────────────────────┤
│                      MIDDLEWARE + AUTH LAYER                         │
│                                                                     │
│  ┌──────────────┐  ┌──────────────┐  ┌────────────────────────┐    │
│  │  Next.js      │  │  Supabase    │  │  Tenant Context        │    │
│  │  Middleware    │  │  Auth        │  │  Resolution            │    │
│  └──────┬───────┘  └──────┬───────┘  └───────────┬────────────┘    │
│         │                 │                       │                  │
├─────────┴─────────────────┴───────────────────────┴─────────────────┤
│                      API / SERVER ACTION LAYER                       │
│                                                                     │
│  ┌────────────┐ ┌────────────┐ ┌──────────┐ ┌───────────────────┐  │
│  │  Campaign   │ │  Inbox     │ │  CSV     │ │  Client/Branding  │  │
│  │  Stats API  │ │  Reply API │ │  Process │ │  Management API   │  │
│  └─────┬──────┘ └─────┬──────┘ └────┬─────┘ └────────┬──────────┘  │
│        │              │             │                 │              │
├────────┴──────────────┴─────────────┴─────────────────┴─────────────┤
│                      DATA ACCESS LAYER                               │
│                                                                     │
│  ┌──────────────────────┐  ┌──────────────────────────────────┐    │
│  │  Supabase Client     │  │  Instantly.ai API Client          │    │
│  │  (RLS-enforced)      │  │  (Server-side only)               │    │
│  └──────────┬───────────┘  └───────────────┬──────────────────┘    │
│             │                              │                        │
├─────────────┴──────────────────────────────┴────────────────────────┤
│                      STORAGE LAYER                                   │
│                                                                     │
│  ┌──────────────────┐  ┌──────────────┐  ┌──────────────────────┐  │
│  │  PostgreSQL       │  │  Supabase    │  │  Instantly.ai        │  │
│  │  (all tables)     │  │  Storage     │  │  (campaigns,         │  │
│  │                   │  │  (logos)     │  │   replies, sending)  │  │
│  └──────────────────┘  └──────────────┘  └──────────────────────┘  │
└─────────────────────────────────────────────────────────────────────┘
```

### Component Responsibilities

| Component | Responsibility | Typical Implementation |
|-----------|----------------|------------------------|
| Next.js Middleware | Route protection, role-based redirect, tenant slug resolution | `middleware.ts` at project root, runs on every request |
| Supabase Auth | User sessions, JWT tokens, role claim embedding | Supabase auth with custom `user_metadata.role` and `user_metadata.client_id` |
| Tenant Context | Resolve current client from URL slug or auth session, provide branding | React context provider wrapping client dashboard routes |
| Campaign Stats API | Aggregate and serve Instantly.ai campaign data per client | Server Actions or Route Handlers calling Instantly API + local cache |
| Inbox/Reply API | Fetch replies, send responses via original sender account | Route Handlers that proxy to Instantly.ai with proper headers |
| CSV Processor | Parse uploads, validate, store in JSONB, apply DNC filtering, export | Server Action for upload; utility functions for parse/filter/export |
| Client Management API | CRUD for clients, branding config, user account provisioning | Server Actions with operator-only auth checks |
| Supabase Client | All database reads/writes with RLS enforcement | `@supabase/ssr` for server components, `@supabase/supabase-js` for client |
| Instantly.ai Client | Campaign data fetch, email sending, reply retrieval | Custom wrapper class, server-side only (API keys never exposed to browser) |

## Recommended Project Structure

```
src/
├── app/
│   ├── (auth)/
│   │   ├── login/page.tsx           # Shared login page
│   │   └── layout.tsx               # Minimal layout for auth pages
│   ├── (operator)/
│   │   ├── admin/
│   │   │   ├── layout.tsx           # Operator shell (sidebar, nav)
│   │   │   ├── page.tsx             # Operator home / client list
│   │   │   ├── clients/
│   │   │   │   ├── page.tsx         # All clients overview
│   │   │   │   ├── [clientId]/
│   │   │   │   │   ├── page.tsx     # Single client management
│   │   │   │   │   └── csv/page.tsx # CSV import/export for client
│   │   │   │   └── new/page.tsx     # Create new client
│   │   │   ├── errors/page.tsx      # Error monitoring dashboard
│   │   │   └── upload/page.tsx      # Bulk CSV operations
│   │   └── layout.tsx               # Operator auth guard
│   ├── (client)/
│   │   ├── dashboard/
│   │   │   ├── layout.tsx           # Client shell (branded sidebar)
│   │   │   ├── page.tsx             # Overzicht (overview/stats)
│   │   │   ├── inbox/page.tsx       # Inbox with reply capability
│   │   │   ├── preview/page.tsx     # 7-day contact preview
│   │   │   ├── sent/page.tsx        # Sent emails read-only
│   │   │   ├── dnc/page.tsx         # Do-not-contact management
│   │   │   └── meetings/page.tsx    # External URL redirect
│   │   └── layout.tsx               # Client auth guard + branding provider
│   ├── api/
│   │   ├── instantly/
│   │   │   ├── campaigns/route.ts   # Campaign data proxy
│   │   │   ├── replies/route.ts     # Reply fetch proxy
│   │   │   └── send/route.ts        # Send email proxy
│   │   ├── csv/
│   │   │   ├── import/route.ts      # CSV upload endpoint
│   │   │   └── export/route.ts      # CSV download endpoint
│   │   └── webhooks/
│   │       └── instantly/route.ts   # Webhook receiver (if needed)
│   ├── layout.tsx                   # Root layout
│   └── middleware.ts                # Auth + role routing
├── components/
│   ├── ui/                          # Shared primitives (Button, Card, etc.)
│   ├── charts/                      # Campaign stat charts
│   ├── tables/                      # Data tables (contacts, emails, DNC)
│   ├── forms/                       # CSV upload, DNC entry, client creation
│   ├── inbox/                       # Email thread view, reply composer
│   └── branding/                    # White-label wrapper, themed components
├── lib/
│   ├── supabase/
│   │   ├── client.ts                # Browser Supabase client
│   │   ├── server.ts                # Server Supabase client (cookies-based)
│   │   ├── admin.ts                 # Service-role client for operator ops
│   │   └── middleware.ts            # Supabase middleware helper
│   ├── instantly/
│   │   ├── client.ts                # Instantly.ai API wrapper
│   │   ├── types.ts                 # Instantly API response types
│   │   └── campaigns.ts             # Campaign-specific helpers
│   ├── csv/
│   │   ├── parser.ts                # CSV parse with JSONB preservation
│   │   ├── exporter.ts              # CSV export from JSONB
│   │   └── dnc-filter.ts            # DNC filtering logic
│   └── utils/
│       ├── auth.ts                  # Auth helpers (getRole, getClientId)
│       ├── branding.ts              # Color/logo resolution
│       └── dutch.ts                 # Dutch label constants
├── hooks/
│   ├── use-client-context.ts        # Current client branding/config
│   ├── use-auth.ts                  # Auth state hook
│   └── use-instantly.ts             # Campaign data hooks
├── types/
│   ├── database.ts                  # Generated Supabase types
│   ├── instantly.ts                 # Instantly.ai domain types
│   └── csv.ts                       # CSV/import types
└── middleware.ts                     # Root middleware (auth + routing)
```

### Structure Rationale

- **Route groups `(auth)`, `(operator)`, `(client)`:** Separate layout trees per user role. Each group has its own layout.tsx that enforces auth and applies role-specific UI shell. No shared layout between operator and client prevents accidental UI bleed.
- **`lib/` for service clients:** All external API communication (Supabase, Instantly) lives in `lib/`, never in components. This keeps data fetching testable and prevents API keys from leaking into client bundles.
- **`components/` by domain, not by page:** Charts, tables, inbox components are reusable across pages. A `charts/CampaignStats` component serves both the operator client-detail view and the client overview page.
- **`api/` routes for external integrations:** Instantly.ai calls must go through server-side Route Handlers because the API key cannot be exposed client-side. CSV upload also needs a server endpoint for file processing.

## Architectural Patterns

### Pattern 1: Tenant Isolation via client_id Foreign Keys + Application-Level Guards

**What:** Every data table includes a `client_id` column. Every query filters by the authenticated user's `client_id`. Supabase RLS policies provide a safety net, but application code also enforces scoping.

**When to use:** Always -- this is the core multi-tenancy mechanism.

**Trade-offs:**
- PRO: Simple, no schema-per-tenant complexity, works with Supabase RLS
- PRO: Easy to query across tenants for operator views
- CON: One missed WHERE clause = data leak. RLS mitigates this for direct Supabase access but not for server-side service-role queries.

**Example:**
```typescript
// lib/supabase/server.ts -- scoped query helper
export async function getClientData(
  tableName: string,
  clientId: string
) {
  const supabase = createServerClient();
  const { data, error } = await supabase
    .from(tableName)
    .select('*')
    .eq('client_id', clientId);

  if (error) throw new TenantScopeError(tableName, clientId, error);
  return data;
}

// RLS policy (applied in Supabase SQL editor)
// CREATE POLICY "clients_own_data" ON contacts
//   FOR ALL
//   USING (
//     client_id = (auth.jwt() -> 'user_metadata' ->> 'client_id')::uuid
//     OR
//     (auth.jwt() -> 'user_metadata' ->> 'role') = 'operator'
//   );
```

### Pattern 2: Dual Supabase Client Strategy (User-scoped vs Service-role)

**What:** Use two Supabase clients -- a user-scoped client (respects RLS, uses session cookies) for client-facing operations, and a service-role client (bypasses RLS) for operator admin operations that need cross-tenant access.

**When to use:** Client pages use user-scoped client. Operator pages and background jobs (CSV processing, data sync) use service-role client.

**Trade-offs:**
- PRO: RLS automatically prevents client data leaks in client-facing code
- PRO: Operators can query across all tenants without RLS restrictions
- CON: Service-role client is powerful -- must never be exposed to browser. Server-only.

**Example:**
```typescript
// lib/supabase/server.ts -- user-scoped (for client pages)
import { createServerClient as createSSR } from '@supabase/ssr';

export function createUserClient() {
  const cookieStore = cookies();
  return createSSR(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    { cookies: { /* cookie handlers */ } }
  );
}

// lib/supabase/admin.ts -- service-role (for operator/background)
import { createClient } from '@supabase/supabase-js';

export function createAdminClient() {
  return createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!  // Never NEXT_PUBLIC_
  );
}
```

### Pattern 3: Server Actions for Mutations, Route Handlers for External APIs

**What:** Use Next.js Server Actions for database mutations (create client, update DNC list, etc.) and Route Handlers (`app/api/`) for operations that involve external APIs or file processing (Instantly.ai calls, CSV upload/download).

**When to use:** Server Actions for form submissions and simple CRUD. Route Handlers for streaming responses, file uploads, webhook receivers, and external API proxying.

**Trade-offs:**
- PRO: Server Actions are simpler, type-safe with `useActionState`, progressively enhanced
- PRO: Route Handlers give full control over request/response for external API proxying
- CON: Server Actions cannot stream large responses (CSV export needs Route Handler)

**Example:**
```typescript
// Server Action for mutation
'use server';

export async function addToDncList(formData: FormData) {
  const supabase = createUserClient();
  const email = formData.get('email') as string;
  const clientId = await getAuthenticatedClientId();

  const { error } = await supabase
    .from('do_not_contact')
    .insert({ client_id: clientId, email, source: 'manual' });

  if (error) return { error: error.message };
  revalidatePath('/dashboard/dnc');
  return { success: true };
}

// Route Handler for external API proxy
// app/api/instantly/send/route.ts
export async function POST(request: Request) {
  const session = await getSession();
  if (!session) return Response.json({ error: 'Unauthorized' }, { status: 401 });

  const body = await request.json();
  const result = await instantlyClient.sendReply({
    ...body,
    // Server adds API key, enforces sender account
  });

  return Response.json(result);
}
```

### Pattern 4: White-Label Branding via CSS Custom Properties

**What:** Store each client's `primary_color` and `logo_url` in the `clients` table. On client dashboard load, inject these as CSS custom properties at the layout level. All themed components reference `var(--brand-primary)` instead of hardcoded colors.

**When to use:** Every client-facing page.

**Trade-offs:**
- PRO: Zero JavaScript overhead for theming -- pure CSS
- PRO: Tailwind arbitrary values work: `bg-[var(--brand-primary)]`
- PRO: Easy to extend later (secondary color, font) without refactoring
- CON: Limited to properties CSS can express (sufficient for color + logo)

**Example:**
```typescript
// app/(client)/dashboard/layout.tsx
export default async function ClientDashboardLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const client = await getCurrentClient();

  return (
    <div
      style={{
        '--brand-primary': client.primary_color,
        '--brand-primary-light': `${client.primary_color}20`,
      } as React.CSSProperties}
    >
      <Sidebar logoUrl={client.logo_url} />
      <main>{children}</main>
    </div>
  );
}

// Any themed component
function BrandedButton({ children }: { children: React.ReactNode }) {
  return (
    <button className="bg-[var(--brand-primary)] text-white hover:opacity-90">
      {children}
    </button>
  );
}
```

### Pattern 5: JSONB-Based CSV Storage for Column Fidelity

**What:** Store each CSV row as a JSONB object in the `raw_data` column alongside normalized columns (`email`, `first_name`, `last_name`). On export, reconstruct the full CSV from JSONB, preserving every original column.

**When to use:** Contacts and preview_contacts tables -- anywhere CSV data is imported.

**Trade-offs:**
- PRO: Zero column loss regardless of CSV schema variation across clients
- PRO: Normalized columns enable fast queries/filtering; JSONB preserves everything else
- CON: JSONB is not indexable for arbitrary fields (fine for this use case -- queries use normalized columns)
- CON: Storage is slightly larger than pure relational

**Example:**
```typescript
// Schema concept
// contacts table:
//   id, client_id, email, first_name, last_name, company_name,
//   raw_data JSONB,  -- full original row: {"email": "...", "vacancy_url": "...", ...}
//   created_at

// Import: parse CSV, extract known columns, store full row as JSONB
function processCSVRow(row: Record<string, string>, clientId: string) {
  return {
    client_id: clientId,
    email: row.email,
    first_name: row.first_name,
    last_name: row.last_name,
    company_name: row.company_name,
    raw_data: row,  // Entire original row preserved
  };
}

// Export: reconstruct from JSONB
function exportToCSV(contacts: Contact[]): string {
  const allKeys = new Set<string>();
  contacts.forEach(c => Object.keys(c.raw_data).forEach(k => allKeys.add(k)));
  // Build CSV with all original columns
}
```

## Data Flow

### Request Flow (Client Dashboard)

```
[Browser] → [Next.js Middleware]
                │
                ├─ Check Supabase session cookie
                ├─ Extract role from JWT user_metadata
                ├─ If no session → redirect /login
                ├─ If role=operator accessing /dashboard → redirect /admin
                ├─ If role=client accessing /admin → redirect /dashboard
                │
                ↓
[Server Component / Route Handler]
                │
                ├─ createUserClient() → Supabase (RLS-enforced)
                ├─ Query with automatic client_id scoping via RLS
                │
                ↓
[PostgreSQL + RLS Policy]
                │
                ↓
[Data returned] → [Server Component renders] → [HTML to browser]
```

### Request Flow (Operator Admin)

```
[Browser] → [Next.js Middleware]
                │
                ├─ Verify operator role
                │
                ↓
[Server Component / Server Action]
                │
                ├─ createAdminClient() → Supabase (service-role, no RLS)
                ├─ Query across all clients or specific client_id
                │
                ↓
[PostgreSQL (no RLS)]
                │
                ↓
[Data returned] → [Server Component renders] → [HTML to browser]
```

### Instantly.ai Data Flow

```
[Operator triggers sync]  OR  [Cron job / webhook]
         │
         ↓
[Server: Instantly API Client]
         │
         ├─ GET /campaigns → campaign list per client
         ├─ GET /campaign/analytics → stats per campaign
         ├─ GET /replies → new replies with sentiment
         │
         ↓
[Transform + Store in PostgreSQL]
         │
         ├─ emails_sent table (outbound message records)
         ├─ replies table (inbound, with sentiment)
         ├─ Update campaign stats cache
         │
         ↓
[Client dashboard reads from PostgreSQL, not Instantly directly]
```

### CSV Import Flow

```
[Operator uploads CSV for client X]
         │
         ↓
[Route Handler: /api/csv/import]
         │
         ├─ Parse CSV (papaparse or similar)
         ├─ Validate required columns (email minimum)
         ├─ Store each row: normalized columns + full JSONB
         │
         ↓
[Apply DNC filter]
         │
         ├─ Match against do_not_contact table for client X
         ├─ Match against domain blocks
         ├─ Flag or remove matches
         │
         ↓
[Insert into contacts / preview_contacts]
         │
         ↓
[Return summary: imported count, filtered count, errors]
```

### Email Reply Flow

```
[Client views inbox → clicks "Reply"]
         │
         ↓
[Reply composer component]
         │
         ├─ Shows original thread
         ├─ Client types reply
         ├─ Submits to /api/instantly/send
         │
         ↓
[Route Handler]
         │
         ├─ Verify client owns this thread (client_id check)
         ├─ Look up original sender account from replies/outbound_messages
         ├─ Call Instantly.ai API: send reply
         │   ├─ from: original sender email
         │   ├─ In-Reply-To: original message ID
         │   ├─ References: thread message IDs
         │
         ↓
[Instantly.ai sends email]
         │
         ↓
[Store sent reply in outbound_messages table]
```

### Key Data Flows

1. **Campaign data sync:** Instantly.ai API --> server-side sync job --> PostgreSQL --> client dashboard reads from DB. Clients never call Instantly directly.
2. **CSV round-trip:** Operator uploads CSV --> parsed + DNC-filtered --> stored with JSONB --> exported back with all original columns intact.
3. **Email reply chain:** Client reads reply from DB --> composes response --> server proxies to Instantly.ai with correct sender identity --> response stored locally.
4. **White-label resolution:** Client logs in --> middleware resolves client_id from JWT --> layout fetches client branding --> CSS custom properties applied to all child routes.

## Scaling Considerations

| Scale | Architecture Adjustments |
|-------|--------------------------|
| 15 clients (current) | Monolith is perfect. Server Components handle all rendering. Direct Instantly.ai API calls on demand. No caching needed. |
| 50-100 clients | Add campaign data caching (store Instantly stats in PostgreSQL, sync on interval rather than per-request). Add database indexes on client_id + created_at. |
| 500+ clients | Background job system for Instantly sync (Vercel Cron or external). Consider connection pooling (Supabase has built-in Supavisor). Paginate all list views. |

### Scaling Priorities

1. **First bottleneck: Instantly.ai API rate limits.** If every client dashboard load triggers live Instantly API calls, you hit rate limits fast. Solution: sync Instantly data to PostgreSQL on a schedule (every 15-30 min), serve from local DB. Build this from the start -- it is simpler than live-fetching anyway.
2. **Second bottleneck: CSV processing for large files.** A 50,000-row CSV with DNC filtering takes time. Solution: process asynchronously, show progress. For v1 with 15 clients, synchronous processing in a Route Handler is fine up to ~10,000 rows.

## Anti-Patterns

### Anti-Pattern 1: Client-Side Instantly.ai API Calls

**What people do:** Call the Instantly.ai API directly from browser JavaScript to avoid writing backend proxy endpoints.
**Why it's wrong:** Exposes the Instantly.ai API key to every client user. Any client could extract the key and access all campaign data across all clients.
**Do this instead:** All Instantly.ai calls go through Route Handlers on the server. The API key lives in environment variables, never in `NEXT_PUBLIC_` prefixed vars.

### Anti-Pattern 2: Relying Solely on RLS Without Application Guards

**What people do:** Set up RLS policies and assume all data access is safe, then use the service-role client everywhere for convenience.
**Why it's wrong:** The service-role client bypasses RLS entirely. If operator code accidentally passes user input without filtering by client_id, data leaks across tenants.
**Do this instead:** Use the user-scoped client (`anon` key + session cookies) for all client-facing pages. Reserve the service-role client for operator admin code and background jobs. Add application-level `client_id` checks as defense in depth even when RLS is active.

### Anti-Pattern 3: Storing Branding in Environment Variables or Config Files

**What people do:** Define per-client themes in a config file or hardcode them, requiring a deploy for each new client.
**Why it's wrong:** Adding a new client should be a database operation, not a code change. Config-file branding does not scale and creates deploy coupling.
**Do this instead:** Store `primary_color` and `logo_url` in the `clients` database table. Read at runtime in the client dashboard layout. New clients get branding immediately upon database entry.

### Anti-Pattern 4: Mixing Operator and Client Route Layouts

**What people do:** Use a single layout for both operator and client views, with conditional rendering based on role.
**Why it's wrong:** Creates a tangled component tree where operator UI leaks into client views (or vice versa). Makes it easy to accidentally show admin controls to clients.
**Do this instead:** Use Next.js route groups: `(operator)` and `(client)` with completely separate layout trees. Share only leaf components (buttons, charts) through `components/`, never layouts.

### Anti-Pattern 5: Live-Fetching All Instantly Data on Page Load

**What people do:** Every time a client loads the overview page, make 5+ Instantly API calls to get campaign stats, reply counts, etc.
**Why it's wrong:** Slow page loads (Instantly API latency), API rate limit exhaustion, no offline resilience. Same data fetched repeatedly for no reason.
**Do this instead:** Sync Instantly data to PostgreSQL periodically (cron or operator-triggered). Dashboard reads from local DB. Show "Last synced: X minutes ago" to set expectations.

## Integration Points

### External Services

| Service | Integration Pattern | Notes |
|---------|---------------------|-------|
| Instantly.ai API | Server-side REST client via Route Handlers. Sync data to local DB on schedule. Proxy email sending. | API key in env vars only. Rate limits apply -- batch requests where possible. Instantly handles sentiment classification of replies. |
| Supabase Auth | SSR cookie-based sessions via `@supabase/ssr`. Custom user_metadata for role + client_id. | Use `auth.signUp()` with metadata for new client users. Operators create client user accounts. |
| Supabase Storage | Logo uploads via operator admin. Public bucket for logo serving. | Generate unique paths: `logos/{client_id}/logo.{ext}`. Set max file size. |
| Vercel | Deployment platform. Environment variables for all secrets. | Use Vercel Cron for scheduled Instantly sync if needed. Preview deployments for staging. |

### Internal Boundaries

| Boundary | Communication | Notes |
|----------|---------------|-------|
| Client pages <-> Data | User-scoped Supabase client (RLS active) | Client code NEVER uses service-role client |
| Operator pages <-> Data | Service-role Supabase client (no RLS) + explicit client_id filtering | Operators need cross-tenant queries for overview/management |
| Any page <-> Instantly.ai | Via `/api/instantly/*` Route Handlers only | Never direct browser-to-Instantly calls |
| CSV processing <-> Database | Server Action (small files) or Route Handler (large files) | DNC filtering happens server-side before insert |
| Auth <-> Middleware | Supabase session cookie checked in middleware on every request | Middleware sets tenant context for downstream components |

## Build Order (Dependency-Based)

The following order reflects technical dependencies -- each layer requires the previous one to function.

### Layer 1: Foundation (must be first)
- Supabase project setup + schema creation (all tables with client_id)
- RLS policies on all tables
- Auth configuration (user_metadata schema for role + client_id)
- Next.js project scaffold with route groups
- Middleware for auth + role routing
- Supabase client utilities (user-scoped + service-role)

### Layer 2: Operator Core (enables everything else)
- Client CRUD (create/edit/delete clients with branding fields)
- Client user provisioning (create Supabase auth users for clients)
- White-label branding storage and resolution

### Layer 3: Client Dashboard Shell
- Client layout with branding injection (CSS custom properties)
- Navigation sidebar (Dutch labels)
- Auth guard for client routes

### Layer 4: Data Features (can be parallelized)
- Campaign stats / Overzicht page (requires Instantly.ai client)
- Instantly.ai API wrapper + data sync to PostgreSQL
- Inbox / replies view
- Email reply functionality (send via Instantly from original sender)
- Sent emails view
- Contact preview (7-day lookahead)
- DNC management (manual + domain blocking)

### Layer 5: CSV Pipeline
- CSV parser with JSONB preservation
- CSV import with DNC filtering
- CSV export reconstructing full original columns

### Layer 6: Polish
- Error monitoring dashboard (operator)
- Meetings page (external URL redirect)
- Edge cases, loading states, error handling

**Rationale:** You cannot build client dashboards without auth and client records. You cannot show campaign data without the Instantly integration. CSV processing depends on having the contacts schema and DNC logic in place. Everything converges at Layer 4 where multiple features can be built in parallel.

## Sources

- Training knowledge of Next.js App Router, Supabase auth/RLS, multi-tenant SaaS patterns (MEDIUM confidence -- unable to verify against live documentation due to tool restrictions)
- Project context from `.planning/PROJECT.md` (HIGH confidence -- project-specific requirements)

**Note:** WebSearch and WebFetch were unavailable during this research session. Key claims about Supabase RLS policy syntax, `@supabase/ssr` client patterns, and Instantly.ai API capabilities should be verified against current documentation before implementation begins.

---
*Architecture research for: NextWave Solutions multi-tenant B2B client dashboard platform*
*Researched: 2026-02-15*
