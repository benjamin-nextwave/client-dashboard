export const runtime = 'nodejs'
export const maxDuration = 120
export const dynamic = 'force-dynamic'

import { NextResponse } from 'next/server'
import { after } from 'next/server'
import { createAdminClient } from '@/lib/supabase/admin'
import { syncInboxData, syncSingleLeadByEmail } from '@/lib/instantly/sync'

/**
 * Webhook endpoint for triggering a sync from Make.com (or any external service).
 * Protected by CRON_SECRET. No user session required.
 *
 * Two modes:
 *
 * 1. **Targeted sync** (preferred for Make.com):
 *    Body: { "email": "lead@example.com" }
 *    Runs syncSingleLeadByEmail() SYNCHRONOUSLY (~2-5 seconds).
 *    Returns only after the lead is in the DB — Make.com can then send the
 *    notification email knowing the dashboard is ready.
 *
 * 2. **Full client sync** (backward compat):
 *    Body: { "client_id": "<uuid>" }
 *    Runs syncInboxData() in the background via after().
 *    Returns immediately with 200.
 */
export async function POST(request: Request) {
  // Validate secret
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

  // Normalize keys to lowercase so "Email", "EMAIL", "email" all work
  const body: Record<string, unknown> = {}
  for (const [key, value] of Object.entries(rawBody)) {
    body[key.toLowerCase()] = value
  }

  // --- Mode 1: Targeted single-lead sync (by email) ---
  if (body.email) {
    const email = String(body.email).toLowerCase().trim()

    try {
      const result = await syncSingleLeadByEmail(email)

      if (!result.synced) {
        return NextResponse.json({
          synced: false,
          email,
          message: 'Lead not found in any campaign',
        }, { status: 200 })
      }

      return NextResponse.json({
        synced: true,
        email,
        client_ids: result.clientIds,
        message: `Lead synced for ${result.clientIds.length} client(s)`,
      })
    } catch (error) {
      console.error(`Webhook targeted sync failed for ${email}:`, error)
      return NextResponse.json({
        error: 'Sync failed',
        email,
        message: error instanceof Error ? error.message : String(error),
      }, { status: 500 })
    }
  }

  // --- Mode 2: Full client sync (backward compat) ---
  if (!body.client_id) {
    return NextResponse.json(
      { error: 'email or client_id required' },
      { status: 400 }
    )
  }

  const admin = createAdminClient()
  const clientId = body.client_id as string

  const { data: client } = await admin
    .from('clients')
    .select('id, company_name')
    .eq('id', clientId)
    .single()

  if (!client) {
    return NextResponse.json({ error: 'Client not found' }, { status: 404 })
  }

  // Run full sync in the background
  after(async () => {
    try {
      await syncInboxData(client.id)
      console.log(`Webhook sync completed for client ${client.id} (${client.company_name})`)
    } catch (error) {
      console.error(`Webhook sync failed for client ${client.id}:`, error)
    }
  })

  return NextResponse.json({
    accepted: true,
    client_ids: [client.id],
    client_names: [client.company_name],
    message: `Sync started in background for ${client.company_name}`,
  })
}
