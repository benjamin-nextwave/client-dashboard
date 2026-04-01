import { NextResponse } from 'next/server'

// Cron disabled — analytics sync is now on-demand via /api/sync-client
export async function GET() {
  return NextResponse.json({ disabled: true })
}
