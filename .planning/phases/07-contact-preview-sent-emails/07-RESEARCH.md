# Phase 7: Contact Preview & Sent Emails - Research

**Researched:** 2026-02-15
**Domain:** Data presentation (tables), soft-delete flagging, read-only email views, Supabase RLS, Instantly API email listing
**Confidence:** HIGH

## Summary

Phase 7 builds two distinct features on top of existing infrastructure: (1) a 7-day contact preview table where clients can see and remove upcoming contacts, and (2) a read-only sent emails mailbox view. Both features leverage existing patterns extensively -- the synced_leads table already contains all necessary lead data for the preview, the cached_emails table and Instantly `listEmails` API already exist for sent email display, and the DNC list component provides the exact delete-from-table UI pattern needed.

The contact preview requires a new `is_excluded` boolean column on `synced_leads` to flag removed contacts without deleting data. This flag must integrate with the operator's DNC filtering export (Phase 6) so excluded contacts are filtered out during CSV processing. The sent emails view is simpler: it queries cached_emails (or Instantly API on cache miss) filtered to outbound-only messages, displayed in a read-only list with detail view. The key constraint is that the Instantly API does not expose a "scheduled date" for upcoming contacts, so the 7-day preview must derive upcoming contacts from leads with `lead_status = 'not_yet_emailed'` in the synced_leads table, presenting them as the pool of contacts that will be reached within the campaign's active window.

**Primary recommendation:** Use `synced_leads` with `lead_status = 'not_yet_emailed'` for the preview table, add an `is_excluded` column for soft-delete, and reuse the `cached_emails` + `listEmails` pattern from Phase 5 for the sent emails view (filtered to outbound only, with all interactive actions removed).

## Standard Stack

### Core
| Library | Version | Purpose | Why Standard |
|---------|---------|---------|--------------|
| Next.js | 15.5.12 | App router, server components, server actions | Already in use, project standard |
| @supabase/supabase-js | ^2.95.3 | Database queries with RLS | Already in use, project standard |
| @supabase/ssr | ^0.8.0 | Server-side Supabase client | Already in use, project standard |
| Tailwind CSS | ^4 | Styling | Already in use, project standard |
| Zod | ^3.25.76 | Server action validation | Already in use, project standard |
| date-fns | ^4.1.0 | Date formatting (nl locale) | Already in use, available for date display |

### Supporting
| Library | Version | Purpose | When to Use |
|---------|---------|---------|-------------|
| Instantly API v2 | - | Fetch sent emails | Cache miss on cached_emails |

### Alternatives Considered
| Instead of | Could Use | Tradeoff |
|------------|-----------|----------|
| `is_excluded` on synced_leads | Separate exclusions table | Simpler to add column; exclusions table adds join complexity for minimal benefit |
| Instantly API direct for sent emails | Only cached_emails | API gives freshest data; cache-first with fallback is the established pattern |

**Installation:**
No new packages needed. All dependencies already installed.

## Architecture Patterns

### Recommended Project Structure
```
src/
├── app/(client)/dashboard/
│   ├── verzonden/                    # Sent emails (already exists as stub)
│   │   ├── page.tsx                  # Server component: sent email list
│   │   ├── [emailId]/
│   │   │   └── page.tsx              # Server component: sent email detail
│   │   └── _components/
│   │       ├── sent-email-list.tsx    # Client component: list with click navigation
│   │       └── sent-email-detail.tsx  # Server or client component: full email view
│   └── preview/                      # Contact preview (new route)
│       ├── page.tsx                   # Server component: preview table
│       └── _components/
│           └── preview-table.tsx      # Client component: table with delete buttons
├── lib/
│   ├── actions/
│   │   └── preview-actions.ts        # Server actions: excludeContact, getPreviewContacts
│   ├── data/
│   │   └── sent-data.ts              # Data fetching: getSentEmails, getSentEmailDetail
│   └── validations/
│       └── preview.ts                # Zod schemas for preview actions
└── supabase/migrations/
    └── 20260218000001_preview_exclusions.sql  # Add is_excluded column + RLS updates
```

### Pattern 1: Server Component Data Fetching (established)
**What:** Server components fetch data directly, pass to client components only when interactivity is needed
**When to use:** All page-level data loading
**Example:**
```typescript
// Source: Existing pattern from src/app/(client)/dashboard/inbox/page.tsx
export const dynamic = 'force-dynamic'

export default async function PreviewPage() {
  const client = await getClientBranding()
  if (!client) redirect('/login')

  const contacts = await getPreviewContacts(client.id)

  return (
    <div>
      <h1 className="text-2xl font-bold text-gray-900">Contactvoorvertoning</h1>
      <p className="mt-1 text-sm text-gray-600">
        Contacten die de komende 7 dagen worden benaderd.
      </p>
      <PreviewTable contacts={contacts} />
    </div>
  )
}
```

### Pattern 2: Client Component with Delete Action (established)
**What:** Client component calls server action for deletion, shows loading state, auto-dismisses feedback
**When to use:** The preview table's per-row delete button
**Example:**
```typescript
// Source: Existing pattern from src/app/(client)/dashboard/dnc/_components/dnc-list.tsx
'use client'

import { useState } from 'react'
import { excludeContact } from '@/lib/actions/preview-actions'

export function PreviewTable({ contacts }: { contacts: PreviewContact[] }) {
  const [removing, setRemoving] = useState<string | null>(null)
  const [feedback, setFeedback] = useState<{ type: 'success' | 'error'; message: string } | null>(null)

  async function handleExclude(leadId: string) {
    setRemoving(leadId)
    setFeedback(null)
    const result = await excludeContact(leadId)
    if ('error' in result) {
      setFeedback({ type: 'error', message: result.error })
    } else {
      setFeedback({ type: 'success', message: 'Contact verwijderd uit voorvertoning.' })
    }
    setRemoving(null)
    setTimeout(() => setFeedback(null), 3000)
  }
  // ... table render
}
```

### Pattern 3: Server Action with Auth + Validation (established)
**What:** Server action validates input with Zod, checks auth, performs operation
**When to use:** The excludeContact action
**Example:**
```typescript
// Source: Existing pattern from src/lib/actions/dnc-actions.ts
'use server'

import { revalidatePath } from 'next/cache'
import { createClient } from '@/lib/supabase/server'

export async function excludeContact(leadId: string): Promise<{ success: true } | { error: string }> {
  if (!leadId) return { error: 'Ongeldig contact-ID.' }

  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return { error: 'Niet ingelogd.' }

  const clientId = user.app_metadata?.client_id as string | undefined
  if (!clientId) return { error: 'Niet ingelogd.' }

  // Update uses RLS - client can only update own leads
  const { error } = await supabase
    .from('synced_leads')
    .update({ is_excluded: true })
    .eq('id', leadId)

  if (error) return { error: 'Fout bij het verwijderen. Probeer het opnieuw.' }

  revalidatePath('/dashboard/preview')
  return { success: true }
}
```

### Pattern 4: Sent Emails Cache Pattern (established)
**What:** Check cached_emails first, fetch from Instantly API on miss, cache with admin client
**When to use:** The sent emails data fetching layer
**Example:**
```typescript
// Source: Existing pattern from src/lib/data/inbox-data.ts (getLeadThread)
export async function getSentEmails(clientId: string): Promise<SentEmail[]> {
  const supabase = await createClient()

  // Fetch from cached_emails where the from_address is a sender_account (outbound)
  const { data: cached } = await supabase
    .from('cached_emails')
    .select('*')
    .eq('client_id', clientId)
    .eq('is_reply', false)  // Outbound campaign emails only
    .order('email_timestamp', { ascending: false })

  return (cached ?? []).map(email => ({
    id: email.id,
    to: email.to_address,
    subject: email.subject,
    bodyText: email.body_text,
    bodyHtml: email.body_html,
    sentAt: email.email_timestamp,
  }))
}
```

### Anti-Patterns to Avoid
- **Adding reply/forward/compose actions to sent view:** SENT-03 explicitly forbids any interactive email actions. No forms, no buttons beyond navigation.
- **Hard-deleting excluded contacts:** Use soft-delete (`is_excluded = true`) so contacts can be restored and data integrity is maintained.
- **Creating a new route for preview at /dashboard/contacten:** Use a dedicated `/dashboard/preview` or Dutch equivalent `/dashboard/voorvertoning` route, keeping it separate from existing contact list in overzicht dashboard.
- **Fetching all leads from Instantly API for preview:** Use the already-synced `synced_leads` table. The sync is handled by Phase 4's cron/sync infrastructure.

## Don't Hand-Roll

| Problem | Don't Build | Use Instead | Why |
|---------|-------------|-------------|-----|
| Date formatting for Dutch locale | Custom date formatter | `date-fns` with `nl` locale (already installed) | Handles edge cases, localization |
| Email caching layer | New caching mechanism | Existing `cached_emails` table + 5-min TTL pattern from inbox-data.ts | Already battle-tested in Phase 5 |
| Delete-from-table UI pattern | New component pattern | Copy DNC list pattern (`dnc-list.tsx`) | Loading states, feedback, error handling already solved |
| Auth check in server actions | Custom auth middleware | `getAuthClientId()` pattern from dnc-actions.ts | Consistent pattern across all actions |
| Table component styling | Custom table CSS | Existing table pattern from DNC list (Tailwind classes) | Consistent look and feel |

**Key insight:** This phase is almost entirely assembly of existing patterns. The preview table is the DNC list with different columns. The sent emails view is the inbox without reply/compose. The data layer uses the same Supabase queries and Instantly API client. No new libraries or complex patterns are needed.

## Common Pitfalls

### Pitfall 1: Not Filtering Excluded Contacts in DNC Export
**What goes wrong:** Client excludes contacts from preview, but operator's CSV DNC filter (Phase 6) doesn't check the `is_excluded` flag, so excluded contacts still get emailed.
**Why it happens:** The `applyDncFilter` function in csv-actions.ts only checks `dnc_entries` table, not `synced_leads.is_excluded`.
**How to avoid:** Modify `applyDncFilter` to also cross-reference excluded synced_leads emails when filtering CSV rows. Add a new filter_reason like `'client_excluded'`.
**Warning signs:** Excluded contacts still appear in exported CSVs.

### Pitfall 2: Confusing "Upcoming Contacts" with Scheduled Dates
**What goes wrong:** Trying to show exact scheduling dates for each contact when Instantly API doesn't expose per-lead scheduling information.
**Why it happens:** The requirement says "7-day preview" but Instantly doesn't have a "scheduled_date" field on leads.
**How to avoid:** Show leads with `lead_status = 'not_yet_emailed'` as the pool of upcoming contacts. The "7-day window" can reference the campaign's active sending window rather than per-lead dates. Display the `contact_date` as either a computed estimate or show the column as "Status" instead.
**Warning signs:** Empty preview table because no leads have a `contact_date` field.

### Pitfall 3: RLS Policy Missing for UPDATE on synced_leads
**What goes wrong:** Client tries to exclude a contact but gets a permission error because `synced_leads` only has SELECT policies for clients (no UPDATE).
**Why it happens:** Phase 4 only added SELECT RLS policies on synced_leads for clients.
**How to avoid:** Add a new RLS policy allowing clients to UPDATE `is_excluded` on their own leads. Keep the policy narrow: only allow updating `is_excluded`, not other fields.
**Warning signs:** 403 or empty result when calling excludeContact server action.

### Pitfall 4: Sent Emails Showing Inbound Replies
**What goes wrong:** The sent mailbox shows both outbound emails AND inbound replies from leads, making it confusing.
**Why it happens:** `cached_emails` contains both directions. Filtering only by `is_reply = false` may miss follow-up sequence emails.
**How to avoid:** Filter sent emails by checking if `from_address` matches a known sender_account (outbound) rather than relying solely on `is_reply`. An outbound email has `from_address` that is one of the campaign's sending accounts.
**Warning signs:** Lead responses appearing in the sent mailbox.

### Pitfall 5: Deduplication of Preview Contacts
**What goes wrong:** Same lead appears multiple times in preview because they exist in multiple campaigns.
**Why it happens:** `synced_leads` has entries per campaign (unique constraint is `client_id, instantly_lead_id, campaign_id`).
**How to avoid:** Deduplicate by email address (same pattern as `getContactList` in campaign-stats.ts), keeping the most recently updated entry.
**Warning signs:** Duplicate names/emails in the preview table.

### Pitfall 6: No Navigation Link for Preview Page
**What goes wrong:** Preview page exists but there's no way for clients to reach it.
**Why it happens:** Sidebar nav items are hardcoded in `sidebar-nav.tsx`.
**How to avoid:** Add a nav item for the preview page. Consider whether it should be a new sidebar item or a sub-section of an existing page (like a tab on the overzicht/dashboard page).
**Warning signs:** Feature works but nobody can find it.

## Code Examples

Verified patterns from the existing codebase:

### Database Migration: Add is_excluded Column
```sql
-- Add exclusion flag to synced_leads
ALTER TABLE public.synced_leads
  ADD COLUMN IF NOT EXISTS is_excluded BOOLEAN DEFAULT FALSE;

-- Index for efficient preview queries (not_yet_emailed + not excluded)
CREATE INDEX idx_synced_leads_preview
  ON public.synced_leads(client_id, lead_status, is_excluded)
  WHERE lead_status = 'not_yet_emailed' AND is_excluded = FALSE;

-- RLS policy: Allow clients to update is_excluded on their own leads
CREATE POLICY "Clients can exclude own leads" ON public.synced_leads
  FOR UPDATE TO authenticated
  USING (client_id::TEXT = (SELECT auth.jwt() ->> 'client_id'))
  WITH CHECK (client_id::TEXT = (SELECT auth.jwt() ->> 'client_id'));
```

### Preview Data Query
```typescript
// Source: Pattern from src/lib/data/campaign-stats.ts (getContactList)
export async function getPreviewContacts(clientId: string): Promise<PreviewContact[]> {
  const supabase = await createClient()

  const { data, error } = await supabase
    .from('synced_leads')
    .select('id, email, first_name, last_name, company_name, job_title, industry, updated_at')
    .eq('client_id', clientId)
    .eq('lead_status', 'not_yet_emailed')
    .eq('is_excluded', false)
    .order('updated_at', { ascending: false })

  if (error) throw new Error(`Preview ophalen mislukt: ${error.message}`)
  if (!data || data.length === 0) return []

  // Deduplicate by email
  const seen = new Set<string>()
  const contacts: PreviewContact[] = []

  for (const row of data) {
    if (!seen.has(row.email)) {
      seen.add(row.email)
      contacts.push({
        id: row.id,
        fullName: [row.first_name, row.last_name].filter(Boolean).join(' ') || row.email,
        companyName: row.company_name,
        jobTitle: row.job_title,
        industry: row.industry,
        email: row.email,
      })
    }
  }

  return contacts
}
```

### Sent Email Detail View
```typescript
// Source: Pattern from src/lib/data/inbox-data.ts (getLeadThread)
export async function getSentEmailDetail(
  clientId: string,
  emailId: string
): Promise<SentEmailDetail | null> {
  const supabase = await createClient()

  const { data, error } = await supabase
    .from('cached_emails')
    .select('*')
    .eq('client_id', clientId)
    .eq('id', emailId)
    .single()

  if (error || !data) return null

  return {
    id: data.id,
    to: data.to_address,
    from: data.from_address,
    subject: data.subject,
    bodyHtml: data.body_html,
    bodyText: data.body_text,
    sentAt: data.email_timestamp,
  }
}
```

### Dutch Table Headers (Preview)
```typescript
// Column headers per PREV-01 requirements
const PREVIEW_COLUMNS = [
  { key: 'fullName', label: 'Volledige naam' },
  { key: 'companyName', label: 'Bedrijfsnaam' },
  { key: 'contactDate', label: 'Contactdatum' },
  { key: 'industry', label: 'Sector/Industrie' },
  { key: 'jobTitle', label: 'Functie' },
  { key: 'action', label: 'Actie' },
]
```

## State of the Art

| Old Approach | Current Approach | When Changed | Impact |
|--------------|------------------|--------------|--------|
| Direct Instantly API calls per page load | Cache layer (cached_emails) with 5-min TTL | Phase 5 | Sent emails should reuse this pattern |
| Hard delete contacts | Soft-delete with is_excluded flag | This phase | Preserves data, enables undo, audit trail |

**Deprecated/outdated:**
- None relevant. All patterns are current with the codebase.

## Open Questions

1. **What does "contact date" mean in the preview table?**
   - What we know: PREV-01 requires a "contact date" column. Instantly API does not expose a per-lead scheduled send date.
   - What's unclear: Whether the contact_date should be a computed estimate, the lead's `created_at`, or a fixed "within 7 days" indicator.
   - Recommendation: Show the lead's `created_at` (when added to campaign) or `updated_at` as a reference date. Alternatively, display "Komende 7 dagen" as a status badge rather than a specific date. The planner should decide based on what data is actually available in synced_leads.

2. **Where should the preview page live in navigation?**
   - What we know: There's no existing "preview" nav item in the sidebar. The sidebar already has 6 items.
   - What's unclear: Whether preview should be a new sidebar item, a tab on the overzicht page, or accessible from afspraken.
   - Recommendation: Add as a new sidebar nav item with Dutch label "Voorvertoning" or repurpose the existing "Afspraken" page (currently a stub) for this purpose, since contact preview is a form of "upcoming appointments/contacts."

3. **Should excluded contacts be recoverable?**
   - What we know: PREV-02 says "remove" contacts. The soft-delete approach with `is_excluded` allows recovery.
   - What's unclear: Whether there should be a UI to undo exclusions.
   - Recommendation: Implement soft-delete for data integrity. Undo UI is optional for this phase but the data model supports it.

4. **How to populate sent emails if cached_emails is sparse?**
   - What we know: `cached_emails` is populated on-demand when viewing inbox threads (Phase 5). It may not contain all sent emails for a client.
   - What's unclear: Whether a bulk sync of sent emails is needed, or if the verzonden page should trigger a fetch-and-cache on first visit.
   - Recommendation: On first load of verzonden page, fetch recent sent emails from Instantly API using `listEmails` with campaign_id filters, cache them, then display. Follow the same cache-first pattern as `getLeadThread`.

5. **Integration of is_excluded with DNC filter export**
   - What we know: PREV-03 requires excluded contacts to be "excluded during operator's DNC filtering export." The `applyDncFilter` function in csv-actions.ts currently only checks `dnc_entries`.
   - What's unclear: The exact integration point - should `applyDncFilter` query synced_leads, or should excluded emails be auto-added to `dnc_entries`?
   - Recommendation: Modify `applyDncFilter` to also query `synced_leads` where `is_excluded = true` and treat those emails as additional DNC entries. This keeps the source of truth in synced_leads while honoring the filter during export.

## Sources

### Primary (HIGH confidence)
- Existing codebase analysis: `src/lib/data/inbox-data.ts`, `src/lib/data/campaign-stats.ts` - data fetching patterns
- Existing codebase analysis: `src/lib/actions/dnc-actions.ts` - server action with delete pattern
- Existing codebase analysis: `src/app/(client)/dashboard/dnc/_components/dnc-list.tsx` - table with delete button UI pattern
- Existing codebase analysis: `src/lib/instantly/client.ts` - Instantly API client, `listEmails` function
- Existing codebase analysis: `supabase/migrations/` - all migration files for schema understanding
- Existing codebase analysis: `src/lib/instantly/types.ts` - InstantlyEmail and InstantlyLead interfaces

### Secondary (MEDIUM confidence)
- [Instantly API V2 Lead docs](https://developer.instantly.ai/api/v2/lead) - Lead endpoint structure (SPA not fully scrapeable)
- [Instantly API V2 Email docs](https://developer.instantly.ai/api/v2/email) - Email endpoint structure

### Tertiary (LOW confidence)
- Instantly API does not expose per-lead scheduled send dates - based on WebSearch across multiple sources; no official confirmation found in docs (SPA rendered). The `InstantlyLead` type in the codebase has no schedule_date field, which supports this conclusion.

## Metadata

**Confidence breakdown:**
- Standard stack: HIGH - No new libraries needed, everything exists in the codebase
- Architecture: HIGH - All patterns are direct copies of existing Phase 5/6 patterns
- Pitfalls: HIGH - Based on direct codebase analysis (RLS policies, DNC filter code, data deduplication)
- Contact date interpretation: LOW - Instantly API docs not fully accessible; unclear what "contact date" maps to
- Sent email population strategy: MEDIUM - Cache pattern is established but bulk population for verzonden is untested

**Research date:** 2026-02-15
**Valid until:** 2026-03-15 (stable patterns, no fast-moving dependencies)
