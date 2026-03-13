export const runtime = 'nodejs'
export const maxDuration = 300
export const dynamic = 'force-dynamic'

import { NextResponse } from 'next/server'
import { createAdminClient } from '@/lib/supabase/admin'
import { syncInboxData, syncClientData } from '@/lib/instantly/sync'
import { logError } from '@/lib/errors/log-error'

/**
 * Webhook endpoint for Make.com to trigger data refresh.
 * Replaces the old 15-minute polling cron.
 *
 * Auth: requires header `x-refresh-secret` matching env REFRESH_SECRET.
 *
 * Body (optional):
 *   { "client_id": "uuid" }        — refresh a specific client
 *   { "campaign_id": "abc-123" }    — refresh the client owning this campaign
 *   {}                              — refresh all active dashboards
 *
 * Idempotency: uses a per-client lock via sync_state.refresh_lock_until.
 * If a refresh was started <60s ago for the same client, it returns 200 with skipped=true.
 */

const LOCK_DURATION_MS = 60_000 // 60 seconds — prevent duplicate refreshes

export async function POST(request: Request) {
  // --- Auth ---
  const secret = process.env.REFRESH_SECRET
  if (!secret) {
    console.error('/api/refresh: REFRESH_SECRET not configured')
    return NextResponse.json({ error: 'Server misconfigured' }, { status: 500 })
  }

  const provided = request.headers.get('x-refresh-secret')
  if (provided !== secret) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  // --- Parse body ---
  let body: { client_id?: string; campaign_id?: string } = {}
  try {
    const text = await request.text()
    if (text.trim()) {
      body = JSON.parse(text)
    }
  } catch {
    return NextResponse.json({ error: 'Invalid JSON body' }, { status: 400 })
  }

  const supabase = createAdminClient()

  // --- Resolve target client(s) ---
  let targetClientIds: string[] = []

  if (body.client_id) {
    targetClientIds = [body.client_id]
  } else if (body.campaign_id) {
    const { data: cc } = await supabase
      .from('client_campaigns')
      .select('client_id')
      .eq('campaign_id', body.campaign_id)
      .single()

    if (!cc) {
      return NextResponse.json(
        { error: `campaign_id ${body.campaign_id} not found` },
        { status: 404 }
      )
    }
    targetClientIds = [cc.client_id]
  } else {
    // All active clients (those with campaigns)
    const { data: allCampaigns } = await supabase
      .from('client_campaigns')
      .select('client_id')

    if (allCampaigns && allCampaigns.length > 0) {
      targetClientIds = [...new Set(allCampaigns.map((c) => c.client_id))]
    }
  }

  if (targetClientIds.length === 0) {
    return NextResponse.json({ success: true, refreshed: 0, message: 'No clients to refresh' })
  }

  // --- Refresh with idempotency lock ---
  const results: { client_id: string; status: 'refreshed' | 'skipped' | 'error'; error?: string }[] = []
  const now = Date.now()

  for (const clientId of targetClientIds) {
    // Check idempotency lock via sync_state
    const { data: lockRows } = await supabase
      .from('sync_state')
      .select('refresh_lock_until')
      .eq('client_id', clientId)
      .not('refresh_lock_until', 'is', null)
      .limit(1)

    const lockUntil = lockRows?.[0]?.refresh_lock_until
    if (lockUntil && new Date(lockUntil).getTime() > now) {
      results.push({ client_id: clientId, status: 'skipped' })
      continue
    }

    // Set lock
    const lockExpiry = new Date(now + LOCK_DURATION_MS).toISOString()
    await supabase
      .from('sync_state')
      .update({ refresh_lock_until: lockExpiry })
      .eq('client_id', clientId)

    try {
      await syncInboxData(clientId)
      results.push({ client_id: clientId, status: 'refreshed' })
    } catch (error) {
      const message = error instanceof Error ? error.message : String(error)
      console.error(`/api/refresh: sync failed for client ${clientId}:`, error)
      await logError({
        clientId,
        errorType: 'sync_error',
        message: `Webhook refresh mislukt voor klant ${clientId}`,
        details: { error: message },
      })
      results.push({ client_id: clientId, status: 'error', error: message })
    } finally {
      // Release lock
      await supabase
        .from('sync_state')
        .update({ refresh_lock_until: null })
        .eq('client_id', clientId)
    }
  }

  const refreshed = results.filter((r) => r.status === 'refreshed').length
  const skipped = results.filter((r) => r.status === 'skipped').length

  return NextResponse.json({
    success: true,
    refreshed,
    skipped,
    total: targetClientIds.length,
    results,
    timestamp: new Date().toISOString(),
  })
}
