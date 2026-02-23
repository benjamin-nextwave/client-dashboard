export const runtime = 'nodejs'
export const maxDuration = 300

import { NextResponse } from 'next/server'

export const dynamic = 'force-dynamic'

export async function GET() {
  // DISABLED: listLeads returns global lead pool, not per-campaign.
  // Cron sync writes corrupt data (all leads to every client).
  // Re-enable only after syncInboxData is rewritten to use getCampaignsForEmail.
  return NextResponse.json({
    disabled: true,
    reason: 'listLeads returns global pool, not per-campaign — sync writes corrupt data',
    timestamp: new Date().toISOString(),
  })
}
