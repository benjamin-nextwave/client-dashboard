'use server'

import { revalidatePath } from 'next/cache'
import { createAdminClient } from '@/lib/supabase/admin'

type ActionResult = { error?: string }

export async function toggleDncApproval(
  clientId: string,
  entryId: string,
  approved: boolean
): Promise<ActionResult> {
  const supabase = createAdminClient()
  const { error } = await supabase
    .from('dnc_entries')
    .update({
      approved,
      approved_at: approved ? new Date().toISOString() : null,
    })
    .eq('id', entryId)
    .eq('client_id', clientId)
  if (error) return { error: error.message }
  revalidatePath(`/admin/clients/${clientId}/dnc`)
  revalidatePath(`/dashboard/dnc`)
  return {}
}

export async function deleteDncEntryAdmin(
  clientId: string,
  entryId: string
): Promise<ActionResult> {
  const supabase = createAdminClient()
  const { error } = await supabase
    .from('dnc_entries')
    .delete()
    .eq('id', entryId)
    .eq('client_id', clientId)
  if (error) return { error: error.message }
  revalidatePath(`/admin/clients/${clientId}/dnc`)
  revalidatePath(`/dashboard/dnc`)
  return {}
}

function sanitizeSectors(input: unknown): string[] {
  if (!Array.isArray(input)) return []
  const seen = new Set<string>()
  const out: string[] = []
  for (const item of input) {
    if (typeof item !== 'string') continue
    const trimmed = item.trim()
    if (trimmed.length === 0 || trimmed.length > 200) continue
    const key = trimmed.toLowerCase()
    if (seen.has(key)) continue
    seen.add(key)
    out.push(trimmed)
  }
  return out
}

export async function updateClientDncSectors(
  clientId: string,
  sectors: string[]
): Promise<ActionResult> {
  const cleaned = sanitizeSectors(sectors)
  const supabase = createAdminClient()
  const { error } = await supabase
    .from('clients')
    .update({ dnc_sectors: cleaned })
    .eq('id', clientId)
  if (error) return { error: error.message }
  revalidatePath(`/admin/clients/${clientId}/dnc`)
  return {}
}

export async function updateClientDncAdminNote(
  clientId: string,
  note: string
): Promise<ActionResult> {
  const trimmed = note.trim()
  const supabase = createAdminClient()
  const { error } = await supabase
    .from('clients')
    .update({ dnc_admin_note: trimmed.length > 0 ? trimmed : null })
    .eq('id', clientId)
  if (error) return { error: error.message }
  revalidatePath(`/admin/clients/${clientId}/dnc`)
  return {}
}
