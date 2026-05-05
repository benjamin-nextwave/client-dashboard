'use server'

import { revalidatePath } from 'next/cache'
import { createClient } from '@/lib/supabase/server'
import { getLeadInboxCustomerId } from './customer'
import type { Lead } from './types'

export type ActionResult = { ok: true } | { ok: false; error: string }
export type SendReplyResult = ActionResult

const NO_ACCESS: ActionResult = { ok: false, error: 'Geen toegang tot de lead-inbox.' }

async function assertLeadOwnership(
  customerId: string,
  leadId: string,
): Promise<{ ok: true } | { ok: false; error: string }> {
  const supabase = await createClient()
  const { data, error } = await supabase
    .from('leads')
    .select('id')
    .eq('customer_id', customerId)
    .eq('id', leadId)
    .maybeSingle()
  if (error) return { ok: false, error: error.message }
  if (!data) return { ok: false, error: 'Lead niet gevonden.' }
  return { ok: true }
}

function revalidateLeadInbox(leadId?: string) {
  revalidatePath('/dashboard/lead-inbox')
  if (leadId) revalidatePath(`/dashboard/lead-inbox/${leadId}`)
}

const WEBHOOK_URL = process.env.MAKE_OUTBOUND_WEBHOOK_URL

export async function sendReply(
  leadId: string,
  subject: string,
  body: string
): Promise<SendReplyResult> {
  const customerId = await getLeadInboxCustomerId()
  if (!customerId) return NO_ACCESS

  const trimmedSubject = subject.trim()
  if (!trimmedSubject) {
    return { ok: false, error: 'Onderwerp mag niet leeg zijn.' }
  }
  const trimmed = body.trim()
  if (!trimmed) return { ok: false, error: 'Bericht mag niet leeg zijn.' }

  if (!WEBHOOK_URL) {
    return {
      ok: false,
      error:
        'MAKE_OUTBOUND_WEBHOOK_URL is niet geconfigureerd op de server.',
    }
  }

  // Lead ophalen: we hebben de laatste inbound reply nodig (in_reply_to_email_id)
  // en het sending_account waar Instantly vanuit moet antwoorden.
  const supabase = await createClient()
  const { data: leadRow, error: leadError } = await supabase
    .from('leads')
    .select('id, sending_account, replies')
    .eq('customer_id', customerId)
    .eq('id', leadId)
    .maybeSingle()

  if (leadError) return { ok: false, error: leadError.message }
  if (!leadRow) return { ok: false, error: 'Lead niet gevonden.' }

  const lead = leadRow as unknown as Pick<
    Lead,
    'id' | 'sending_account' | 'replies'
  >

  // Laatste reply (chronologisch). Make beantwoordt altijd de meest recente.
  const sortedReplies = [...lead.replies].sort(
    (a, b) =>
      new Date(b.received_at).getTime() - new Date(a.received_at).getTime()
  )
  const latestReply = sortedReplies[0]
  if (!latestReply?.instantly_email_id) {
    return {
      ok: false,
      error: 'Geen reply gevonden om op te reageren.',
    }
  }

  let response: Response
  try {
    response = await fetch(WEBHOOK_URL, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        instantly_email_id: latestReply.instantly_email_id,
        sending_account: lead.sending_account,
        subject: trimmedSubject,
        body_text: trimmed,
      }),
    })
  } catch (err) {
    const message = err instanceof Error ? err.message : 'Onbekende fout'
    return { ok: false, error: `Webhook onbereikbaar: ${message}` }
  }

  if (!response.ok) {
    const text = await response.text().catch(() => '')
    return {
      ok: false,
      error: `Webhook gaf ${response.status}${text ? `: ${text.slice(0, 200)}` : ''}`,
    }
  }

  return { ok: true }
}

// ─── Custom labels ──────────────────────────────────────────────────────

export async function createLabel(name: string, color: string): Promise<ActionResult> {
  const customerId = await getLeadInboxCustomerId()
  if (!customerId) return NO_ACCESS

  const trimmed = name.trim()
  if (!trimmed) return { ok: false, error: 'Naam mag niet leeg zijn.' }
  if (!color.trim()) return { ok: false, error: 'Kleur is verplicht.' }

  const supabase = await createClient()
  const { error } = await supabase.from('lead_inbox_user_labels').insert({
    customer_id: customerId,
    name: trimmed,
    color,
  })
  if (error) {
    if (error.code === '23505') {
      return { ok: false, error: 'Er bestaat al een label met die naam.' }
    }
    return { ok: false, error: error.message }
  }
  revalidateLeadInbox()
  return { ok: true }
}

export async function deleteLabel(labelId: string): Promise<ActionResult> {
  const customerId = await getLeadInboxCustomerId()
  if (!customerId) return NO_ACCESS

  const supabase = await createClient()
  const { error } = await supabase
    .from('lead_inbox_user_labels')
    .delete()
    .eq('id', labelId)
    .eq('customer_id', customerId)
  if (error) return { ok: false, error: error.message }
  revalidateLeadInbox()
  return { ok: true }
}

export async function assignLabel(leadId: string, labelId: string): Promise<ActionResult> {
  const customerId = await getLeadInboxCustomerId()
  if (!customerId) return NO_ACCESS

  const own = await assertLeadOwnership(customerId, leadId)
  if (!own.ok) return own
  const supabase = await createClient()
  const { data: label } = await supabase
    .from('lead_inbox_user_labels')
    .select('id')
    .eq('id', labelId)
    .eq('customer_id', customerId)
    .maybeSingle()
  if (!label) return { ok: false, error: 'Label niet gevonden.' }

  const { error } = await supabase
    .from('lead_inbox_lead_label_assignments')
    .insert({ lead_id: leadId, label_id: labelId })
  if (error && error.code !== '23505') return { ok: false, error: error.message }
  revalidateLeadInbox(leadId)
  return { ok: true }
}

export async function unassignLabel(
  leadId: string,
  labelId: string
): Promise<ActionResult> {
  const customerId = await getLeadInboxCustomerId()
  if (!customerId) return NO_ACCESS

  const own = await assertLeadOwnership(customerId, leadId)
  if (!own.ok) return own
  const supabase = await createClient()
  const { error } = await supabase
    .from('lead_inbox_lead_label_assignments')
    .delete()
    .eq('lead_id', leadId)
    .eq('label_id', labelId)
  if (error) return { ok: false, error: error.message }
  revalidateLeadInbox(leadId)
  return { ok: true }
}

// ─── Notes ──────────────────────────────────────────────────────────────

type NoteOwnRow = {
  lead_id: string
  leads: { customer_id: string } | { customer_id: string }[]
}

function ownerOf(n: NoteOwnRow): string | undefined {
  return Array.isArray(n.leads) ? n.leads[0]?.customer_id : n.leads.customer_id
}

export async function createNote(
  leadId: string,
  body: string,
  color: string
): Promise<ActionResult> {
  const customerId = await getLeadInboxCustomerId()
  if (!customerId) return NO_ACCESS

  const own = await assertLeadOwnership(customerId, leadId)
  if (!own.ok) return own
  const trimmed = body.trim()
  if (!trimmed) return { ok: false, error: 'Notitie mag niet leeg zijn.' }
  if (!color.trim()) return { ok: false, error: 'Kleur is verplicht.' }

  const supabase = await createClient()
  const { error } = await supabase
    .from('lead_inbox_lead_notes')
    .insert({ lead_id: leadId, body: trimmed, color })
  if (error) return { ok: false, error: error.message }
  revalidateLeadInbox(leadId)
  return { ok: true }
}

export async function updateNote(
  noteId: string,
  body: string,
  color: string
): Promise<ActionResult> {
  const customerId = await getLeadInboxCustomerId()
  if (!customerId) return NO_ACCESS

  const trimmed = body.trim()
  if (!trimmed) return { ok: false, error: 'Notitie mag niet leeg zijn.' }
  const supabase = await createClient()
  const { data: noteRaw } = await supabase
    .from('lead_inbox_lead_notes')
    .select('lead_id, leads!inner(customer_id)')
    .eq('id', noteId)
    .maybeSingle()
  const note = noteRaw as NoteOwnRow | null
  if (!note || ownerOf(note) !== customerId) {
    return { ok: false, error: 'Notitie niet gevonden.' }
  }
  const { error } = await supabase
    .from('lead_inbox_lead_notes')
    .update({ body: trimmed, color })
    .eq('id', noteId)
  if (error) return { ok: false, error: error.message }
  revalidateLeadInbox(note.lead_id)
  return { ok: true }
}

export async function deleteNote(noteId: string): Promise<ActionResult> {
  const customerId = await getLeadInboxCustomerId()
  if (!customerId) return NO_ACCESS

  const supabase = await createClient()
  const { data: noteRaw } = await supabase
    .from('lead_inbox_lead_notes')
    .select('lead_id, leads!inner(customer_id)')
    .eq('id', noteId)
    .maybeSingle()
  const note = noteRaw as NoteOwnRow | null
  if (!note || ownerOf(note) !== customerId) {
    return { ok: false, error: 'Notitie niet gevonden.' }
  }
  const { error } = await supabase.from('lead_inbox_lead_notes').delete().eq('id', noteId)
  if (error) return { ok: false, error: error.message }
  revalidateLeadInbox(note.lead_id)
  return { ok: true }
}

// ─── Trash ──────────────────────────────────────────────────────────────

export async function moveLeadToTrash(leadId: string): Promise<ActionResult> {
  const customerId = await getLeadInboxCustomerId()
  if (!customerId) return NO_ACCESS

  const own = await assertLeadOwnership(customerId, leadId)
  if (!own.ok) return own
  const supabase = await createClient()
  const { error } = await supabase
    .from('leads')
    .update({ deleted_at: new Date().toISOString() })
    .eq('id', leadId)
    .eq('customer_id', customerId)
  if (error) return { ok: false, error: error.message }
  revalidateLeadInbox(leadId)
  return { ok: true }
}

export async function restoreLeadFromTrash(leadId: string): Promise<ActionResult> {
  const customerId = await getLeadInboxCustomerId()
  if (!customerId) return NO_ACCESS

  const own = await assertLeadOwnership(customerId, leadId)
  if (!own.ok) return own
  const supabase = await createClient()
  const { error } = await supabase
    .from('leads')
    .update({ deleted_at: null })
    .eq('id', leadId)
    .eq('customer_id', customerId)
  if (error) return { ok: false, error: error.message }
  revalidateLeadInbox(leadId)
  return { ok: true }
}

export async function permanentlyDeleteLead(leadId: string): Promise<ActionResult> {
  const customerId = await getLeadInboxCustomerId()
  if (!customerId) return NO_ACCESS

  const own = await assertLeadOwnership(customerId, leadId)
  if (!own.ok) return own
  const supabase = await createClient()
  const { error } = await supabase
    .from('leads')
    .delete()
    .eq('id', leadId)
    .eq('customer_id', customerId)
    .not('deleted_at', 'is', null)
  if (error) return { ok: false, error: error.message }
  revalidateLeadInbox()
  return { ok: true }
}
