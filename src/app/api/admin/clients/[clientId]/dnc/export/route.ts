export const runtime = 'nodejs'
export const dynamic = 'force-dynamic'

import { NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { createAdminClient } from '@/lib/supabase/admin'

interface RouteContext {
  params: Promise<{ clientId: string }>
}

function escapeCsv(value: string): string {
  if (/[",\n\r]/.test(value)) {
    return `"${value.replace(/"/g, '""')}"`
  }
  return value
}

export async function GET(_request: Request, { params }: RouteContext) {
  const { clientId } = await params

  const supabase = await createClient()
  const {
    data: { user },
  } = await supabase.auth.getUser()

  if (!user) {
    return NextResponse.json({ error: 'Niet ingelogd.' }, { status: 401 })
  }
  if (user.app_metadata?.user_role !== 'operator') {
    return NextResponse.json({ error: 'Geen toegang.' }, { status: 403 })
  }

  const admin = createAdminClient()

  const { data: client } = await admin
    .from('clients')
    .select('company_name')
    .eq('id', clientId)
    .single()

  if (!client) {
    return NextResponse.json({ error: 'Klant niet gevonden.' }, { status: 404 })
  }

  const { data, error } = await admin
    .from('dnc_entries')
    .select('value, approved, approved_at, created_at')
    .eq('client_id', clientId)
    .eq('entry_type', 'email')
    .order('created_at', { ascending: false })

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 })
  }

  const rows: string[][] = [['email', 'status', 'toegevoegd_op', 'doorgevoerd_op']]
  for (const row of data ?? []) {
    rows.push([
      String(row.value ?? ''),
      row.approved ? 'doorgevoerd' : 'in_verwerking',
      row.created_at ? new Date(row.created_at).toISOString() : '',
      row.approved_at ? new Date(row.approved_at).toISOString() : '',
    ])
  }

  const csv = rows.map((cols) => cols.map(escapeCsv).join(',')).join('\r\n')

  const companyName = (client as { company_name?: string }).company_name ?? 'klant'
  const safeName = companyName.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-+|-+$/g, '') || 'klant'
  const stamp = new Date().toISOString().slice(0, 10)
  const filename = `dnc-${safeName}-${stamp}.csv`

  return new NextResponse(csv, {
    status: 200,
    headers: {
      'Content-Type': 'text/csv; charset=utf-8',
      'Content-Disposition': `attachment; filename="${filename}"`,
      'Cache-Control': 'no-store',
    },
  })
}
