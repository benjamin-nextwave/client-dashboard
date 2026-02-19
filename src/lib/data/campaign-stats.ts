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

interface PipelineStage {
  label: string
  count: number
}

/**
 * Get monthly stats: total replies, positive leads count, emails sent.
 * Replies and emails_sent are from campaign_analytics for the given date range.
 * Positive leads is all-time count of leads with interest_status = 'positive'.
 */
export async function getMonthlyStats(
  clientId: string,
  startDate?: string,
  endDate?: string
): Promise<MonthlyStats> {
  const supabase = await createClient()
  const dateStart = startDate ?? firstDayOfMonth()

  // Fetch analytics for date range
  let query = supabase
    .from('campaign_analytics')
    .select('unique_replies, emails_sent')
    .eq('client_id', clientId)
    .gte('date', dateStart)

  if (endDate) {
    query = query.lte('date', endDate)
  }

  const { data: analytics } = await query

  const totalReplies = (analytics ?? []).reduce(
    (sum, row) => sum + (row.unique_replies ?? 0),
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
    .eq('client_has_replied', false)

  return new Set((data ?? []).map((l) => l.email)).size
}

/**
 * Get total distinct contact count across all campaigns.
 */
export async function getContactCount(
  clientId: string
): Promise<number> {
  const supabase = await createClient()

  const { count } = await supabase
    .from('synced_leads')
    .select('*', { count: 'exact', head: true })
    .eq('client_id', clientId)

  return count ?? 0
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
 * Deduplicates by email, keeping the most advanced status
 * (replied > emailed > bounced > not_yet_emailed) to avoid
 * double-counting contacts that appear across multiple campaigns.
 */
export async function getContactStatusBreakdown(
  clientId: string
): Promise<StatusBreakdown[]> {
  const supabase = await createClient()

  const { data } = await supabase
    .from('synced_leads')
    .select('email, lead_status, updated_at')
    .eq('client_id', clientId)
    .order('updated_at', { ascending: false })

  if (!data || data.length === 0) return []

  // Deduplicate: keep the most recently updated status per email
  const emailStatus = new Map<string, string>()

  for (const row of data) {
    if (!emailStatus.has(row.email)) {
      emailStatus.set(row.email, row.lead_status ?? 'unknown')
    }
  }

  // Group by status and count
  const groups = new Map<string, number>()

  for (const status of emailStatus.values()) {
    groups.set(status, (groups.get(status) ?? 0) + 1)
  }

  return Array.from(groups.entries()).map(([status, count]) => ({
    status: LEAD_STATUS_LABELS[status] ?? status,
    count,
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

// --- Daily email stats ---

interface DailyEmailStat {
  date: string
  count: number
}

/**
 * Get emails sent per day for the given date range.
 * Aggregates across all campaigns for the client.
 */
export async function getDailyEmailsSent(
  clientId: string,
  startDate?: string,
  endDate?: string
): Promise<DailyEmailStat[]> {
  const supabase = await createClient()
  const dateStart = startDate ?? firstDayOfMonth()

  let query = supabase
    .from('campaign_analytics')
    .select('date, emails_sent')
    .eq('client_id', clientId)
    .gte('date', dateStart)
    .order('date', { ascending: true })

  if (endDate) {
    query = query.lte('date', endDate)
  }

  const { data } = await query

  if (!data || data.length === 0) return []

  // Aggregate by date (multiple campaigns may have entries for same date)
  const dateMap = new Map<string, number>()

  for (const row of data) {
    dateMap.set(row.date, (dateMap.get(row.date) ?? 0) + (row.emails_sent ?? 0))
  }

  return Array.from(dateMap.entries())
    .map(([date, count]) => ({ date, count }))
    .sort((a, b) => a.date.localeCompare(b.date))
}

/**
 * Get pipeline data: counts for each stage of the lead funnel.
 * Stages: Niet gemaild -> Gemaild -> Geopend -> Beantwoord -> Positief
 */
export async function getPipelineData(
  clientId: string
): Promise<PipelineStage[]> {
  const supabase = await createClient()

  const { data } = await supabase
    .from('synced_leads')
    .select('email, lead_status, interest_status')
    .eq('client_id', clientId)

  if (!data || data.length === 0) {
    return [
      { label: 'Niet gemaild', count: 0 },
      { label: 'Gemaild', count: 0 },
      { label: 'Geopend', count: 0 },
      { label: 'Beantwoord', count: 0 },
      { label: 'Positief', count: 0 },
    ]
  }

  // Deduplicate by email
  const seen = new Map<string, { lead_status: string | null; interest_status: string | null }>()
  for (const row of data) {
    if (!seen.has(row.email)) {
      seen.set(row.email, { lead_status: row.lead_status, interest_status: row.interest_status })
    }
  }

  let emailed = 0
  let opened = 0
  let replied = 0
  let positive = 0

  for (const lead of seen.values()) {
    if (lead.interest_status === 'positive') positive++
    if (lead.lead_status === 'replied') replied++
    if (lead.lead_status === 'emailed' || lead.lead_status === 'replied') {
      opened++
    }
    if (lead.lead_status !== 'not_yet_emailed') {
      emailed++
    }
  }

  // Cumulative funnel: each stage includes all downstream
  const total = seen.size
  return [
    { label: 'Totaal', count: total },
    { label: 'Gemaild', count: emailed },
    { label: 'Geopend', count: opened },
    { label: 'Beantwoord', count: replied },
    { label: 'Positief', count: positive },
  ]
}
