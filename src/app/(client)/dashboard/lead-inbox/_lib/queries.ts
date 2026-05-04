import { createClient } from '@/lib/supabase/server'
import type { Lead } from './types'

const LEAD_COLUMNS = `
  id,
  customer_id,
  email,
  name,
  classification,
  thread_id,
  first_campaign_id,
  sending_account,
  first_reply_at,
  last_reply_at,
  notified_at,
  replies,
  created_at,
  updated_at
`

export async function getLeadsForCustomer(customerId: string): Promise<Lead[]> {
  const supabase = await createClient()
  const { data, error } = await supabase
    .from('leads')
    .select(LEAD_COLUMNS)
    .eq('customer_id', customerId)
    .order('last_reply_at', { ascending: false })

  if (error) {
    throw new Error(`getLeadsForCustomer failed: ${error.message}`)
  }
  return (data ?? []) as unknown as Lead[]
}

export async function getLeadById(
  customerId: string,
  leadId: string
): Promise<Lead | null> {
  const supabase = await createClient()
  const { data, error } = await supabase
    .from('leads')
    .select(LEAD_COLUMNS)
    .eq('customer_id', customerId)
    .eq('id', leadId)
    .maybeSingle()

  if (error) {
    throw new Error(`getLeadById failed: ${error.message}`)
  }
  return (data ?? null) as Lead | null
}
