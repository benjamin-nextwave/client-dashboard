export const runtime = 'nodejs'
export const maxDuration = 300
export const dynamic = 'force-dynamic'

import { NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { createAdminClient } from '@/lib/supabase/admin'
import { listLeads, listEmails } from '@/lib/instantly/client'

const RATE_LIMIT_DELAY_MS = 300
const DEFAULT_CAMPAIGN_LIMIT = 5

function delay(ms: number): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, ms))
}

/**
 * Backfill positive-interest leads per campaign from Instantly.
 *
 * Now that listLeads uses the correct "campaign" parameter, we can:
 * 1. Iterate over campaigns in client_campaigns
 * 2. Per campaign: paginate through ALL leads via listLeads
 * 3. Filter client-side on lt_interest_status == 1
 * 4. Upsert positive leads into synced_leads with correct (client_id, campaign_id)
 * 5. Cache emails per positive lead
 *
 * No getCampaignsForEmail needed — campaign filtering works directly.
 *
 * Supports:
 *   ?limit=5           — max campaigns per batch (default 5, for Vercel timeout)
 *   ?offset=0          — skip first N campaigns (for pagination)
 *   ?campaign_id=X     — only backfill a specific campaign
 *
 * POST /api/admin/backfill-positive
 */
export async function POST(request: Request) {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()

  if (!user) {
    return NextResponse.json({ error: 'Not authenticated' }, { status: 401 })
  }

  if (user.app_metadata?.user_role !== 'operator') {
    return NextResponse.json({ error: 'Forbidden — operator only' }, { status: 403 })
  }

  const { searchParams } = new URL(request.url)
  const campaignLimit = Math.min(
    Math.max(parseInt(searchParams.get('limit') ?? '', 10) || DEFAULT_CAMPAIGN_LIMIT, 1),
    50
  )
  const offset = Math.max(parseInt(searchParams.get('offset') ?? '', 10) || 0, 0)
  const filterCampaignId = searchParams.get('campaign_id') ?? null

  const admin = createAdminClient()

  // Load all client_campaigns
  const { data: allClientCampaigns, error: ccError } = await admin
    .from('client_campaigns')
    .select('client_id, campaign_id')

  if (ccError || !allClientCampaigns) {
    return NextResponse.json({
      error: `Failed to load client_campaigns: ${ccError?.message}`,
    }, { status: 500 })
  }

  // Filter to specific campaign if requested
  let campaignsToProcess = filterCampaignId
    ? allClientCampaigns.filter((cc) => cc.campaign_id === filterCampaignId)
    : allClientCampaigns

  const totalCampaigns = campaignsToProcess.length

  // Apply offset and limit for pagination
  campaignsToProcess = campaignsToProcess.slice(offset, offset + campaignLimit)
  const hasMore = offset + campaignLimit < totalCampaigns

  console.log(
    `backfill-positive: ${totalCampaigns} total campaigns, ` +
    `processing ${campaignsToProcess.length} (offset=${offset}, limit=${campaignLimit})` +
    `${filterCampaignId ? `, filter=${filterCampaignId}` : ''}`
  )

  if (campaignsToProcess.length === 0) {
    return NextResponse.json({
      message: 'No campaigns to process',
      total_campaigns: totalCampaigns,
      campaigns_processed: 0,
      next_offset: null,
    })
  }

  let totalInserted = 0
  let totalEmailsCached = 0
  let totalLeadsScanned = 0
  let totalPositiveFound = 0

  const campaignDetails: Array<{
    campaign_id: string
    client_id: string
    total_leads: number
    positive_leads: number
    inserted: number
    emails_cached: number
    positive_emails: string[]
  }> = []

  for (let ci = 0; ci < campaignsToProcess.length; ci++) {
    const { client_id: clientId, campaign_id: campaignId } = campaignsToProcess[ci]

    if (ci > 0) await delay(RATE_LIMIT_DELAY_MS)

    console.log(
      `backfill-positive [${ci + 1}/${campaignsToProcess.length}]: ` +
      `campaign=${campaignId}, client=${clientId}`
    )

    // Paginate through ALL leads for this campaign
    let cursor: string | undefined
    let campaignTotalLeads = 0
    let campaignPositive = 0
    let campaignInserted = 0
    let campaignEmailsCached = 0
    const positiveEmails: string[] = []

    try {
      do {
        const response = await listLeads(campaignId, {
          limit: 100,
          startingAfter: cursor,
        })

        const leads = response.items
        campaignTotalLeads += leads.length

        // Filter client-side on positive interest
        // eslint-disable-next-line eqeqeq
        const positiveLeads = leads.filter((l) => l.lt_interest_status == 1)
        campaignPositive += positiveLeads.length

        for (const lead of positiveLeads) {
          const emailLower = lead.email.toLowerCase().trim()
          positiveEmails.push(emailLower)

          const payload = lead.payload ?? {}
          const icpFields = normalizeIcpFields(payload)

          const row = {
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
            lead_status: lead.email_reply_count > 0 ? 'replied' : 'emailed',
            interest_status: 'positive',
            sender_account: lead.last_step_from,
            email_sent_count: lead.email_open_count > 0 ? 1 : 0,
            email_reply_count: lead.email_reply_count,
            linkedin_url: extractField(payload, ['LinkedIn', 'linkedin', 'linkedin_url', 'LinkedIn URL']),
            vacancy_url: extractField(payload, ['Vacancy URL', 'vacancy_url', 'Vacature URL', 'vacature_url']),
            payload: lead.payload,
            last_synced_at: new Date().toISOString(),
            updated_at: new Date().toISOString(),
          }

          const { error: upsertError } = await admin
            .from('synced_leads')
            .upsert(row, { onConflict: 'client_id,instantly_lead_id,campaign_id' })

          if (upsertError) {
            console.error(
              `backfill-positive: upsert failed for ${emailLower} → ` +
              `client=${clientId}, campaign=${campaignId}: ${upsertError.message}`
            )
          } else {
            campaignInserted++
          }

          // Cache emails for this lead
          try {
            const emailResponse = await listEmails({ lead: emailLower, limit: 100 })
            const emails = emailResponse.items

            if (emails.length > 0) {
              const cacheRows = emails.map((e) => ({
                client_id: clientId,
                instantly_email_id: e.id,
                thread_id: e.thread_id,
                lead_email: e.lead?.toLowerCase() ?? emailLower,
                from_address: e.from_address_email,
                to_address: e.to_address_email_list,
                subject: e.subject,
                body_text: e.body?.text ?? null,
                body_html: e.body?.html ?? null,
                is_reply: e.ue_type === 2,
                sender_account: e.ue_type === 2 ? null : e.from_address_email,
                email_timestamp: e.timestamp_email ?? e.timestamp_created,
              }))

              const { error: cacheError } = await admin
                .from('cached_emails')
                .upsert(cacheRows, { onConflict: 'instantly_email_id' })

              if (cacheError) {
                console.error(`backfill-positive: cache emails failed for ${emailLower}:`, cacheError.message)
              } else {
                campaignEmailsCached += cacheRows.length
              }

              // Update reply data on synced_leads
              const latestReply = emails
                .filter((e) => e.ue_type === 2)
                .sort((a, b) => (b.timestamp_email ?? b.timestamp_created).localeCompare(
                  a.timestamp_email ?? a.timestamp_created
                ))[0]

              if (latestReply) {
                await admin
                  .from('synced_leads')
                  .update({
                    reply_subject: latestReply.subject ?? null,
                    reply_content: latestReply.body?.html ?? latestReply.body?.text ?? null,
                    client_has_replied: false,
                  })
                  .eq('client_id', clientId)
                  .eq('campaign_id', campaignId)
                  .eq('email', lead.email)
              }
            }
          } catch (error) {
            console.error(`backfill-positive: emails fetch failed for ${emailLower}:`, error)
          }

          await delay(RATE_LIMIT_DELAY_MS)
        }

        cursor = response.next_starting_after ?? undefined
        if (cursor) await delay(RATE_LIMIT_DELAY_MS)
      } while (cursor)
    } catch (error) {
      console.error(
        `backfill-positive: listLeads failed for campaign ${campaignId}:`,
        error instanceof Error ? error.message : error
      )
    }

    totalLeadsScanned += campaignTotalLeads
    totalPositiveFound += campaignPositive
    totalInserted += campaignInserted
    totalEmailsCached += campaignEmailsCached

    campaignDetails.push({
      campaign_id: campaignId,
      client_id: clientId,
      total_leads: campaignTotalLeads,
      positive_leads: campaignPositive,
      inserted: campaignInserted,
      emails_cached: campaignEmailsCached,
      positive_emails: positiveEmails,
    })

    console.log(
      `backfill-positive: campaign ${campaignId} done — ` +
      `${campaignTotalLeads} leads scanned, ${campaignPositive} positive, ` +
      `${campaignInserted} inserted, ${campaignEmailsCached} emails cached`
    )
  }

  const summary = {
    total_campaigns: totalCampaigns,
    campaigns_processed: campaignsToProcess.length,
    next_offset: hasMore ? offset + campaignLimit : null,
    total_leads_scanned: totalLeadsScanned,
    total_positive_found: totalPositiveFound,
    total_inserted: totalInserted,
    total_emails_cached: totalEmailsCached,
    campaigns: campaignDetails,
  }

  console.log(
    `backfill-positive: batch done — ${campaignsToProcess.length} campaigns, ` +
    `${totalLeadsScanned} leads scanned, ${totalPositiveFound} positive, ` +
    `${totalInserted} inserted, ${totalEmailsCached} emails cached` +
    `${hasMore ? `, next_offset=${offset + campaignLimit}` : ', ALL DONE'}`
  )

  return NextResponse.json(summary)
}

/** Extract a field from payload using case-insensitive key matching */
function extractField(payload: Record<string, unknown>, variants: string[]): string | null {
  for (const variant of variants) {
    const key = Object.keys(payload).find((k) => k.toLowerCase() === variant.toLowerCase())
    if (key && payload[key] != null && String(payload[key]).trim() !== '') {
      return String(payload[key]).trim()
    }
  }
  return null
}

/** Normalize ICP fields from lead payload */
function normalizeIcpFields(payload: Record<string, unknown>) {
  return {
    job_title: extractField(payload, ['Job Title', 'job_title', 'Functie', 'functie']),
    industry: extractField(payload, ['Industry', 'industry', 'Branche', 'branche']),
    company_size: extractField(payload, ['Company Size', 'company_size', 'Bedrijfsgrootte', 'bedrijfsgrootte']),
  }
}
