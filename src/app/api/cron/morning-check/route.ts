export const runtime = 'nodejs'
export const maxDuration = 60
export const dynamic = 'force-dynamic'

import { NextResponse } from 'next/server'
import { checkAndAlertClientIssues } from '@/lib/data/admin-stats'

/**
 * Morning health check cron job.
 * Runs daily at 06:00 Amsterdam time (configured in vercel.json or external scheduler).
 * Checks all clients for:
 * - Too few emails sent yesterday (< 74 total across campaigns)
 * - Campaigns running out of contacts (< 180 not_yet_emailed)
 * Triggers a webhook alert for each client with issues.
 */
export async function GET(request: Request) {
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
    const result = await checkAndAlertClientIssues()

    return NextResponse.json({
      success: true,
      alerted: result.alerted,
      errors: result.errors,
      timestamp: new Date().toISOString(),
    })
  } catch (error) {
    const message =
      error instanceof Error ? error.message : 'Unknown error occurred'
    console.error('Morning check failed:', error)

    return NextResponse.json(
      { success: false, error: message },
      { status: 500 }
    )
  }
}
