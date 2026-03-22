import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { createAdminClient } from '@/lib/supabase/admin'

const DNC_WEBHOOK = 'https://hook.eu2.make.com/dhkkgga3ktiwgalbkeujdw21odiqqqa5'

export async function POST(req: NextRequest) {
  // Verify the user is authenticated
  const supabase = await createClient()
  const {
    data: { user },
  } = await supabase.auth.getUser()

  if (!user) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  const clientId = user.app_metadata?.client_id as string | undefined
  if (!clientId) {
    return NextResponse.json({ error: 'No client' }, { status: 400 })
  }

  // Get company name
  const admin = createAdminClient()
  const { data: client } = await admin
    .from('clients')
    .select('company_name')
    .eq('id', clientId)
    .single()

  const companyName = client?.company_name ?? 'Onbekend'

  const body = await req.json()

  // Call Make.com webhook
  const res = await fetch(DNC_WEBHOOK, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      type: body.type,
      company_name: companyName,
      ...(body.type === 'single'
        ? { email: body.email }
        : { emails: body.emails }),
    }),
  })

  return NextResponse.json({ success: res.ok, status: res.status })
}
