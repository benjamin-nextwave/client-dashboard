# Phase 8: Polish & Error Monitoring - Research

**Researched:** 2026-02-15
**Domain:** Next.js error handling, Supabase error logging, redirect patterns
**Confidence:** HIGH

## Summary

Phase 8 covers three distinct areas: (1) an operator-facing error monitoring dashboard backed by a new Supabase table that logs API failures, import errors, and sync issues; (2) client meetings page redirect logic using the existing `meeting_url` column on the `clients` table; and (3) production-readiness polish by adding `error.tsx` and `loading.tsx` files across all route segments.

The codebase currently has **zero** `error.tsx` or `loading.tsx` files. All error handling is inline (conditional rendering of error messages from Supabase query results or server action return values). The `meeting_url` field already exists in the database schema and is already editable via the client form -- the afspraken page just needs redirect logic. The error monitoring dashboard requires a new `error_logs` table in Supabase plus a new admin page at `/admin/errors`.

**Primary recommendation:** Create the `error_logs` table first, then instrument existing sync/API code to write errors to it, build the operator dashboard page, implement the meetings redirect, and finally add error.tsx/loading.tsx files across all route segments.

## Standard Stack

### Core
| Library | Version | Purpose | Why Standard |
|---------|---------|---------|--------------|
| Next.js | 15.5.12 | App Router error.tsx/loading.tsx conventions | Already in use |
| @supabase/supabase-js | ^2.95.3 | Database queries for error_logs table | Already in use |
| Supabase (admin client) | service_role | Write error logs from server-side code | Already in use |

### Supporting
| Library | Version | Purpose | When to Use |
|---------|---------|---------|-------------|
| date-fns | ^4.1.0 | Format timestamps in error dashboard | Already in project |
| zod | ^3.25.76 | Validate error log inputs | Already in project |

No new dependencies are needed for this phase.

**Installation:**
```bash
# No new packages required
```

## Architecture Patterns

### Recommended Project Structure
```
src/
  app/
    (operator)/admin/
      errors/
        page.tsx                    # Error monitoring dashboard (server component, force-dynamic)
        _components/
          error-log-table.tsx       # Client component for interactive table
          error-log-filters.tsx     # Client component for filtering by client/type/status
    (client)/dashboard/
      afspraken/
        page.tsx                    # Redirect logic (server component)
      error.tsx                     # Client dashboard error boundary
      loading.tsx                   # Client dashboard loading skeleton
    (operator)/admin/
      error.tsx                     # Operator admin error boundary
      loading.tsx                   # Operator admin loading skeleton
    error.tsx                       # Root error boundary (catches layout errors from route groups)
    global-error.tsx                # Global error boundary (wraps entire app including root layout)
  lib/
    data/
      error-logs.ts                # Query functions for error_logs table
    errors/
      log-error.ts                 # Utility to write errors to error_logs table
supabase/
  migrations/
    YYYYMMDD_error_logs.sql        # New error_logs table + RLS policies
```

### Pattern 1: Error Logging Utility
**What:** A server-side utility function that writes structured error entries to the `error_logs` table using the admin client. Called from existing sync code, API routes, and server actions where errors are currently only `console.error`-ed.
**When to use:** Any time an operation fails that the operator should know about (API failures, import errors, sync issues).
**Example:**
```typescript
// src/lib/errors/log-error.ts
import { createAdminClient } from '@/lib/supabase/admin'

interface LogErrorInput {
  clientId: string
  errorType: 'api_failure' | 'import_error' | 'sync_error'
  message: string
  details?: Record<string, unknown>
}

export async function logError(input: LogErrorInput): Promise<void> {
  try {
    const supabase = createAdminClient()
    await supabase.from('error_logs').insert({
      client_id: input.clientId,
      error_type: input.errorType,
      message: input.message,
      details: input.details ?? null,
    })
  } catch (e) {
    // Never let error logging crash the parent operation
    console.error('Failed to log error:', e)
  }
}
```

### Pattern 2: Next.js error.tsx Error Boundary
**What:** A client component that catches runtime errors in a route segment and displays a fallback UI with a retry button.
**When to use:** Place at each route group level to catch errors from child pages.
**Example:**
```typescript
// src/app/(client)/dashboard/error.tsx
'use client'

export default function DashboardError({
  error,
  reset,
}: {
  error: Error & { digest?: string }
  reset: () => void
}) {
  return (
    <div className="flex min-h-[400px] flex-col items-center justify-center">
      <h2 className="text-lg font-semibold text-gray-900">
        Er is iets misgegaan
      </h2>
      <p className="mt-2 text-sm text-gray-600">
        {error.message || 'Een onverwachte fout is opgetreden.'}
      </p>
      <button
        onClick={reset}
        className="mt-4 rounded-md bg-blue-600 px-4 py-2 text-sm font-medium text-white hover:bg-blue-700"
      >
        Opnieuw proberen
      </button>
    </div>
  )
}
```

### Pattern 3: Next.js loading.tsx Skeleton
**What:** A server component that renders immediately while the page's async data loads, wrapped in a Suspense boundary by Next.js automatically.
**When to use:** Place at each route group level for a generic loading skeleton.
**Example:**
```typescript
// src/app/(client)/dashboard/loading.tsx
export default function DashboardLoading() {
  return (
    <div className="animate-pulse space-y-6">
      <div className="h-8 w-48 rounded bg-gray-200" />
      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4">
        {Array.from({ length: 4 }).map((_, i) => (
          <div key={i} className="h-24 rounded-lg bg-gray-200" />
        ))}
      </div>
      <div className="h-64 rounded-lg bg-gray-200" />
    </div>
  )
}
```

### Pattern 4: Server-Side Redirect for Meetings
**What:** Use Next.js `redirect()` from `next/navigation` in a server component to redirect to the client's meeting URL or the default NextWave URL.
**When to use:** The afspraken page, which currently is a placeholder.
**Example:**
```typescript
// src/app/(client)/dashboard/afspraken/page.tsx
import { redirect } from 'next/navigation'
import { getClientBranding } from '@/lib/client/get-client-branding'

const DEFAULT_MEETING_URL = 'https://meetings.nextwave.nl'

export default async function AfsprakenPage() {
  const client = await getClientBranding()
  if (!client) redirect('/login')

  // getClientBranding needs to also select meeting_url
  const meetingUrl = (client as any).meeting_url || DEFAULT_MEETING_URL
  redirect(meetingUrl)
}
```

### Pattern 5: Error Dashboard with Resolution Status
**What:** Operator dashboard page that queries error_logs table with filtering and allows marking errors as resolved.
**When to use:** The new `/admin/errors` page.
**Example:**
```typescript
// Server component fetches data, passes to client component for interactivity
export const dynamic = 'force-dynamic'

export default async function ErrorDashboardPage() {
  const supabase = createAdminClient()
  const { data: errors } = await supabase
    .from('error_logs')
    .select('*, clients(company_name)')
    .order('created_at', { ascending: false })
    .limit(100)

  return <ErrorLogTable errors={errors ?? []} />
}
```

### Anti-Patterns to Avoid
- **error.tsx in same segment as layout.tsx it should catch:** error.tsx does NOT catch errors from the layout.tsx of its own segment. The error boundary must be in a parent segment. The route group layouts `(client)/layout.tsx` and `(operator)/layout.tsx` have their errors caught by `app/error.tsx` (root level).
- **Forgetting `'use client'` on error.tsx:** error.tsx MUST be a client component. Next.js will throw a build error otherwise.
- **Blocking redirect with intermediate UI:** The afspraken page should NOT render any UI then redirect. Use `redirect()` directly in the server component for an instant server-side redirect.
- **Logging errors synchronously in the critical path:** The `logError` function should never await in a way that blocks the user-facing response. Use fire-and-forget pattern or catch silently.

## Don't Hand-Roll

| Problem | Don't Build | Use Instead | Why |
|---------|-------------|-------------|-----|
| Error boundaries | Custom try/catch wrappers in every page | Next.js `error.tsx` convention | Built-in React Error Boundary integration, handles reset |
| Loading states | Custom isLoading state in every component | Next.js `loading.tsx` convention | Automatic Suspense wrapping, streaming support |
| Server-side redirect | Client-side `useEffect` + `router.push` | `redirect()` from `next/navigation` | Instant server-side redirect, no flash of content |
| Error log table with joins | Manual client-side join of error + client data | Supabase foreign key join `select('*, clients(company_name)')` | Single query, type-safe |

**Key insight:** Next.js App Router has built-in file conventions for error and loading states that are more reliable than hand-rolled solutions. The redirect() function provides instant server-side redirects without any client-side JavaScript.

## Common Pitfalls

### Pitfall 1: getClientBranding Does Not Select meeting_url
**What goes wrong:** The current `getClientBranding()` function selects `id, company_name, primary_color, logo_url` but NOT `meeting_url`. The afspraken redirect will silently fall back to the default URL for all clients.
**Why it happens:** The function was written before the meetings feature was needed.
**How to avoid:** Update the select statement in `getClientBranding()` to include `meeting_url`. Update the return type accordingly.
**Warning signs:** All clients redirect to the default URL regardless of their settings.

### Pitfall 2: error.tsx Not Catching Layout Errors
**What goes wrong:** If the client layout throws (e.g., `getClientBranding()` fails), putting `error.tsx` inside `/dashboard/` won't catch it because the error originates from the layout at the same level.
**Why it happens:** React Error Boundaries only catch errors in their children, not in their parent (which includes the layout that wraps them).
**How to avoid:** Place an `error.tsx` at the `app/` root level to catch errors from route group layouts. Additionally, the `global-error.tsx` at app root catches root layout errors.
**Warning signs:** Unhandled errors show the default Next.js error page instead of the custom one.

### Pitfall 3: Fire-and-Forget Error Logging Losing Errors
**What goes wrong:** If `logError()` is called with `void logError(...)` (fire-and-forget), and the server action or API route returns before the log is written, the log may be lost in serverless environments where the function is killed after response.
**Why it happens:** Serverless functions terminate after sending the response.
**How to avoid:** Await the `logError()` call before returning the response, but wrap it in try/catch so it never blocks or crashes the parent operation. The small latency of an insert is acceptable.
**Warning signs:** Error logs are intermittently missing.

### Pitfall 4: Error Log Table Growing Unbounded
**What goes wrong:** Without cleanup, the error_logs table grows indefinitely, slowing queries.
**Why it happens:** No retention policy.
**How to avoid:** Add a `created_at` index and consider a cleanup cron or Supabase database function to delete logs older than 90 days. Alternatively, add a note in the schema for future cleanup.
**Warning signs:** Error dashboard page load time increases over time.

### Pitfall 5: Redirect Loop on Afspraken Page
**What goes wrong:** If the meeting URL redirect target is unreachable or returns a redirect back, the user gets stuck.
**Why it happens:** External URLs can change or be misconfigured.
**How to avoid:** Validate that meeting_url is a valid external URL (starts with http:// or https://) before redirecting. The Zod schema already validates URL format on input, so this is mainly a safeguard.
**Warning signs:** Users report being unable to access the afspraken page.

## Code Examples

### Database Migration: error_logs Table
```sql
-- Migration: error_logs table for error monitoring dashboard
CREATE TABLE public.error_logs (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  client_id UUID NOT NULL REFERENCES public.clients(id) ON DELETE CASCADE,
  error_type TEXT NOT NULL CHECK (error_type IN ('api_failure', 'import_error', 'sync_error')),
  message TEXT NOT NULL,
  details JSONB,
  is_resolved BOOLEAN NOT NULL DEFAULT FALSE,
  resolved_at TIMESTAMPTZ,
  resolved_by UUID REFERENCES auth.users(id),
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

ALTER TABLE public.error_logs ENABLE ROW LEVEL SECURITY;

CREATE INDEX idx_error_logs_client_id ON public.error_logs(client_id);
CREATE INDEX idx_error_logs_created_at ON public.error_logs(created_at DESC);
CREATE INDEX idx_error_logs_unresolved ON public.error_logs(is_resolved) WHERE is_resolved = FALSE;

-- Operators only: full CRUD
CREATE POLICY "Operators can manage error_logs" ON public.error_logs
  FOR ALL TO authenticated
  USING ((SELECT auth.jwt() ->> 'user_role') = 'operator')
  WITH CHECK ((SELECT auth.jwt() ->> 'user_role') = 'operator');
```

### Instrumenting Existing Sync Code
```typescript
// In src/lib/instantly/sync.ts - modify the catch blocks:
// BEFORE:
console.error(`Failed to sync analytics for campaign ${campaignId}:`, error)

// AFTER:
console.error(`Failed to sync analytics for campaign ${campaignId}:`, error)
await logError({
  clientId,
  errorType: 'sync_error',
  message: `Sync analytics mislukt voor campagne ${campaignId}`,
  details: { campaignId, error: error instanceof Error ? error.message : String(error) },
})
```

### Resolve Error Server Action
```typescript
// src/lib/actions/error-log-actions.ts
'use server'

import { createAdminClient } from '@/lib/supabase/admin'
import { createClient } from '@/lib/supabase/server'

export async function resolveError(errorId: string): Promise<{ success: true } | { error: string }> {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return { error: 'Niet ingelogd.' }

  const admin = createAdminClient()
  const { error } = await admin
    .from('error_logs')
    .update({
      is_resolved: true,
      resolved_at: new Date().toISOString(),
      resolved_by: user.id,
    })
    .eq('id', errorId)

  if (error) return { error: `Fout oplossen mislukt: ${error.message}` }
  return { success: true }
}
```

### Updated getClientBranding
```typescript
// Add meeting_url to the select
const { data: client } = await supabase
  .from('clients')
  .select('id, company_name, primary_color, logo_url, meeting_url')
  .eq('id', clientId)
  .single()
```

### global-error.tsx (Root Level)
```typescript
// src/app/global-error.tsx
'use client'

export default function GlobalError({
  error,
  reset,
}: {
  error: Error & { digest?: string }
  reset: () => void
}) {
  return (
    <html lang="nl">
      <body>
        <div style={{ display: 'flex', minHeight: '100vh', alignItems: 'center', justifyContent: 'center', fontFamily: 'system-ui' }}>
          <div style={{ textAlign: 'center' }}>
            <h2 style={{ fontSize: '1.25rem', fontWeight: 600 }}>Er is iets misgegaan</h2>
            <p style={{ marginTop: '0.5rem', color: '#6b7280' }}>
              Een onverwachte fout is opgetreden.
            </p>
            <button
              onClick={reset}
              style={{
                marginTop: '1rem',
                padding: '0.5rem 1rem',
                backgroundColor: '#2563eb',
                color: 'white',
                border: 'none',
                borderRadius: '0.375rem',
                cursor: 'pointer',
              }}
            >
              Opnieuw proberen
            </button>
          </div>
        </div>
      </body>
    </html>
  )
}
```

## State of the Art

| Old Approach | Current Approach | When Changed | Impact |
|--------------|------------------|--------------|--------|
| Custom ErrorBoundary class components | Next.js `error.tsx` file convention | Next.js 13+ App Router | Automatic per-segment error boundaries |
| `getInitialProps` loading | `loading.tsx` with Suspense streaming | Next.js 13+ App Router | Instant loading skeletons, streaming HTML |
| `useRouter().push()` for redirects | `redirect()` from `next/navigation` in server components | Next.js 13+ App Router | Server-side, no client JS needed |

**Deprecated/outdated:**
- Pages Router `_error.tsx` / `_app.tsx` error handling: replaced by App Router `error.tsx` / `global-error.tsx`

## Open Questions

1. **Default NextWave meetings URL**
   - What we know: MEET-02 says "redirect to the default NextWave meetings URL" but no specific URL is given
   - What's unclear: The exact default URL (e.g., `https://meetings.nextwave.nl` or a Calendly link)
   - Recommendation: Use a constant like `DEFAULT_MEETING_URL` that can be easily changed. Hardcode a reasonable placeholder and make it configurable via environment variable if needed.

2. **Error log retention policy**
   - What we know: No cleanup mechanism is specified in requirements
   - What's unclear: How long error logs should be kept
   - Recommendation: Add a `created_at DESC` index for query performance. Defer cleanup to a future phase. The table won't grow large enough to matter for an MVP.

3. **Operator navigation to error dashboard**
   - What we know: The operator layout currently has a header with "NextWave Admin" and "Uitloggen" button, no sidebar nav
   - What's unclear: Whether to add a sidebar nav to operator layout or just a link in the header
   - Recommendation: Add a simple nav link in the operator header bar (next to the title or as a tab) since there are now two operator pages (`/admin` = klanten, `/admin/errors` = fouten). Keep it minimal.

## Sources

### Primary (HIGH confidence)
- Codebase analysis: `src/app/(client)/dashboard/afspraken/page.tsx` - current placeholder page
- Codebase analysis: `src/lib/client/get-client-branding.ts` - missing `meeting_url` in select
- Codebase analysis: `src/lib/instantly/sync.ts` - existing error handling uses only console.error
- Codebase analysis: `supabase/migrations/20260215000001_initial_schema.sql` - `meeting_url` column exists on clients table
- Codebase analysis: glob for `error.tsx` and `loading.tsx` - zero files found
- [Next.js error.tsx file convention docs](https://nextjs.org/docs/app/api-reference/file-conventions/error)
- [Next.js error handling guide](https://nextjs.org/docs/app/getting-started/error-handling)

### Secondary (MEDIUM confidence)
- [Next.js 15 error handling best practices](https://devanddeliver.com/blog/frontend/next-js-15-error-handling-best-practices-for-code-and-routes) - community article confirming patterns

### Tertiary (LOW confidence)
- None

## Metadata

**Confidence breakdown:**
- Standard stack: HIGH - no new libraries needed, all existing
- Architecture: HIGH - verified against codebase structure and Next.js docs
- Pitfalls: HIGH - identified through direct codebase analysis (missing meeting_url in select, no error/loading files)
- Error monitoring: HIGH - straightforward Supabase table + query pattern consistent with rest of codebase

**Research date:** 2026-02-15
**Valid until:** 2026-03-15 (30 days - stable domain, no fast-moving dependencies)
