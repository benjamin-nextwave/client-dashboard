import { createAdminClient } from '@/lib/supabase/admin'
import { logError } from '@/lib/errors/log-error'
import { getCampaignDailyAnalytics, listCampaigns, listLeads, listEmails, getCampaignsForEmail } from './client'

const RATE_LIMIT_DELAY_MS = 1000

const ANALYTICS_DAYS_INCREMENTAL = 7
const ANALYTICS_DAYS_FULL = 365
const FULL_SYNC_INTERVAL_MS = 6 * 60 * 60 * 1000
const VERIFY_DELAY_MS = 1000

function delay(ms: number): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, ms))
}

function mapInterestStatus(iStatus: number | string | null | undefined): string | null {
  if (iStatus == null) return null
  // eslint-disable-next-line eqeqeq
  if (iStatus == 1) return 'positive'
  // eslint-disable-next-line eqeqeq
  if (iStatus == 0) return 'neutral'
  // eslint-disable-next-line eqeqeq
  if (iStatus == -1) return 'negative'
  console.warn(`mapInterestStatus: unexpected value ${JSON.stringify(iStatus)} (type: ${typeof iStatus})`)
  return null
}

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

function needsFullSync(syncState: { last_full_sync: string | null } | null): boolean {
  if (!syncState || !syncState.last_full_sync) return true
  const age = Date.now() - new Date(syncState.last_full_sync).getTime()
  return age > FULL_SYNC_INTERVAL_MS
}

/**
 * Get the client's Instantly API key from the database.
 * Returns null if no key is configured.
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
async function getAllWorkspaceCampaigns(apiKey: string): Promise<{ id: string; name: string }[]> {
  const campaigns: { id: string; name: string }[] = []
  let startingAfter: string | undefined

  while (true) {
    const response = await listCampaigns({
      limit: 100,
      startingAfter,
      apiKey,
    })

    for (const campaign of response.items) {
      campaigns.push({ id: campaign.id, name: campaign.name })
    }

    if (!response.next_starting_after) break
    startingAfter = response.next_starting_after
    await delay(RATE_LIMIT_DELAY_MS)
  }

  return campaigns
}

/**
 * Sync all campaign data for a single client.
 * Uses the client's own Instantly API key to fetch all campaigns from their workspace.
 */
export async function syncClientData(clientId: string, forceFullSync = false): Promise<void> {
  const supabase = createAdminClient()

  const apiKey = await getClientApiKey(supabase, clientId)
  if (!apiKey) {
    console.log(`syncClientData: client=${clientId} has no API key — skipping`)
    return
  }

  // Fetch all campaigns from the client's workspace
  const campaigns = await getAllWorkspaceCampaigns(apiKey)

  if (campaigns.length === 0) {
    console.log(`syncClientData: client=${clientId} has no campaigns in workspace`)
    return
  }

  console.log(
    `syncClientData: client=${clientId}, ${campaigns.length} campaign(s), forceFullSync=${forceFullSync}`
  )

  // Update client_campaigns table to keep it in sync
  await supabase
    .from('client_campaigns')
    .delete()
    .eq('client_id', clientId)

  const campaignRows = campaigns.map((c) => ({
    client_id: clientId,
    campaign_id: c.id,
    campaign_name: c.name,
  }))

  await supabase
    .from('client_campaigns')
    .upsert(campaignRows, { onConflict: 'client_id,campaign_id' })

  for (const campaign of campaigns) {
    const syncState = await getSyncState(supabase, clientId, campaign.id)
    const isFullSync = forceFullSync || needsFullSync(syncState)
    const analyticsDays = isFullSync ? ANALYTICS_DAYS_FULL : ANALYTICS_DAYS_INCREMENTAL
    const endDate = new Date().toISOString().split('T')[0]
    const startDate = new Date(Date.now() - analyticsDays * 24 * 60 * 60 * 1000)
      .toISOString()
      .split('T')[0]

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
          .upsert(analyticsRows, { onConflict: 'client_id,campaign_id,date' })

        if (analyticsError) {
          console.error(`Failed to upsert analytics for campaign ${campaign.id}:`, analyticsError.message)
          await logError({
            clientId,
            errorType: 'sync_error',
            message: `Analytics upsert mislukt voor campagne ${campaign.id}`,
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

    await updateSyncState(supabase, clientId, campaign.id, {
      last_analytics_sync: new Date().toISOString(),
      ...(isFullSync ? { last_full_sync: new Date().toISOString() } : {}),
    })

    await delay(RATE_LIMIT_DELAY_MS)
  }
}

/**
 * Sync all leads from all campaigns in the client's workspace.
 * Fetches every lead and upserts into synced_leads.
 */
export async function syncAllLeads(clientId: string): Promise<void> {
  const supabase = createAdminClient()
  const apiKey = await getClientApiKey(supabase, clientId)
  if (!apiKey) return

  const campaigns = await getAllWorkspaceCampaigns(apiKey)
  if (campaigns.length === 0) return

  console.log(`syncAllLeads: client=${clientId}, ${campaigns.length} campaign(s)`)

  let totalUpserted = 0

  for (const campaign of campaigns) {
    let startingAfter: string | undefined

    while (true) {
      try {
        const response = await listLeads(campaign.id, {
          limit: 100,
          startingAfter,
          apiKey,
        })

        if (response.items.length === 0) break

        const rows = response.items.map((lead) => {
          const payload = lead.payload ?? {}
          const extractField = (variants: string[]): string | null => {
            for (const variant of variants) {
              const key = Object.keys(payload).find((k) => k.toLowerCase() === variant.toLowerCase())
              if (key && payload[key] != null && String(payload[key]).trim() !== '') {
                return String(payload[key]).trim()
              }
            }
            return null
          }

          const interestStatus = mapInterestStatus(lead.lt_interest_status)

          return {
            client_id: clientId,
            instantly_lead_id: lead.id,
            campaign_id: campaign.id,
            email: lead.email.toLowerCase().trim(),
            first_name: lead.first_name ?? null,
            last_name: lead.last_name ?? null,
            company_name: lead.company_name ?? null,
            job_title: extractField(['Job Title', 'job_title', 'Functie', 'functie']),
            industry: extractField(['Industry', 'industry', 'Branche', 'branche']),
            company_size: extractField(['Company Size', 'company_size', 'Bedrijfsgrootte', 'bedrijfsgrootte']),
            website: lead.website ?? null,
            phone: lead.phone ?? null,
            lead_status: lead.email_reply_count > 0 ? 'replied' : 'emailed',
            interest_status: interestStatus ?? 'neutral',
            sender_account: lead.last_step_from ?? null,
            email_sent_count: lead.email_open_count > 0 ? 1 : 0,
            email_reply_count: lead.email_reply_count ?? 0,
            payload: lead.payload ?? null,
            last_synced_at: new Date().toISOString(),
            updated_at: new Date().toISOString(),
          }
        })

        const { error: upsertError } = await supabase
          .from('synced_leads')
          .upsert(rows, { onConflict: 'client_id,instantly_lead_id,campaign_id' })

        if (upsertError) {
          console.error(`syncAllLeads: upsert failed for campaign ${campaign.id}:`, upsertError.message)
        } else {
          totalUpserted += rows.length
        }

        if (!response.next_starting_after) break
        startingAfter = response.next_starting_after
      } catch (error) {
        console.error(`syncAllLeads: failed for campaign ${campaign.id}:`, error)
        break
      }

      await delay(RATE_LIMIT_DELAY_MS)
    }

    await delay(RATE_LIMIT_DELAY_MS)
  }

  console.log(`syncAllLeads: DONE for client ${clientId} — ${totalUpserted} leads upserted`)
}

/**
 * Lightweight inbox-only sync for a single client.
 */
export async function syncInboxData(clientId: string): Promise<void> {
  const supabase = createAdminClient()
  const apiKey = await getClientApiKey(supabase, clientId)
  if (!apiKey) return

  await updateExistingLeads(clientId, supabase, apiKey)
}

async function updateExistingLeads(
  clientId: string,
  supabase: ReturnType<typeof createAdminClient>,
  apiKey: string
): Promise<void> {
  const { data: existingLeads, error: leadsError } = await supabase
    .from('synced_leads')
    .select('id, email, campaign_id, interest_status, instantly_lead_id')
    .eq('client_id', clientId)

  if (leadsError) {
    throw new Error(`Failed to fetch existing leads for client ${clientId}: ${leadsError.message}`)
  }

  if (!existingLeads || existingLeads.length === 0) {
    console.log(`updateExistingLeads: client=${clientId} has no leads — nothing to update`)
    return
  }

  const manualLeads = existingLeads.filter((l) => l.instantly_lead_id?.startsWith('manual:'))
  const syncedLeads = existingLeads.filter((l) => !l.instantly_lead_id?.startsWith('manual:'))

  if (manualLeads.length > 0) {
    console.log(`updateExistingLeads: client=${clientId} has ${manualLeads.length} manually-added lead(s) — skipping sync for those`)
  }

  const uniqueEmails = [...new Set(syncedLeads.map((l) => l.email.toLowerCase()))]

  console.log(
    `updateExistingLeads: client=${clientId}, ${syncedLeads.length} synced rows, ` +
    `${manualLeads.length} manual rows, ${uniqueEmails.length} unique emails`
  )

  let updated = 0
  let removed = 0
  let errors = 0

  for (let i = 0; i < uniqueEmails.length; i++) {
    const email = uniqueEmails[i]
    if (i > 0) await delay(VERIFY_DELAY_MS)

    let instantlyCampaignIds: string[]
    try {
      instantlyCampaignIds = await getCampaignsForEmail(email, apiKey)
    } catch (error) {
      console.error(`updateExistingLeads: getCampaignsForEmail failed for ${email}:`, error)
      errors++
      continue
    }

    const instantlySet = new Set(instantlyCampaignIds)
    const leadRows = syncedLeads.filter((l) => l.email.toLowerCase() === email)

    for (const row of leadRows) {
      if (!instantlySet.has(row.campaign_id)) {
        await supabase.from('synced_leads').delete().eq('id', row.id)
        console.log(`updateExistingLeads: removed ${email} from campaign ${row.campaign_id} (not in Instantly)`)
        removed++
        continue
      }

      try {
        const response = await listLeads(row.campaign_id, { search: email, limit: 10, apiKey })
        const lead = response.items.find((l) => l.email.toLowerCase().trim() === email)

        if (lead) {
          const interestStatus = mapInterestStatus(lead.lt_interest_status)

          if (interestStatus !== 'positive' && row.interest_status === 'positive') {
            await supabase.from('synced_leads').delete().eq('id', row.id)
            console.log(`updateExistingLeads: removed ${email} — no longer positive (now: ${interestStatus})`)
            removed++
            continue
          }

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

    await delay(RATE_LIMIT_DELAY_MS)
    try {
      const emailResponse = await listEmails({ lead: email, limit: 100, apiKey })
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
 * Full sync for all clients (used by the daily cron).
 * Only syncs clients that have an API key configured.
 */
export async function syncAllClientsFull(): Promise<void> {
  const supabase = createAdminClient()

  const { data: clients, error } = await supabase
    .from('clients')
    .select('id')
    .not('instantly_api_key', 'is', null)

  if (error) {
    throw new Error(`Failed to fetch clients: ${error.message}`)
  }

  if (!clients || clients.length === 0) return

  for (const client of clients) {
    try {
      await syncClientData(client.id, true)
    } catch (error) {
      console.error(`Full sync failed for client ${client.id}:`, error)
      await logError({
        clientId: client.id,
        errorType: 'sync_error',
        message: `Volledige sync mislukt voor klant ${client.id}`,
        details: { error: error instanceof Error ? error.message : String(error) },
      })
    }

    await delay(RATE_LIMIT_DELAY_MS)
  }
}
