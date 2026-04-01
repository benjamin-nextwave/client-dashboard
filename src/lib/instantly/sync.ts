import { createAdminClient } from '@/lib/supabase/admin'
import { logError } from '@/lib/errors/log-error'
import { getCampaignDailyAnalytics, listCampaigns } from './client'

const RATE_LIMIT_DELAY_MS = 1000
const ANALYTICS_DAYS = 365

function delay(ms: number): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, ms))
}

/**
 * Get the client's Instantly API key from the database.
 */
async function getClientApiKey(
  supabase: ReturnType<typeof createAdminClient>,
  clientId: string
): Promise<string | null> {
  const { data } = await supabase
    .from('clients')
    .select('instantly_api_key')
    .eq('id', clientId)
    .single()

  return data?.instantly_api_key ?? null
}

/**
 * Fetch all campaign IDs from the client's Instantly workspace.
 */
async function getAllWorkspaceCampaigns(apiKey: string): Promise<{ id: string; name: string; status: number }[]> {
  const campaigns: { id: string; name: string; status: number }[] = []
  let startingAfter: string | undefined

  while (true) {
    const response = await listCampaigns({
      limit: 100,
      startingAfter,
      apiKey,
    })

    for (const campaign of response.items) {
      campaigns.push({ id: campaign.id, name: campaign.name, status: campaign.status })
    }

    if (!response.next_starting_after) break
    startingAfter = response.next_starting_after
    await delay(RATE_LIMIT_DELAY_MS)
  }

  return campaigns
}

/**
 * Sync campaign analytics for a single client.
 *
 * 1. Fetches ALL campaigns from the client's Instantly workspace using their API key
 * 2. Clears old analytics for this client
 * 3. Fetches daily analytics for each campaign and stores in campaign_analytics
 *
 * Returns summary stats for immediate use.
 */
export async function syncClientData(clientId: string): Promise<{
  campaignCount: number
  activeCampaigns: number
} | null> {
  const supabase = createAdminClient()

  const apiKey = await getClientApiKey(supabase, clientId)
  if (!apiKey) {
    console.log(`syncClientData: client=${clientId} has no API key — skipping`)
    return null
  }

  // Fetch all campaigns from the client's workspace
  const campaigns = await getAllWorkspaceCampaigns(apiKey)

  if (campaigns.length === 0) {
    console.log(`syncClientData: client=${clientId} has no campaigns in workspace`)
    return { campaignCount: 0, activeCampaigns: 0 }
  }

  const activeCampaigns = campaigns.filter((c) => c.status === 1).length

  console.log(
    `syncClientData: client=${clientId}, ${campaigns.length} campaign(s), ${activeCampaigns} active`
  )

  // Clear old analytics for this client to prevent stale data
  await supabase
    .from('campaign_analytics')
    .delete()
    .eq('client_id', clientId)

  const endDate = new Date().toISOString().split('T')[0]
  const startDate = new Date(Date.now() - ANALYTICS_DAYS * 24 * 60 * 60 * 1000)
    .toISOString()
    .split('T')[0]

  for (const campaign of campaigns) {
    try {
      const dailyAnalytics = await getCampaignDailyAnalytics(campaign.id, startDate, endDate, apiKey)

      if (dailyAnalytics.length > 0) {
        const analyticsRows = dailyAnalytics.map((day) => ({
          client_id: clientId,
          campaign_id: campaign.id,
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
          console.error(`Failed to insert analytics for campaign ${campaign.id}:`, analyticsError.message)
          await logError({
            clientId,
            errorType: 'sync_error',
            message: `Analytics insert mislukt voor campagne ${campaign.id}`,
            details: { campaignId: campaign.id, error: analyticsError.message },
          })
        }
      }
    } catch (error) {
      console.error(`Failed to sync analytics for campaign ${campaign.id}:`, error)
      await logError({
        clientId,
        errorType: 'api_failure',
        message: `Sync analytics mislukt voor campagne ${campaign.id}`,
        details: { campaignId: campaign.id, error: error instanceof Error ? error.message : String(error) },
      })
    }

    await delay(RATE_LIMIT_DELAY_MS)
  }

  console.log(`syncClientData: DONE for client ${clientId}`)

  return { campaignCount: campaigns.length, activeCampaigns }
}
