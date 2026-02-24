import { createAdminClient } from '@/lib/supabase/admin'
import { logError } from '@/lib/errors/log-error'
import { getCampaignDailyAnalytics, listLeads, listEmails, getCampaignsForEmail } from './client'

const RATE_LIMIT_DELAY_MS = 200

// How many days of analytics to fetch on incremental syncs
const ANALYTICS_DAYS_INCREMENTAL = 7
// How many days of analytics to fetch on full syncs (first sync or weekly refresh)
const ANALYTICS_DAYS_FULL = 365
// Force a full sync (all emails + leads) every 6 hours per campaign
const FULL_SYNC_INTERVAL_MS = 6 * 60 * 60 * 1000
// Rate limit for getCampaignsForEmail verification calls (max 2/sec)
const VERIFY_DELAY_MS = 500

function delay(ms: number): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, ms))
}

/**
 * Map Instantly interest status to our interest_status string.
 * i_status / lt_interest_status: -1 = not interested, 0 = neutral, 1 = interested
 * Uses loose equality (==) because the API may return strings instead of numbers.
 */
function mapInterestStatus(iStatus: number | string | null | undefined): string | null {
  if (iStatus == null) return null
  // eslint-disable-next-line eqeqeq
  if (iStatus == 1) return 'positive'
  // eslint-disable-next-line eqeqeq
  if (iStatus == 0) return 'neutral'
  // eslint-disable-next-line eqeqeq
  if (iStatus == -1) return 'negative'
  // Unknown value — log it so we can debug
  console.warn(`mapInterestStatus: unexpected value ${JSON.stringify(iStatus)} (type: ${typeof iStatus})`)
  return null
}

/**
 * Get or create sync state for a campaign.
 */
async function getSyncState(
  supabase: ReturnType<typeof createAdminClient>,
  clientId: string,
  campaignId: string
) {
  const { data } = await supabase
    .from('sync_state')
    .select('*')
    .eq('client_id', clientId)
    .eq('campaign_id', campaignId)
    .single()

  return data as {
    last_email_timestamp: string | null
    last_lead_count: number
    last_analytics_sync: string | null
    last_full_sync: string | null
  } | null
}

/**
 * Update sync state after a successful sync.
 */
async function updateSyncState(
  supabase: ReturnType<typeof createAdminClient>,
  clientId: string,
  campaignId: string,
  updates: {
    last_email_timestamp?: string | null
    last_lead_count?: number
    last_analytics_sync?: string | null
    last_full_sync?: string | null
  }
) {
  await supabase
    .from('sync_state')
    .upsert(
      {
        client_id: clientId,
        campaign_id: campaignId,
        ...updates,
        updated_at: new Date().toISOString(),
      },
      { onConflict: 'client_id,campaign_id' }
    )
}

/**
 * Determine if a full sync is needed (vs incremental).
 * Full sync when: first sync ever, or last full sync was >24h ago.
 */
function needsFullSync(syncState: { last_full_sync: string | null } | null): boolean {
  if (!syncState || !syncState.last_full_sync) return true
  const age = Date.now() - new Date(syncState.last_full_sync).getTime()
  return age > FULL_SYNC_INTERVAL_MS
}

/**
 * Sync all campaign data for a single client.
 * Syncs analytics + updates existing leads. Does NOT discover new leads (webhook does that).
 *
 * 1. Per campaign: sync analytics
 * 2. Per existing lead: fetch latest status from Instantly, update in DB
 * 3. Remove leads that are no longer positive
 */
export async function syncClientData(clientId: string, forceFullSync = false): Promise<void> {
  const supabase = createAdminClient()

  const { data: campaigns, error: campaignError } = await supabase
    .from('client_campaigns')
    .select('campaign_id')
    .eq('client_id', clientId)

  if (campaignError) {
    throw new Error(`Failed to fetch campaigns for client ${clientId}: ${campaignError.message}`)
  }

  if (!campaigns || campaigns.length === 0) return

  console.log(
    `syncClientData: client=${clientId}, ${campaigns.length} campaign(s), forceFullSync=${forceFullSync}`
  )

  // 1. Sync analytics per campaign
  for (const { campaign_id: campaignId } of campaigns) {
    const syncState = await getSyncState(supabase, clientId, campaignId)
    const isFullSync = forceFullSync || needsFullSync(syncState)
    const analyticsDays = isFullSync ? ANALYTICS_DAYS_FULL : ANALYTICS_DAYS_INCREMENTAL
    const endDate = new Date().toISOString().split('T')[0]
    const startDate = new Date(Date.now() - analyticsDays * 24 * 60 * 60 * 1000)
      .toISOString()
      .split('T')[0]

    try {
      const dailyAnalytics = await getCampaignDailyAnalytics(campaignId, startDate, endDate)

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
          .upsert(analyticsRows, { onConflict: 'client_id,campaign_id,date' })

        if (analyticsError) {
          console.error(`Failed to upsert analytics for campaign ${campaignId}:`, analyticsError.message)
          await logError({
            clientId,
            errorType: 'sync_error',
            message: `Analytics upsert mislukt voor campagne ${campaignId}`,
            details: { campaignId, error: analyticsError.message },
          })
        }
      }
    } catch (error) {
      console.error(`Failed to sync analytics for campaign ${campaignId}:`, error)
      await logError({
        clientId,
        errorType: 'api_failure',
        message: `Sync analytics mislukt voor campagne ${campaignId}`,
        details: { campaignId, error: error instanceof Error ? error.message : String(error) },
      })
    }

    await updateSyncState(supabase, clientId, campaignId, {
      last_analytics_sync: new Date().toISOString(),
      ...(isFullSync ? { last_full_sync: new Date().toISOString() } : {}),
    })

    await delay(RATE_LIMIT_DELAY_MS)
  }

  // 2. Update existing leads (same logic as syncInboxData)
  await updateExistingLeads(clientId, supabase)
}

/**
 * Lightweight inbox-only sync for a single client.
 * Only updates existing leads — does NOT discover new leads (webhook does that).
 * Skips analytics entirely. Used by "Verversen" button and 15-minute cron.
 *
 * For each existing lead in synced_leads:
 * 1. Fetch latest emails from Instantly
 * 2. Update interest_status, reply data, email counts
 * 3. Remove leads that are no longer positive
 */
export async function syncInboxData(clientId: string): Promise<void> {
  const supabase = createAdminClient()
  await updateExistingLeads(clientId, supabase)
}

/**
 * Core logic: update all existing synced_leads for a client.
 * Per lead: check interest_status via getCampaignsForEmail + listLeads,
 * update email cache, remove leads no longer positive.
 */
async function updateExistingLeads(
  clientId: string,
  supabase: ReturnType<typeof createAdminClient>
): Promise<void> {
  // Get all existing leads for this client
  const { data: existingLeads, error: leadsError } = await supabase
    .from('synced_leads')
    .select('id, email, campaign_id, interest_status')
    .eq('client_id', clientId)

  if (leadsError) {
    throw new Error(`Failed to fetch existing leads for client ${clientId}: ${leadsError.message}`)
  }

  if (!existingLeads || existingLeads.length === 0) {
    console.log(`updateExistingLeads: client=${clientId} has no leads — nothing to update`)
    return
  }

  // Deduplicate by email (a lead may have multiple campaign rows)
  const uniqueEmails = [...new Set(existingLeads.map((l) => l.email.toLowerCase()))]

  console.log(
    `updateExistingLeads: client=${clientId}, ${existingLeads.length} rows, ` +
    `${uniqueEmails.length} unique emails`
  )

  let updated = 0
  let removed = 0
  let errors = 0

  for (let i = 0; i < uniqueEmails.length; i++) {
    const email = uniqueEmails[i]
    if (i > 0) await delay(VERIFY_DELAY_MS)

    // Verify this lead is still in the correct campaigns
    let instantlyCampaignIds: string[]
    try {
      instantlyCampaignIds = await getCampaignsForEmail(email)
    } catch (error) {
      console.error(`updateExistingLeads: getCampaignsForEmail failed for ${email}:`, error)
      errors++
      continue
    }

    const instantlySet = new Set(instantlyCampaignIds)

    // Get this lead's rows for this client
    const leadRows = existingLeads.filter((l) => l.email.toLowerCase() === email)

    for (const row of leadRows) {
      if (!instantlySet.has(row.campaign_id)) {
        // Lead no longer in this campaign — delete
        await supabase.from('synced_leads').delete().eq('id', row.id)
        console.log(`updateExistingLeads: removed ${email} from campaign ${row.campaign_id} (not in Instantly)`)
        removed++
        continue
      }

      // Lead still valid — fetch fresh data via listLeads(search=email)
      try {
        const response = await listLeads(row.campaign_id, { search: email, limit: 10 })
        const lead = response.items.find((l) => l.email.toLowerCase().trim() === email)

        if (lead) {
          const interestStatus = mapInterestStatus(lead.lt_interest_status)

          // If lead is no longer positive, remove from inbox
          if (interestStatus !== 'positive' && row.interest_status === 'positive') {
            await supabase.from('synced_leads').delete().eq('id', row.id)
            console.log(`updateExistingLeads: removed ${email} — no longer positive (now: ${interestStatus})`)
            removed++
            continue
          }

          // Update the lead with fresh data
          await supabase
            .from('synced_leads')
            .update({
              interest_status: interestStatus ?? row.interest_status,
              email_reply_count: lead.email_reply_count,
              lead_status: lead.email_reply_count > 0 ? 'replied' : 'emailed',
              last_synced_at: new Date().toISOString(),
              updated_at: new Date().toISOString(),
            })
            .eq('id', row.id)

          updated++
        }
      } catch (error) {
        console.error(`updateExistingLeads: listLeads failed for ${email}:`, error)
        errors++
      }

      await delay(RATE_LIMIT_DELAY_MS)
    }

    // Refresh cached emails for this lead
    try {
      const emailResponse = await listEmails({ lead: email, limit: 100 })
      if (emailResponse.items.length > 0) {
        const cacheRows = emailResponse.items.map((e) => ({
          client_id: clientId,
          instantly_email_id: e.id,
          thread_id: e.thread_id,
          lead_email: e.lead?.toLowerCase() ?? email,
          from_address: e.from_address_email,
          to_address: e.to_address_email_list,
          subject: e.subject,
          body_text: e.body?.text ?? null,
          body_html: e.body?.html ?? null,
          is_reply: e.ue_type === 2,
          sender_account: e.ue_type === 2 ? null : e.from_address_email,
          email_timestamp: e.timestamp_email ?? e.timestamp_created,
        }))

        await supabase
          .from('cached_emails')
          .upsert(cacheRows, { onConflict: 'instantly_email_id' })

        // Update reply data on synced_leads
        const latestReply = emailResponse.items
          .filter((e) => e.ue_type === 2)
          .sort((a, b) =>
            (b.timestamp_email ?? b.timestamp_created).localeCompare(
              a.timestamp_email ?? a.timestamp_created
            )
          )[0]

        if (latestReply) {
          await supabase
            .from('synced_leads')
            .update({
              reply_subject: latestReply.subject ?? null,
              reply_content: latestReply.body?.html ?? latestReply.body?.text ?? null,
            })
            .eq('client_id', clientId)
            .eq('email', email)
        }
      }
    } catch (error) {
      console.error(`updateExistingLeads: email cache failed for ${email}:`, error)
    }
  }

  // Clean up orphaned cached_emails for removed leads
  if (removed > 0) {
    const { data: remainingLeads } = await supabase
      .from('synced_leads')
      .select('email')
      .eq('client_id', clientId)

    const remainingEmails = new Set((remainingLeads ?? []).map((l) => l.email.toLowerCase()))

    for (const email of uniqueEmails) {
      if (!remainingEmails.has(email)) {
        await supabase
          .from('cached_emails')
          .delete()
          .eq('client_id', clientId)
          .eq('lead_email', email)
      }
    }
  }

  console.log(
    `updateExistingLeads: DONE for client ${clientId} — ` +
    `${updated} updated, ${removed} removed, ${errors} errors`
  )
}

/**
 * Get all client IDs that have campaigns, sorted by least-recently-synced first.
 */
async function getClientIdsSortedBySyncTime(
  supabase: ReturnType<typeof createAdminClient>
): Promise<string[]> {
  const { data: clientCampaigns, error } = await supabase
    .from('client_campaigns')
    .select('client_id')

  if (error) {
    throw new Error(`Failed to fetch client campaigns: ${error.message}`)
  }

  if (!clientCampaigns || clientCampaigns.length === 0) return []

  const clientIds = [...new Set(clientCampaigns.map((cc) => cc.client_id))]

  const { data: syncTimes } = await supabase
    .from('synced_leads')
    .select('client_id, last_synced_at')
    .in('client_id', clientIds)
    .order('last_synced_at', { ascending: false })

  const lastSyncMap = new Map<string, string>()
  for (const row of syncTimes ?? []) {
    if (!lastSyncMap.has(row.client_id)) {
      lastSyncMap.set(row.client_id, row.last_synced_at)
    }
  }

  clientIds.sort((a, b) => {
    const aTime = lastSyncMap.get(a) ?? ''
    const bTime = lastSyncMap.get(b) ?? ''
    return aTime.localeCompare(bTime)
  })

  return clientIds
}

/**
 * Inbox-only sync for all clients (used by the 15-minute cron).
 * Only syncs emails + recent leads. Skips analytics entirely.
 * All syncing power goes to keeping the inbox up-to-date.
 */
export async function syncAllClientsInbox(): Promise<void> {
  const supabase = createAdminClient()
  const clientIds = await getClientIdsSortedBySyncTime(supabase)

  for (const clientId of clientIds) {
    try {
      await syncInboxData(clientId)
    } catch (error) {
      console.error(`Inbox sync failed for client ${clientId}:`, error)
      await logError({
        clientId,
        errorType: 'sync_error',
        message: `Inbox sync mislukt voor klant ${clientId}`,
        details: { error: error instanceof Error ? error.message : String(error) },
      })
    }

    await delay(RATE_LIMIT_DELAY_MS)
  }
}

/**
 * Full sync for all clients (used by the daily 6 AM cron).
 * Syncs everything: analytics, all emails, all leads.
 */
export async function syncAllClientsFull(): Promise<void> {
  const supabase = createAdminClient()
  const clientIds = await getClientIdsSortedBySyncTime(supabase)

  for (const clientId of clientIds) {
    try {
      await syncClientData(clientId, true)
    } catch (error) {
      console.error(`Full sync failed for client ${clientId}:`, error)
      await logError({
        clientId,
        errorType: 'sync_error',
        message: `Volledige sync mislukt voor klant ${clientId}`,
        details: { error: error instanceof Error ? error.message : String(error) },
      })
    }

    await delay(RATE_LIMIT_DELAY_MS)
  }
}
