export const runtime = 'nodejs'
export const maxDuration = 120
export const dynamic = 'force-dynamic'

import { NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { syncClientData } from '@/lib/instantly/sync'

/**
 * On-demand sync endpoint for a single client.
 * Fetches all campaign analytics from the client's Instantly workspace.
 */
export async function POST() {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()

  if (!user) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  const clientId = user.app_metadata?.client_id as string | undefined
  if (!clientId) {
    return NextResponse.json({ error: 'No client' }, { status: 400 })
  }

  try {
    const result = await syncClientData(clientId)

    if (!result) {
      return NextResponse.json({ error: 'Geen API key geconfigureerd' }, { status: 400 })
    }

    return NextResponse.json({
      synced: true,
      campaignCount: result.campaignCount,
      activeCampaigns: result.activeCampaigns,
    })
  } catch (error) {
    console.error(`On-demand sync failed for client ${clientId}:`, error)
    return NextResponse.json(
      { error: 'Sync failed' },
      { status: 500 }
    )
  }
}
