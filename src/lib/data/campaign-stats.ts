import { createClient } from '@/lib/supabase/server'

// --- Types ---

interface MonthlyStats {
  totalReplies: number
  positiveLeads: number
  emailsSent: number
}

interface StatusBreakdown {
  status: string
  count: number
}

interface NameValue {
  name: string
  value: number
}

interface Contact {
  email: string
  first_name: string | null
  last_name: string | null
  company_name: string | null
  job_title: string | null
  industry: string | null
  lead_status: string | null
  interest_status: string | null
}

interface PositiveLeadPatterns {
  industries: NameValue[]
  jobTitles: NameValue[]
}

// --- Dutch label mapping ---

const LEAD_STATUS_LABELS: Record<string, string> = {
  emailed: 'Gemaild',
  not_yet_emailed: 'Nog niet gemaild',
  replied: 'Beantwoord',
  bounced: 'Gebounced',
}

// --- Helper: first day of current month ---

function firstDayOfMonth(): string {
  const now = new Date()
  return `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}-01`
}

// --- Helper: count distinct by field ---

function countDistinctByField<T extends Record<string, unknown>>(
  rows: T[],
  groupField: keyof T,
  emailField: keyof T,
  fallbackLabel: string = 'Onbekend'
): NameValue[] {
  const groups = new Map<string, Set<string>>()

  for (const row of rows) {
    const key = row[groupField]
      ? String(row[groupField])
      : fallbackLabel
    const email = String(row[emailField])

    if (!groups.has(key)) {
      groups.set(key, new Set())
    }
    groups.get(key)!.add(email)
  }

  return Array.from(groups.entries())
    .map(([name, emails]) => ({ name, value: emails.size }))
    .sort((a, b) => b.value - a.value)
    .slice(0, 10)
}

// --- Exported query functions ---

/**
 * Get monthly stats: total replies, positive leads count, emails sent.
 * Replies and emails_sent are from campaign_analytics for the current month.
 * Positive leads is all-time count of leads with interest_status = 'positive'.
 */
export async function getMonthlyStats(
  clientId: string
): Promise<MonthlyStats> {
  const supabase = await createClient()
  const monthStart = firstDayOfMonth()

  // Fetch analytics for current month
  const { data: analytics } = await supabase
    .from('campaign_analytics')
    .select('replies, emails_sent')
    .eq('client_id', clientId)
    .gte('date', monthStart)

  const totalReplies = (analytics ?? []).reduce(
    (sum, row) => sum + (row.replies ?? 0),
    0
  )
  const emailsSent = (analytics ?? []).reduce(
    (sum, row) => sum + (row.emails_sent ?? 0),
    0
  )

  // Fetch positive leads (all-time, distinct by email)
  const { data: positiveLeads } = await supabase
    .from('synced_leads')
    .select('email')
    .eq('client_id', clientId)
    .eq('interest_status', 'positive')

  const uniquePositive = new Set(
    (positiveLeads ?? []).map((l) => l.email)
  ).size

  return {
    totalReplies,
    positiveLeads: uniquePositive,
    emailsSent,
  }
}

/**
 * Get count of positive leads with no replies (unanswered).
 * Used for "Reactie vereist" alert.
 */
export async function getUnansweredPositiveCount(
  clientId: string
): Promise<number> {
  const supabase = await createClient()

  const { data } = await supabase
    .from('synced_leads')
    .select('email')
    .eq('client_id', clientId)
    .eq('interest_status', 'positive')
    .eq('email_reply_count', 0)

  return new Set((data ?? []).map((l) => l.email)).size
}

/**
 * Get total distinct contact count across all campaigns.
 */
export async function getContactCount(
  clientId: string
): Promise<number> {
  const supabase = await createClient()

  const { data } = await supabase
    .from('synced_leads')
    .select('email')
    .eq('client_id', clientId)

  return new Set((data ?? []).map((l) => l.email)).size
}

/**
 * Get deduplicated contact list (most recently updated per email).
 */
export async function getContactList(
  clientId: string
): Promise<Contact[]> {
  const supabase = await createClient()

  const { data } = await supabase
    .from('synced_leads')
    .select(
      'email, first_name, last_name, company_name, job_title, industry, lead_status, interest_status, updated_at'
    )
    .eq('client_id', clientId)
    .order('updated_at', { ascending: false })

  if (!data || data.length === 0) return []

  // Deduplicate: keep first occurrence per email (most recent due to ordering)
  const seen = new Set<string>()
  const contacts: Contact[] = []

  for (const row of data) {
    if (!seen.has(row.email)) {
      seen.add(row.email)
      contacts.push({
        email: row.email,
        first_name: row.first_name,
        last_name: row.last_name,
        company_name: row.company_name,
        job_title: row.job_title,
        industry: row.industry,
        lead_status: row.lead_status,
        interest_status: row.interest_status,
      })
    }
  }

  return contacts
}

/**
 * Get lead status breakdown with Dutch labels.
 * Groups by lead_status, counts distinct emails per status.
 */
export async function getContactStatusBreakdown(
  clientId: string
): Promise<StatusBreakdown[]> {
  const supabase = await createClient()

  const { data } = await supabase
    .from('synced_leads')
    .select('email, lead_status')
    .eq('client_id', clientId)

  if (!data || data.length === 0) return []

  // Group by lead_status, count distinct emails
  const groups = new Map<string, Set<string>>()

  for (const row of data) {
    const status = row.lead_status ?? 'unknown'
    if (!groups.has(status)) {
      groups.set(status, new Set())
    }
    groups.get(status)!.add(row.email)
  }

  return Array.from(groups.entries()).map(([status, emails]) => ({
    status: LEAD_STATUS_LABELS[status] ?? status,
    count: emails.size,
  }))
}

/**
 * Get industry breakdown (top 10).
 */
export async function getIndustryBreakdown(
  clientId: string
): Promise<NameValue[]> {
  const supabase = await createClient()

  const { data } = await supabase
    .from('synced_leads')
    .select('email, industry')
    .eq('client_id', clientId)

  if (!data || data.length === 0) return []

  return countDistinctByField(data, 'industry', 'email', 'Onbekend')
}

/**
 * Get job title breakdown (top 10).
 */
export async function getJobTitleBreakdown(
  clientId: string
): Promise<NameValue[]> {
  const supabase = await createClient()

  const { data } = await supabase
    .from('synced_leads')
    .select('email, job_title')
    .eq('client_id', clientId)

  if (!data || data.length === 0) return []

  return countDistinctByField(data, 'job_title', 'email', 'Onbekend')
}

/**
 * Get positive lead patterns: industry and job title breakdown
 * for leads with interest_status = 'positive'.
 * Shows ICP patterns among leads that responded positively.
 */
export async function getPositiveLeadPatterns(
  clientId: string
): Promise<PositiveLeadPatterns> {
  const supabase = await createClient()

  const { data } = await supabase
    .from('synced_leads')
    .select('email, industry, job_title')
    .eq('client_id', clientId)
    .eq('interest_status', 'positive')

  if (!data || data.length === 0) {
    return { industries: [], jobTitles: [] }
  }

  return {
    industries: countDistinctByField(data, 'industry', 'email', 'Onbekend'),
    jobTitles: countDistinctByField(data, 'job_title', 'email', 'Onbekend'),
  }
}
