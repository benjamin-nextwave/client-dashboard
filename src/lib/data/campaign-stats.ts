import { createClient } from '@/lib/supabase/server'

// --- Types ---

export interface OverviewStats {
  emailsSent: number
  uniqueReplies: number
  bounced: number
  activeCampaigns: number
}

export interface DailyStats {
  date: string
  emailsSent: number
  replies: number
}

// --- Helper ---

function firstDayOfMonth(): string {
  const now = new Date()
  return `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}-01`
}

/**
 * Get overview stats from campaign_analytics for the given date range.
 */
export async function getOverviewStats(
  clientId: string,
  startDate?: string,
  endDate?: string
): Promise<OverviewStats> {
  const supabase = await createClient()
  const dateStart = startDate ?? firstDayOfMonth()

  let query = supabase
    .from('campaign_analytics')
    .select('emails_sent, unique_replies, bounced')
    .eq('client_id', clientId)
    .gte('date', dateStart)

  if (endDate) {
    query = query.lte('date', endDate)
  }

  const { data: analytics } = await query

  const rows = analytics ?? []

  return {
    emailsSent: rows.reduce((sum, r) => sum + (r.emails_sent ?? 0), 0),
    uniqueReplies: rows.reduce((sum, r) => sum + (r.unique_replies ?? 0), 0),
    bounced: rows.reduce((sum, r) => sum + (r.bounced ?? 0), 0),
    activeCampaigns: 0, // Will be set from sync result or separate query
  }
}

/**
 * Get daily stats: emails sent + replies per day.
 * Aggregates across all campaigns for the client.
 */
export async function getDailyStats(
  clientId: string,
  startDate?: string,
  endDate?: string
): Promise<DailyStats[]> {
  const supabase = await createClient()
  const dateStart = startDate ?? firstDayOfMonth()

  let query = supabase
    .from('campaign_analytics')
    .select('date, emails_sent, unique_replies')
    .eq('client_id', clientId)
    .gte('date', dateStart)
    .order('date', { ascending: true })

  if (endDate) {
    query = query.lte('date', endDate)
  }

  const { data } = await query

  if (!data || data.length === 0) return []

  // Aggregate by date (multiple campaigns may have entries for same date)
  const dateMap = new Map<string, { emailsSent: number; replies: number }>()

  for (const row of data) {
    const existing = dateMap.get(row.date) ?? { emailsSent: 0, replies: 0 }
    existing.emailsSent += row.emails_sent ?? 0
    existing.replies += row.unique_replies ?? 0
    dateMap.set(row.date, existing)
  }

  return Array.from(dateMap.entries())
    .map(([date, stats]) => ({ date, ...stats }))
    .sort((a, b) => a.date.localeCompare(b.date))
}
