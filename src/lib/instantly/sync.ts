import { createAdminClient } from '@/lib/supabase/admin'
import { getCampaignDailyAnalytics, listLeads } from './client'
import type { InstantlyLead } from './types'

const RATE_LIMIT_DELAY_MS = 500

function delay(ms: number): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, ms))
}

/**
 * Extract a value from payload using case-insensitive key matching.
 * Checks multiple common variants (English + Dutch) for ICP fields.
 */
function extractPayloadField(
  payload: Record<string, unknown>,
  variants: string[]
): string | null {
  for (const variant of variants) {
    const key = Object.keys(payload).find(
      (k) => k.toLowerCase() === variant.toLowerCase()
    )
    if (key && payload[key] != null && String(payload[key]).trim() !== '') {
      return String(payload[key]).trim()
    }
  }
  return null
}

/**
 * Normalize ICP fields from lead payload custom variables.
 */
function normalizeIcpFields(payload: Record<string, unknown>): {
  job_title: string | null
  industry: string | null
  company_size: string | null
} {
  return {
    job_title: extractPayloadField(payload, [
      'Job Title',
      'job_title',
      'Functie',
      'functie',
    ]),
    industry: extractPayloadField(payload, [
      'Industry',
      'industry',
      'Branche',
      'branche',
    ]),
    company_size: extractPayloadField(payload, [
      'Company Size',
      'company_size',
      'Bedrijfsgrootte',
      'bedrijfsgrootte',
    ]),
  }
}

/**
 * Derive lead_status from Instantly lead data.
 */
function deriveLeadStatus(lead: InstantlyLead): string {
  if (lead.email_reply_count > 0) return 'replied'
  if (lead.status_summary?.toLowerCase().includes('bounced')) return 'bounced'
  if (lead.email_open_count > 0 || lead.status === 'contacted') return 'emailed'
  return 'not_yet_emailed'
}

/**
 * Fetch all leads for a campaign using cursor pagination.
 */
async function fetchAllLeads(campaignId: string): Promise<InstantlyLead[]> {
  const allLeads: InstantlyLead[] = []
  let cursor: string | undefined

  do {
    const response = await listLeads(campaignId, {
      limit: 100,
      startingAfter: cursor,
    })

    allLeads.push(...response.items)
    cursor = response.next_starting_after ?? undefined

    if (cursor) {
      await delay(RATE_LIMIT_DELAY_MS)
    }
  } while (cursor)

  return allLeads
}

/**
 * Sync all campaign data for a single client.
 * Fetches campaign IDs from client_campaigns, then for each campaign:
 * 1. Fetches daily analytics and upserts into campaign_analytics
 * 2. Fetches all leads with pagination and upserts into synced_leads
 */
export async function syncClientData(clientId: string): Promise<void> {
  const supabase = createAdminClient()

  // Get campaign IDs for this client
  const { data: campaigns, error: campaignError } = await supabase
    .from('client_campaigns')
    .select('campaign_id')
    .eq('client_id', clientId)

  if (campaignError) {
    throw new Error(`Failed to fetch campaigns for client ${clientId}: ${campaignError.message}`)
  }

  if (!campaigns || campaigns.length === 0) {
    return // No campaigns to sync
  }

  // Date range: last 90 days to today
  const endDate = new Date().toISOString().split('T')[0]
  const startDate = new Date(Date.now() - 90 * 24 * 60 * 60 * 1000)
    .toISOString()
    .split('T')[0]

  for (const { campaign_id: campaignId } of campaigns) {
    // 1. Sync daily analytics
    try {
      const dailyAnalytics = await getCampaignDailyAnalytics(
        campaignId,
        startDate,
        endDate
      )

      if (dailyAnalytics.length > 0) {
        const analyticsRows = dailyAnalytics.map((day) => ({
          client_id: clientId,
          campaign_id: campaignId,
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
          .upsert(analyticsRows, {
            onConflict: 'client_id,campaign_id,date',
          })

        if (analyticsError) {
          console.error(
            `Failed to upsert analytics for campaign ${campaignId}:`,
            analyticsError.message
          )
        }
      }
    } catch (error) {
      console.error(
        `Failed to sync analytics for campaign ${campaignId}:`,
        error
      )
    }

    await delay(RATE_LIMIT_DELAY_MS)

    // 2. Sync leads
    try {
      const leads = await fetchAllLeads(campaignId)

      if (leads.length > 0) {
        const leadRows = leads.map((lead) => {
          const icpFields = normalizeIcpFields(lead.payload ?? {})

          return {
            client_id: clientId,
            instantly_lead_id: lead.id,
            campaign_id: campaignId,
            email: lead.email,
            first_name: lead.first_name,
            last_name: lead.last_name,
            company_name: lead.company_name,
            job_title: icpFields.job_title,
            industry: icpFields.industry,
            company_size: icpFields.company_size,
            website: lead.website,
            phone: lead.phone,
            lead_status: deriveLeadStatus(lead),
            interest_status: null as string | null, // Set from Instantly's classification if available
            sender_account: lead.last_step_from,
            email_sent_count: lead.email_open_count > 0 ? 1 : 0, // Approximate from available data
            email_reply_count: lead.email_reply_count,
            payload: lead.payload,
            last_synced_at: new Date().toISOString(),
            updated_at: new Date().toISOString(),
          }
        })

        // Upsert in batches of 500 to avoid payload limits
        const BATCH_SIZE = 500
        for (let i = 0; i < leadRows.length; i += BATCH_SIZE) {
          const batch = leadRows.slice(i, i + BATCH_SIZE)

          const { error: leadsError } = await supabase
            .from('synced_leads')
            .upsert(batch, {
              onConflict: 'client_id,instantly_lead_id,campaign_id',
            })

          if (leadsError) {
            console.error(
              `Failed to upsert leads batch for campaign ${campaignId}:`,
              leadsError.message
            )
          }
        }
      }
    } catch (error) {
      console.error(
        `Failed to sync leads for campaign ${campaignId}:`,
        error
      )
    }

    await delay(RATE_LIMIT_DELAY_MS)
  }
}

/**
 * Sync data for all clients that have associated campaigns.
 * Processes clients sequentially to respect API rate limits.
 */
export async function syncAllClients(): Promise<void> {
  const supabase = createAdminClient()

  // Get all distinct client IDs that have campaigns
  const { data: clientCampaigns, error } = await supabase
    .from('client_campaigns')
    .select('client_id')

  if (error) {
    throw new Error(`Failed to fetch client campaigns: ${error.message}`)
  }

  if (!clientCampaigns || clientCampaigns.length === 0) {
    return
  }

  // Deduplicate client IDs
  const clientIds = [...new Set(clientCampaigns.map((cc) => cc.client_id))]

  for (const clientId of clientIds) {
    try {
      await syncClientData(clientId)
    } catch (error) {
      console.error(`Failed to sync client ${clientId}:`, error)
    }

    await delay(RATE_LIMIT_DELAY_MS)
  }
}
