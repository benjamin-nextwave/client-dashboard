# Phase 4: Instantly.ai Integration & Campaign Stats - Research

**Researched:** 2026-02-15
**Domain:** Instantly.ai API v2 integration, campaign analytics, data sync, charting
**Confidence:** MEDIUM (API docs use client-side rendering; some field details inferred from multiple sources)

## Summary

This phase integrates the Instantly.ai API v2 to pull campaign analytics, lead data, and reply information for each client's associated campaigns, then displays aggregated statistics on the client dashboard. The existing codebase already has an Instantly API client (`src/lib/instantly/client.ts`) that handles campaign listing with Bearer token auth against `https://api.instantly.ai/api/v2/`, and a `client_campaigns` junction table linking clients to campaign IDs.

The Instantly.ai API v2 provides dedicated endpoints for campaign analytics (overview + daily), lead listing with filtering, email retrieval, and reply sending. Crucially, lead interest status (positive/neutral/negative) is handled by Instantly's own classification system, so we do not need to build sentiment analysis. Webhooks are available for real-time event processing (reply_received, lead_interested, etc.) but a polling approach may be simpler for the initial implementation given the "no-store cache" decision already made.

**Primary recommendation:** Use Next.js Server Actions and Route Handlers to fetch from Instantly API v2 on demand (no caching), store synced lead/analytics data in new Supabase tables for aggregation, and use Recharts for all chart components on the client dashboard.

## Standard Stack

### Core
| Library | Version | Purpose | Why Standard |
|---------|---------|---------|--------------|
| Instantly.ai API v2 | current | Campaign data, leads, emails, replies | Already in use; the only data source for campaign stats |
| Recharts | ^2.15 | Bar charts, pie/donut charts, stacked bars | Most popular React charting library, 24.8K GitHub stars, composable components, works well with Next.js App Router as client components |
| Supabase (existing) | ^2.95 | Data storage, RLS-enforced aggregation queries | Already the project database; store synced Instantly data here for fast aggregation |

### Supporting
| Library | Version | Purpose | When to Use |
|---------|---------|---------|-------------|
| date-fns | ^4.1 | Date range calculations (this month, formatting) | Monthly stat filtering, date display in Dutch locale |

### Alternatives Considered
| Instead of | Could Use | Tradeoff |
|------------|-----------|----------|
| Recharts | Chart.js / react-chartjs-2 | Chart.js is canvas-based (less accessible), Recharts is SVG-based and more React-native |
| Recharts | Tremor | Tremor is opinionated UI kit; overkill when we just need a few chart types |
| Polling API | Webhooks | Webhooks give real-time updates but require a publicly reachable endpoint and webhook management; polling is simpler for MVP |

**Installation:**
```bash
npm install recharts date-fns
```

## Architecture Patterns

### Recommended Project Structure
```
src/
  lib/
    instantly/
      client.ts          # Existing - extend with new API methods
      types.ts           # Existing - extend with analytics/lead types
      sync.ts            # NEW - sync logic: fetch from API, upsert to Supabase
  app/
    (client)/
      dashboard/
        page.tsx          # Existing placeholder - becomes the stats dashboard
        _components/      # NEW - dashboard-specific client components
          stats-cards.tsx         # "Reactie vereist", monthly stats cards
          contact-status-chart.tsx  # Bar/stacked bar chart
          icp-charts.tsx           # Industry + job title pie/donut charts
          contact-list-modal.tsx   # Modal with full contact list
    api/
      cron/
        sync-instantly/
          route.ts        # NEW - cron endpoint for periodic data sync
```

### Pattern 1: Data Sync to Local Tables
**What:** Fetch data from Instantly API and store in Supabase tables, then query locally for dashboard display.
**When to use:** Always -- aggregating across multiple campaigns per client requires local data.
**Why:** The Instantly API does not support cross-campaign aggregation. Each API call returns data for specific campaign(s). To show a client aggregated stats without exposing campaign names, we must fetch per-campaign data and aggregate locally.

```typescript
// Sync flow (server-side only)
async function syncClientCampaignData(clientId: string) {
  // 1. Get campaign IDs for this client from client_campaigns table
  // 2. For each campaign: fetch analytics overview from Instantly
  // 3. For each campaign: fetch leads list from Instantly
  // 4. Upsert data into local Supabase tables
  // 5. Never expose campaign_id or campaign_name to client
}
```

### Pattern 2: Recharts as Client Components
**What:** All chart components must use `"use client"` directive because Recharts uses browser-only APIs.
**When to use:** Every chart component.
**Example:**
```tsx
"use client"

import { PieChart, Pie, Cell, ResponsiveContainer, Tooltip } from 'recharts'

interface IndustryChartProps {
  data: { name: string; value: number }[]
  brandColor: string
}

export function IndustryChart({ data, brandColor }: IndustryChartProps) {
  return (
    <ResponsiveContainer width="100%" height={300}>
      <PieChart>
        <Pie data={data} dataKey="value" nameKey="name" cx="50%" cy="50%" outerRadius={100} innerRadius={60}>
          {data.map((_, index) => (
            <Cell key={index} fill={index === 0 ? brandColor : `${brandColor}${Math.max(30, 100 - index * 15).toString(16)}`} />
          ))}
        </Pie>
        <Tooltip />
      </PieChart>
    </ResponsiveContainer>
  )
}
```

### Pattern 3: Server Component Data Fetching + Client Component Display
**What:** Dashboard page.tsx is a Server Component that fetches aggregated data from Supabase, passes it as props to client chart components.
**When to use:** The main dashboard page.
```tsx
// app/(client)/dashboard/page.tsx - Server Component
import { StatsCards } from './_components/stats-cards'
import { ContactStatusChart } from './_components/contact-status-chart'

export default async function OverzichtPage() {
  const stats = await getAggregatedStats(clientId) // Supabase query
  const contacts = await getContactBreakdown(clientId) // Supabase query

  return (
    <div>
      <StatsCards stats={stats} />
      <ContactStatusChart data={contacts} />
    </div>
  )
}
```

### Anti-Patterns to Avoid
- **Calling Instantly API from client-side:** API key would be exposed. All Instantly calls must be server-side only.
- **Exposing campaign names/IDs to client users:** All data must be aggregated; client_campaigns table and campaign identifiers stay server-side.
- **Fetching Instantly API on every page load:** Even with no-store cache, calling the Instantly API for every dashboard render is wasteful and hits rate limits. Sync to local tables periodically instead.
- **Using a single analytics call for all campaigns:** The analytics endpoint supports multiple campaign IDs, but lead listing must be done per-campaign. Be consistent and sync everything.

## Instantly.ai API v2 - Endpoint Reference

### Authentication
- Bearer token: `Authorization: Bearer ${INSTANTLY_API_KEY}`
- API key scopes required: `campaigns:read`, `leads:read`, `emails:read`, `emails:create` (for replies)
- Rate limit: Shared across entire workspace (v1 + v2), 429 on exceed. Exact per-plan limits not publicly documented but estimated at 10 req/s for Growth plan.

### Key Endpoints

#### 1. Campaign Analytics Overview
```
GET https://api.instantly.ai/api/v2/campaigns/analytics/overview
```
**Parameters:** `id` or `ids` (campaign IDs), `start_date`, `end_date` (YYYY-MM-DD), `campaign_status`
**Response fields:** `sent`, `contacted`, `new_leads_contacted`, `opened`, `unique_opened`, `replies`, `unique_replies`, `replies_automatic`, `unique_replies_automatic`, `clicks`, `unique_clicks`, `opportunities`, `unique_opportunities`
**Confidence:** HIGH - multiple sources confirm these fields

#### 2. Daily Campaign Analytics
```
GET https://api.instantly.ai/api/v2/campaigns/analytics/daily
```
**Parameters:** `campaign_id`, `campaign_status`, `start_date`, `end_date`
**Response fields:** `date`, `sent`, `contacted`, `new_leads_contacted`, `opened`, `unique_opened`, `replies`, `unique_replies`, `replies_automatic`, `unique_replies_automatic`, `clicks`, `unique_clicks`
**Confidence:** HIGH

#### 3. List Leads (POST, not GET)
```
POST https://api.instantly.ai/api/v2/leads/list
```
**Parameters (body):** `campaign_id`, `limit`, `starting_after` (cursor pagination), `interest_status` (filter: positive/neutral/negative)
**Response lead fields:** `id`, `email`, `first_name`, `last_name`, `company_name`, `phone`, `website`, `company_domain`, `status`, `status_summary`, `email_open_count`, `email_reply_count`, `email_click_count`, `payload` (custom variables object), `timestamp_created`, `timestamp_updated`, `last_step_from` (sender email), `last_step_id`, `last_step_timestamp_executed`
**Confidence:** MEDIUM - field list assembled from multiple search results; `last_step_from` as sender account needs validation

**Important:** `last_step_from` likely contains the email account used to send to this lead. This is critical for INST-04 (tracking sender account per contact for reply routing).

#### 4. Reply to Email
```
POST https://api.instantly.ai/api/v2/emails/reply
```
**Parameters:** `reply_to_uuid` (email ID to reply to), `eaccount` (sender email account), `body` (html/text)
**Required scopes:** `emails:create`
**Confidence:** HIGH

#### 5. List Emails
```
GET https://api.instantly.ai/api/v2/emails/{id}
GET https://api.instantly.ai/api/v2/emails (list)
```
Used to retrieve email threads, reply content. Includes `campaign_id`, lead info, `eaccount` (sender).
**Confidence:** MEDIUM

#### 6. Lead Labels / Interest Status
Lead labels have: `id`, `label`, `interest_status` (enum: "positive", "neutral", "negative"), `description`, `use_with_ai`
Filter leads by interest_status to get positive replies (for "Reactie vereist" count and "Geleverde leads deze maand").
**Confidence:** HIGH

### Webhook Events (for future consideration)
Available events: `email_sent`, `email_opened`, `reply_received`, `auto_reply_received`, `link_clicked`, `email_bounced`, `lead_unsubscribed`, `lead_neutral`, `lead_interested`, `lead_not_interested`, `lead_meeting_booked`, `lead_meeting_completed`, `lead_closed`, `lead_out_of_office`, `lead_wrong_person`, `campaign_completed`
**Payload base fields:** `timestamp`, `event_type`, `workspace`, `campaign_id`, `campaign_name`
**Reply event extras:** `lead_email`, `email_account`, `reply_text_snippet`, `reply_subject`, `reply_text`, `reply_html`, `unibox_url`
**Confidence:** HIGH

## Database Schema Design

### New Tables Required

```sql
-- Synced lead data from Instantly (source of truth for contact list + ICP charts)
CREATE TABLE public.synced_leads (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  client_id UUID NOT NULL REFERENCES public.clients(id) ON DELETE CASCADE,
  instantly_lead_id TEXT NOT NULL,
  campaign_id TEXT NOT NULL,        -- internal only, never shown to client
  email TEXT NOT NULL,
  first_name TEXT,
  last_name TEXT,
  company_name TEXT,
  job_title TEXT,                   -- from payload custom variables
  industry TEXT,                    -- from payload custom variables
  company_size TEXT,                -- from payload custom variables
  website TEXT,
  phone TEXT,
  lead_status TEXT,                 -- emailed, not_yet_emailed, replied, bounced
  interest_status TEXT,             -- positive, neutral, negative (from Instantly)
  sender_account TEXT,              -- which email account sent to this lead (INST-04)
  email_sent_count INTEGER DEFAULT 0,
  email_reply_count INTEGER DEFAULT 0,
  payload JSONB,                    -- raw custom variables from Instantly
  last_synced_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  UNIQUE(client_id, instantly_lead_id, campaign_id)
);

ALTER TABLE public.synced_leads ENABLE ROW LEVEL SECURITY;
CREATE INDEX idx_synced_leads_client_id ON public.synced_leads(client_id);
CREATE INDEX idx_synced_leads_interest_status ON public.synced_leads(client_id, interest_status);

-- Synced campaign analytics snapshots
CREATE TABLE public.campaign_analytics (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  client_id UUID NOT NULL REFERENCES public.clients(id) ON DELETE CASCADE,
  campaign_id TEXT NOT NULL,        -- internal only
  date DATE NOT NULL,
  emails_sent INTEGER DEFAULT 0,
  leads_contacted INTEGER DEFAULT 0,
  replies INTEGER DEFAULT 0,
  unique_replies INTEGER DEFAULT 0,
  bounced INTEGER DEFAULT 0,
  opened INTEGER DEFAULT 0,
  clicked INTEGER DEFAULT 0,
  last_synced_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  UNIQUE(client_id, campaign_id, date)
);

ALTER TABLE public.campaign_analytics ENABLE ROW LEVEL SECURITY;
CREATE INDEX idx_campaign_analytics_client_date ON public.campaign_analytics(client_id, date);
```

### RLS Policies
- Clients can SELECT from synced_leads and campaign_analytics WHERE `client_id` matches their JWT claim
- Operators can SELECT all
- Only service_role (cron/sync) can INSERT/UPDATE -- use Supabase admin client
- **Critical:** campaign_id column must NEVER be exposed in client-facing queries; use aggregation queries that GROUP BY client_id only

### Mapping Instantly Fields to lead_status
| Instantly Status | Our lead_status | How to Determine |
|-----------------|-----------------|-------------------|
| Lead with email_sent_count > 0, reply_count = 0 | `emailed` | Check counts |
| Lead with email_sent_count = 0 | `not_yet_emailed` | Check counts |
| Lead with email_reply_count > 0 | `replied` | Check counts |
| Lead that bounced | `bounced` | Check status_summary or separate bounce tracking |

### ICP Data (STAT-07, STAT-08, STAT-09)
Industry, job title, and company size are NOT standard Instantly lead fields -- they come from **custom variables in the payload**. This means:
- The CSV upload to Instantly must include these columns for them to be available
- They will appear in the `payload` JSON field of each lead
- Field names depend on what the operator names them in the CSV (e.g., "Industry", "industry", "Job Title", "job_title")
- **Recommendation:** Document expected payload field names and normalize during sync (case-insensitive matching for common variants)

## Don't Hand-Roll

| Problem | Don't Build | Use Instead | Why |
|---------|-------------|-------------|-----|
| Sentiment/reply classification | Custom NLP | Instantly's interest_status | Already decided; Instantly classifies positive/neutral/negative |
| Chart rendering | Custom SVG/Canvas | Recharts | Battle-tested, responsive, accessible, composable |
| Date math | Manual date calculations | date-fns | Month boundaries, date ranges, locale formatting |
| Data pagination | Custom cursor tracking | Instantly's `starting_after` cursor | Built into API; just pass the cursor from previous response |
| Rate limiting | Custom throttle | Simple sequential fetching with delay | For sync jobs, process campaigns sequentially with small delays |

**Key insight:** The biggest complexity here is data synchronization and aggregation, not visualization. Focus engineering effort on reliable sync logic and correct aggregation queries.

## Common Pitfalls

### Pitfall 1: ICP Custom Variable Field Names
**What goes wrong:** Industry/job title/company size data is stored in Instantly's custom `payload` field, and field names vary per CSV upload (e.g., "Industry" vs "industry" vs "Branche").
**Why it happens:** No standardized schema for custom variables in Instantly.
**How to avoid:** During sync, normalize field names by checking common variants (case-insensitive). Document required CSV column names for operators. Fallback gracefully if fields are missing.
**Warning signs:** Empty ICP charts despite leads having data in Instantly.

### Pitfall 2: Exposing Campaign Details to Clients
**What goes wrong:** Campaign IDs or names leak into the client-facing UI or API responses.
**Why it happens:** Forgetting to aggregate, or including campaign_id in SELECT queries for client views.
**How to avoid:** RLS policies that only return aggregated data. Never include campaign_id in any Server Component that renders for client role. Review all queries.
**Warning signs:** Client can see individual campaign data or campaign counts.

### Pitfall 3: Rate Limiting During Bulk Sync
**What goes wrong:** Sync job hits 429 errors when fetching data for many campaigns/leads.
**Why it happens:** All campaigns fetched in parallel without throttling.
**How to avoid:** Process campaigns sequentially. Add delay between requests. Implement exponential backoff on 429. Consider syncing clients in round-robin.
**Warning signs:** Intermittent sync failures, missing data for some clients.

### Pitfall 4: Lead Deduplication Across Campaigns
**What goes wrong:** Same contact appears in multiple campaigns for the same client, leading to inflated contact counts.
**Why it happens:** Instantly treats leads per-campaign; a lead can exist in multiple campaigns.
**How to avoid:** Use `distinct_contacts` parameter in list leads, or deduplicate by email at the Supabase level when calculating "Contacten in database" count. The `synced_leads` UNIQUE constraint on `(client_id, instantly_lead_id, campaign_id)` prevents duplicates per campaign, but cross-campaign dedup needs a query-level DISTINCT on email.
**Warning signs:** Contact count much higher than expected.

### Pitfall 5: Sender Account Tracking for Reply Routing (INST-04)
**What goes wrong:** Cannot route replies through the correct sender account.
**Why it happens:** Not capturing which email account was used for each lead during sync.
**How to avoid:** Store `last_step_from` (or equivalent sender field) from the lead data during sync. When composing a reply via the API, use this stored `eaccount` value.
**Warning signs:** Replies sent from wrong account, email threading breaks.

### Pitfall 6: Recharts Bundle Size
**What goes wrong:** Full Recharts import inflates client bundle.
**Why it happens:** Importing from 'recharts' without tree-shaking.
**How to avoid:** Import specific components: `import { PieChart, Pie } from 'recharts'`. Recharts v2 supports tree-shaking.
**Warning signs:** Slow page loads on client dashboard.

## Code Examples

### Extending the Instantly Client
```typescript
// src/lib/instantly/client.ts - additions
import type {
  InstantlyCampaignAnalytics,
  InstantlyLead,
  InstantlyListResponse,
} from './types'

const BASE_URL = 'https://api.instantly.ai/api/v2'
const headers = {
  Authorization: `Bearer ${process.env.INSTANTLY_API_KEY}`,
  'Content-Type': 'application/json',
}

export async function getCampaignAnalyticsOverview(
  campaignIds: string[],
  startDate: string,
  endDate: string
): Promise<InstantlyCampaignAnalytics> {
  const params = new URLSearchParams({
    ids: campaignIds.join(','),
    start_date: startDate,
    end_date: endDate,
  })

  const response = await fetch(
    `${BASE_URL}/campaigns/analytics/overview?${params}`,
    { headers, cache: 'no-store' }
  )

  if (!response.ok) {
    throw new Error(`Instantly API error: ${response.status} ${response.statusText}`)
  }

  return response.json()
}

export async function listLeads(
  campaignId: string,
  options?: { limit?: number; startingAfter?: string; interestStatus?: string }
): Promise<InstantlyListResponse<InstantlyLead>> {
  const body: Record<string, unknown> = { campaign_id: campaignId }
  if (options?.limit) body.limit = options.limit
  if (options?.startingAfter) body.starting_after = options.startingAfter
  if (options?.interestStatus) body.interest_status = options.interestStatus

  const response = await fetch(`${BASE_URL}/leads/list`, {
    method: 'POST',
    headers,
    body: JSON.stringify(body),
    cache: 'no-store',
  })

  if (!response.ok) {
    throw new Error(`Instantly API error: ${response.status} ${response.statusText}`)
  }

  return response.json()
}

export async function replyToEmail(
  replyToUuid: string,
  eaccount: string,
  body: { html?: string; text?: string }
): Promise<void> {
  const response = await fetch(`${BASE_URL}/emails/reply`, {
    method: 'POST',
    headers,
    body: JSON.stringify({
      reply_to_uuid: replyToUuid,
      eaccount,
      body,
    }),
    cache: 'no-store',
  })

  if (!response.ok) {
    throw new Error(`Instantly API error: ${response.status} ${response.statusText}`)
  }
}
```

### Aggregation Query Example
```sql
-- "Verzonden mails" (total sent) for a client this month
SELECT COALESCE(SUM(emails_sent), 0) as total_sent
FROM campaign_analytics
WHERE client_id = $1
  AND date >= date_trunc('month', CURRENT_DATE)
  AND date <= CURRENT_DATE;

-- "Contacten in database" (unique contacts across campaigns)
SELECT COUNT(DISTINCT email) as total_contacts
FROM synced_leads
WHERE client_id = $1;

-- Contact status breakdown for chart
SELECT
  lead_status,
  COUNT(DISTINCT email) as count
FROM synced_leads
WHERE client_id = $1
GROUP BY lead_status;

-- Industry breakdown for ICP chart
SELECT
  COALESCE(industry, 'Onbekend') as industry,
  COUNT(DISTINCT email) as count
FROM synced_leads
WHERE client_id = $1
GROUP BY industry
ORDER BY count DESC
LIMIT 10;

-- "Reactie vereist" count (unanswered positive replies)
-- This needs a separate tracking mechanism:
-- positive interest_status leads that haven't been replied to by operator
SELECT COUNT(DISTINCT email) as unanswered_positive
FROM synced_leads
WHERE client_id = $1
  AND interest_status = 'positive'
  AND NOT EXISTS (
    SELECT 1 FROM operator_replies
    WHERE operator_replies.lead_email = synced_leads.email
      AND operator_replies.client_id = synced_leads.client_id
  );
```

## State of the Art

| Old Approach | Current Approach | When Changed | Impact |
|--------------|------------------|--------------|--------|
| Instantly API v1 (api_key param) | API v2 (Bearer token) | 2024-2025 | v1 deprecated; must use v2 |
| GET for lead listing | POST /leads/list | API v2 | Complex filters need POST body |
| Manual sentiment | Instantly AI classification | 2024 | interest_status field automated |
| Per-campaign analytics only | Multi-campaign analytics overview | API v2 | Can pass multiple IDs to overview endpoint |

**Deprecated/outdated:**
- API v1 endpoints (planned deprecation 2025): Do NOT use `api_key` query parameter auth
- Old webhook format: Use v2 webhook events

## Open Questions

1. **Exact rate limit numbers per plan tier**
   - What we know: Rate limits exist, shared across workspace, 429 on exceed
   - What's unclear: Exact requests/second for Growth plan
   - Recommendation: Start conservative (1-2 req/s during sync), implement backoff, test empirically

2. **Lead `last_step_from` field availability**
   - What we know: Lead response includes `last_step_from` and `last_step_id` fields
   - What's unclear: Whether `last_step_from` reliably contains the sender email account
   - Recommendation: Validate with a test API call early in implementation; if not available, check email endpoints for sender info

3. **ICP custom variable field names**
   - What we know: Industry, job title, company size come from custom payload variables
   - What's unclear: What field names the operators currently use in their CSV uploads
   - Recommendation: Ask operators for sample CSV, then build normalization mapping

4. **"Reactie vereist" tracking mechanism**
   - What we know: Need to count positive replies that operators haven't responded to
   - What's unclear: How to track operator responses -- via Instantly API or local tracking
   - Recommendation: Track locally with an `operator_replies` table; when operator sends reply via dashboard, record it. Alternatively, check email thread in Instantly for operator responses.

5. **Sync frequency and trigger**
   - What we know: "No-store cache" decision means operators need fresh data
   - What's unclear: How often to sync (every 5 min? 15 min? on-demand?)
   - Recommendation: Implement a Vercel Cron job every 15 minutes for background sync, plus a manual "refresh" button for operators. Client dashboard reads from local tables (fast).

6. **Bounced lead detection**
   - What we know: Analytics overview has `bounced_count` aggregate; individual leads may have bounce status
   - What's unclear: Exact field on lead object that indicates bounce
   - Recommendation: Check `status_summary` field on leads; may contain bounce indicator. Also check webhook `email_bounced` events if implementing webhooks later.

## Sources

### Primary (HIGH confidence)
- [Instantly API v2 Developer Portal](https://developer.instantly.ai/) - API structure, endpoints, authentication
- [Campaign Analytics Endpoint](https://developer.instantly.ai/api/v2/analytics/getcampaignanalytics) - Analytics fields
- [Daily Campaign Analytics](https://developer.instantly.ai/api/v2/campaign/getdailycampaignanalytics) - Daily breakdown fields
- [Lead Endpoints](https://developer.instantly.ai/api/v2/lead) - Lead CRUD, list leads POST
- [Reply to Email](https://developer.instantly.ai/api/v2/email/replytoemail) - Reply endpoint, eaccount parameter
- [Lead Labels](https://developer.instantly.ai/api/v2/leadlabel) - interest_status enum (positive/neutral/negative)
- [Webhook Events](https://developer.instantly.ai/webhook-events) - Available event types and payload fields
- [Rate Limits](https://developer.instantly.ai/getting-started/rate-limit) - Rate limiting behavior (shared workspace)
- [Recharts GitHub](https://github.com/recharts/recharts) - Chart library capabilities

### Secondary (MEDIUM confidence)
- [Instantly API v1 docs / migration guide](https://developer.instantly.ai/api-v1-docs) - Legacy reference, field names
- [Instantly blog on API & Webhooks](https://instantly.ai/blog/api-webhooks-custom-integrations-for-outreach/) - Integration patterns
- [Theneo-hosted API docs (v1)](https://app.theneo.io/instantly-ai/instantlyapidocs/lead/add-leads-to-a-campaign) - Lead field list verified

### Tertiary (LOW confidence)
- Lead `last_step_from` field as sender account - inferred from field name in search results, needs API validation
- Exact rate limit numbers - not publicly documented in detail
- `status_summary` for bounce detection - inferred, needs validation

## Metadata

**Confidence breakdown:**
- Standard stack: HIGH - Recharts and date-fns are well-established; Instantly API v2 is documented
- Architecture (sync pattern): HIGH - standard API-to-local-DB sync; well-understood pattern
- API endpoints/fields: MEDIUM - docs use client-side rendering making exact field extraction difficult; assembled from multiple search results
- ICP data availability: LOW - depends on CSV upload conventions; needs operator input
- Pitfalls: MEDIUM - based on general API integration experience and Instantly-specific quirks

**Research date:** 2026-02-15
**Valid until:** 2026-03-15 (Instantly API is stable but evolving; recheck before major implementation changes)
