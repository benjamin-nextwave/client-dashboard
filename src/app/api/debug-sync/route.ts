export const runtime = 'nodejs'

import { NextResponse } from 'next/server'
import { createAdminClient } from '@/lib/supabase/admin'
import { listLeads, listEmails } from '@/lib/instantly/client'

export const dynamic = 'force-dynamic'

/**
 * Debug endpoint to inspect what the Instantly API actually returns
 * for interest status fields, so we can fix the inbox logic.
 *
 * Usage: GET /api/debug-sync?client_id=<uuid>
 */
export async function GET(request: Request) {
  try {
    const url = new URL(request.url)
    const clientId = url.searchParams.get('client_id')

    const supabase = createAdminClient()

    // If no client_id, list all clients with their lead counts
    if (!clientId) {
      const { data: clients } = await supabase
        .from('clients')
        .select('id, company_name')

      const { data: allLeads } = await supabase
        .from('synced_leads')
        .select('client_id, interest_status')

      const summary: Record<string, { company: string; total: number; positive: number; neutral: number; negative: number; null_status: number }> = {}
      for (const c of clients ?? []) {
        summary[c.id] = { company: c.company_name, total: 0, positive: 0, neutral: 0, negative: 0, null_status: 0 }
      }
      for (const l of allLeads ?? []) {
        const s = summary[l.client_id]
        if (!s) continue
        s.total++
        if (l.interest_status === 'positive') s.positive++
        else if (l.interest_status === 'neutral') s.neutral++
        else if (l.interest_status === 'negative') s.negative++
        else s.null_status++
      }

      return NextResponse.json({ clients: summary })
    }

    // For a specific client: deep inspection
    const { data: campaigns } = await supabase
      .from('client_campaigns')
      .select('campaign_id, campaign_name')
      .eq('client_id', clientId)

    if (!campaigns || campaigns.length === 0) {
      return NextResponse.json({ error: 'No campaigns for this client' })
    }

    const results: Record<string, unknown> = {}

    for (const camp of campaigns) {
      // 1. Fetch first page of leads from Instantly API (raw)
      const leadsResponse = await listLeads(camp.campaign_id, { limit: 5 })
      const rawLeadSample = leadsResponse.items.map(l => ({
        id: l.id,
        email: l.email,
        status: l.status,
        lt_interest_status: l.lt_interest_status,
        label_ids: l.label_ids,
        email_reply_count: l.email_reply_count,
        // Include ALL fields to see what Instantly returns
        _raw_keys: Object.keys(l),
      }))

      // 2. Fetch first page of emails from Instantly API (raw)
      const emailsResponse = await listEmails({
        campaignId: camp.campaign_id,
        limit: 10,
      })
      const rawEmailSample = emailsResponse.items.map(e => ({
        id: e.id,
        from: e.from_address_email,
        to: e.to_address_email_list,
        ue_type: e.ue_type,
        lead: e.lead,
        i_status: e.i_status,
        subject: e.subject?.substring(0, 50),
        _raw_keys: Object.keys(e),
      }))

      // 3. Count i_status distribution across ALL emails (just first 100)
      const iStatusDist: Record<string, number> = {}
      for (const e of emailsResponse.items) {
        const key = String(e.i_status ?? 'null/undefined')
        iStatusDist[key] = (iStatusDist[key] || 0) + 1
      }

      // 4. Check what's in the DB right now
      const { data: dbLeads } = await supabase
        .from('synced_leads')
        .select('interest_status')
        .eq('client_id', clientId)
        .eq('campaign_id', camp.campaign_id)

      const dbDist: Record<string, number> = {}
      for (const l of dbLeads ?? []) {
        const key = l.interest_status ?? 'null'
        dbDist[key] = (dbDist[key] || 0) + 1
      }

      // 5. Try fetching with interest_value=1 to see if it actually filters
      const interestedResponse = await listLeads(camp.campaign_id, {
        limit: 5,
        interestStatus: 1,
      })

      results[camp.campaign_name] = {
        campaign_id: camp.campaign_id,
        api_leads_sample: rawLeadSample,
        api_leads_total_in_first_page: leadsResponse.items.length,
        api_leads_with_interest_filter: interestedResponse.items.length,
        api_interested_leads_have_next: !!interestedResponse.next_starting_after,
        api_emails_sample: rawEmailSample,
        api_email_i_status_distribution: iStatusDist,
        db_interest_status_distribution: dbDist,
        db_total_leads: dbLeads?.length ?? 0,
      }
    }

    return NextResponse.json({ clientId, campaigns: results })
  } catch (e: unknown) {
    return NextResponse.json({ error: e instanceof Error ? e.message : String(e) }, { status: 500 })
  }
}
