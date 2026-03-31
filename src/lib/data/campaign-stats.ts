import { createClient } from '@/lib/supabase/server'

// --- Types ---

interface MonthlyStats {
  totalReplies: number
  positiveLeads: number
  emailsSent: number
}

// --- Helper: first day of current month ---

function firstDayOfMonth(): string {
  const now = new Date()
  return `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}-01`
}

// --- Exported query functions ---

/**
 * Get monthly stats: total replies and emails sent from campaign_analytics.
 */
export async function getMonthlyStats(
  clientId: string,
  startDate?: string,
  endDate?: string
): Promise<MonthlyStats> {
  const supabase = await createClient()
  const dateStart = startDate ?? firstDayOfMonth()

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

  return {
    totalReplies,
    positiveLeads: totalReplies,
    emailsSent,
  }
}

/**
 * No longer tracking individual leads — always returns 0.
 */
export async function getUnansweredPositiveCount(
  clientId: string
): Promise<number> {
  void clientId
  return 0
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
