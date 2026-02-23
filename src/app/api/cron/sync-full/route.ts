export const runtime = 'nodejs'
export const maxDuration = 300
export const dynamic = 'force-dynamic'

import { NextResponse } from 'next/server'

/**
 * Daily full sync cron job.
 * Runs at 06:00 Amsterdam time (05:00 UTC).
 *
 * DISABLED: listLeads returns global lead pool, not per-campaign.
 * Cron sync writes corrupt data (all leads to every client).
 * Re-enable only after syncClientData is rewritten to use getCampaignsForEmail.
 */
export async function GET() {
  return NextResponse.json({
    disabled: true,
    reason: 'listLeads returns global pool, not per-campaign — sync writes corrupt data',
    timestamp: new Date().toISOString(),
  })
}
