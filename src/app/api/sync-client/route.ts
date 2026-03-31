export const runtime = 'nodejs'
export const maxDuration = 120
export const dynamic = 'force-dynamic'

import { NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { createAdminClient } from '@/lib/supabase/admin'
import { syncClientData } from '@/lib/instantly/sync'

/**
 * On-demand sync endpoint for a single client.
 * Syncs both analytics and leads from the client's Instantly workspace.
 * Requires authentication — syncs only the logged-in client's data.
 */
export async function POST(request: Request) {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()

  if (!user) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  const clientId = user.app_metadata?.client_id as string | undefined
  if (!clientId) {
    return NextResponse.json({ error: 'No client' }, { status: 400 })
  }

  // Allow ?force=true to bypass the debounce
  const { searchParams } = new URL(request.url)
  const force = searchParams.get('force') === 'true'

  if (!force) {
    // Check if data was synced recently (within 2 minutes) — skip if so
    const admin = createAdminClient()
    const { data: recentAnalytics } = await admin
      .from('campaign_analytics')
      .select('last_synced_at')
      .eq('client_id', clientId)
      .order('last_synced_at', { ascending: false })
      .limit(1)
      .single()

    if (recentAnalytics?.last_synced_at) {
      const age = Date.now() - new Date(recentAnalytics.last_synced_at).getTime()
      if (age < 2 * 60 * 1000) {
        return NextResponse.json({ synced: false, reason: 'fresh' })
      }
    }
  }

  try {
    await syncClientData(clientId, force)
    return NextResponse.json({ synced: true })
  } catch (error) {
    console.error(`On-demand sync failed for client ${clientId}:`, error)
    return NextResponse.json(
      { error: 'Sync failed' },
      { status: 500 }
    )
  }
}
