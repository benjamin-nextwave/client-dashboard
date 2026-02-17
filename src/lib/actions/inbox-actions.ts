'use server'

import { z } from 'zod'
import { revalidatePath } from 'next/cache'
import { createClient } from '@/lib/supabase/server'
import { createAdminClient } from '@/lib/supabase/admin'
import { replyToEmail, listEmails } from '@/lib/instantly/client'

// --- Zod Schemas ---

const SendReplySchema = z.object({
  leadId: z.string().min(1, 'Lead ID is verplicht.'),
  replyToUuid: z.string().min(1, 'Reply UUID is verplicht.'),
  senderAccount: z.string().email('Ongeldig afzenderadres.'),
  subject: z.string().min(1, 'Onderwerp is verplicht.'),
  bodyHtml: z.string().min(1, 'Berichttekst is verplicht.'),
})

const ComposeReplySchema = z.object({
  leadId: z.string().min(1, 'Lead ID is verplicht.'),
  leadEmail: z.string().email('Ongeldig e-mailadres.'),
  senderAccount: z.string().email('Ongeldig afzenderadres.'),
  subject: z.string().min(1, 'Onderwerp is verplicht.'),
  bodyHtml: z.string().min(1, 'Berichttekst is verplicht.'),
})

const ComposeNewEmailSchema = z.object({
  leadEmail: z.string().email('Ongeldig e-mailadres.'),
  senderAccount: z.string().email('Ongeldig afzenderadres.'),
  subject: z.string().min(1, 'Onderwerp is verplicht.'),
  bodyHtml: z.string().min(1, 'Berichttekst is verplicht.'),
})

type SendReplyInput = z.infer<typeof SendReplySchema>
type ComposeReplyInput = z.infer<typeof ComposeReplySchema>
type ComposeNewEmailInput = z.infer<typeof ComposeNewEmailSchema>

type ActionResult = { success: true } | { error: string }

// --- Server Actions ---

export async function sendReply(input: SendReplyInput): Promise<ActionResult> {
  // Validate input
  const parsed = SendReplySchema.safeParse(input)
  if (!parsed.success) {
    return { error: parsed.error.errors[0]?.message ?? 'Ongeldige invoer.' }
  }

  const { leadId, replyToUuid, senderAccount, subject, bodyHtml } = parsed.data

  // Auth check
  const supabase = await createClient()
  const {
    data: { user },
  } = await supabase.auth.getUser()
  if (!user) {
    return { error: 'Niet ingelogd.' }
  }

  // Verify lead belongs to this client (RLS handles isolation)
  const { data: lead, error: leadError } = await supabase
    .from('synced_leads')
    .select('id')
    .eq('id', leadId)
    .single()

  if (leadError || !lead) {
    return { error: 'Lead niet gevonden of geen toegang.' }
  }

  // Send reply via Instantly API
  try {
    await replyToEmail({
      eaccount: senderAccount,
      replyToUuid,
      subject,
      bodyHtml,
    })
  } catch (err) {
    console.error('Failed to send reply via Instantly:', err)
    return { error: 'Fout bij het verzenden van de e-mail. Probeer het opnieuw.' }
  }

  // Update client_has_replied using admin client (bypasses SELECT-only RLS)
  const admin = createAdminClient()
  const { error: updateError } = await admin
    .from('synced_leads')
    .update({ client_has_replied: true })
    .eq('id', leadId)

  if (updateError) {
    console.error('Failed to update client_has_replied:', updateError.message)
  }

  revalidatePath('/dashboard/inbox')
  return { success: true }
}

export async function composeReply(
  input: ComposeReplyInput
): Promise<ActionResult> {
  // Validate input
  const parsed = ComposeReplySchema.safeParse(input)
  if (!parsed.success) {
    return { error: parsed.error.errors[0]?.message ?? 'Ongeldige invoer.' }
  }

  const { leadId, leadEmail, senderAccount, subject, bodyHtml } = parsed.data

  // Auth check
  const supabase = await createClient()
  const {
    data: { user },
  } = await supabase.auth.getUser()
  if (!user) {
    return { error: 'Niet ingelogd.' }
  }

  // Verify lead belongs to this client (RLS handles isolation)
  const { data: lead, error: leadError } = await supabase
    .from('synced_leads')
    .select('id')
    .eq('id', leadId)
    .single()

  if (leadError || !lead) {
    return { error: 'Lead niet gevonden of geen toegang.' }
  }

  // Fetch most recent email to get reply_to_uuid
  try {
    const response = await listEmails({
      lead: leadEmail,
      sortOrder: 'desc',
      limit: 1,
    })

    if (!response.items || response.items.length === 0) {
      return { error: 'Geen eerdere e-mails gevonden voor deze lead.' }
    }

    const replyToUuid = response.items[0].id

    // Send reply via Instantly API
    await replyToEmail({
      eaccount: senderAccount,
      replyToUuid,
      subject,
      bodyHtml,
    })
  } catch (err) {
    console.error('Failed to compose reply via Instantly:', err)
    return { error: 'Fout bij het verzenden van de e-mail. Probeer het opnieuw.' }
  }

  // Update client_has_replied using admin client (bypasses SELECT-only RLS)
  const admin = createAdminClient()
  const { error: updateError } = await admin
    .from('synced_leads')
    .update({ client_has_replied: true })
    .eq('id', leadId)

  if (updateError) {
    console.error('Failed to update client_has_replied:', updateError.message)
  }

  revalidatePath('/dashboard/inbox')
  return { success: true }
}

/**
 * Mark a lead as handled (dismiss "Actie vereist" tag without sending a reply).
 */
export async function dismissLead(leadId: string): Promise<ActionResult> {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return { error: 'Niet ingelogd.' }

  const { data: lead, error: leadError } = await supabase
    .from('synced_leads')
    .select('id')
    .eq('id', leadId)
    .single()

  if (leadError || !lead) return { error: 'Lead niet gevonden.' }

  const admin = createAdminClient()
  const { error } = await admin
    .from('synced_leads')
    .update({ client_has_replied: true })
    .eq('id', leadId)

  if (error) return { error: 'Fout bij het bijwerken van de status.' }

  revalidatePath('/dashboard/inbox')
  return { success: true }
}

/**
 * Mark a lead as opened (sets opened_at timestamp if not already set).
 */
export async function markLeadAsOpened(leadId: string): Promise<void> {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return

  const { data: lead } = await supabase
    .from('synced_leads')
    .select('id, opened_at')
    .eq('id', leadId)
    .single()

  if (!lead || lead.opened_at) return

  const admin = createAdminClient()
  await admin
    .from('synced_leads')
    .update({ opened_at: new Date().toISOString() })
    .eq('id', leadId)
}

/**
 * Delete a lead from the inbox by setting interest_status to null.
 */
export async function deleteLeadFromInbox(leadId: string): Promise<ActionResult> {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return { error: 'Niet ingelogd.' }

  const { data: lead, error: leadError } = await supabase
    .from('synced_leads')
    .select('id')
    .eq('id', leadId)
    .single()

  if (leadError || !lead) return { error: 'Lead niet gevonden.' }

  const admin = createAdminClient()
  const { error } = await admin
    .from('synced_leads')
    .update({ interest_status: null })
    .eq('id', leadId)

  if (error) return { error: 'Fout bij het verwijderen van de lead.' }

  revalidatePath('/dashboard/inbox')
  return { success: true }
}

/**
 * Move a lead to the "Afgehandeld" folder by setting archived_at.
 */
export async function archiveLead(leadId: string): Promise<ActionResult> {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return { error: 'Niet ingelogd.' }

  const { data: lead, error: leadError } = await supabase
    .from('synced_leads')
    .select('id')
    .eq('id', leadId)
    .single()

  if (leadError || !lead) return { error: 'Lead niet gevonden.' }

  const admin = createAdminClient()
  const { error } = await admin
    .from('synced_leads')
    .update({ archived_at: new Date().toISOString() })
    .eq('id', leadId)

  if (error) return { error: 'Fout bij het archiveren van de lead.' }

  revalidatePath('/dashboard/inbox')
  return { success: true }
}

/**
 * Move a lead back from "Afgehandeld" to the main inbox.
 */
export async function unarchiveLead(leadId: string): Promise<ActionResult> {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return { error: 'Niet ingelogd.' }

  const { data: lead, error: leadError } = await supabase
    .from('synced_leads')
    .select('id')
    .eq('id', leadId)
    .single()

  if (leadError || !lead) return { error: 'Lead niet gevonden.' }

  const admin = createAdminClient()
  const { error } = await admin
    .from('synced_leads')
    .update({ archived_at: null })
    .eq('id', leadId)

  if (error) return { error: 'Fout bij het terugplaatsen van de lead.' }

  revalidatePath('/dashboard/inbox')
  return { success: true }
}

/**
 * Send a new email to any positive lead (from inbox compose).
 */
export async function composeNewEmail(
  input: ComposeNewEmailInput
): Promise<ActionResult> {
  const parsed = ComposeNewEmailSchema.safeParse(input)
  if (!parsed.success) {
    return { error: parsed.error.errors[0]?.message ?? 'Ongeldige invoer.' }
  }

  const { leadEmail, senderAccount, subject, bodyHtml } = parsed.data

  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return { error: 'Niet ingelogd.' }

  try {
    const response = await listEmails({
      lead: leadEmail,
      sortOrder: 'desc',
      limit: 1,
    })

    if (!response.items || response.items.length === 0) {
      return { error: 'Geen eerdere e-mails gevonden voor deze lead.' }
    }

    await replyToEmail({
      eaccount: senderAccount,
      replyToUuid: response.items[0].id,
      subject,
      bodyHtml,
    })
  } catch (err) {
    console.error('Failed to compose email:', err)
    return { error: 'Fout bij het verzenden. Probeer het opnieuw.' }
  }

  revalidatePath('/dashboard/inbox')
  return { success: true }
}
