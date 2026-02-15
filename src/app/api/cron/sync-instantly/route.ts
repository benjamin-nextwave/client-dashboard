import { syncAllClients } from '@/lib/instantly/sync'
import { NextResponse } from 'next/server'

export const dynamic = 'force-dynamic'

export async function GET(request: Request) {
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
    await syncAllClients()

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
