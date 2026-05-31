'use server'

import { revalidatePath } from 'next/cache'
import { createAdminClient } from '@/lib/supabase/admin'
import { normalizeCompanyKnowledgeChecklist } from './_components/company-knowledge-shared'

type ActionResult = { error?: string }

const INBOX_APPROACHES = ['eigen_workspace', 'n8n_inbox'] as const
type InboxApproach = (typeof INBOX_APPROACHES)[number]

const UPDATE_AUTHORS = ['kix', 'merlijn', 'benjamin'] as const
type UpdateAuthor = (typeof UPDATE_AUTHORS)[number]

function isInboxApproach(value: unknown): value is InboxApproach {
  return typeof value === 'string' && (INBOX_APPROACHES as readonly string[]).includes(value)
}

function isUpdateAuthor(value: unknown): value is UpdateAuthor {
  return typeof value === 'string' && (UPDATE_AUTHORS as readonly string[]).includes(value)
}

export async function updateClientDealbasis(
  clientId: string,
  value: string
): Promise<ActionResult> {
  const supabase = createAdminClient()
  const trimmed = value.trim()
  const { error } = await supabase
    .from('clients')
    .update({ dealbasis: trimmed.length > 0 ? trimmed : null })
    .eq('id', clientId)
  if (error) return { error: error.message }
  revalidatePath(`/admin/clients/${clientId}`)
  return {}
}

export async function updateClientInboxApproach(
  clientId: string,
  value: string | null
): Promise<ActionResult> {
  if (value !== null && !isInboxApproach(value)) {
    return { error: 'Ongeldige inbox-aanpak' }
  }
  const supabase = createAdminClient()
  const { error } = await supabase
    .from('clients')
    .update({ inbox_approach: value })
    .eq('id', clientId)
  if (error) return { error: error.message }
  revalidatePath(`/admin/clients/${clientId}`)
  return {}
}

export async function updateClientStartDateMaand(
  clientId: string,
  isoDate: string | null
): Promise<ActionResult> {
  const supabase = createAdminClient()
  const value = isoDate && isoDate.trim().length > 0 ? isoDate : null
  const { error } = await supabase
    .from('clients')
    .update({ start_date_maand: value })
    .eq('id', clientId)
  if (error) return { error: error.message }
  revalidatePath(`/admin/clients/${clientId}`)
  return {}
}

export async function updateClientEndDateMaand(
  clientId: string,
  isoDate: string | null
): Promise<ActionResult> {
  const supabase = createAdminClient()
  const value = isoDate && isoDate.trim().length > 0 ? isoDate : null
  const { error } = await supabase
    .from('clients')
    .update({ end_date_maand: value })
    .eq('id', clientId)
  if (error) return { error: error.message }
  revalidatePath(`/admin/clients/${clientId}`)
  return {}
}

export async function updateClientCompanySummary(
  clientId: string,
  value: string
): Promise<ActionResult> {
  const supabase = createAdminClient()
  const trimmed = value.trim()
  const { error } = await supabase
    .from('clients')
    .update({ company_summary: trimmed.length > 0 ? trimmed : null })
    .eq('id', clientId)
  if (error) return { error: error.message }
  revalidatePath(`/admin/clients/${clientId}`)
  return {}
}

export async function updateClientCompanyKnowledge(
  clientId: string,
  input: {
    text: string
    checklist: unknown
    complete: boolean
  }
): Promise<ActionResult> {
  const supabase = createAdminClient()
  const trimmed = input.text.trim()
  const { error } = await supabase
    .from('clients')
    .update({
      company_knowledge: trimmed.length > 0 ? trimmed : null,
      company_knowledge_checklist: normalizeCompanyKnowledgeChecklist(input.checklist),
      company_knowledge_complete: input.complete,
    })
    .eq('id', clientId)
  if (error) return { error: error.message }
  revalidatePath(`/admin/clients/${clientId}`)
  return {}
}

export async function createClientUpdate(
  clientId: string,
  input: { author: string; message: string; isUrgent: boolean; linkedToSummary: boolean }
): Promise<ActionResult & { id?: string }> {
  if (!isUpdateAuthor(input.author)) {
    return { error: 'Ongeldige afzender' }
  }
  const message = input.message.trim()
  if (message.length === 0) {
    return { error: 'Bericht mag niet leeg zijn' }
  }

  const supabase = createAdminClient()
  const { data, error } = await supabase
    .from('client_updates')
    .insert({
      client_id: clientId,
      author: input.author,
      message,
      is_urgent: input.isUrgent,
      linked_to_summary: input.linkedToSummary,
    })
    .select('id')
    .single()

  if (error) return { error: error.message }
  revalidatePath(`/admin/clients/${clientId}`)
  revalidatePath(`/admin/clients/${clientId}/updates`)
  return { id: data.id }
}

export async function deleteClientUpdate(
  clientId: string,
  updateId: string
): Promise<ActionResult> {
  const supabase = createAdminClient()
  const { error } = await supabase
    .from('client_updates')
    .delete()
    .eq('id', updateId)
    .eq('client_id', clientId)
  if (error) return { error: error.message }
  revalidatePath(`/admin/clients/${clientId}`)
  revalidatePath(`/admin/clients/${clientId}/updates`)
  return {}
}

export async function toggleClientUpdateLinked(
  clientId: string,
  updateId: string,
  linked: boolean
): Promise<ActionResult> {
  const supabase = createAdminClient()
  const { error } = await supabase
    .from('client_updates')
    .update({ linked_to_summary: linked })
    .eq('id', updateId)
    .eq('client_id', clientId)
  if (error) return { error: error.message }
  revalidatePath(`/admin/clients/${clientId}`)
  revalidatePath(`/admin/clients/${clientId}/updates`)
  return {}
}

export async function toggleClientUpdateUrgent(
  clientId: string,
  updateId: string,
  urgent: boolean
): Promise<ActionResult> {
  const supabase = createAdminClient()
  const { error } = await supabase
    .from('client_updates')
    .update({ is_urgent: urgent })
    .eq('id', updateId)
    .eq('client_id', clientId)
  if (error) return { error: error.message }
  revalidatePath(`/admin/clients/${clientId}`)
  revalidatePath(`/admin/clients/${clientId}/updates`)
  return {}
}
