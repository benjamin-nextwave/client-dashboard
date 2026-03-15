'use server'

import { revalidatePath } from 'next/cache'
import { createAdminClient } from '@/lib/supabase/admin'

export async function reviewObjection(
  leadId: string,
  decision: 'approved' | 'rejected',
  response: string
): Promise<{ error?: string }> {
  const supabase = createAdminClient()

  // Get current objection data to preserve it
  const { data: lead } = await supabase
    .from('synced_leads')
    .select('objection_data')
    .eq('id', leadId)
    .single()

  if (!lead) {
    return { error: 'Lead niet gevonden' }
  }

  const existingData = (lead.objection_data as Record<string, unknown>) ?? {}

  const { error } = await supabase
    .from('synced_leads')
    .update({
      objection_status: decision,
      objection_data: {
        ...existingData,
        response,
        reviewed_at: new Date().toISOString(),
      },
    })
    .eq('id', leadId)

  if (error) {
    return { error: error.message }
  }

  revalidatePath('/admin/bezwaren')
  revalidatePath('/dashboard/inbox')
  return {}
}
