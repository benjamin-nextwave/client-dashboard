export const runtime = 'nodejs'
export const maxDuration = 120
export const dynamic = 'force-dynamic'

import { NextResponse } from 'next/server'
import { createAdminClient } from '@/lib/supabase/admin'
import { listLeads, listEmails } from '@/lib/instantly/client'

/**
 * Webhook endpoint for Make.com lead notifications.
 * Protected by CRON_SECRET.
 *
 * Required payload: { "Email": "lead@example.com", "campaign_id": "abc-123" }
 *
 * Flow:
 * 1. Look up client_id via client_campaigns WHERE campaign_id = campaign_id
 * 2. Fetch lead data from Instantly via listLeads(search=email)
 * 3. Upsert into synced_leads with correct (client_id, campaign_id)
 * 4. Cache emails for this lead
 *
 * No getCampaignsForEmail needed — campaign_id comes directly from Instantly via Make.com.
 */
export async function POST(request: Request) {
  const cronSecret = process.env.CRON_SECRET
  if (cronSecret) {
    const authHeader = request.headers.get('authorization')
    if (authHeader !== `Bearer ${cronSecret}`) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }
  }

  let rawBody: Record<string, unknown>
  try {
    rawBody = await request.json()
  } catch {
    return NextResponse.json({ error: 'Invalid JSON body' }, { status: 400 })
  }

  // Normalize keys to lowercase
  const body: Record<string, unknown> = {}
  for (const [key, value] of Object.entries(rawBody)) {
    body[key.toLowerCase()] = value
  }

  const email = body.email ? String(body.email).toLowerCase().trim() : null
  const campaignId = body.campaign_id ? String(body.campaign_id).trim() : null

  if (!email) {
    return NextResponse.json({ error: 'email is required' }, { status: 400 })
  }

  if (!campaignId) {
    return NextResponse.json({ error: 'campaign_id is required' }, { status: 400 })
  }

  console.log(`Webhook: sync ${email} for campaign ${campaignId}`)

  const admin = createAdminClient()

  // Look up client_id via client_campaigns
  const { data: cc, error: ccError } = await admin
    .from('client_campaigns')
    .select('client_id')
    .eq('campaign_id', campaignId)
    .single()

  if (ccError || !cc) {
    console.error(`Webhook: campaign_id ${campaignId} not found in client_campaigns`)
    return NextResponse.json({
      error: `campaign_id ${campaignId} not found in client_campaigns`,
    }, { status: 404 })
  }

  const clientId = cc.client_id

  // Fetch lead data from Instantly
  let leadData: {
    id: string
    first_name: string | null
    last_name: string | null
    company_name: string | null
    phone: string | null
    website: string | null
    email_open_count: number
    email_reply_count: number
    last_step_from: string | null
    lt_interest_status?: number | string | null
    payload: Record<string, unknown>
  } | null = null

  try {
    const response = await listLeads(campaignId, { search: email, limit: 10 })
    const exactMatch = response.items.find(
      (l) => l.email.toLowerCase().trim() === email
    )
    if (exactMatch) {
      leadData = exactMatch
    }
  } catch (error) {
    console.error(`Webhook: listLeads search failed for ${email}:`, error)
  }

  // Map interest status
  let interestStatus: string | null = 'positive' // Default: webhook means positive
  if (leadData?.lt_interest_status != null) {
    const raw = leadData.lt_interest_status
    // eslint-disable-next-line eqeqeq
    if (raw == 1) interestStatus = 'positive'
    // eslint-disable-next-line eqeqeq
    else if (raw == 0) interestStatus = 'neutral'
    // eslint-disable-next-line eqeqeq
    else if (raw == -1) interestStatus = 'negative'
  }

  // Extract ICP fields from payload
  const payload = leadData?.payload ?? {}
  const extractField = (variants: string[]): string | null => {
    for (const variant of variants) {
      const key = Object.keys(payload).find((k) => k.toLowerCase() === variant.toLowerCase())
      if (key && payload[key] != null && String(payload[key]).trim() !== '') {
        return String(payload[key]).trim()
      }
    }
    return null
  }

  // Upsert into synced_leads
  const row = {
    client_id: clientId,
    instantly_lead_id: leadData?.id ?? email, // fallback to email if lead not found
    campaign_id: campaignId,
    email,
    first_name: leadData?.first_name ?? null,
    last_name: leadData?.last_name ?? null,
    company_name: leadData?.company_name ?? null,
    job_title: extractField(['Job Title', 'job_title', 'Functie', 'functie']),
    industry: extractField(['Industry', 'industry', 'Branche', 'branche']),
    company_size: extractField(['Company Size', 'company_size', 'Bedrijfsgrootte', 'bedrijfsgrootte']),
    website: leadData?.website ?? null,
    phone: leadData?.phone ?? null,
    lead_status: (leadData?.email_reply_count ?? 0) > 0 ? 'replied' : 'emailed',
    interest_status: interestStatus,
    sender_account: leadData?.last_step_from ?? null,
    email_sent_count: (leadData?.email_open_count ?? 0) > 0 ? 1 : 0,
    email_reply_count: leadData?.email_reply_count ?? 0,
    linkedin_url: extractField(['LinkedIn', 'linkedin', 'linkedin_url', 'LinkedIn URL']),
    vacancy_url: extractField(['Vacancy URL', 'vacancy_url', 'Vacature URL', 'vacature_url']),
    payload: leadData?.payload ?? null,
    last_synced_at: new Date().toISOString(),
    updated_at: new Date().toISOString(),
  }

  const { error: upsertError } = await admin
    .from('synced_leads')
    .upsert(row, { onConflict: 'client_id,instantly_lead_id,campaign_id' })

  if (upsertError) {
    console.error(`Webhook: upsert failed for ${email}:`, upsertError.message)
    return NextResponse.json({
      error: `Upsert failed: ${upsertError.message}`,
    }, { status: 500 })
  }

  // Cache emails for this lead
  let emailsCached = 0
  try {
    const emailResponse = await listEmails({ lead: email, limit: 100 })
    const emails = emailResponse.items

    if (emails.length > 0) {
      const cacheRows = emails.map((e) => ({
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

      await admin
        .from('cached_emails')
        .upsert(cacheRows, { onConflict: 'instantly_email_id' })

      emailsCached = cacheRows.length

      // Update reply data on synced_leads
      const latestReply = emails
        .filter((e) => e.ue_type === 2)
        .sort((a, b) =>
          (b.timestamp_email ?? b.timestamp_created).localeCompare(
            a.timestamp_email ?? a.timestamp_created
          )
        )[0]

      if (latestReply) {
        await admin
          .from('synced_leads')
          .update({
            reply_subject: latestReply.subject ?? null,
            reply_content: latestReply.body?.html ?? latestReply.body?.text ?? null,
          })
          .eq('client_id', clientId)
          .eq('campaign_id', campaignId)
          .eq('email', email)
      }
    }
  } catch (error) {
    console.error(`Webhook: email cache failed for ${email}:`, error)
  }

  console.log(
    `Webhook: synced ${email} → client=${clientId}, campaign=${campaignId}, ` +
    `interest=${interestStatus}, ${emailsCached} emails cached`
  )

  return NextResponse.json({
    synced: true,
    email,
    campaign_id: campaignId,
    client_id: clientId,
    interest_status: interestStatus,
    emails_cached: emailsCached,
    lead_found: !!leadData,
  })
}
