export const runtime = 'nodejs'
export const maxDuration = 300
export const dynamic = 'force-dynamic'

import { NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { createAdminClient } from '@/lib/supabase/admin'
import { listLeads } from '@/lib/instantly/client'

const RATE_LIMIT_DELAY_MS = 500

function delay(ms: number): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, ms))
}

/**
 * Bulk cleanup: verify every (campaign_id, email) in synced_leads against the
 * Instantly API. Removes rows where the lead does NOT actually exist in that campaign.
 *
 * Efficient: fetches ALL leads per campaign (1 API call per campaign), then
 * cross-references with synced_leads in bulk.
 *
 * Protected: operator-only.
 *
 * Optional query params:
 *   ?dry_run=true  — only report, don't delete
 *   ?client_id=X   — only clean up a specific client
 */
export async function POST(request: Request) {
  // Auth check — operator only
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()

  if (!user) {
    return NextResponse.json({ error: 'Not authenticated' }, { status: 401 })
  }

  const userRole = user.app_metadata?.user_role
  if (userRole !== 'operator') {
    return NextResponse.json({ error: 'Forbidden — operator only' }, { status: 403 })
  }

  const { searchParams } = new URL(request.url)
  const dryRun = searchParams.get('dry_run') === 'true'
  const filterClientId = searchParams.get('client_id') ?? null

  const admin = createAdminClient()

  console.log(`=== cleanup-leads: starting${dryRun ? ' (DRY RUN)' : ''}${filterClientId ? ` for client ${filterClientId}` : ''} ===`)

  // 1. Get all unique campaign_ids from synced_leads (optionally filtered by client)
  let campaignQuery = admin
    .from('synced_leads')
    .select('campaign_id, client_id')

  if (filterClientId) {
    campaignQuery = campaignQuery.eq('client_id', filterClientId)
  }

  const { data: allPairs, error: pairsError } = await campaignQuery

  if (pairsError) {
    return NextResponse.json({ error: `Failed to query synced_leads: ${pairsError.message}` }, { status: 500 })
  }

  if (!allPairs || allPairs.length === 0) {
    return NextResponse.json({ message: 'No synced_leads to check', results: [] })
  }

  // Get unique campaign_ids
  const uniqueCampaignIds = [...new Set(allPairs.map((p) => p.campaign_id))]

  console.log(`cleanup-leads: ${allPairs.length} total (client_id, campaign_id) pairs across ${uniqueCampaignIds.length} unique campaigns`)

  const results: Array<{
    campaign_id: string
    instantly_lead_count: number
    synced_lead_count: number
    kept: number
    removed: number
    removed_emails: string[]
  }> = []

  let totalRemoved = 0
  let totalKept = 0
  let totalEmailsRemoved = 0

  // 2. Process each campaign sequentially
  for (const campaignId of uniqueCampaignIds) {
    console.log(`cleanup-leads: processing campaign ${campaignId}...`)

    // Fetch ALL leads from Instantly for this campaign
    let instantlyEmails: Set<string>
    try {
      const allLeads = await fetchAllLeadsForCampaign(campaignId)
      instantlyEmails = new Set(allLeads.map((l) => l.email.toLowerCase().trim()))
      console.log(`cleanup-leads: campaign ${campaignId} has ${instantlyEmails.size} leads in Instantly`)
    } catch (error) {
      console.error(`cleanup-leads: failed to fetch leads for campaign ${campaignId}:`, error)
      results.push({
        campaign_id: campaignId,
        instantly_lead_count: -1,
        synced_lead_count: 0,
        kept: 0,
        removed: 0,
        removed_emails: [`ERROR: ${error instanceof Error ? error.message : String(error)}`],
      })
      await delay(RATE_LIMIT_DELAY_MS)
      continue
    }

    // Fetch all synced_leads for this campaign (optionally filtered by client)
    let syncedQuery = admin
      .from('synced_leads')
      .select('id, client_id, email')
      .eq('campaign_id', campaignId)

    if (filterClientId) {
      syncedQuery = syncedQuery.eq('client_id', filterClientId)
    }

    const { data: syncedLeads, error: syncedError } = await syncedQuery

    if (syncedError) {
      console.error(`cleanup-leads: failed to query synced_leads for campaign ${campaignId}:`, syncedError.message)
      await delay(RATE_LIMIT_DELAY_MS)
      continue
    }

    if (!syncedLeads || syncedLeads.length === 0) {
      await delay(RATE_LIMIT_DELAY_MS)
      continue
    }

    // Compare: find synced_leads NOT in Instantly
    const toRemove = syncedLeads.filter(
      (sl) => !instantlyEmails.has(sl.email.toLowerCase().trim())
    )
    const toKeep = syncedLeads.length - toRemove.length

    console.log(
      `cleanup-leads: campaign ${campaignId} — ` +
      `${syncedLeads.length} in DB, ${toKeep} valid, ${toRemove.length} to remove`
    )

    if (toRemove.length > 0) {
      const removedEmails = toRemove.map((r) => r.email)

      if (!dryRun) {
        // Delete in batches of 50 to avoid oversized requests
        const BATCH_SIZE = 50
        for (let i = 0; i < toRemove.length; i += BATCH_SIZE) {
          const batch = toRemove.slice(i, i + BATCH_SIZE)
          const ids = batch.map((r) => r.id)

          const { error: delError } = await admin
            .from('synced_leads')
            .delete()
            .in('id', ids)

          if (delError) {
            console.error(`cleanup-leads: failed to delete batch:`, delError.message)
          }
        }

        // Clean up orphaned cached_emails for each removed lead
        // Group by client_id to batch the cleanup
        const clientLeadMap = new Map<string, string[]>()
        for (const removed of toRemove) {
          const leads = clientLeadMap.get(removed.client_id) ?? []
          leads.push(removed.email)
          clientLeadMap.set(removed.client_id, leads)
        }

        let emailsRemoved = 0
        for (const [clientId, leadEmails] of clientLeadMap) {
          // Only delete cached_emails if there are NO remaining synced_leads for this client/email
          for (const leadEmail of leadEmails) {
            const { data: remaining } = await admin
              .from('synced_leads')
              .select('id')
              .eq('client_id', clientId)
              .eq('email', leadEmail)
              .limit(1)

            if (!remaining || remaining.length === 0) {
              const { error: ceDelError } = await admin
                .from('cached_emails')
                .delete()
                .eq('client_id', clientId)
                .eq('lead_email', leadEmail)

              if (ceDelError) {
                console.error(`cleanup-leads: failed to delete cached_emails for ${clientId}/${leadEmail}:`, ceDelError.message)
              } else {
                emailsRemoved++
              }
            }
          }
        }

        totalEmailsRemoved += emailsRemoved
        console.log(`cleanup-leads: campaign ${campaignId} — removed ${toRemove.length} leads + ${emailsRemoved} cached emails`)
      } else {
        console.log(`cleanup-leads: DRY RUN — would remove ${toRemove.length} leads from campaign ${campaignId}: [${removedEmails.slice(0, 10).join(', ')}${removedEmails.length > 10 ? '...' : ''}]`)
      }

      results.push({
        campaign_id: campaignId,
        instantly_lead_count: instantlyEmails.size,
        synced_lead_count: syncedLeads.length,
        kept: toKeep,
        removed: toRemove.length,
        removed_emails: removedEmails,
      })

      totalRemoved += toRemove.length
    }

    totalKept += toKeep

    await delay(RATE_LIMIT_DELAY_MS)
  }

  const summary = {
    dry_run: dryRun,
    campaigns_checked: uniqueCampaignIds.length,
    total_kept: totalKept,
    total_removed: totalRemoved,
    total_cached_emails_removed: totalEmailsRemoved,
    campaigns_with_removals: results.length,
    details: results,
  }

  console.log(
    `=== cleanup-leads: DONE — ${totalRemoved} leads removed, ${totalKept} kept, ` +
    `${totalEmailsRemoved} cached emails removed${dryRun ? ' (DRY RUN)' : ''} ===`
  )

  return NextResponse.json(summary)
}

/**
 * Fetch ALL leads for a campaign using cursor pagination.
 */
async function fetchAllLeadsForCampaign(campaignId: string): Promise<Array<{ email: string }>> {
  const allLeads: Array<{ email: string }> = []
  let cursor: string | undefined

  do {
    const response = await listLeads(campaignId, {
      limit: 100,
      startingAfter: cursor,
    })

    allLeads.push(...response.items.map((l) => ({ email: l.email })))
    cursor = response.next_starting_after ?? undefined

    if (cursor) {
      await delay(200)
    }
  } while (cursor)

  return allLeads
}
