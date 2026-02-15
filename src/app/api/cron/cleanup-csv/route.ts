import { createAdminClient } from '@/lib/supabase/admin'
import { NextResponse } from 'next/server'

export const dynamic = 'force-dynamic'

// This endpoint should be called daily via Vercel Cron.
// Example vercel.json config:
// { "crons": [{ "path": "/api/cron/cleanup-csv", "schedule": "0 3 * * *" }] }

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
    const admin = createAdminClient()

    // Delete expired uploads (CASCADE deletes csv_rows automatically)
    const { data, error } = await admin
      .from('csv_uploads')
      .delete()
      .lt('expires_at', new Date().toISOString())
      .select('id')

    if (error) {
      return NextResponse.json(
        { success: false, error: error.message },
        { status: 500 }
      )
    }

    const deleted = data?.length ?? 0

    return NextResponse.json({
      success: true,
      deleted,
      timestamp: new Date().toISOString(),
    })
  } catch (error) {
    const message =
      error instanceof Error ? error.message : 'Unknown error occurred'

    console.error('CSV cleanup cron failed:', error)

    return NextResponse.json(
      { success: false, error: message },
      { status: 500 }
    )
  }
}
