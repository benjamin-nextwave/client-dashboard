'use server'

import { revalidatePath } from 'next/cache'
import { createClient } from '@/lib/supabase/server'

type ActionResult = { success: true } | { error: string }

export async function createFolder(name: string): Promise<ActionResult> {
  const supabase = await createClient()

  const { data: profile } = await supabase
    .from('profiles')
    .select('client_id')
    .eq('id', (await supabase.auth.getUser()).data.user?.id ?? '')
    .single()

  if (!profile?.client_id) return { error: 'Geen client gevonden.' }

  // Get max sort_order
  const { data: existing } = await supabase
    .from('inbox_folders')
    .select('sort_order')
    .eq('client_id', profile.client_id)
    .order('sort_order', { ascending: false })
    .limit(1)

  const nextOrder = (existing?.[0]?.sort_order ?? -1) + 1

  const { error } = await supabase
    .from('inbox_folders')
    .insert({ client_id: profile.client_id, name: name.trim(), sort_order: nextOrder })

  if (error) return { error: 'Kon mapje niet aanmaken.' }

  revalidatePath('/dashboard/inbox')
  return { success: true }
}

export async function renameFolder(folderId: string, name: string): Promise<ActionResult> {
  const supabase = await createClient()

  const { error } = await supabase
    .from('inbox_folders')
    .update({ name: name.trim(), updated_at: new Date().toISOString() })
    .eq('id', folderId)

  if (error) return { error: 'Kon mapje niet hernoemen.' }

  revalidatePath('/dashboard/inbox')
  return { success: true }
}

export async function deleteFolder(folderId: string): Promise<ActionResult> {
  const supabase = await createClient()

  // Leads in this folder get folder_id = null (handled by ON DELETE SET NULL)
  const { error } = await supabase
    .from('inbox_folders')
    .delete()
    .eq('id', folderId)

  if (error) return { error: 'Kon mapje niet verwijderen.' }

  revalidatePath('/dashboard/inbox')
  return { success: true }
}

export async function moveLeadToFolder(
  leadId: string,
  folderId: string | null
): Promise<ActionResult> {
  const supabase = await createClient()

  const { error } = await supabase
    .from('synced_leads')
    .update({ folder_id: folderId, updated_at: new Date().toISOString() })
    .eq('id', leadId)

  if (error) return { error: 'Kon lead niet verplaatsen.' }

  revalidatePath('/dashboard/inbox')
  return { success: true }
}
