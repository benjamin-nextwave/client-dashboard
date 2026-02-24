export const runtime = 'nodejs'
export const maxDuration = 300
export const dynamic = 'force-dynamic'

import { NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { createAdminClient } from '@/lib/supabase/admin'
import { listLeads, listEmails, getCampaignsForEmail } from '@/lib/instantly/client'
import type { InstantlyLead, InstantlyEmail } from '@/lib/instantly/types'

const RATE_LIMIT_DELAY_MS = 500
const DEFAULT_LIMIT = 10

function delay(ms: number): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, ms))
}

/**
 * Backfill only positive-interest leads from the Instantly global pool.
 *
 * 1. Fetch positive leads via listLeads (interest_value=1) — paginated from global pool
 * 2. Per lead: getCampaignsForEmail → which campaigns?
 * 3. Per campaign: look up client_id in client_campaigns
 * 4. INSERT into synced_leads with correct (client_id, campaign_id)
 * 5. Cache emails for the lead
 *
 * Supports cursor-based pagination:
 *   ?limit=10          — leads per batch (default 10)
 *   ?cursor=<id>       — Instantly pagination cursor (from previous next_cursor)
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
  const limit = Math.min(
    Math.max(parseInt(searchParams.get('limit') ?? '', 10) || DEFAULT_LIMIT, 1),
    100
  )
  const cursor = searchParams.get('cursor') ?? undefined

  const admin = createAdminClient()

  console.log(
    `backfill-positive: starting batch, limit=${limit}` +
    `${cursor ? `, cursor=${cursor}` : ''}`
  )

  // Pre-load client_campaigns mapping: campaign_id → client_id
  const { data: allClientCampaigns, error: ccError } = await admin
    .from('client_campaigns')
    .select('client_id, campaign_id')

  if (ccError || !allClientCampaigns) {
    return NextResponse.json({
      error: `Failed to load client_campaigns: ${ccError?.message}`,
    }, { status: 500 })
  }

  const campaignToClient = new Map<string, string>()
  for (const cc of allClientCampaigns) {
    campaignToClient.set(cc.campaign_id, cc.client_id)
  }

  // Fetch positive leads from Instantly (global pool, interest_value=1)
  // We pass a dummy campaign_id since the API ignores it anyway
  const dummyCampaignId = allClientCampaigns[0]?.campaign_id
  if (!dummyCampaignId) {
    return NextResponse.json({ error: 'No campaigns found' }, { status: 500 })
  }

  let leadsResponse
  try {
    leadsResponse = await listLeads(dummyCampaignId, {
      limit,
      startingAfter: cursor,
      interestStatus: 1, // positive only
    })
  } catch (error) {
    return NextResponse.json({
      error: `Failed to fetch positive leads: ${error instanceof Error ? error.message : String(error)}`,
    }, { status: 500 })
  }

  const leads = leadsResponse.items
  const nextCursor = leadsResponse.next_starting_after ?? null

  console.log(
    `backfill-positive: fetched ${leads.length} positive leads` +
    `${nextCursor ? `, next_cursor=${nextCursor}` : ', no more pages'}`
  )

  let totalInserted = 0
  let totalEmailsCached = 0
  let totalSkipped = 0
  let totalApiErrors = 0

  const details: Array<{
    email: string
    campaigns: Array<{ campaign_id: string; client_id: string }>
    emails_cached: number
  }> = []

  for (let i = 0; i < leads.length; i++) {
    const lead = leads[i]
    const emailLower = lead.email.toLowerCase().trim()

    if (i > 0) await delay(RATE_LIMIT_DELAY_MS)

    // Get campaigns for this lead from Instantly
    let instantlyCampaignIds: string[]
    try {
      instantlyCampaignIds = await getCampaignsForEmail(emailLower)
    } catch (error) {
      console.error(`backfill-positive: getCampaignsForEmail failed for ${emailLower}:`, error)
      totalApiErrors++
      continue
    }

    if (instantlyCampaignIds.length === 0) {
      console.log(`backfill-positive: ${emailLower} not found in any campaign — skipping`)
      totalSkipped++
      continue
    }

    // Map to (client_id, campaign_id) pairs
    const pairs: Array<{ client_id: string; campaign_id: string }> = []
    for (const campaignId of instantlyCampaignIds) {
      const clientId = campaignToClient.get(campaignId)
      if (clientId) {
        pairs.push({ client_id: clientId, campaign_id: campaignId })
      }
    }

    if (pairs.length === 0) {
      console.log(
        `backfill-positive: ${emailLower} is in campaigns [${instantlyCampaignIds.join(', ')}] ` +
        `but none are in client_campaigns — skipping`
      )
      totalSkipped++
      continue
    }

    // Build lead rows for each valid pair
    const payload = lead.payload ?? {}
    const icpFields = normalizeIcpFields(payload)

    for (const pair of pairs) {
      const row = {
        client_id: pair.client_id,
        instantly_lead_id: lead.id,
        campaign_id: pair.campaign_id,
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
          `client=${pair.client_id}, campaign=${pair.campaign_id}: ${upsertError.message}`
        )
      } else {
        totalInserted++
      }
    }

    // Cache emails for this lead
    let emailsCached = 0
    try {
      const emailResponse = await listEmails({ lead: emailLower, limit: 100 })
      const emails = emailResponse.items

      if (emails.length > 0) {
        // Cache for each client that has this lead
        const clientIds = [...new Set(pairs.map((p) => p.client_id))]
        for (const clientId of clientIds) {
          const cacheRows = emails.map((email) => ({
            client_id: clientId,
            instantly_email_id: email.id,
            thread_id: email.thread_id,
            lead_email: email.lead?.toLowerCase() ?? emailLower,
            from_address: email.from_address_email,
            to_address: email.to_address_email_list,
            subject: email.subject,
            body_text: email.body?.text ?? null,
            body_html: email.body?.html ?? null,
            is_reply: email.ue_type === 2,
            sender_account: email.ue_type === 2 ? null : email.from_address_email,
            email_timestamp: email.timestamp_email ?? email.timestamp_created,
          }))

          const { error: cacheError } = await admin
            .from('cached_emails')
            .upsert(cacheRows, { onConflict: 'instantly_email_id' })

          if (cacheError) {
            console.error(`backfill-positive: cache emails failed for ${emailLower}:`, cacheError.message)
          } else {
            emailsCached += cacheRows.length
          }
        }
      }

      // Also extract reply data and update synced_leads
      const latestReply = emails
        .filter((e) => e.ue_type === 2)
        .sort((a, b) => (b.timestamp_email ?? b.timestamp_created).localeCompare(
          a.timestamp_email ?? a.timestamp_created
        ))[0]

      if (latestReply) {
        for (const pair of pairs) {
          await admin
            .from('synced_leads')
            .update({
              reply_subject: latestReply.subject ?? null,
              reply_content: latestReply.body?.html ?? latestReply.body?.text ?? null,
              client_has_replied: false,
            })
            .eq('client_id', pair.client_id)
            .eq('campaign_id', pair.campaign_id)
            .eq('email', lead.email)
        }
      }
    } catch (error) {
      console.error(`backfill-positive: emails fetch failed for ${emailLower}:`, error)
    }

    totalEmailsCached += emailsCached

    details.push({
      email: emailLower,
      campaigns: pairs,
      emails_cached: emailsCached,
    })

    console.log(
      `backfill-positive [${i + 1}/${leads.length}]: ${emailLower} → ` +
      `${pairs.length} pair(s), ${emailsCached} emails cached`
    )
  }

  const summary = {
    next_cursor: nextCursor,
    batch_size: leads.length,
    total_inserted: totalInserted,
    total_emails_cached: totalEmailsCached,
    total_skipped: totalSkipped,
    api_errors: totalApiErrors,
    details,
  }

  console.log(
    `backfill-positive: batch done — ${totalInserted} inserted, ` +
    `${totalEmailsCached} emails cached, ${totalSkipped} skipped, ` +
    `${totalApiErrors} API errors` +
    `${nextCursor ? `, next_cursor=${nextCursor}` : ', ALL DONE'}`
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
