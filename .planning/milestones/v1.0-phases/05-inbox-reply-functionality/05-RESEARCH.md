# Phase 5: Inbox & Reply Functionality - Research

**Researched:** 2026-02-15
**Domain:** Email inbox UI, Instantly.ai API v2 email endpoints, conversation threading
**Confidence:** MEDIUM

## Summary

This phase transforms the placeholder inbox page into a full Gmail-style inbox where clients can view positive leads, read conversation threads, and reply directly from the dashboard. The core technical challenge is integrating with the Instantly.ai API v2 email endpoints to fetch conversation threads and send replies through the original sender account.

The Instantly API v2 provides dedicated endpoints for listing emails (with thread filtering), getting individual emails, and replying to emails via `reply_to_uuid`. Email threading is handled by Instantly itself -- the `reply_to_uuid` mechanism ensures replies land in the correct thread in the recipient's inbox (proper In-Reply-To/References headers are managed server-side by Instantly). There is NO standalone "send new email" endpoint in the API v2; new outbound emails to positive leads (INBX-04 "Nieuwe Email" button) must either use the reply endpoint with a creative workaround or be handled through a different approach.

The existing codebase already has synced_leads with `interest_status` (for filtering positive leads), `sender_account` (for routing replies), and `payload` JSONB (for extracting LinkedIn URLs and vacancy URLs). The inbox UI needs new data fetching for emails/threads from the Instantly API, a new database table for caching conversation threads, and Server Actions for sending replies.

**Primary recommendation:** Use Instantly API v2 email endpoints (`GET /emails` with `lead` filter, `POST /emails/reply`) for conversation data and replies. Cache email threads in a local `email_threads` table to reduce API calls. Extract LinkedIn and vacancy URLs from the synced_leads payload field using the existing `extractPayloadField` pattern.

## Standard Stack

### Core (already in project)
| Library | Version | Purpose | Why Standard |
|---------|---------|---------|--------------|
| Next.js | 15.5.12 | App Router, Server Components, Server Actions | Already in project |
| @supabase/ssr | ^0.8.0 | Server-side Supabase client | Already in project |
| @supabase/supabase-js | ^2.95.3 | Supabase client | Already in project |
| date-fns | ^4.1.0 | Date formatting (relative timestamps) | Already in project |
| react-hook-form | ^7.71.1 | Form handling for reply/compose | Already in project |
| zod | ^3.25.76 | Validation for reply form data | Already in project |

### Supporting (no new dependencies needed)
| Library | Version | Purpose | When to Use |
|---------|---------|---------|-------------|
| date-fns | ^4.1.0 | `formatDistanceToNow`, `format` for inbox timestamps | Inbox list and thread view |
| react-hook-form + zod | existing | Reply form validation | Reply and compose forms |

### Alternatives Considered
| Instead of | Could Use | Tradeoff |
|------------|-----------|----------|
| Caching threads in Supabase | Direct API calls every time | Too slow, 20 req/min rate limit on emails endpoint |
| Server Actions for replies | API Route handlers | Server Actions integrate better with Next.js 15 form handling |
| Polling for new emails | Instantly webhooks | Webhooks add complexity; periodic sync + manual refresh is simpler for MVP |

**Installation:**
```bash
# No new packages needed - all dependencies already installed
```

## Architecture Patterns

### Recommended Project Structure
```
src/
├── app/(client)/dashboard/inbox/
│   ├── page.tsx                    # Inbox list (server component)
│   ├── [leadId]/
│   │   └── page.tsx                # Thread view for specific lead (server component)
│   └── _components/
│       ├── inbox-list.tsx          # Client component: inbox list with status badges
│       ├── inbox-item.tsx          # Single inbox row component
│       ├── thread-view.tsx         # Client component: conversation thread display
│       ├── thread-message.tsx      # Single message bubble in thread
│       ├── reply-form.tsx          # Client component: reply form with RHF
│       ├── compose-modal.tsx       # Client component: new email compose modal
│       └── lead-contact-card.tsx   # Contact details sidebar (name, company, job title, email, LinkedIn, vacancy URL)
├── lib/
│   ├── instantly/
│   │   ├── client.ts              # ADD: email list, get email, reply email functions
│   │   ├── types.ts               # ADD: email-related type definitions
│   │   └── sync.ts                # MODIFY: sync email threads for positive leads
│   ├── data/
│   │   └── inbox-data.ts          # NEW: inbox queries (positive leads, threads, status)
│   └── actions/
│       └── inbox-actions.ts       # NEW: Server Actions for reply, compose, mark-as-read
```

### Pattern 1: Server Component Data Fetching (existing pattern)
**What:** Fetch data in server components, pass to client components for interactivity
**When to use:** Inbox list page, thread view page
**Example:**
```typescript
// src/app/(client)/dashboard/inbox/page.tsx
// Following the exact same pattern as dashboard/page.tsx
export const dynamic = 'force-dynamic'

export default async function InboxPage() {
  const client = await getClientBranding()
  if (!client) redirect('/login')

  const positiveLeads = await getPositiveLeadsForInbox(client.id)

  return (
    <div>
      <h1 className="text-2xl font-bold text-gray-900">Inbox</h1>
      <InboxList leads={positiveLeads} isRecruitment={client.is_recruitment} />
    </div>
  )
}
```

### Pattern 2: Server Actions for Mutations
**What:** Use Next.js Server Actions for reply/compose operations
**When to use:** Sending replies, composing new emails, marking threads as read
**Example:**
```typescript
// src/lib/actions/inbox-actions.ts
'use server'

import { revalidatePath } from 'next/cache'
import { createClient } from '@/lib/supabase/server'
import { replyToEmail } from '@/lib/instantly/client'

export async function sendReply(formData: {
  replyToUuid: string
  eaccount: string
  subject: string
  bodyHtml: string
}) {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) throw new Error('Unauthorized')

  // Verify the lead belongs to this client
  // ... RLS handles this at DB level

  await replyToEmail({
    eaccount: formData.eaccount,
    reply_to_uuid: formData.replyToUuid,
    subject: formData.subject,
    body: { html: formData.bodyHtml },
  })

  revalidatePath('/dashboard/inbox')
}
```

### Pattern 3: Instantly API Email Fetching with Thread Grouping
**What:** Fetch emails from Instantly API filtered by lead email, group by thread_id
**When to use:** Building conversation thread views
**Example:**
```typescript
// Fetch all emails for a specific lead across all sender accounts
async function getLeadEmails(leadEmail: string, senderAccounts: string[]) {
  const params = new URLSearchParams({
    lead: leadEmail,
    eaccount: senderAccounts.join(','),
    limit: '100',
    sort_order: 'asc',
  })

  const response = await fetch(
    `${BASE_URL}/emails?${params.toString()}`,
    { headers: getHeaders(), cache: 'no-store' }
  )
  // ... returns emails with thread_id, from_address_email, body, timestamp
}
```

### Anti-Patterns to Avoid
- **Fetching all emails on every page load:** Cache thread data in Supabase; only fetch from Instantly API on explicit refresh or during sync
- **Exposing campaign_id to clients:** Continue the existing pattern where campaign_id is internal-only; the inbox should group by lead, not by campaign
- **Building a rich text editor for replies:** Plain textarea or basic HTML is sufficient for email replies; rich text adds complexity without value
- **Sending replies client-side:** Always proxy through Server Actions to protect the Instantly API key

## Don't Hand-Roll

| Problem | Don't Build | Use Instead | Why |
|---------|-------------|-------------|-----|
| Email threading | Custom In-Reply-To/References header management | Instantly's `reply_to_uuid` mechanism | Instantly handles all SMTP threading headers server-side |
| Sentiment classification | NLP for positive/negative detection | Instantly's `interest_status` field on leads | Already classified by Instantly AI |
| Email sending infrastructure | SMTP client, email delivery | Instantly API `POST /emails/reply` | Deliverability, warmup, rotation all handled by Instantly |
| Relative time display | Custom "2 hours ago" logic | date-fns `formatDistanceToNow` | Handles all edge cases, i18n-ready |
| Form validation | Custom validation logic | zod schema + react-hook-form resolver | Already in the project, battle-tested |

**Key insight:** The Instantly API v2 handles all email infrastructure (threading, delivery, sender rotation). Our job is purely UI/UX: fetching data, displaying it nicely, and proxying reply requests.

## Common Pitfalls

### Pitfall 1: Instantly API Rate Limiting on Emails Endpoint
**What goes wrong:** The `GET /emails` endpoint has a rate limit of 20 requests per minute. If every inbox page load hits the API, you'll quickly get rate-limited with multiple concurrent users.
**Why it happens:** Treating Instantly as a real-time data source rather than a sync source.
**How to avoid:** Cache email/thread data in a local Supabase table (`email_threads` or similar). Sync periodically (cron job extends the existing sync module) and on-demand when user opens a thread. Use the cached data for inbox list rendering.
**Warning signs:** 429 HTTP responses from Instantly, slow inbox page loads.

### Pitfall 2: No Standalone "Send New Email" Endpoint
**What goes wrong:** INBX-04 requires a "Nieuwe Email" button to compose new outbound emails to positive leads. The Instantly API v2 does NOT have a `POST /emails/send` endpoint for new emails -- only reply and forward.
**Why it happens:** Instantly's API is designed around campaign workflows and Unibox replies, not arbitrary email composition.
**How to avoid:** For composing new emails to existing leads, use `POST /emails/reply` with the `reply_to_uuid` set to the most recent email in the thread. This creates a new reply in the existing thread. If there is truly no prior email thread (unlikely for positive leads who have already been contacted via campaign), this is an edge case that needs special handling -- potentially using the forward endpoint or accepting this limitation.
**Warning signs:** Users trying to compose emails to leads with no prior thread.

### Pitfall 3: Sender Account Mismatch
**What goes wrong:** Reply is sent from a different email account than the one that originally contacted the lead, confusing the recipient.
**Why it happens:** The client may have multiple sender accounts across campaigns. The wrong `eaccount` is passed to the reply endpoint.
**How to avoid:** Always look up the `sender_account` field from the `synced_leads` table for the specific lead, and pass that as the `eaccount` parameter. Validate that the sender account exists in the workspace before sending.
**Warning signs:** Replies showing different "From" address than original outreach emails.

### Pitfall 4: LinkedIn/Vacancy URL Not in Schema
**What goes wrong:** INBX-02 requires LinkedIn URL in contact details, INBX-06 requires vacancy URL for recruitment clients. Neither field has a dedicated column in `synced_leads`.
**Why it happens:** These fields live in the `payload` JSONB column as custom variables from the CSV upload.
**How to avoid:** Add `linkedin_url` and `vacancy_url` columns to `synced_leads` via migration. Extract them during sync using the existing `extractPayloadField` pattern with variants like `['LinkedIn', 'linkedin', 'linkedin_url', 'LinkedIn URL']` and `['Vacancy URL', 'vacancy_url', 'Vacature URL', 'vacature_url']`.
**Warning signs:** Contact cards showing "N/A" for LinkedIn when the data exists in the payload.

### Pitfall 5: Deduplication of Leads Across Campaigns
**What goes wrong:** A lead may appear in multiple campaigns, resulting in duplicate inbox entries.
**Why it happens:** `synced_leads` has a unique constraint on `(client_id, instantly_lead_id, campaign_id)`, meaning the same email can appear multiple times.
**How to avoid:** When querying for the inbox list, deduplicate by email address (same pattern used in `getContactList`). Show one inbox entry per unique lead email, with the most recent activity.
**Warning signs:** Same person appearing multiple times in inbox list.

### Pitfall 6: Thread Data Not Synced Yet
**What goes wrong:** Inbox shows positive leads from synced_leads but clicking into a thread shows no emails because email content hasn't been fetched from Instantly.
**Why it happens:** Phase 4 sync only syncs lead metadata, not email content/threads.
**How to avoid:** Either extend the cron sync to also fetch email threads for positive leads, or fetch threads on-demand when a user opens a thread view (with caching). On-demand is simpler and avoids syncing threads for leads the user never looks at.
**Warning signs:** Empty thread views, loading states that never resolve.

## Code Examples

### Instantly API: List Emails for a Lead
```typescript
// Source: https://developer.instantly.ai/api/v2/email/listemail
// Extends src/lib/instantly/client.ts

export interface InstantlyEmail {
  id: string                      // UUID - used as reply_to_uuid
  thread_id: string               // Groups emails into conversations
  from_address_email: string      // Sender email
  to_address_email_list: string   // Recipient email(s)
  subject: string
  body: {
    text?: string
    html?: string
  }
  timestamp_created: string       // When added to DB
  timestamp_email?: string        // Actual email timestamp from server
  is_reply: boolean               // Whether this is a reply/auto-reply
  campaign_id?: string
  subsequence_id?: string | null  // null for manually sent emails
  i_status?: number               // Interest status: 0 = false, 1 = true
  is_unread?: boolean
  attachments?: unknown[] | null
}

export interface ListEmailsOptions {
  lead?: string                   // Filter by lead email
  eaccount?: string               // Filter by sender account(s), comma-separated
  campaignId?: string
  limit?: number
  startingAfter?: string
  sortOrder?: 'asc' | 'desc'
  search?: string                 // Can use "thread:THREAD_ID" to get full thread
}

export async function listEmails(
  options?: ListEmailsOptions
): Promise<InstantlyListResponse<InstantlyEmail>> {
  const params = new URLSearchParams()

  if (options?.lead) params.set('lead', options.lead)
  if (options?.eaccount) params.set('eaccount', options.eaccount)
  if (options?.campaignId) params.set('campaign_id', options.campaignId)
  if (options?.limit) params.set('limit', String(options.limit))
  if (options?.startingAfter) params.set('starting_after', options.startingAfter)
  if (options?.sortOrder) params.set('sort_order', options.sortOrder)
  if (options?.search) params.set('search', options.search)

  const response = await fetch(
    `${BASE_URL}/emails?${params.toString()}`,
    { headers: getHeaders(), cache: 'no-store' }
  )

  if (!response.ok) {
    throw new Error(`Instantly API error: ${response.status} ${response.statusText}`)
  }

  return response.json()
}
```

### Instantly API: Reply to an Email
```typescript
// Source: https://developer.instantly.ai/api/v2/email/replytoemail
// Extends src/lib/instantly/client.ts

export interface ReplyEmailOptions {
  eaccount: string                // Sender account (must be in workspace)
  reply_to_uuid: string           // ID of the email being replied to
  subject: string
  body: {
    text?: string
    html?: string
  }
  cc_address_email_list?: string  // Comma-separated CC addresses
  bcc_address_email_list?: string // Comma-separated BCC addresses
}

export async function replyToEmail(
  options: ReplyEmailOptions
): Promise<InstantlyEmail> {
  const response = await fetch(`${BASE_URL}/emails/reply`, {
    method: 'POST',
    headers: getHeaders(),
    body: JSON.stringify(options),
  })

  if (!response.ok) {
    throw new Error(`Instantly API error: ${response.status} ${response.statusText}`)
  }

  return response.json()
}
```

### Inbox Data Query: Positive Leads with Latest Reply
```typescript
// src/lib/data/inbox-data.ts

interface InboxLead {
  id: string
  email: string
  first_name: string | null
  last_name: string | null
  company_name: string | null
  job_title: string | null
  linkedin_url: string | null
  vacancy_url: string | null
  sender_account: string | null
  reply_date: string | null        // Most recent activity
  reply_preview: string | null     // Preview text for inbox list
  has_client_reply: boolean        // "In gesprek" vs "Nieuwe lead"
}

export async function getPositiveLeadsForInbox(
  clientId: string
): Promise<InboxLead[]> {
  const supabase = await createClient()

  const { data } = await supabase
    .from('synced_leads')
    .select('id, email, first_name, last_name, company_name, job_title, linkedin_url, vacancy_url, sender_account, updated_at, payload')
    .eq('client_id', clientId)
    .eq('interest_status', 'positive')
    .order('updated_at', { ascending: false })

  if (!data) return []

  // Deduplicate by email, keep most recent
  const seen = new Set<string>()
  const leads: InboxLead[] = []

  for (const row of data) {
    if (!seen.has(row.email)) {
      seen.add(row.email)
      leads.push({
        id: row.id,
        email: row.email,
        first_name: row.first_name,
        last_name: row.last_name,
        company_name: row.company_name,
        job_title: row.job_title,
        linkedin_url: row.linkedin_url,
        vacancy_url: row.vacancy_url,
        sender_account: row.sender_account,
        reply_date: row.updated_at,
        reply_preview: null, // Populated from cached emails or on-demand
        has_client_reply: false, // Determined from email thread data
      })
    }
  }

  return leads
}
```

### Database Migration: Add Missing Columns and Email Cache Table
```sql
-- New migration for Phase 5

-- Add linkedin_url and vacancy_url to synced_leads
ALTER TABLE public.synced_leads ADD COLUMN IF NOT EXISTS linkedin_url TEXT;
ALTER TABLE public.synced_leads ADD COLUMN IF NOT EXISTS vacancy_url TEXT;

-- Email cache table for conversation threads
CREATE TABLE public.cached_emails (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  client_id UUID NOT NULL REFERENCES public.clients(id) ON DELETE CASCADE,
  instantly_email_id TEXT NOT NULL UNIQUE,
  thread_id TEXT NOT NULL,
  lead_email TEXT NOT NULL,
  from_address TEXT NOT NULL,
  to_address TEXT NOT NULL,
  subject TEXT,
  body_text TEXT,
  body_html TEXT,
  is_reply BOOLEAN DEFAULT FALSE,
  sender_account TEXT,             -- Which workspace account was involved
  email_timestamp TIMESTAMPTZ,     -- Actual email timestamp
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

ALTER TABLE public.cached_emails ENABLE ROW LEVEL SECURITY;

CREATE INDEX idx_cached_emails_client_lead ON public.cached_emails(client_id, lead_email);
CREATE INDEX idx_cached_emails_thread ON public.cached_emails(thread_id);

-- RLS: Clients can view their own cached emails
CREATE POLICY "Clients can view own cached emails" ON public.cached_emails
  FOR SELECT TO authenticated
  USING (client_id::TEXT = (SELECT auth.jwt() ->> 'client_id'));

-- Operators can view all
CREATE POLICY "Operators can view all cached emails" ON public.cached_emails
  FOR SELECT TO authenticated
  USING ((SELECT auth.jwt() ->> 'user_role') = 'operator');

-- Track whether the client has replied (for status labels)
ALTER TABLE public.synced_leads ADD COLUMN IF NOT EXISTS client_has_replied BOOLEAN DEFAULT FALSE;
```

### Status Label Logic
```typescript
// INBX-05: "Nieuwe lead" vs "In gesprek"
function getLeadStatusLabel(lead: InboxLead): {
  label: string
  color: string
} {
  if (lead.has_client_reply) {
    return { label: 'In gesprek', color: 'bg-blue-100 text-blue-800' }
  }
  return { label: 'Nieuwe lead', color: 'bg-green-100 text-green-800' }
}
```

## State of the Art

| Old Approach | Current Approach | When Changed | Impact |
|--------------|------------------|--------------|--------|
| Instantly API v1 (API key in query params) | API v2 (Bearer token auth) | 2024-2025 | More secure, scoped permissions |
| Unibox v1 API (different URL format) | API v2 `/emails` endpoints | 2024-2025 | Unified under v2, v1 deprecated |
| Custom sentiment analysis | Instantly AI interest classification | Built-in | No NLP needed, just read `interest_status` |

**Deprecated/outdated:**
- Instantly API v1: Planned for deprecation since 2025. This project already uses v2. Do not reference v1 endpoints.
- Old Unibox API (`app.theneo.io/instantly-ai/instantlyapidocs/unibox`): Replaced by v2 email endpoints.

## Open Questions

1. **No "Send New Email" endpoint in Instantly API v2**
   - What we know: The API has reply, forward, list, get, patch, delete, count-unread, and mark-as-read. No standalone `POST /emails/send`.
   - What's unclear: How to implement INBX-04 ("Nieuwe Email" button) for composing a brand new email to a positive lead. Since these leads have already been contacted via campaigns, there should always be an existing thread to reply to.
   - Recommendation: Implement "Nieuwe Email" as a reply to the most recent email in the thread (using `reply_to_uuid`). If the subject differs, it may start a new visual thread in the recipient's inbox. Flag this as a limitation to validate during implementation. If a lead truly has no prior email thread (edge case), disable the compose button and show a tooltip explaining the limitation.

2. **Email thread data freshness**
   - What we know: Cached emails will go stale. The cron sync runs periodically.
   - What's unclear: Exact sync frequency for email threads. Current sync is for leads/analytics only.
   - Recommendation: Add email thread sync for positive leads to the existing cron job. Also fetch fresh thread data on-demand when user opens a thread view. Cache for at least 5 minutes to stay within rate limits.

3. **Reply content preview for inbox list**
   - What we know: INBX-01 requires "preview text" in the inbox list. This is the lead's reply content.
   - What's unclear: Whether to store reply content in synced_leads during sync or fetch from cached_emails.
   - Recommendation: Add a `reply_content` and `reply_subject` column to synced_leads, populated during the existing lead sync. This gives the inbox list immediate access to preview text without joining to cached_emails.

4. **LinkedIn URL and Vacancy URL field name variations**
   - What we know: These come from CSV custom variables stored in payload JSONB. Field names vary across clients.
   - What's unclear: Exact field name variants used by current clients.
   - Recommendation: Use the existing `extractPayloadField` pattern with generous variants: `['LinkedIn', 'linkedin', 'linkedin_url', 'LinkedIn URL', 'linkedIn']` and `['Vacancy URL', 'vacancy_url', 'Vacature URL', 'vacature_url', 'Vacancy', 'vacature']`. Populate dedicated columns during sync.

5. **Instantly API scopes required**
   - What we know: Email endpoints require `emails:read`, `emails:create`, `emails:all`, `all:read`, `all:create`, or `all:all` scopes.
   - What's unclear: Whether the current API key has these scopes configured.
   - Recommendation: Verify API key scopes before implementation. If not set, update the API key in the Instantly workspace settings.

## Sources

### Primary (HIGH confidence)
- [Instantly API v2 Email endpoints](https://developer.instantly.ai/api/v2/email) - All available email operations
- [Instantly API v2 Reply to email](https://developer.instantly.ai/api/v2/email/replytoemail) - Reply endpoint: `POST /emails/reply` with `reply_to_uuid`, `eaccount`, `subject`, `body`
- [Instantly API v2 List emails](https://developer.instantly.ai/api/v2/email/listemail) - List endpoint: `GET /emails` with `lead`, `eaccount`, `campaign_id`, `search` (supports `thread:THREAD_ID`), 20 req/min rate limit
- [Instantly API v2 Schemas](https://developer.instantly.ai/api/v2/schemas) - Email object fields: `id`, `thread_id`, `from_address_email`, `to_address_email_list`, `subject`, `body`, `is_reply`, `timestamp_email`
- Existing codebase: `src/lib/instantly/client.ts`, `src/lib/instantly/sync.ts`, `src/lib/data/campaign-stats.ts` - Established patterns for API calls, sync, and data fetching

### Secondary (MEDIUM confidence)
- [Instantly API v2 Introduction](https://developer.instantly.ai/) - v2 uses Bearer auth, v1 deprecated
- [Instantly API v2 Get email](https://developer.instantly.ai/api/v2/email/getemail) - `GET /emails/{id}` for individual email
- WebSearch results confirming email endpoint list: reply, forward, list, get, patch, delete, count-unread, mark-as-read (no standalone send)

### Tertiary (LOW confidence)
- The exact field names in the email response object (`from_address_email`, `to_address_email_list`, `is_reply`, `i_status`) are inferred from WebSearch snippets of the docs. The JavaScript-rendered docs could not be fetched directly. These should be validated with a test API call during implementation.
- The `subsequence_id: null` for manually sent emails claim needs validation.

## Metadata

**Confidence breakdown:**
- Standard stack: HIGH - No new dependencies, extends existing patterns
- Architecture: HIGH - Follows established patterns in the codebase (server components, Server Actions, Supabase queries)
- Instantly API email endpoints: MEDIUM - Verified endpoint names and key parameters via WebSearch, but JS-rendered docs prevented full schema extraction. Field names need validation with test API calls.
- Pitfalls: MEDIUM - Rate limiting and missing "send" endpoint are confirmed; field name variants for LinkedIn/vacancy are educated guesses
- Email threading: MEDIUM - The `reply_to_uuid` mechanism is documented, but exact behavior of In-Reply-To/References headers is managed by Instantly and not directly verified

**Research date:** 2026-02-15
**Valid until:** 2026-03-15 (Instantly API is stable but check for v2 updates)
