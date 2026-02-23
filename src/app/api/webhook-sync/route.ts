export const runtime = 'nodejs'
export const maxDuration = 120
export const dynamic = 'force-dynamic'

import { NextResponse } from 'next/server'
import { after } from 'next/server'
import { createAdminClient } from '@/lib/supabase/admin'
import { syncInboxData } from '@/lib/instantly/sync'

/**
 * Webhook endpoint for triggering a sync from Make.com (or any external service).
 * Protected by CRON_SECRET. No user session required.
 *
 * Returns immediately with 200 and runs the sync in the background
 * (using Next.js `after()`) so Make.com doesn't timeout.
 *
 * Usage from Make.com HTTP module:
 *   POST https://dashboard.nextwave-solutions.nl/api/webhook-sync
 *   Headers: { "Authorization": "Bearer <CRON_SECRET>" }
 *   Body (JSON): { "client_id": "<uuid>" }
 *
 * Optionally pass "email" instead of "client_id" to look up the client
 * by the lead's email address (useful when Make.com only has the lead email).
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

  let body: Record<string, unknown>
  try {
    body = await request.json()
  } catch {
    return NextResponse.json({ error: 'Invalid JSON body' }, { status: 400 })
  }

  const admin = createAdminClient()
  let clientId = body.client_id as string | undefined

  // If no client_id provided, try to look it up by lead email
  if (!clientId && body.email) {
    const { data: lead } = await admin
      .from('synced_leads')
      .select('client_id')
      .eq('email', String(body.email).toLowerCase())
      .limit(1)
      .single()

    clientId = lead?.client_id
  }

  if (!clientId) {
    return NextResponse.json(
      { error: 'client_id or email required' },
      { status: 400 }
    )
  }

  // Verify client exists
  const { data: client } = await admin
    .from('clients')
    .select('id, company_name')
    .eq('id', clientId)
    .single()

  if (!client) {
    return NextResponse.json({ error: 'Client not found' }, { status: 404 })
  }

  // Run sync in the background — respond immediately so Make.com doesn't timeout
  after(async () => {
    try {
      await syncInboxData(clientId!)
      console.log(`Webhook sync completed for client ${clientId} (${client.company_name})`)
    } catch (error) {
      console.error(`Webhook sync failed for client ${clientId}:`, error)
    }
  })

  return NextResponse.json({
    accepted: true,
    client_id: clientId,
    company_name: client.company_name,
    message: 'Sync started in background',
  })
}
