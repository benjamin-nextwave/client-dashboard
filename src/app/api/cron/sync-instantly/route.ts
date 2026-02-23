export const runtime = 'nodejs'
export const maxDuration = 300

import { syncAllClientsInbox } from '@/lib/instantly/sync'
import { NextResponse } from 'next/server'

export const dynamic = 'force-dynamic'

export async function GET(request: Request) {
  // ⛔ DISABLED: listLeads returns global lead pool, not per-campaign.
  // Cron sync writes corrupt data (all leads to every client).
  // Re-enable only after syncInboxData is rewritten to use getCampaignsForEmail.
  return NextResponse.json({
    disabled: true,
    reason: 'listLeads returns global pool, not per-campaign — sync writes corrupt data',
    timestamp: new Date().toISOString(),
  })

  // Validate CRON_SECRET if set
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
    await syncAllClientsInbox()

    return NextResponse.json({
      success: true,
      timestamp: new Date().toISOString(),
    })
  } catch (error) {
    const message =
      error instanceof Error ? error.message : 'Unknown error occurred'

    console.error('Cron sync failed:', error)

    return NextResponse.json(
      { success: false, error: message },
      { status: 500 }
    )
  }
}
