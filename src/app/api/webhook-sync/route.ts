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
  let clientIds: string[] = []

  if (body.client_id) {
    clientIds = [body.client_id as string]
  } else if (body.email) {
    // Find ALL clients that have this lead — a lead can appear across many clients
    const { data: leads } = await admin
      .from('synced_leads')
      .select('client_id')
      .eq('email', String(body.email).toLowerCase())

    if (leads && leads.length > 0) {
      clientIds = [...new Set(leads.map((l) => l.client_id))]
    }
  }

  if (clientIds.length === 0) {
    return NextResponse.json(
      { error: 'client_id or email required (no matching clients found)' },
      { status: 400 }
    )
  }

  // Verify clients exist
  const { data: clients } = await admin
    .from('clients')
    .select('id, company_name')
    .in('id', clientIds)

  if (!clients || clients.length === 0) {
    return NextResponse.json({ error: 'No clients found' }, { status: 404 })
  }

  // Run sync in the background for ALL matching clients
  after(async () => {
    for (const client of clients) {
      try {
        await syncInboxData(client.id)
        console.log(`Webhook sync completed for client ${client.id} (${client.company_name})`)
      } catch (error) {
        console.error(`Webhook sync failed for client ${client.id}:`, error)
      }
    }
  })

  return NextResponse.json({
    accepted: true,
    client_ids: clients.map((c) => c.id),
    client_names: clients.map((c) => c.company_name),
    message: `Sync started in background for ${clients.length} client(s)`,
  })
}
