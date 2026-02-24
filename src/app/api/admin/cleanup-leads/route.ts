export const runtime = 'nodejs'
export const maxDuration = 300
export const dynamic = 'force-dynamic'

import { NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { createAdminClient } from '@/lib/supabase/admin'
import { getCampaignsForEmail } from '@/lib/instantly/client'

const RATE_LIMIT_DELAY_MS = 500
const DEFAULT_LIMIT = 50

function delay(ms: number): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, ms))
}

/**
 * Bulk cleanup: for every unique email in synced_leads, ask Instantly which
 * campaigns that email actually belongs to (via search-by-contact API).
 * Then delete any synced_leads rows where the campaign_id is NOT in the
 * Instantly response.
 *
 * Supports cursor-based pagination to avoid Vercel timeout:
 *   ?limit=50          — max emails per batch (default 50)
 *   ?cursor=email@x.com — start after this email (from previous response's next_cursor)
 *   ?dry_run=true      — only report, don't delete
 *   ?client_id=X       — only clean up a specific client
 *
 * Call repeatedly until next_cursor is null:
 *   POST /api/admin/cleanup-leads?limit=50
 *   POST /api/admin/cleanup-leads?limit=50&cursor=john@example.com
 *   ...until next_cursor is null
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
  const limit = Math.min(Math.max(parseInt(searchParams.get('limit') ?? '', 10) || DEFAULT_LIMIT, 1), 500)
  const cursor = searchParams.get('cursor')?.toLowerCase().trim() ?? null

  const admin = createAdminClient()

  console.log(
    `=== cleanup-leads: starting batch` +
    `${dryRun ? ' (DRY RUN)' : ''}` +
    `${filterClientId ? ` for client ${filterClientId}` : ''}` +
    `, limit=${limit}` +
    `${cursor ? `, cursor=${cursor}` : ''} ===`
  )

  // 1. Get all unique emails from synced_leads, sorted alphabetically for stable cursor
  let emailQuery = admin
    .from('synced_leads')
    .select('email')

  if (filterClientId) {
    emailQuery = emailQuery.eq('client_id', filterClientId)
  }

  const { data: allLeadRows, error: queryError } = await emailQuery

  if (queryError) {
    return NextResponse.json({ error: `Failed to query synced_leads: ${queryError.message}` }, { status: 500 })
  }

  if (!allLeadRows || allLeadRows.length === 0) {
    return NextResponse.json({ message: 'No synced_leads to check', next_cursor: null, results: [] })
  }

  // Dedupe and sort for stable pagination
  const allUniqueEmails = [...new Set(allLeadRows.map((r) => r.email.toLowerCase().trim()))].sort()

  // Apply cursor: skip emails up to and including the cursor
  let startIndex = 0
  if (cursor) {
    const cursorIndex = allUniqueEmails.indexOf(cursor)
    if (cursorIndex >= 0) {
      startIndex = cursorIndex + 1
    } else {
      // Cursor not found — find first email that sorts after cursor
      startIndex = allUniqueEmails.findIndex((e) => e > cursor)
      if (startIndex < 0) startIndex = allUniqueEmails.length
    }
  }

  // Slice the batch
  const batchEmails = allUniqueEmails.slice(startIndex, startIndex + limit)
  const hasMore = startIndex + limit < allUniqueEmails.length
  const nextCursor = hasMore ? batchEmails[batchEmails.length - 1] : null

  console.log(
    `cleanup-leads: ${allUniqueEmails.length} total unique emails, ` +
    `processing batch of ${batchEmails.length} (index ${startIndex}–${startIndex + batchEmails.length - 1})` +
    `${hasMore ? `, next_cursor=${nextCursor}` : ', this is the last batch'}`
  )

  if (batchEmails.length === 0) {
    return NextResponse.json({
      message: 'No more emails to process',
      next_cursor: null,
      unique_emails_total: allUniqueEmails.length,
      batch_size: 0,
      total_kept: 0,
      total_removed: 0,
      details: [],
    })
  }

  let totalRemoved = 0
  let totalKept = 0
  let totalEmailsRemoved = 0
  let totalApiErrors = 0

  const removedDetails: Array<{
    email: string
    removed_pairs: Array<{ client_id: string; campaign_id: string }>
    instantly_campaigns: string[]
  }> = []

  // 2. Process each email in the batch sequentially
  for (let i = 0; i < batchEmails.length; i++) {
    const email = batchEmails[i]

    // Rate limit: max 2 calls per second
    if (i > 0) {
      await delay(RATE_LIMIT_DELAY_MS)
    }

    // Ask Instantly which campaigns this email belongs to
    let instantlyCampaignIds: string[]
    try {
      instantlyCampaignIds = await getCampaignsForEmail(email)
    } catch (error) {
      console.error(`cleanup-leads: getCampaignsForEmail failed for ${email}:`, error)
      totalApiErrors++
      continue
    }

    const instantlyCampaignSet = new Set(instantlyCampaignIds)

    // Get all synced_leads for this email
    let leadsQuery = admin
      .from('synced_leads')
      .select('id, client_id, campaign_id')
      .eq('email', email)

    if (filterClientId) {
      leadsQuery = leadsQuery.eq('client_id', filterClientId)
    }

    const { data: syncedLeads } = await leadsQuery

    if (!syncedLeads || syncedLeads.length === 0) continue

    // Get valid (client_id, campaign_id) pairs from client_campaigns
    // A row is valid ONLY if BOTH:
    //   1. campaign_id is in Instantly response (lead actually in that campaign)
    //   2. (client_id, campaign_id) is in client_campaigns (campaign belongs to that client)
    const { data: validPairs } = await admin
      .from('client_campaigns')
      .select('client_id, campaign_id')
      .in('campaign_id', instantlyCampaignIds)

    const validPairSet = new Set(
      (validPairs ?? []).map((p) => `${p.client_id}:${p.campaign_id}`)
    )

    const validLeads = syncedLeads.filter(
      (sl) => instantlyCampaignSet.has(sl.campaign_id) && validPairSet.has(`${sl.client_id}:${sl.campaign_id}`)
    )
    const staleLeads = syncedLeads.filter(
      (sl) => !instantlyCampaignSet.has(sl.campaign_id) || !validPairSet.has(`${sl.client_id}:${sl.campaign_id}`)
    )

    totalKept += validLeads.length

    if (staleLeads.length === 0) continue

    console.log(
      `cleanup-leads: ${email} — Instantly has ${instantlyCampaignIds.length} campaign(s) [${instantlyCampaignIds.join(', ')}], ` +
      `DB has ${syncedLeads.length} row(s), removing ${staleLeads.length} stale row(s)`
    )

    const removedPairs = staleLeads.map((sl) => ({
      client_id: sl.client_id,
      campaign_id: sl.campaign_id,
    }))

    if (!dryRun) {
      // Delete stale synced_leads
      const staleIds = staleLeads.map((sl) => sl.id)
      const { error: delError } = await admin
        .from('synced_leads')
        .delete()
        .in('id', staleIds)

      if (delError) {
        console.error(`cleanup-leads: failed to delete stale synced_leads for ${email}:`, delError.message)
      }

      // Clean up orphaned cached_emails
      const affectedClientIds = [...new Set(staleLeads.map((sl) => sl.client_id))]
      for (const clientId of affectedClientIds) {
        const { data: remaining } = await admin
          .from('synced_leads')
          .select('id')
          .eq('client_id', clientId)
          .eq('email', email)
          .limit(1)

        if (!remaining || remaining.length === 0) {
          const { error: ceDelError } = await admin
            .from('cached_emails')
            .delete()
            .eq('client_id', clientId)
            .eq('lead_email', email)

          if (ceDelError) {
            console.error(`cleanup-leads: failed to delete cached_emails for ${clientId}/${email}:`, ceDelError.message)
          } else {
            totalEmailsRemoved++
          }
        }
      }
    }

    totalRemoved += staleLeads.length

    removedDetails.push({
      email,
      removed_pairs: removedPairs,
      instantly_campaigns: instantlyCampaignIds,
    })
  }

  const summary = {
    dry_run: dryRun,
    next_cursor: nextCursor,
    unique_emails_total: allUniqueEmails.length,
    batch_size: batchEmails.length,
    batch_start_index: startIndex,
    total_kept: totalKept,
    total_removed: totalRemoved,
    total_cached_emails_cleaned: totalEmailsRemoved,
    api_errors: totalApiErrors,
    emails_with_removals: removedDetails.length,
    details: removedDetails,
  }

  console.log(
    `=== cleanup-leads: batch done — ${totalRemoved} removed, ${totalKept} kept` +
    `${dryRun ? ' (DRY RUN)' : ''}` +
    `${nextCursor ? `, next_cursor=${nextCursor}` : ', ALL DONE'} ===`
  )

  return NextResponse.json(summary)
}
