import { NextResponse } from 'next/server'

// Disabled — analytics sync is now on-demand via /api/sync-client
export async function POST() {
  return NextResponse.json({ disabled: true })
}
