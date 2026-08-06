import { createAdminClient } from '@/lib/supabase/admin'
import { logError } from '@/lib/errors/log-error'
import { getCampaignDailyAnalytics } from './client'

const RATE_LIMIT_DELAY_MS = 1000
const ANALYTICS_DAYS = 365

function delay(ms: number): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, ms))
}

interface LinkedCampaign {
  instantlyCampaignId: string
  name: string
}

/**
 * Resolve the Instantly campaigns linked to a client.
 *
 * All clients now share ONE Instantly workspace, so we can no longer sync
 * "every campaign in the workspace". Instead we sync only the campaigns the
 * operator has explicitly linked to this client via the "Lead-inbox campagnes"
 * section (clients.lead_inbox_customer_id -> campaigns.customer_id).
 *
 * Only campaigns marked as active are synced.
 */
async function getLinkedCampaigns(
  supabase: ReturnType<typeof createAdminClient>,
  clientId: string
): Promise<LinkedCampaign[]> {
  const { data: client } = await supabase
    .from('clients')
    .select('lead_inbox_customer_id')
    .eq('id', clientId)
    .single()

  if (!client?.lead_inbox_customer_id) return []

  const { data: rows } = await supabase
    .from('campaigns')
    .select('instantly_campaign_id, name, is_active')
    .eq('customer_id', client.lead_inbox_customer_id)
    .eq('is_active', true)

  return (rows ?? [])
    .filter((r) => r.instantly_campaign_id)
    .map((r) => ({ instantlyCampaignId: r.instantly_campaign_id, name: r.name }))
}

/**
 * Sync campaign analytics for a single client.
 *
 * 1. Resolves the campaigns linked to this client (shared workspace, filtered
 *    by campaign id — see getLinkedCampaigns).
 * 2. Clears old analytics for this client.
 * 3. Fetches daily analytics for each linked campaign from the shared
 *    Instantly workspace and stores them in campaign_analytics.
 *
 * Returns summary stats for immediate use, or null if the shared API key is
 * not configured.
 */
export async function syncClientData(clientId: string): Promise<{
  campaignCount: number
  activeCampaigns: number
} | null> {
  const supabase = createAdminClient()

  const apiKey = process.env.INSTANTLY_API_KEY
  if (!apiKey) {
    console.log(`syncClientData: no INSTANTLY_API_KEY configured — skipping`)
    return null
  }

  const campaigns = await getLinkedCampaigns(supabase, clientId)

  // Always clear old analytics so removing/deactivating a campaign also
  // removes its stale data from the dashboard.
  await supabase.from('campaign_analytics').delete().eq('client_id', clientId)

  if (campaigns.length === 0) {
    console.log(`syncClientData: client=${clientId} has no active linked campaigns`)
    return { campaignCount: 0, activeCampaigns: 0 }
  }

  console.log(
    `syncClientData: client=${clientId}, ${campaigns.length} linked campaign(s)`
  )

  const endDate = new Date().toISOString().split('T')[0]
  const startDate = new Date(Date.now() - ANALYTICS_DAYS * 24 * 60 * 60 * 1000)
    .toISOString()
    .split('T')[0]

  for (const campaign of campaigns) {
    try {
      const dailyAnalytics = await getCampaignDailyAnalytics(
        campaign.instantlyCampaignId,
        startDate,
        endDate,
        apiKey
      )

      if (dailyAnalytics.length > 0) {
        const analyticsRows = dailyAnalytics.map((day) => ({
          client_id: clientId,
          campaign_id: campaign.instantlyCampaignId,
          date: day.date,
          emails_sent: day.sent,
          leads_contacted: day.contacted,
          replies: day.replies,
          unique_replies: day.unique_replies,
          bounced: day.bounced,
          opened: day.opened,
          clicked: day.clicked,
          last_synced_at: new Date().toISOString(),
        }))

        const { error: analyticsError } = await supabase
          .from('campaign_analytics')
          .insert(analyticsRows)

        if (analyticsError) {
          console.error(`Failed to insert analytics for campaign ${campaign.instantlyCampaignId}:`, analyticsError.message)
          await logError({
            clientId,
            errorType: 'sync_error',
            message: `Analytics insert mislukt voor campagne ${campaign.instantlyCampaignId}`,
            details: { campaignId: campaign.instantlyCampaignId, error: analyticsError.message },
          })
        }
      }
    } catch (error) {
      console.error(`Failed to sync analytics for campaign ${campaign.instantlyCampaignId}:`, error)
      await logError({
        clientId,
        errorType: 'api_failure',
        message: `Sync analytics mislukt voor campagne ${campaign.instantlyCampaignId}`,
        details: { campaignId: campaign.instantlyCampaignId, error: error instanceof Error ? error.message : String(error) },
      })
    }

    await delay(RATE_LIMIT_DELAY_MS)
  }

  console.log(`syncClientData: DONE for client ${clientId}`)

  return { campaignCount: campaigns.length, activeCampaigns: campaigns.length }
}
