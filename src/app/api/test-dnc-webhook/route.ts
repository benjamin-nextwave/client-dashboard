import { NextResponse } from 'next/server'
import { createAdminClient } from '@/lib/supabase/admin'

const DNC_WEBHOOK = 'https://hook.eu2.make.com/dhkkgga3ktiwgalbkeujdw21odiqqqa5'

export async function GET() {
  const steps: string[] = []

  try {
    // Step 1: Get a client to test with
    steps.push('1. Fetching a client from database...')
    const admin = createAdminClient()
    const { data: client, error: clientError } = await admin
      .from('clients')
      .select('id, company_name')
      .limit(1)
      .single()

    if (clientError) {
      steps.push(`FAILED: ${clientError.message}`)
      return NextResponse.json({ steps })
    }
    steps.push(`OK: Found client "${client.company_name}" (${client.id})`)

    // Step 2: Call webhook
    steps.push('2. Calling DNC webhook...')
    const res = await fetch(DNC_WEBHOOK, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        type: 'single',
        company_name: client.company_name,
        email: 'server-action-test@test.nl',
      }),
    })
    steps.push(`OK: Webhook responded with status ${res.status}`)

    return NextResponse.json({ success: true, steps })
  } catch (error) {
    steps.push(`EXCEPTION: ${String(error)}`)
    return NextResponse.json({ success: false, steps }, { status: 500 })
  }
}
