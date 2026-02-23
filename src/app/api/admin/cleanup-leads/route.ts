export const runtime = 'nodejs'
export const maxDuration = 300
export const dynamic = 'force-dynamic'

import { NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { createAdminClient } from '@/lib/supabase/admin'
import { getCampaignsForEmail } from '@/lib/instantly/client'

const RATE_LIMIT_DELAY_MS = 500

function delay(ms: number): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, ms))
}

/**
 * Bulk cleanup: for every unique email in synced_leads, ask Instantly which
 * campaigns that email actually belongs to (via search-by-contact API).
 * Then delete any synced_leads rows where the campaign_id is NOT in the
 * Instantly response.
 *
 * This is 1 API call per unique email (not per campaign).
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

  // 1. Get all unique emails from synced_leads (optionally filtered by client)
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
    return NextResponse.json({ message: 'No synced_leads to check', results: [] })
  }

  const uniqueEmails = [...new Set(allLeadRows.map((r) => r.email.toLowerCase().trim()))]

  console.log(`cleanup-leads: found ${uniqueEmails.length} unique emails to verify`)

  let totalRemoved = 0
  let totalKept = 0
  let totalEmailsRemoved = 0
  let totalApiErrors = 0

  const removedDetails: Array<{
    email: string
    removed_pairs: Array<{ client_id: string; campaign_id: string }>
    instantly_campaigns: string[]
  }> = []

  // 2. Process each email sequentially (1 API call per email, max 2/sec)
  for (let i = 0; i < uniqueEmails.length; i++) {
    const email = uniqueEmails[i]

    // Rate limit: max 2 calls per second (500ms between calls)
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

    // Get all synced_leads for this email (optionally filtered by client)
    let leadsQuery = admin
      .from('synced_leads')
      .select('id, client_id, campaign_id')
      .eq('email', email)

    if (filterClientId) {
      leadsQuery = leadsQuery.eq('client_id', filterClientId)
    }

    const { data: syncedLeads } = await leadsQuery

    if (!syncedLeads || syncedLeads.length === 0) continue

    // Split into valid and stale
    const validLeads = syncedLeads.filter((sl) => instantlyCampaignSet.has(sl.campaign_id))
    const staleLeads = syncedLeads.filter((sl) => !instantlyCampaignSet.has(sl.campaign_id))

    totalKept += validLeads.length

    if (staleLeads.length === 0) continue

    // Log every removal
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
        // Only delete cached_emails if no synced_leads remain for this client/email
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

    // Progress log every 50 emails
    if ((i + 1) % 50 === 0) {
      console.log(`cleanup-leads: progress — ${i + 1}/${uniqueEmails.length} emails processed, ${totalRemoved} removed so far`)
    }
  }

  const summary = {
    dry_run: dryRun,
    unique_emails_checked: uniqueEmails.length,
    total_kept: totalKept,
    total_removed: totalRemoved,
    total_cached_emails_cleaned: totalEmailsRemoved,
    api_errors: totalApiErrors,
    emails_with_removals: removedDetails.length,
    details: removedDetails,
  }

  console.log(
    `=== cleanup-leads: DONE — ${totalRemoved} synced_leads removed, ${totalKept} kept, ` +
    `${totalEmailsRemoved} cached_emails cleaned, ${totalApiErrors} API errors` +
    `${dryRun ? ' (DRY RUN)' : ''} ===`
  )

  return NextResponse.json(summary)
}
