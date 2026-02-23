export const runtime = 'nodejs'
export const dynamic = 'force-dynamic'

import { NextResponse } from 'next/server'
import { createAdminClient } from '@/lib/supabase/admin'

const BASE_URL = 'https://api.instantly.ai/api/v2'

/**
 * Debug endpoint to inspect what Instantly API returns for a lead.
 * Shows raw API response, DB state, and interest_status derivation.
 *
 * GET /api/debug-lead?email=test@example.com
 * Authorization: Bearer <CRON_SECRET>
 */
export async function GET(request: Request) {
  const cronSecret = process.env.CRON_SECRET
  if (cronSecret) {
    const authHeader = request.headers.get('authorization')
    if (authHeader !== `Bearer ${cronSecret}`) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }
  }

  const { searchParams } = new URL(request.url)
  const email = searchParams.get('email')

  if (!email) {
    return NextResponse.json({ error: 'email query param required' }, { status: 400 })
  }

  const supabase = createAdminClient()
  const results: Record<string, unknown> = {}

  // 1. Check DB state
  const { data: dbLeads } = await supabase
    .from('synced_leads')
    .select('id, email, interest_status, lead_status, campaign_id, client_id, last_synced_at, updated_at')
    .ilike('email', email)

  results.db_leads = dbLeads ?? []

  // 2. Get campaigns for the client(s) found
  const clientIds = [...new Set((dbLeads ?? []).map((l) => l.client_id))]
  const campaignIds: string[] = []

  if (clientIds.length > 0) {
    const { data: campaigns } = await supabase
      .from('client_campaigns')
      .select('campaign_id, client_id')
      .in('client_id', clientIds)

    results.campaigns = campaigns ?? []
    campaignIds.push(...(campaigns ?? []).map((c) => c.campaign_id))
  }

  // 3. Call Instantly API to get raw lead data for each campaign
  const apiKey = process.env.INSTANTLY_API_KEY
  if (apiKey && campaignIds.length > 0) {
    const apiResults: Record<string, unknown>[] = []

    for (const campaignId of campaignIds) {
      // Search for this lead in the campaign
      const response = await fetch(`${BASE_URL}/leads/list`, {
        method: 'POST',
        headers: {
          Authorization: `Bearer ${apiKey}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          campaign_id: campaignId,
          search: email,
          limit: 10,
        }),
        cache: 'no-store',
      })

      if (response.ok) {
        const data = await response.json()
        // Show the RAW items with all fields, especially lt_interest_status
        for (const lead of data.items ?? []) {
          if (lead.email?.toLowerCase() === email.toLowerCase()) {
            apiResults.push({
              campaign_id: campaignId,
              raw_lead: lead,
              lt_interest_status_value: lead.lt_interest_status,
              lt_interest_status_type: typeof lead.lt_interest_status,
              // Check all possible interest-related fields
              all_interest_fields: Object.fromEntries(
                Object.entries(lead).filter(([k]) =>
                  k.toLowerCase().includes('interest') || k.toLowerCase().includes('status')
                )
              ),
            })
          }
        }

        // If search didn't find it, also show what the API returned
        if ((data.items ?? []).length === 0) {
          apiResults.push({
            campaign_id: campaignId,
            note: 'No leads found with search parameter',
            raw_response: data,
          })
        }
      } else {
        apiResults.push({
          campaign_id: campaignId,
          error: `API returned ${response.status} ${response.statusText}`,
          body: await response.text(),
        })
      }
    }

    results.instantly_api = apiResults
  }

  // 4. Check emails for this lead
  const { data: emails } = await supabase
    .from('cached_emails')
    .select('instantly_email_id, lead_email, is_reply, email_timestamp, subject')
    .ilike('lead_email', email)
    .order('email_timestamp', { ascending: false })
    .limit(5)

  results.cached_emails = emails ?? []

  // 5. Also fetch raw emails from Instantly API for this lead
  if (apiKey) {
    const emailsResponse = await fetch(
      `${BASE_URL}/emails?lead=${encodeURIComponent(email)}&limit=5`,
      {
        headers: {
          Authorization: `Bearer ${apiKey}`,
          'Content-Type': 'application/json',
        },
        cache: 'no-store',
      }
    )

    if (emailsResponse.ok) {
      const emailsData = await emailsResponse.json()
      results.instantly_emails = (emailsData.items ?? []).map((e: Record<string, unknown>) => ({
        id: e.id,
        i_status: e.i_status,
        i_status_type: typeof e.i_status,
        ue_type: e.ue_type,
        lead: e.lead,
        from: e.from_address_email,
        to: e.to_address_email_list,
        subject: e.subject,
        timestamp: e.timestamp_email ?? e.timestamp_created,
      }))
    }
  }

  return NextResponse.json(results, { status: 200 })
}
