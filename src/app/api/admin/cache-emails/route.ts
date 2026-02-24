export const runtime = 'nodejs'
export const maxDuration = 300
export const dynamic = 'force-dynamic'

import { NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { createAdminClient } from '@/lib/supabase/admin'
import { listEmails } from '@/lib/instantly/client'

const RATE_LIMIT_DELAY_MS = 300

function delay(ms: number): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, ms))
}

/**
 * Cache emails for positive leads that are missing cached_emails.
 * Finds all positive synced_leads, checks which ones have no cached_emails,
 * and fetches + caches emails from Instantly for those leads.
 *
 * Operator-only.
 *
 *   ?limit=20       — max leads to process per batch (default 20)
 *   ?email=x@y.com  — only cache for a specific email
 *
 * POST /api/admin/cache-emails
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
    Math.max(parseInt(searchParams.get('limit') ?? '', 10) || 20, 1),
    100
  )
  const filterEmail = searchParams.get('email')?.toLowerCase().trim() ?? null

  const admin = createAdminClient()

  // Get all positive leads
  let leadsQuery = admin
    .from('synced_leads')
    .select('id, email, client_id, campaign_id')
    .eq('interest_status', 'positive')

  if (filterEmail) {
    leadsQuery = leadsQuery.eq('email', filterEmail)
  }

  const { data: positiveLeads, error: leadsError } = await leadsQuery

  if (leadsError) {
    return NextResponse.json({
      error: `Failed to fetch positive leads: ${leadsError.message}`,
    }, { status: 500 })
  }

  if (!positiveLeads || positiveLeads.length === 0) {
    return NextResponse.json({ message: 'No positive leads found', cached: 0 })
  }

  // Deduplicate by (client_id, email) — we only need to fetch emails once per lead per client
  const uniquePairs = new Map<string, { client_id: string; email: string }>()
  for (const lead of positiveLeads) {
    const key = `${lead.client_id}:${lead.email.toLowerCase()}`
    if (!uniquePairs.has(key)) {
      uniquePairs.set(key, { client_id: lead.client_id, email: lead.email.toLowerCase() })
    }
  }

  // Check which pairs already have cached emails
  const pairsToCache: Array<{ client_id: string; email: string }> = []

  for (const [, pair] of uniquePairs) {
    const { data: existing } = await admin
      .from('cached_emails')
      .select('id')
      .eq('client_id', pair.client_id)
      .eq('lead_email', pair.email)
      .limit(1)

    if (!existing || existing.length === 0) {
      pairsToCache.push(pair)
    }
  }

  console.log(
    `cache-emails: ${positiveLeads.length} positive leads, ` +
    `${uniquePairs.size} unique (client, email) pairs, ` +
    `${pairsToCache.length} missing cached emails`
  )

  if (pairsToCache.length === 0) {
    return NextResponse.json({
      message: 'All positive leads already have cached emails',
      total_positive: positiveLeads.length,
      unique_pairs: uniquePairs.size,
      missing: 0,
      cached: 0,
    })
  }

  // Process up to limit
  const batch = pairsToCache.slice(0, limit)
  let totalCached = 0
  let totalErrors = 0

  const details: Array<{
    email: string
    client_id: string
    emails_cached: number
    error?: string
  }> = []

  for (let i = 0; i < batch.length; i++) {
    const { client_id: clientId, email } = batch[i]

    if (i > 0) await delay(RATE_LIMIT_DELAY_MS)

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

        const { error: cacheError } = await admin
          .from('cached_emails')
          .upsert(cacheRows, { onConflict: 'instantly_email_id' })

        if (cacheError) {
          console.error(`cache-emails: upsert failed for ${email}:`, cacheError.message)
          totalErrors++
          details.push({ email, client_id: clientId, emails_cached: 0, error: cacheError.message })
        } else {
          totalCached += cacheRows.length
          details.push({ email, client_id: clientId, emails_cached: cacheRows.length })

          // Also update reply data on synced_leads
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
              })
              .eq('client_id', clientId)
              .eq('email', email)
          }
        }
      } else {
        details.push({ email, client_id: clientId, emails_cached: 0 })
      }

      console.log(
        `cache-emails [${i + 1}/${batch.length}]: ${email} → ${emails.length} emails cached`
      )
    } catch (error) {
      const errMsg = error instanceof Error ? error.message : String(error)
      console.error(`cache-emails: failed for ${email}:`, error)
      totalErrors++
      details.push({ email, client_id: clientId, emails_cached: 0, error: errMsg })
    }
  }

  return NextResponse.json({
    total_positive: positiveLeads.length,
    unique_pairs: uniquePairs.size,
    missing: pairsToCache.length,
    processed: batch.length,
    remaining: pairsToCache.length - batch.length,
    total_emails_cached: totalCached,
    errors: totalErrors,
    details,
  })
}
