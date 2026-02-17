import { createAdminClient } from '@/lib/supabase/admin'

// --- Types ---

export interface CampaignStats {
  campaignId: string
  campaignName: string
  emailsSentYesterday: number
  contactsRemaining: number
}

export interface ClientOverview {
  id: string
  companyName: string
  primaryColor: string | null
  logoUrl: string | null
  isRecruitment: boolean
  password: string | null
  createdAt: string
  campaigns: CampaignStats[]
  totalLeads: number
  lastSyncedAt: string | null
  // Computed
  totalEmailsYesterday: number
  hasLowEmails: boolean
  hasLowContacts: boolean
  hasIssues: boolean
}

// Thresholds
const MIN_EMAILS_YESTERDAY = 74
const MIN_CONTACTS_REMAINING = 180

/**
 * Get full client overview data for the admin dashboard.
 * Includes per-campaign stats for yesterday's emails and remaining contacts.
 */
export async function getClientOverviews(): Promise<ClientOverview[]> {
  const supabase = createAdminClient()

  // Get yesterday's date in UTC (analytics are stored by date)
  const yesterday = new Date()
  yesterday.setDate(yesterday.getDate() - 1)
  const yesterdayStr = yesterday.toISOString().split('T')[0]

  // Fetch all data in parallel
  const [
    clientsResult,
    campaignsResult,
    analyticsResult,
    leadsResult,
    syncResult,
  ] = await Promise.all([
    supabase
      .from('clients')
      .select('id, company_name, primary_color, logo_url, is_recruitment, password, created_at')
      .order('company_name', { ascending: true }),
    supabase
      .from('client_campaigns')
      .select('client_id, campaign_id, campaign_name'),
    supabase
      .from('campaign_analytics')
      .select('client_id, campaign_id, emails_sent')
      .eq('date', yesterdayStr),
    supabase
      .from('synced_leads')
      .select('client_id, campaign_id, email, lead_status'),
    supabase
      .from('campaign_analytics')
      .select('client_id, last_synced_at')
      .order('last_synced_at', { ascending: false }),
  ])

  const clients = clientsResult.data ?? []
  const campaigns = campaignsResult.data ?? []
  const analytics = analyticsResult.data ?? []
  const leads = leadsResult.data ?? []
  const syncs = syncResult.data ?? []

  // Build analytics map: campaignId -> emails_sent yesterday
  const emailsYesterdayMap = new Map<string, number>()
  for (const row of analytics) {
    const key = `${row.client_id}:${row.campaign_id}`
    emailsYesterdayMap.set(key, (emailsYesterdayMap.get(key) ?? 0) + (row.emails_sent ?? 0))
  }

  // Build contacts remaining map: campaignId -> count of not_yet_emailed (deduplicated by email)
  const contactsMap = new Map<string, Set<string>>()
  const totalLeadsMap = new Map<string, Set<string>>()
  for (const row of leads) {
    // Total leads per client
    if (!totalLeadsMap.has(row.client_id)) {
      totalLeadsMap.set(row.client_id, new Set())
    }
    totalLeadsMap.get(row.client_id)!.add(row.email)

    // Contacts remaining per campaign
    if (row.lead_status === 'not_yet_emailed') {
      const key = `${row.client_id}:${row.campaign_id}`
      if (!contactsMap.has(key)) {
        contactsMap.set(key, new Set())
      }
      contactsMap.get(key)!.add(row.email)
    }
  }

  // Build last synced map per client
  const lastSyncMap = new Map<string, string>()
  for (const row of syncs) {
    if (row.last_synced_at && !lastSyncMap.has(row.client_id)) {
      lastSyncMap.set(row.client_id, row.last_synced_at)
    }
  }

  // Build client overviews
  return clients.map((client) => {
    const clientCampaigns = campaigns.filter((c) => c.client_id === client.id)

    const campaignStats: CampaignStats[] = clientCampaigns.map((campaign) => {
      const key = `${client.id}:${campaign.campaign_id}`
      return {
        campaignId: campaign.campaign_id,
        campaignName: campaign.campaign_name || 'Naamloze campagne',
        emailsSentYesterday: emailsYesterdayMap.get(key) ?? 0,
        contactsRemaining: contactsMap.get(key)?.size ?? 0,
      }
    })

    const totalEmailsYesterday = campaignStats.reduce(
      (sum, c) => sum + c.emailsSentYesterday, 0
    )

    const hasLowEmails = clientCampaigns.length > 0 && totalEmailsYesterday < MIN_EMAILS_YESTERDAY
    const hasLowContacts = campaignStats.some(
      (c) => c.contactsRemaining < MIN_CONTACTS_REMAINING
    )

    return {
      id: client.id,
      companyName: client.company_name,
      primaryColor: client.primary_color,
      logoUrl: client.logo_url,
      isRecruitment: client.is_recruitment,
      password: client.password ?? null,
      createdAt: client.created_at,
      campaigns: campaignStats,
      totalLeads: totalLeadsMap.get(client.id)?.size ?? 0,
      lastSyncedAt: lastSyncMap.get(client.id) ?? null,
      totalEmailsYesterday,
      hasLowEmails,
      hasLowContacts,
      hasIssues: hasLowEmails || hasLowContacts,
    }
  })
}

/**
 * Check all clients for issues and send webhook alerts.
 * Called by the morning cron job.
 */
export async function checkAndAlertClientIssues(): Promise<{
  alerted: string[]
  errors: string[]
}> {
  const WEBHOOK_URL = 'https://hook.eu2.make.com/e4zu7hn12gktfmmy9yd2a087nwinc20n'

  const clients = await getClientOverviews()
  const alerted: string[] = []
  const errors: string[] = []

  for (const client of clients) {
    if (!client.hasIssues || client.campaigns.length === 0) continue

    const problems: string[] = []

    if (client.hasLowEmails) {
      problems.push(
        `Te weinig e-mails verzonden gisteren: ${client.totalEmailsYesterday} (minimum: ${MIN_EMAILS_YESTERDAY})`
      )
    }

    const lowContactCampaigns = client.campaigns.filter(
      (c) => c.contactsRemaining < MIN_CONTACTS_REMAINING
    )
    if (lowContactCampaigns.length > 0) {
      for (const campaign of lowContactCampaigns) {
        problems.push(
          `Contacten opraken in "${campaign.campaignName}": ${campaign.contactsRemaining} over (minimum: ${MIN_CONTACTS_REMAINING})`
        )
      }
    }

    try {
      const res = await fetch(WEBHOOK_URL, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          client_name: client.companyName,
          client_id: client.id,
          problems,
          total_emails_yesterday: client.totalEmailsYesterday,
          campaigns: client.campaigns.map((c) => ({
            name: c.campaignName,
            emails_yesterday: c.emailsSentYesterday,
            contacts_remaining: c.contactsRemaining,
          })),
          timestamp: new Date().toISOString(),
        }),
      })

      if (!res.ok) {
        errors.push(`Webhook failed for ${client.companyName}: ${res.status}`)
      } else {
        alerted.push(client.companyName)
      }
    } catch (err) {
      errors.push(
        `Webhook error for ${client.companyName}: ${err instanceof Error ? err.message : String(err)}`
      )
    }
  }

  return { alerted, errors }
}
