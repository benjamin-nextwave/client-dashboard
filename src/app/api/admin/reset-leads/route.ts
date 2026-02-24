export const runtime = 'nodejs'
export const maxDuration = 60
export const dynamic = 'force-dynamic'

import { NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { createAdminClient } from '@/lib/supabase/admin'

/**
 * Wipe synced_leads and cached_emails tables completely.
 * Operator-only. Used before backfill-positive to start clean.
 *
 * POST /api/admin/reset-leads
 */
export async function POST() {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()

  if (!user) {
    return NextResponse.json({ error: 'Not authenticated' }, { status: 401 })
  }

  if (user.app_metadata?.user_role !== 'operator') {
    return NextResponse.json({ error: 'Forbidden — operator only' }, { status: 403 })
  }

  const admin = createAdminClient()

  // Count before deleting
  const { data: leadsRows } = await admin
    .from('synced_leads')
    .select('id')
    .limit(1)

  const { data: emailsRows } = await admin
    .from('cached_emails')
    .select('id')
    .limit(1)

  // Delete all synced_leads
  const { error: leadsError } = await admin
    .from('synced_leads')
    .delete()
    .neq('id', '00000000-0000-0000-0000-000000000000')

  if (leadsError) {
    return NextResponse.json({
      error: `Failed to delete synced_leads: ${leadsError.message}`,
    }, { status: 500 })
  }

  // Delete all cached_emails
  const { error: emailsError } = await admin
    .from('cached_emails')
    .delete()
    .neq('id', '00000000-0000-0000-0000-000000000000')

  if (emailsError) {
    return NextResponse.json({
      error: `Failed to delete cached_emails: ${emailsError.message}`,
    }, { status: 500 })
  }

  // Verify tables are empty
  const { data: leadsAfter } = await admin.from('synced_leads').select('id').limit(1)
  const { data: emailsAfter } = await admin.from('cached_emails').select('id').limit(1)

  console.log(
    `reset-leads: synced_leads empty=${!leadsAfter?.length}, cached_emails empty=${!emailsAfter?.length}`
  )

  return NextResponse.json({
    success: true,
    synced_leads_empty: !leadsAfter?.length,
    cached_emails_empty: !emailsAfter?.length,
  })
}
