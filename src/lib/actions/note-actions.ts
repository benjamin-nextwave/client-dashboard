'use server'

import { revalidatePath } from 'next/cache'
import { createClient } from '@/lib/supabase/server'
import { createAdminClient } from '@/lib/supabase/admin'

type ActionResult = { success: true } | { error: string }

// ── Labels ──────────────────────────────────────────────────────────

export async function getLabels() {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return []

  const clientId = user.app_metadata?.client_id as string | undefined
  if (!clientId) return []

  const { data } = await supabase
    .from('lead_note_labels')
    .select('id, name, color')
    .eq('client_id', clientId)
    .order('created_at', { ascending: true })

  return data ?? []
}

export async function createLabel(name: string, color: string): Promise<ActionResult> {
  const trimmed = name.trim()
  if (!trimmed || trimmed.length > 30) return { error: 'Naam moet 1-30 tekens zijn.' }

  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return { error: 'Niet ingelogd.' }

  const clientId = user.app_metadata?.client_id as string | undefined
  if (!clientId) return { error: 'Geen client gevonden.' }

  const admin = createAdminClient()
  const { error } = await admin
    .from('lead_note_labels')
    .insert({ client_id: clientId, name: trimmed, color })

  if (error) {
    if (error.code === '23505') return { error: 'Dit label bestaat al.' }
    return { error: 'Kon label niet aanmaken.' }
  }

  return { success: true }
}

export async function deleteLabel(labelId: string): Promise<ActionResult> {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return { error: 'Niet ingelogd.' }

  const admin = createAdminClient()
  const { error } = await admin
    .from('lead_note_labels')
    .delete()
    .eq('id', labelId)

  if (error) return { error: 'Kon label niet verwijderen.' }

  return { success: true }
}

// ── Notes ───────────────────────────────────────────────────────────

export async function getNotesForLead(leadId: string) {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return []

  const clientId = user.app_metadata?.client_id as string | undefined
  if (!clientId) return []

  const { data } = await supabase
    .from('lead_notes')
    .select('id, content, label_id, created_at, updated_at')
    .eq('client_id', clientId)
    .eq('lead_id', leadId)
    .order('created_at', { ascending: false })

  return data ?? []
}

export async function createNote(
  leadId: string,
  content: string,
  labelId: string | null
): Promise<ActionResult> {
  const trimmed = content.trim()
  if (!trimmed) return { error: 'Notitie mag niet leeg zijn.' }

  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return { error: 'Niet ingelogd.' }

  const clientId = user.app_metadata?.client_id as string | undefined
  if (!clientId) return { error: 'Geen client gevonden.' }

  const admin = createAdminClient()
  const { error } = await admin
    .from('lead_notes')
    .insert({
      client_id: clientId,
      lead_id: leadId,
      content: trimmed,
      label_id: labelId,
    })

  if (error) return { error: 'Kon notitie niet opslaan.' }

  revalidatePath(`/dashboard/inbox/${leadId}`)
  return { success: true }
}

export async function updateNote(
  noteId: string,
  content: string,
  labelId: string | null
): Promise<ActionResult> {
  const trimmed = content.trim()
  if (!trimmed) return { error: 'Notitie mag niet leeg zijn.' }

  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return { error: 'Niet ingelogd.' }

  const admin = createAdminClient()
  const { error } = await admin
    .from('lead_notes')
    .update({ content: trimmed, label_id: labelId, updated_at: new Date().toISOString() })
    .eq('id', noteId)

  if (error) return { error: 'Kon notitie niet bijwerken.' }

  return { success: true }
}

export async function deleteNote(noteId: string, leadId: string): Promise<ActionResult> {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return { error: 'Niet ingelogd.' }

  const admin = createAdminClient()
  const { error } = await admin
    .from('lead_notes')
    .delete()
    .eq('id', noteId)

  if (error) return { error: 'Kon notitie niet verwijderen.' }

  revalidatePath(`/dashboard/inbox/${leadId}`)
  return { success: true }
}
