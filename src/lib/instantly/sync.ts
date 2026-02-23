import { createAdminClient } from '@/lib/supabase/admin'
import { logError } from '@/lib/errors/log-error'
import { sendLeadWebhook } from '@/lib/webhooks/notify-lead'
import { getCampaignDailyAnalytics, listLeads, listEmails } from './client'
import type { InstantlyLead, InstantlyEmail } from './types'

const RATE_LIMIT_DELAY_MS = 200

// How many days of analytics to fetch on incremental syncs
const ANALYTICS_DAYS_INCREMENTAL = 7
// How many days of analytics to fetch on full syncs (first sync or weekly refresh)
const ANALYTICS_DAYS_FULL = 365
// Force a full sync (all emails + leads) every 6 hours per campaign
const FULL_SYNC_INTERVAL_MS = 6 * 60 * 60 * 1000
// Max pages of leads to fetch on incremental sync (newest leads first)
const INCREMENTAL_LEAD_PAGES = 3

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
 * Instantly uses numeric status: 0=not_yet_emailed, 1=emailed, etc.
 */
function deriveLeadStatus(lead: InstantlyLead): string {
  if (lead.email_reply_count > 0) return 'replied'
  if (lead.email_open_count > 0) return 'emailed'
  if (lead.status === 0) return 'not_yet_emailed'
  if (lead.status >= 1) return 'emailed'
  return 'not_yet_emailed'
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
 * Fetch all leads for a campaign using cursor pagination.
 * Optionally filter by interest status (1 = positive, 0 = neutral, -1 = negative).
 */
async function fetchAllLeads(campaignId: string, interestStatus?: number): Promise<InstantlyLead[]> {
  const allLeads: InstantlyLead[] = []
  let cursor: string | undefined

  do {
    const response = await listLeads(campaignId, {
      limit: 100,
      startingAfter: cursor,
      interestStatus,
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
 * Fetch only recent leads (limited pages) for incremental sync.
 * Returns the leads from the most recent N pages.
 */
async function fetchRecentLeads(campaignId: string, maxPages: number): Promise<InstantlyLead[]> {
  const allLeads: InstantlyLead[] = []
  let cursor: string | undefined
  let page = 0

  do {
    const response = await listLeads(campaignId, {
      limit: 100,
      startingAfter: cursor,
    })

    allLeads.push(...response.items)
    cursor = response.next_starting_after ?? undefined
    page++

    if (cursor && page < maxPages) {
      await delay(RATE_LIMIT_DELAY_MS)
    }
  } while (cursor && page < maxPages)

  return allLeads
}

interface EmailMapResult {
  interestMap: Map<string, string>
  replyMap: Map<string, { subject: string | null; content: string | null }>
  latestTimestamp: string | null
}

/**
 * Fetch all emails for a campaign in a single pass:
 * 1. Builds interest_status map and reply data map (for leads sync)
 * 2. Upserts emails into cached_emails table (for Verzonden page)
 */
async function fetchAndCacheEmails(
  clientId: string,
  campaignId: string,
  supabase: ReturnType<typeof createAdminClient>,
  sinceTimestamp?: string | null
): Promise<EmailMapResult> {
  const interestMap = new Map<string, string>()
  const replyMap = new Map<string, { subject: string | null; content: string | null }>()
  let latestTimestamp: string | null = null
  let cursor: string | undefined
  let totalFetched = 0

  do {
    const response = await listEmails({
      campaignId,
      limit: 100,
      startingAfter: cursor,
    })

    // If doing incremental sync, check if we've reached emails older than our cutoff
    let reachedOldEmails = false

    // Build interest and reply maps
    for (const email of response.items) {
      const emailTs = email.timestamp_email ?? email.timestamp_created

      // Track the latest timestamp we've seen
      if (emailTs && (!latestTimestamp || emailTs > latestTimestamp)) {
        latestTimestamp = emailTs
      }

      // For incremental sync: stop processing once we hit emails we already have
      if (sinceTimestamp && emailTs && emailTs <= sinceTimestamp) {
        reachedOldEmails = true
        // Still process this email (it might have updated i_status), but mark to stop paginating
      }

      const leadEmail = extractLeadEmailFromEmail(email)
      if (!leadEmail) continue

      // Track interest status
      if (email.i_status != null) {
        const newStatus = mapInterestStatus(email.i_status)
        if (newStatus) {
          const existing = interestMap.get(leadEmail)
          // Keep the most positive status: positive > neutral > negative
          if (
            !existing ||
            (newStatus === 'positive') ||
            (newStatus === 'neutral' && existing === 'negative')
          ) {
            interestMap.set(leadEmail, newStatus)
          }
        }
      }

      // Track latest reply content (from lead replies)
      if (isInboundReply(email)) {
        const existing = replyMap.get(leadEmail)
        if (!existing || (emailTs && emailTs > (email.timestamp_created ?? ''))) {
          replyMap.set(leadEmail, {
            subject: email.subject ?? null,
            content: email.body?.html ?? email.body?.text ?? null,
          })
        }
      }
    }

    // Cache emails into cached_emails table
    if (response.items.length > 0) {
      const cacheRows = response.items.map((email) => {
        const isReply = isInboundReply(email)
        return {
          client_id: clientId,
          instantly_email_id: email.id,
          thread_id: email.thread_id,
          lead_email: extractLeadEmailFromEmail(email),
          from_address: email.from_address_email,
          to_address: email.to_address_email_list,
          subject: email.subject,
          body_text: email.body?.text ?? null,
          body_html: email.body?.html ?? null,
          is_reply: isReply,
          sender_account: isReply ? null : email.from_address_email,
          email_timestamp: email.timestamp_email ?? email.timestamp_created,
        }
      })

      const { error: upsertError } = await supabase
        .from('cached_emails')
        .upsert(cacheRows, { onConflict: 'instantly_email_id' })

      if (upsertError) {
        console.error(
          `Failed to cache emails for campaign ${campaignId}:`,
          upsertError.message
        )
      }
    }

    totalFetched += response.items.length

    // Stop paginating if we've reached old emails (incremental sync)
    if (reachedOldEmails) {
      break
    }

    cursor = response.next_starting_after ?? undefined
    if (cursor) {
      await delay(RATE_LIMIT_DELAY_MS)
    }
  } while (cursor)

  console.log(
    `Fetched ${totalFetched} emails for campaign ${campaignId}` +
      (sinceTimestamp ? ` (incremental since ${sinceTimestamp})` : ' (full)')
  )

  return { interestMap, replyMap, latestTimestamp }
}

/**
 * Extract the lead's email address from an Instantly email.
 * Uses the `lead` field from the API (most reliable).
 * Falls back to deriving from from/to addresses using ue_type.
 */
function extractLeadEmailFromEmail(email: InstantlyEmail): string | null {
  // The `lead` field is the most reliable way to identify the lead
  if (email.lead) {
    return email.lead.toLowerCase()
  }
  // Fallback: ue_type 2 = inbound reply (lead is sender), 1 = outbound (lead is recipient)
  if (email.ue_type === 2 && email.from_address_email) {
    return email.from_address_email.toLowerCase()
  }
  if (email.to_address_email_list) {
    return email.to_address_email_list.toLowerCase()
  }
  return null
}

/**
 * Check if an email is an inbound reply (from a lead).
 * The API returns ue_type=2 for replies; is_reply is not returned by API v2.
 */
function isInboundReply(email: InstantlyEmail): boolean {
  return email.ue_type === 2
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
 * Process leads: build rows, upsert, detect new positive leads, fire webhooks.
 * Shared logic between full and incremental sync.
 */
async function processLeads(
  leads: InstantlyLead[],
  clientId: string,
  campaignId: string,
  interestMap: Map<string, string>,
  replyMap: Map<string, { subject: string | null; content: string | null }>,
  supabase: ReturnType<typeof createAdminClient>
): Promise<void> {
  if (leads.length === 0) return

  // Fetch existing interest statuses to detect NEW positive leads.
  // Batch the .in() query to avoid exceeding PostgREST URL length limits.
  const leadEmails = leads.map((l) => l.email.toLowerCase())
  const existingStatusMap = new Map<string, string | null>()
  let existingLeadsQueryFailed = false

  const IN_BATCH_SIZE = 50
  for (let i = 0; i < leadEmails.length; i += IN_BATCH_SIZE) {
    const batch = leadEmails.slice(i, i + IN_BATCH_SIZE)
    const { data: existingLeads, error: existingError } = await supabase
      .from('synced_leads')
      .select('email, interest_status')
      .eq('client_id', clientId)
      .eq('campaign_id', campaignId)
      .in('email', batch)

    if (existingError) {
      console.error(
        `Failed to fetch existing leads for campaign ${campaignId}:`,
        existingError.message
      )
      existingLeadsQueryFailed = true
      break
    }

    for (const el of existingLeads ?? []) {
      existingStatusMap.set(el.email.toLowerCase(), el.interest_status)
    }
  }

  const leadRows = leads.map((lead) => {
    const icpFields = normalizeIcpFields(lead.payload ?? {})
    const payload = lead.payload ?? {}
    const leadEmailLower = lead.email.toLowerCase()
    const replyData = replyMap.get(leadEmailLower)

    // Determine interest_status from multiple sources.
    // Rules:
    // - If ANY source says 'positive', the lead is positive (never miss a lead)
    // - Lead-level lt_interest_status can only ADD positive, never downgrade
    // - Email i_status and existing DB value fill in the rest
    const leadInterestStatus = mapInterestStatus(lead.lt_interest_status)
    const emailInterestStatus = interestMap.get(leadEmailLower) ?? null
    const existingInterestStatus = existingStatusMap.get(leadEmailLower) ?? null

    let interest_status: string | null
    if (
      leadInterestStatus === 'positive' ||
      emailInterestStatus === 'positive' ||
      existingInterestStatus === 'positive'
    ) {
      // Once positive from any source, stays positive
      interest_status = 'positive'
    } else {
      // For non-positive: prefer email-level, then existing, then lead-level
      interest_status = emailInterestStatus ?? existingInterestStatus ?? leadInterestStatus
    }

    // Log interest derivation for any lead that has interest signals
    if (leadInterestStatus || emailInterestStatus || existingInterestStatus) {
      console.log(
        `Interest status for ${lead.email}: ` +
        `lt_interest_status=${JSON.stringify(lead.lt_interest_status)} → ${leadInterestStatus}, ` +
        `email_i_status=${emailInterestStatus}, ` +
        `existing_db=${existingInterestStatus} → ` +
        `RESULT: ${interest_status}`
      )
    }

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
      interest_status,
      sender_account: lead.last_step_from,
      email_sent_count: lead.email_open_count > 0 ? 1 : 0,
      email_reply_count: lead.email_reply_count,
      linkedin_url: extractPayloadField(payload, [
        'LinkedIn',
        'linkedin',
        'linkedin_url',
        'LinkedIn URL',
        'linkedIn',
        'Linkedin',
      ]),
      vacancy_url: extractPayloadField(payload, [
        'Vacancy URL',
        'vacancy_url',
        'Vacature URL',
        'vacature_url',
        'vactureUrl',
        'Vacancy',
        'vacature',
      ]),
      reply_subject: replyData?.subject ?? null,
      reply_content: replyData?.content ?? null,
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
      await logError({
        clientId,
        errorType: 'sync_error',
        message: `Leads upsert mislukt voor campagne ${campaignId}`,
        details: { campaignId, error: leadsError.message },
      })
    }
  }

  // Detect NEW positive leads and fire webhook notifications.
  // SAFETY: If we couldn't reliably fetch existing statuses, skip webhooks
  // entirely to prevent duplicate notifications.
  if (existingLeadsQueryFailed) {
    console.warn(
      `Skipping webhook detection for campaign ${campaignId} — existing leads query failed`
    )
  }

  const newPositiveLeads = existingLeadsQueryFailed ? [] : leadRows.filter((row) => {
    const oldStatus = existingStatusMap.get(row.email.toLowerCase())
    return row.interest_status === 'positive' && oldStatus !== 'positive'
  })

  if (newPositiveLeads.length > 0) {
    try {
      const { data: clientData } = await supabase
        .from('clients')
        .select('notification_email, notifications_enabled, company_name')
        .eq('id', clientId)
        .single()

      if (clientData?.notifications_enabled) {
        // Resolve notification email: client setting or fallback to first user's login email
        let notificationEmail = clientData.notification_email
        if (!notificationEmail) {
          const { data: profiles } = await supabase
            .from('profiles')
            .select('id')
            .eq('client_id', clientId)
            .eq('user_role', 'client')
            .limit(1)

          if (profiles && profiles.length > 0) {
            const { data: { user } } = await supabase.auth.admin.getUserById(profiles[0].id)
            notificationEmail = user?.email ?? null
          }
        }

        if (notificationEmail) {
          const appUrl = process.env.NEXT_PUBLIC_APP_URL ?? ''

          // Look up DB ids for the new positive leads so we can build deep links
          const posLeadEmails = newPositiveLeads.map((l) => l.email)
          const { data: leadIdRows } = await supabase
            .from('synced_leads')
            .select('id, email')
            .eq('client_id', clientId)
            .in('email', posLeadEmails)

          const emailToId = new Map<string, string>()
          for (const row of leadIdRows ?? []) {
            emailToId.set(row.email.toLowerCase(), row.id)
          }

          for (const lead of newPositiveLeads) {
            const leadDbId = emailToId.get(lead.email.toLowerCase())
            const dashboardUrl = leadDbId && appUrl
              ? `${appUrl}/dashboard/inbox/${leadDbId}`
              : null

            const vacatureUrl = lead.vacancy_url || null

            await sendLeadWebhook({
              notification_email: notificationEmail,
              lead_email: lead.email,
              status: 'Lead',
              response: lead.reply_content,
              lead_name: [lead.first_name, lead.last_name].filter(Boolean).join(' ') || lead.email,
              website: lead.website,
              company_name: lead.company_name,
              dashboard_url: dashboardUrl,
              vacature_url: vacatureUrl,
              geen_recruitment: !vacatureUrl,
            })
          }
        }
      }
    } catch (notifError) {
      console.error('Failed to send positive lead webhooks:', notifError)
      // Non-fatal: don't fail the sync for webhook errors
    }
  }
}

/**
 * Sync all campaign data for a single client.
 * Uses incremental sync when possible (fetches only new data since last sync).
 * Falls back to full sync on first run or every 24 hours.
 *
 * Incremental sync:
 * - Analytics: last 7 days only
 * - Emails: only emails newer than last fetched timestamp
 * - Leads: only first 3 pages (most recent ~300 leads)
 *
 * Full sync:
 * - Analytics: last 365 days
 * - Emails: all emails
 * - Leads: all leads
 */
export async function syncClientData(clientId: string, forceFullSync = false): Promise<void> {
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

  for (const { campaign_id: campaignId } of campaigns) {
    // Get sync state for this campaign
    const syncState = await getSyncState(supabase, clientId, campaignId)
    const isFullSync = forceFullSync || needsFullSync(syncState)

    console.log(
      `Syncing campaign ${campaignId} for client ${clientId} — ${isFullSync ? 'FULL' : 'INCREMENTAL'}`
    )

    // 1. Sync daily analytics
    const analyticsDays = isFullSync ? ANALYTICS_DAYS_FULL : ANALYTICS_DAYS_INCREMENTAL
    const endDate = new Date().toISOString().split('T')[0]
    const startDate = new Date(Date.now() - analyticsDays * 24 * 60 * 60 * 1000)
      .toISOString()
      .split('T')[0]

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
          await logError({
            clientId,
            errorType: 'sync_error',
            message: `Analytics upsert mislukt voor campagne ${campaignId}`,
            details: { campaignId, error: analyticsError.message },
          })
        }
      }
    } catch (error) {
      console.error(
        `Failed to sync analytics for campaign ${campaignId}:`,
        error
      )
      await logError({
        clientId,
        errorType: 'api_failure',
        message: `Sync analytics mislukt voor campagne ${campaignId}`,
        details: { campaignId, error: error instanceof Error ? error.message : String(error) },
      })
    }

    await delay(RATE_LIMIT_DELAY_MS)

    // 2. Fetch emails: build interest/reply maps AND cache into cached_emails
    let interestMap = new Map<string, string>()
    let replyMap = new Map<string, { subject: string | null; content: string | null }>()
    let latestEmailTimestamp: string | null = null

    try {
      const sinceTimestamp = isFullSync ? null : syncState?.last_email_timestamp
      const emailMapResult = await fetchAndCacheEmails(
        clientId,
        campaignId,
        supabase,
        sinceTimestamp
      )
      interestMap = emailMapResult.interestMap
      replyMap = emailMapResult.replyMap
      latestEmailTimestamp = emailMapResult.latestTimestamp

      // For incremental sync, we also need interest data from existing DB records
      // since we didn't fetch all emails this time
      if (!isFullSync) {
        const { data: existingInterest } = await supabase
          .from('synced_leads')
          .select('email, interest_status')
          .eq('client_id', clientId)
          .eq('campaign_id', campaignId)
          .not('interest_status', 'is', null)

        for (const row of existingInterest ?? []) {
          const email = row.email.toLowerCase()
          // Don't overwrite interest from new emails — those take priority
          if (!interestMap.has(email) && row.interest_status) {
            interestMap.set(email, row.interest_status)
          }
        }
      }
    } catch (error) {
      console.error(
        `Failed to fetch/cache emails for campaign ${campaignId}:`,
        error
      )
      // Non-fatal: continue with leads sync, existing interest_status will be preserved
    }

    await delay(RATE_LIMIT_DELAY_MS)

    // 3. Sync leads
    try {
      let leads: InstantlyLead[]

      if (isFullSync) {
        leads = await fetchAllLeads(campaignId)
      } else {
        // Incremental: fetch recent leads + positive-interest leads to catch
        // leads whose interest was manually changed in Instantly
        const [recentLeads, positiveLeads] = await Promise.all([
          fetchRecentLeads(campaignId, INCREMENTAL_LEAD_PAGES),
          fetchAllLeads(campaignId, 1),
        ])

        const seenIds = new Set<string>()
        leads = []
        for (const lead of [...recentLeads, ...positiveLeads]) {
          if (!seenIds.has(lead.id)) {
            seenIds.add(lead.id)
            leads.push(lead)
          }
        }
      }

      console.log(
        `Fetched ${leads.length} leads for campaign ${campaignId}` +
          (isFullSync ? ' (full)' : ` (incremental, ${INCREMENTAL_LEAD_PAGES} pages + positive)`)
      )

      await processLeads(leads, clientId, campaignId, interestMap, replyMap, supabase)
    } catch (error) {
      console.error(
        `Failed to sync leads for campaign ${campaignId}:`,
        error
      )
      await logError({
        clientId,
        errorType: 'api_failure',
        message: `Sync leads mislukt voor campagne ${campaignId}`,
        details: { campaignId, error: error instanceof Error ? error.message : String(error) },
      })
    }

    // 4. Update sync state
    await updateSyncState(supabase, clientId, campaignId, {
      last_email_timestamp: latestEmailTimestamp ?? syncState?.last_email_timestamp ?? null,
      last_analytics_sync: new Date().toISOString(),
      ...(isFullSync ? { last_full_sync: new Date().toISOString() } : {}),
    })

    await delay(RATE_LIMIT_DELAY_MS)
  }
}

/**
 * Lightweight inbox-only sync for a single client.
 * Skips analytics entirely. Fetches only emails (incremental) and recent leads.
 * Used by the inbox "Verversen" button for fast refresh (~10-30 seconds).
 */
export async function syncInboxData(clientId: string): Promise<void> {
  const supabase = createAdminClient()

  const { data: campaigns, error: campaignError } = await supabase
    .from('client_campaigns')
    .select('campaign_id')
    .eq('client_id', clientId)

  if (campaignError) {
    throw new Error(`Failed to fetch campaigns for client ${clientId}: ${campaignError.message}`)
  }

  if (!campaigns || campaigns.length === 0) return

  for (const { campaign_id: campaignId } of campaigns) {
    const syncState = await getSyncState(supabase, clientId, campaignId)

    console.log(`Inbox sync for campaign ${campaignId} (client ${clientId})`)

    // 1. Fetch emails (incremental when possible) — updates interest_status + cached_emails
    let interestMap = new Map<string, string>()
    let replyMap = new Map<string, { subject: string | null; content: string | null }>()
    let latestEmailTimestamp: string | null = null

    try {
      const sinceTimestamp = syncState?.last_email_timestamp ?? null
      const emailMapResult = await fetchAndCacheEmails(
        clientId,
        campaignId,
        supabase,
        sinceTimestamp
      )
      interestMap = emailMapResult.interestMap
      replyMap = emailMapResult.replyMap
      latestEmailTimestamp = emailMapResult.latestTimestamp

      // Merge existing interest data for leads we didn't fetch new emails for
      if (sinceTimestamp) {
        const { data: existingInterest } = await supabase
          .from('synced_leads')
          .select('email, interest_status')
          .eq('client_id', clientId)
          .eq('campaign_id', campaignId)
          .not('interest_status', 'is', null)

        for (const row of existingInterest ?? []) {
          const email = row.email.toLowerCase()
          if (!interestMap.has(email) && row.interest_status) {
            interestMap.set(email, row.interest_status)
          }
        }
      }
    } catch (error) {
      console.error(`Inbox sync: failed to fetch emails for campaign ${campaignId}:`, error)
    }

    await delay(RATE_LIMIT_DELAY_MS)

    // 2. Fetch recent leads (3 pages) + positive-interest leads specifically.
    // The recent pages catch new leads; the positive fetch catches leads whose
    // interest_status was manually changed in Instantly but are too old to appear
    // in the first few pages of the paginated list.
    try {
      const [recentLeads, positiveLeads] = await Promise.all([
        fetchRecentLeads(campaignId, INCREMENTAL_LEAD_PAGES),
        fetchAllLeads(campaignId, 1), // interest_value=1 (positive)
      ])

      // Merge and deduplicate by lead ID
      const seenIds = new Set<string>()
      const leads: InstantlyLead[] = []
      for (const lead of [...recentLeads, ...positiveLeads]) {
        if (!seenIds.has(lead.id)) {
          seenIds.add(lead.id)
          leads.push(lead)
        }
      }

      console.log(
        `Inbox sync: fetched ${recentLeads.length} recent + ${positiveLeads.length} positive leads ` +
        `(${leads.length} unique) for campaign ${campaignId}`
      )

      await processLeads(leads, clientId, campaignId, interestMap, replyMap, supabase)
    } catch (error) {
      console.error(`Inbox sync: failed to sync leads for campaign ${campaignId}:`, error)
    }

    // 3. Update email timestamp (but not analytics or full sync timestamps)
    await updateSyncState(supabase, clientId, campaignId, {
      last_email_timestamp: latestEmailTimestamp ?? syncState?.last_email_timestamp ?? null,
    })

    await delay(RATE_LIMIT_DELAY_MS)
  }
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
