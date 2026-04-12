'use server'

import { revalidatePath } from 'next/cache'
import { createAdminClient } from '@/lib/supabase/admin'

export async function markEventSeen(eventKey: string): Promise<{ error?: string }> {
  const supabase = createAdminClient()
  const { error } = await supabase
    .from('operator_seen_events')
    .upsert({ event_key: eventKey, seen_at: new Date().toISOString() })

  if (error) return { error: error.message }
  revalidatePath('/admin/overzicht')
  return {}
}

export async function markEventUnseen(eventKey: string): Promise<{ error?: string }> {
  const supabase = createAdminClient()
  const { error } = await supabase
    .from('operator_seen_events')
    .delete()
    .eq('event_key', eventKey)

  if (error) return { error: error.message }
  revalidatePath('/admin/overzicht')
  return {}
}

export async function markAllSeen(eventKeys: string[]): Promise<{ error?: string }> {
  if (eventKeys.length === 0) return {}
  const supabase = createAdminClient()
  const now = new Date().toISOString()
  const { error } = await supabase
    .from('operator_seen_events')
    .upsert(eventKeys.map((k) => ({ event_key: k, seen_at: now })))

  if (error) return { error: error.message }
  revalidatePath('/admin/overzicht')
  return {}
}
