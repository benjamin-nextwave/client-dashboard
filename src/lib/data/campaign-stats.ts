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

// --- Verzendbereik: mailboxen en domeinen ------------------------------------

export interface MailboxEntry {
  address: string
  domain: string
  /** Namen van de campagnes waarvandaan dit adres verstuurd heeft. */
  campaigns: string[]
}

export interface SendingFootprint {
  mailboxes: number
  domains: number
  entries: MailboxEntry[]
}

/**
 * Verzamelt de mailboxen waarvandaan voor deze klant verstuurd is, met de
 * campagnes waaraan ze gekoppeld zijn, en de domeinen erachter.
 *
 * Afgeleid uit wat er al in de database staat: synced_leads koppelt een
 * sender_account aan een campaign_id, cached_emails vult adressen aan die
 * alleen in de mailcache voorkomen. Instantly heeft wel een accounts-endpoint,
 * maar die koppeling mag niet uitgebreid worden — dit telt dus mailboxen die
 * daadwerkelijk gebruikt zijn, niet alles wat in Instantly gekoppeld staat.
 *
 * Alle queries lopen via de request-client, zodat RLS de isolatie per klant
 * afdwingt.
 */
export async function getSendingFootprint(
  clientId: string
): Promise<SendingFootprint> {
  const supabase = await createClient()

  const [campaignsResult, leadsResult, emailsResult] = await Promise.all([
    supabase
      .from('client_campaigns')
      .select('campaign_id, campaign_name')
      .eq('client_id', clientId),
    supabase
      .from('synced_leads')
      .select('sender_account, campaign_id')
      .eq('client_id', clientId)
      .not('sender_account', 'is', null),
    supabase
      .from('cached_emails')
      .select('sender_account, from_address, is_reply')
      .eq('client_id', clientId),
  ])

  const campaignNames = new Map<string, string>()
  for (const row of campaignsResult.data ?? []) {
    campaignNames.set(row.campaign_id, row.campaign_name)
  }

  // adres -> set van campagnenamen
  const byAddress = new Map<string, Set<string>>()

  function add(value: string | null | undefined, campaignId?: string | null) {
    if (!value) return
    const address = value.trim().toLowerCase()
    if (!address.includes('@')) return

    const campaigns = byAddress.get(address) ?? new Set<string>()
    const name = campaignId ? campaignNames.get(campaignId) : undefined
    if (name) campaigns.add(name)
    byAddress.set(address, campaigns)
  }

  for (const row of leadsResult.data ?? []) {
    add(row.sender_account, row.campaign_id)
  }
  for (const row of emailsResult.data ?? []) {
    // cached_emails kent geen campaign_id, dus deze adressen komen zonder
    // campagne binnen tenzij synced_leads ze al gekoppeld had.
    add(row.sender_account)
    // Bij een uitgaande mail is from_address de verzendende mailbox; bij een
    // reply is het de lead zelf, dus die slaan we over.
    if (!row.is_reply) add(row.from_address)
  }

  const entries: MailboxEntry[] = Array.from(byAddress.entries())
    .map(([address, campaigns]) => ({
      address,
      domain: address.split('@')[1] ?? '',
      campaigns: Array.from(campaigns).sort((a, b) => a.localeCompare(b, 'nl')),
    }))
    .sort((a, b) => a.address.localeCompare(b.address, 'nl'))

  const domains = new Set(entries.map((e) => e.domain).filter(Boolean))

  return { mailboxes: entries.length, domains: domains.size, entries }
}
