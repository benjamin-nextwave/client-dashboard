# NextWave Dashboard — Complete System Overview

## Tech Stack

| Layer | Technology |
|-------|-----------|
| Framework | **Next.js 15** (App Router, Turbopack) + **React 19** + **TypeScript 5** |
| Styling | **Tailwind CSS 4** |
| Database | **Supabase** (PostgreSQL 17 + Realtime + Auth + Storage) |
| AI Chat | **Anthropic Claude Haiku** via Vercel AI SDK |
| Email Platform | **Instantly.ai** (API v2) |
| Automation | **Make.com** (webhook relay) |
| Hosting | **Vercel** (with cron jobs) |
| Charts | **Recharts** |
| Forms | **React Hook Form** + **Zod** validation |
| CSV Parsing | **PapaParse** |
| Language | **Dutch (nl-NL)** — all UI is in Dutch |

---

## Architecture Overview

This is a **multi-tenant SaaS dashboard** with two user types:

- **Operators** (NextWave admins) — manage all clients, uploads, errors at `/admin`
- **Clients** (end customers) — view their own campaign data, inbox, leads at `/dashboard`

Isolation is enforced via **Row-Level Security (RLS)** on every table. JWTs carry `user_role` and `client_id` claims injected by a custom Supabase access token hook.

---

## How Data Flows From Instantly

This is the core of the system. There are multiple paths data enters:

### 1. Webhook (Real-time — via Make.com)

```
Instantly detects positive lead
  → Make.com scenario fires
  → POST /api/webhook-sync { email, campaign_id }
  → Looks up client via client_campaigns table
  → Fetches fresh lead data from Instantly API
  → Extracts custom fields (job_title, industry, company_size, linkedin_url, vacancy_url)
  → Upserts into synced_leads
  → Caches all emails into cached_emails
  → Updates latest reply metadata on synced_leads
```

### 2. Cron: Incremental Sync (Every 15 minutes)

```
Vercel cron → GET /api/cron/sync-instantly
  → For each client + campaign:
    → Fetches positive leads from Instantly
    → Updates existing synced_leads (status, reply counts)
    → Caches new emails
    → Removes leads no longer positive
    → 200ms delay between API calls (rate limiting)
```

### 3. Cron: Full Sync (Daily at 05:00 UTC)

```
Vercel cron → GET /api/cron/sync-full
  → For each client + campaign:
    → Fetches 365 days of daily analytics → campaign_analytics
    → Full lead refresh + email caching
    → Force-refreshes campaigns that haven't synced in 6 hours
```

### 4. Morning Health Check (Daily at 05:00 UTC)

```
Vercel cron → GET /api/cron/morning-check
  → Checks each client for:
    → Low email send count (< 74 yesterday)
    → Low remaining contacts (< 180)
  → Fires alert webhooks if thresholds exceeded
```

### 5. Manual Refresh (Client-triggered)

```
User clicks refresh in inbox
  → refreshInbox() server action
  → Scans all campaigns for positive leads
  → Paginated retrieval with cursor support
```

---

## Database Schema (Supabase)

### Core Tables

| Table | Purpose |
|-------|---------|
| `clients` | Tenant registry (company_name, branding, meeting_url, is_recruitment flag) |
| `profiles` | Maps auth.users → client_id + user_role (operator/client) |
| `client_campaigns` | Links clients to Instantly campaign IDs |
| `synced_leads` | All lead data from Instantly (email, name, company, job_title, interest_status, lead_status, sender_account, linkedin_url, vacancy_url, reply metadata, custom payload) |
| `cached_emails` | Email thread cache (from/to, subject, body, thread_id, sender_account, timestamps) |
| `campaign_analytics` | Daily stats per campaign (sent, replied, bounced, opened, clicked) |
| `csv_uploads` | CSV file metadata (headers, column mappings, contact date, status) |
| `csv_rows` | Individual CSV row data as JSONB + filter status |
| `dnc_entries` | Do-Not-Contact list (emails and domains) |
| `sync_state` | Incremental sync cursors per campaign |
| `feedback_requests` | Client feature/bug requests with operator responses |
| `error_logs` | Application error tracking |
| `notification_settings` | Per-user notification preferences |
| `preview_exclusions` | Tracks client-excluded contacts |

### Key Column Details

#### `synced_leads`

```
id, client_id, instantly_lead_id, campaign_id
email, first_name, last_name, company_name
job_title, industry, company_size
website, phone
lead_status ('emailed', 'not_yet_emailed', 'replied', 'bounced')
interest_status ('positive', 'neutral', 'negative')
sender_account (email account that sent to this lead)
email_sent_count, email_reply_count
linkedin_url, vacancy_url
client_has_replied, reply_subject, reply_content
opened_at, archived_at
payload (JSONB of custom fields)
last_synced_at, created_at, updated_at
UNIQUE(client_id, instantly_lead_id, campaign_id)
```

#### `cached_emails`

```
id, client_id, instantly_email_id
thread_id, lead_email
from_address, to_address
subject, body_text, body_html
is_reply (BOOLEAN)
sender_account
email_timestamp
created_at
```

#### `campaign_analytics`

```
id, client_id, campaign_id, date
emails_sent, leads_contacted
replies, unique_replies
bounced, opened, clicked
last_synced_at
UNIQUE(client_id, campaign_id, date)
```

### Storage

- **client-logos** bucket (2MB limit, public, PNG/JPEG/SVG/WebP)

---

## Authentication & Authorization

### Auth Flow

1. Login form at `/login` → Supabase `signInWithPassword(email, password)`
2. Custom access token hook injects `user_role` and `client_id` into JWT claims
3. Middleware reads claims and routes: operators → `/admin`, clients → `/dashboard`
4. Cookie-based sessions via `@supabase/ssr`, auto-refreshed in middleware
5. JWT expiry: 1 hour, refresh token rotation enabled

### RLS Enforcement

- **Clients** can only view/modify rows matching their `client_id`
- **Operators** have full access to all data
- All tables have RLS enabled — no exceptions

---

## Operator Side (`/admin`)

| Page | Purpose |
|------|---------|
| `/admin` | Client overview with health indicators (green/yellow/red dots), search, filters |
| `/admin/clients/new` | Create client — company info, branding, campaign selection from Instantly API |
| `/admin/clients/[id]/edit` | Edit client details, campaigns, branding |
| `/admin/clients/[id]/csv` | Upload CSVs, set email column, column mappings, contact date, filter by DNC, export |
| `/admin/errors` | Error log table with resolve/unresolve |
| `/admin/feedback` | All client feedback requests across all tenants |

### Client Creation Flow

1. Operator fills form (company name, email, color, logo, meeting URL, is_recruitment flag)
2. Selects campaigns from Instantly API
3. System creates `clients` row → `auth.users` entry → `profiles` row → links campaigns

### CSV Management Flow

1. Upload CSV file → create `csv_uploads` record (status: 'uploading')
2. Stream rows into `csv_rows` table (100 rows per batch)
3. Set email column and column mappings
4. Apply DNC filter → marks matching rows as `is_filtered` with reason
5. Export filtered results

### Health Monitoring Thresholds

- **Low Emails:** < 74 sent yesterday → yellow indicator
- **Low Contacts:** < 180 remaining → red indicator

---

## Client Side (`/dashboard`)

| Page | Purpose |
|------|---------|
| `/dashboard` | Overview with stats cards, pipeline chart, ICP breakdowns, daily email chart, date range filter |
| `/dashboard/inbox` | Positive leads list — realtime updates, archive, compose, reply |
| `/dashboard/inbox/[leadId]` | Full email thread + contact card (LinkedIn, vacancy URL), reply form |
| `/dashboard/verzonden` | Sent campaign emails (updated daily at 06:00) |
| `/dashboard/voorvertoning` | Preview contacts from latest CSV upload with DNC/exclusion marking |
| `/dashboard/dnc` | Manage Do-Not-Contact (add email/domain, bulk CSV import) |
| `/dashboard/voorkeuren` | Display name, notification email, notification toggle |
| `/dashboard/feedback` | Submit feature requests/bugs, view history |
| `/dashboard/afspraken` | Redirect to external meeting URL |

### Inbox Features

- Full email thread with **sender_account filtering** (prevents cross-campaign mixing)
- Reply/compose via Instantly API
- Archive/unarchive, dismiss, delete from inbox
- Mark as opened (read/unread tracking)
- Realtime updates via Supabase Realtime subscriptions on `synced_leads` and `cached_emails`

### Sender Account Resolution (Fallback Chain)

1. Read from `synced_leads.sender_account`
2. Fallback: check other leads in same campaign
3. Fallback: extract from email metadata

### AI Chat Widget

- Available on every client page
- Uses Claude Haiku (`claude-haiku-4-5-20251001`)
- Builds context from leads, analytics, CSVs, and DNC data
- Rate limited to 10 messages per minute per client
- Streams responses via Vercel AI SDK

### Dashboard Charts

- **Stats Cards** — total replies, positive leads, emails sent
- **Pipeline Chart** — funnel: Total → Emailed → Opened → Replied → Positive
- **ICP Patterns** — top industries and job titles
- **Contact Status Breakdown** — by lead_status
- **Emails Per Day** — daily send volume
- **Date Range Filter** — 7d, 30d, 90d, current month, all-time

---

## Integrations

| System | Connection Method | Purpose |
|--------|------------------|---------|
| **Instantly.ai** | REST API v2 (Bearer token via `INSTANTLY_API_KEY`) | Source of truth for campaigns, leads, emails. Also sends replies. |
| **Make.com** | Outbound webhook from Instantly → POST to `/api/webhook-sync` | Real-time positive lead notifications |
| **Supabase** | Direct client (anon key + service role key) | Database, auth, realtime, storage |
| **Anthropic Claude** | Via Vercel AI SDK (`@ai-sdk/anthropic`) | Dashboard chatbot for clients |
| **Vercel** | Hosting + Cron | 4 cron jobs for sync, health checks, cleanup |

### Instantly API Endpoints Used

| Endpoint | Purpose |
|----------|---------|
| `GET /campaigns` | List all campaigns |
| `GET /campaigns/analytics/overview` | Campaign performance metrics |
| `GET /campaigns/analytics/daily` | Daily analytics breakdown |
| `POST /leads/list` | Fetch leads for a campaign |
| `GET /emails` | List emails for leads |
| `GET /campaigns/search-by-contact` | Find campaigns containing an email |
| `POST /emails/reply` | Send email replies |

---

## Vercel Cron Schedule

| Schedule | Route | Purpose |
|----------|-------|---------|
| Every 15 min | `/api/cron/sync-instantly` | Incremental inbox refresh |
| Daily 03:00 UTC | `/api/cron/cleanup-csv` | Delete expired CSV uploads |
| Daily 05:00 UTC | `/api/cron/sync-full` | Full lead + analytics sync |
| Daily 05:00 UTC | `/api/cron/morning-check` | Client health alerts |

---

## API Routes

| Route | Method | Auth | Purpose |
|-------|--------|------|---------|
| `/api/chat` | POST | User auth + rate limit | AI chat endpoint |
| `/api/webhook-sync` | POST | CRON_SECRET | Receive lead notifications from Make.com |
| `/api/sync-client` | POST | Internal | Sync single client |
| `/api/csv/export` | GET | Operator role | Export filtered CSV |
| `/api/cron/sync-instantly` | GET | CRON_SECRET | 15-min incremental sync |
| `/api/cron/sync-full` | GET | CRON_SECRET | Daily full sync |
| `/api/cron/morning-check` | GET | CRON_SECRET | Morning health check |
| `/api/cron/cleanup-csv` | GET | CRON_SECRET | CSV expiry cleanup |
| `/api/admin/cache-emails` | POST | Operator role | Cache emails for positive leads |
| `/api/admin/backfill-positive` | POST | Operator role | Backfill positive interest status |
| `/api/admin/cleanup-leads` | POST | Operator role | Clean up orphaned leads |
| `/api/admin/reset-leads` | POST | Operator role | Reset leads for a campaign |
| `/api/debug-sync` | POST | Internal | Debug sync state |
| `/api/debug-lead` | POST | Internal | Debug single lead |

---

## Environment Variables

```
# Supabase
NEXT_PUBLIC_SUPABASE_URL=https://your-project.supabase.co
NEXT_PUBLIC_SUPABASE_ANON_KEY=your-anon-key
SUPABASE_SERVICE_ROLE_KEY=your-service-role-key

# Instantly
INSTANTLY_API_KEY=your-instantly-api-key

# Cron / Webhook Security
CRON_SECRET=shared-secret-for-cron-and-webhook-routes

# Make.com (optional)
MAKE_WEBHOOK_URL=https://hook.make.com/...
ENABLE_LEAD_WEBHOOK=true|false
```

---

## Known Issues & Technical Difficulties

### 1. Sender Account Resolution Complexity

Multiple recent fixes (`020a2e6`, `a3fd44c`) were needed to correctly resolve which sender account sent emails to a lead. When a lead appears across campaigns, emails were mixing. The fix filters by `sender_account` but requires a fallback chain when the lead record is null.

### 2. Instantly API Rate Limiting

Artificial delays (200-500ms) are baked into every sync loop to avoid Instantly throttling. This makes full syncs slow for clients with many campaigns.

### 3. CSV Expiry Removed

Originally CSVs expired after 7 days (`expires_at`), but this caused issues. The latest migration (`20260302000001_csv_uploads_no_expiry.sql`) removes expiry. The cleanup cron still runs but won't match anything with NULL `expires_at`.

### 4. Email Caching Strategy

Emails are cached in `cached_emails` rather than fetched live. When a reply is sent, all cached emails for that lead are **deleted** to force a re-fetch on next view. This is a workaround rather than an incremental cache update.

### 5. No Webhook Authentication from Instantly

The webhook endpoint (`/api/webhook-sync`) validates a `CRON_SECRET` header, but the Make.com relay may not enforce strong authentication. Cron endpoints are also protected only by this shared secret.

### 6. Sync State Complexity

The `sync_state` table tracks cursors per client+campaign, but the incremental sync (every 15 min) fetches only positive leads while the full sync (daily) fetches everything. This dual approach adds complexity, and stale sync state can cause leads to be missed or duplicated.

### 7. No Background Job System

All syncs run as Vercel serverless functions with timeouts. Large clients with many campaigns may hit function timeout limits during full sync. There is no queue-based job system.

### 8. Realtime Subscriptions Trigger Full Refetches

Supabase Realtime is enabled on `synced_leads` and `cached_emails`, but the client-side providers (`InboxRealtimeProvider`, `ThreadRealtimeProvider`) trigger full data refetches rather than incremental updates.

### 9. Inconsistent API Route Auth

Some admin routes (`/api/admin/*`) check for operator role in code, but cron/webhook routes rely solely on the `CRON_SECRET` header with no user authentication.

### 10. Recruitment Feature Partially Implemented

The `is_recruitment` flag exists on clients and is read in the inbox, but actual UI differences for recruitment clients are minimal — vacancy_url and linkedin_url display in the contact card, but there is no distinct recruitment workflow yet.

---

## File Structure

```
src/
├── app/
│   ├── (auth)/login/              # Login page + server action
│   ├── (client)/dashboard/        # All client-facing pages
│   │   ├── page.tsx               # Overview dashboard
│   │   ├── inbox/                 # Inbox + lead thread view
│   │   ├── verzonden/             # Sent emails
│   │   ├── voorvertoning/         # CSV contact preview
│   │   ├── dnc/                   # Do-Not-Contact management
│   │   ├── voorkeuren/            # Preferences
│   │   ├── feedback/              # Feedback submission
│   │   └── afspraken/             # Meeting redirect
│   ├── (operator)/admin/          # All operator pages
│   │   ├── page.tsx               # Client overview list
│   │   ├── clients/               # Client CRUD + CSV management
│   │   ├── errors/                # Error log viewer
│   │   └── feedback/              # Feedback management
│   └── api/                       # API routes (cron, webhooks, admin, chat)
├── lib/
│   ├── actions/                   # Server actions (inbox, csv, dnc, feedback, preferences)
│   ├── data/                      # Data fetching (campaign stats, inbox, sent, preview, chat context)
│   ├── instantly/                 # Instantly API client, sync logic, types
│   ├── supabase/                  # Supabase clients (browser, server, admin, storage)
│   ├── validations/               # Zod schemas
│   ├── errors/                    # Error logging utility
│   └── webhooks/                  # Make.com webhook notification
├── components/
│   ├── admin/                     # Operator UI components
│   ├── client/                    # Client UI components (sidebar, chat, sync)
│   └── ui/                        # Shared UI components
├── middleware.ts                   # Auth + role-based routing
└── supabase/
    └── migrations/                # 18 database migrations
```
