import { createAdminClient } from '@/lib/supabase/admin'
import { logError } from '@/lib/errors/log-error'
import { sendLeadWebhook } from '@/lib/webhooks/notify-lead'
import { getCampaignDailyAnalytics, listLeads, listEmails } from './client'
import type { InstantlyLead, InstantlyEmail } from './types'

const RATE_LIMIT_DELAY_MS = 200

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
  if (lead.status === 0) return 'not_yet_emailed'
  if (lead.email_open_count > 0 || lead.status === 1) return 'emailed'
  return 'not_yet_emailed'
}

/**
 * Map Instantly email i_status to interest_status.
 * i_status: -1 = not interested, 0 = neutral, 1 = interested
 */
function mapInterestStatus(iStatus: number | null | undefined): string | null {
  if (iStatus === 1) return 'positive'
  if (iStatus === 0) return 'neutral'
  if (iStatus === -1) return 'negative'
  return null
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

interface EmailMapResult {
  interestMap: Map<string, string>
  replyMap: Map<string, { subject: string | null; content: string | null }>
}

/**
 * Fetch all emails for a campaign in a single pass:
 * 1. Builds interest_status map and reply data map (for leads sync)
 * 2. Upserts emails into cached_emails table (for Verzonden page)
 */
async function fetchAndCacheEmails(
  clientId: string,
  campaignId: string,
  supabase: ReturnType<typeof createAdminClient>
): Promise<EmailMapResult> {
  const interestMap = new Map<string, string>()
  const replyMap = new Map<string, { subject: string | null; content: string | null }>()
  let cursor: string | undefined

  do {
    const response = await listEmails({
      campaignId,
      limit: 100,
      startingAfter: cursor,
    })

    // Build interest and reply maps
    for (const email of response.items) {
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
        const emailTs = email.timestamp_email ?? email.timestamp_created
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

    cursor = response.next_starting_after ?? undefined
    if (cursor) {
      await delay(RATE_LIMIT_DELAY_MS)
    }
  } while (cursor)

  return { interestMap, replyMap }
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
 * Sync all campaign data for a single client.
 * Fetches campaign IDs from client_campaigns, then for each campaign:
 * 1. Fetches daily analytics and upserts into campaign_analytics
 * 2. Fetches all emails to build interest_status map + cache emails
 * 3. Fetches all leads with pagination and upserts into synced_leads
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

  // Date range: last 365 days to today (covers full campaign history for most clients)
  const endDate = new Date().toISOString().split('T')[0]
  const startDate = new Date(Date.now() - 365 * 24 * 60 * 60 * 1000)
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

    // 2. Fetch emails: build interest/reply maps AND cache into cached_emails (single pass)
    let interestMap = new Map<string, string>()
    let replyMap = new Map<string, { subject: string | null; content: string | null }>()
    try {
      const emailMapResult = await fetchAndCacheEmails(clientId, campaignId, supabase)
      interestMap = emailMapResult.interestMap
      replyMap = emailMapResult.replyMap
    } catch (error) {
      console.error(
        `Failed to fetch/cache emails for campaign ${campaignId}:`,
        error
      )
      // Non-fatal: continue with leads sync, interest_status will be null
    }

    await delay(RATE_LIMIT_DELAY_MS)

    // 3. Sync leads
    try {
      const leads = await fetchAllLeads(campaignId)

      if (leads.length > 0) {
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

          // Determine interest_status from multiple sources:
          // 1. Email-level i_status (from interestMap)
          // 2. Lead-level lt_interest_status (set by Instantly when classifying a lead)
          const emailInterest = interestMap.get(leadEmailLower) ?? null
          const leadInterest = mapInterestStatus(lead.lt_interest_status)
          // Use the most positive status from either source
          let interestStatus = emailInterest
          if (!interestStatus) {
            interestStatus = leadInterest
          } else if (leadInterest === 'positive') {
            interestStatus = 'positive'
          } else if (leadInterest === 'neutral' && interestStatus === 'negative') {
            interestStatus = 'neutral'
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
            interest_status: interestStatus,
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
                const leadEmails = newPositiveLeads.map((l) => l.email)
                const { data: leadIdRows } = await supabase
                  .from('synced_leads')
                  .select('id, email')
                  .eq('client_id', clientId)
                  .in('email', leadEmails)

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

    await delay(RATE_LIMIT_DELAY_MS)
  }
}

/**
 * Sync data for all clients that have associated campaigns.
 * Processes clients sequentially to respect API rate limits.
 * Prioritizes least-recently-synced clients so new clients (never synced)
 * get synced first, and all clients get fair rotation even if the
 * function hits the Vercel timeout.
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

  // Get last sync time per client to prioritize least-recently-synced
  const { data: syncTimes } = await supabase
    .from('synced_leads')
    .select('client_id, last_synced_at')
    .in('client_id', clientIds)
    .order('last_synced_at', { ascending: false })

  const lastSyncMap = new Map<string, string>()
  for (const row of syncTimes ?? []) {
    // Keep only the most recent sync time per client (first seen due to DESC order)
    if (!lastSyncMap.has(row.client_id)) {
      lastSyncMap.set(row.client_id, row.last_synced_at)
    }
  }

  // Sort: never-synced clients first, then oldest-synced first
  clientIds.sort((a, b) => {
    const aTime = lastSyncMap.get(a) ?? ''
    const bTime = lastSyncMap.get(b) ?? ''
    return aTime.localeCompare(bTime)
  })

  for (const clientId of clientIds) {
    try {
      await syncClientData(clientId)
    } catch (error) {
      console.error(`Failed to sync client ${clientId}:`, error)
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
