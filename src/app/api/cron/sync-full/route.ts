export const runtime = 'nodejs'
export const maxDuration = 300
export const dynamic = 'force-dynamic'

import { NextResponse } from 'next/server'
import { syncAllClientsFull } from '@/lib/instantly/sync'

/**
 * Daily full sync cron job.
 * Runs at 06:00 Amsterdam time (05:00 UTC).
 * Syncs everything: analytics, all emails, all leads for all clients.
 */
export async function GET(request: Request) {
  // ⛔ DISABLED: listLeads returns global lead pool, not per-campaign.
  // Cron sync writes corrupt data (all leads to every client).
  // Re-enable only after syncClientData is rewritten to use getCampaignsForEmail.
  return NextResponse.json({
    disabled: true,
    reason: 'listLeads returns global pool, not per-campaign — sync writes corrupt data',
    timestamp: new Date().toISOString(),
  })

  const cronSecret = process.env.CRON_SECRET
  if (cronSecret) {
    const authHeader = request.headers.get('authorization')
    if (authHeader !== `Bearer ${cronSecret}`) {
      return NextResponse.json(
        { success: false, error: 'Unauthorized' },
        { status: 401 }
      )
    }
  }

  try {
    await syncAllClientsFull()

    return NextResponse.json({
      success: true,
      timestamp: new Date().toISOString(),
    })
  } catch (error) {
    const message =
      error instanceof Error ? error.message : 'Unknown error occurred'
    console.error('Daily full sync failed:', error)

    return NextResponse.json(
      { success: false, error: message },
      { status: 500 }
    )
  }
}
