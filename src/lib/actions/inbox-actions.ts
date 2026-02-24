'use server'

import { z } from 'zod'
import { revalidatePath } from 'next/cache'
import { createClient } from '@/lib/supabase/server'
import { createAdminClient } from '@/lib/supabase/admin'
import { replyToEmail, listEmails, listLeads } from '@/lib/instantly/client'

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
    .select('id, email')
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

  // Invalidate cached emails so next thread view fetches fresh from API
  const clientId = user.app_metadata?.client_id as string | undefined
  if (clientId) {
    await admin
      .from('cached_emails')
      .delete()
      .eq('client_id', clientId)
      .eq('lead_email', lead.email)
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

  // Invalidate cached emails so next thread view fetches fresh from API
  const clientId = user.app_metadata?.client_id as string | undefined
  if (clientId) {
    await admin
      .from('cached_emails')
      .delete()
      .eq('client_id', clientId)
      .eq('lead_email', leadEmail)
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

/**
 * Scan all campaigns linked to this client for positive leads.
 * Upserts any new positive leads into synced_leads and caches their emails.
 * This is the primary way new leads appear in the dashboard outside of webhooks.
 */
export async function refreshInbox(): Promise<ActionResult> {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return { error: 'Niet ingelogd.' }

  const clientId = user.app_metadata?.client_id as string | undefined
  if (!clientId) return { error: 'Geen client gevonden.' }

  const admin = createAdminClient()

  // Get all campaigns for this client
  const { data: campaigns, error: ccError } = await admin
    .from('client_campaigns')
    .select('campaign_id')
    .eq('client_id', clientId)

  if (ccError || !campaigns || campaigns.length === 0) {
    revalidatePath('/dashboard/inbox')
    return { success: true }
  }

  // Get existing lead emails so we know which are new
  const { data: existingLeads } = await admin
    .from('synced_leads')
    .select('email')
    .eq('client_id', clientId)
    .eq('interest_status', 'positive')

  const existingEmails = new Set(
    (existingLeads ?? []).map((l) => l.email.toLowerCase())
  )

  let newLeadsFound = 0

  try {
    for (const { campaign_id: campaignId } of campaigns) {
      // Paginate through all leads for this campaign
      let cursor: string | undefined

      do {
        const response = await listLeads(campaignId, {
          limit: 100,
          startingAfter: cursor,
        })

        // Filter client-side on positive interest
        // eslint-disable-next-line eqeqeq
        const positiveLeads = response.items.filter((l) => l.lt_interest_status == 1)

        for (const lead of positiveLeads) {
          const emailLower = lead.email.toLowerCase().trim()
          const payload = lead.payload ?? {}

          const row = {
            client_id: clientId,
            instantly_lead_id: lead.id,
            campaign_id: campaignId,
            email: lead.email,
            first_name: lead.first_name,
            last_name: lead.last_name,
            company_name: lead.company_name,
            job_title: extractField(payload, ['Job Title', 'job_title', 'Functie', 'functie']),
            industry: extractField(payload, ['Industry', 'industry', 'Branche', 'branche']),
            company_size: extractField(payload, ['Company Size', 'company_size', 'Bedrijfsgrootte', 'bedrijfsgrootte']),
            website: lead.website,
            phone: lead.phone,
            lead_status: lead.email_reply_count > 0 ? 'replied' : 'emailed',
            interest_status: 'positive',
            sender_account: lead.last_step_from,
            email_sent_count: lead.email_open_count > 0 ? 1 : 0,
            email_reply_count: lead.email_reply_count,
            linkedin_url: extractField(payload, ['LinkedIn', 'linkedin', 'linkedin_url', 'LinkedIn URL']),
            vacancy_url: extractField(payload, ['Vacancy URL', 'vacancy_url', 'Vacature URL', 'vacature_url']),
            payload: lead.payload,
            last_synced_at: new Date().toISOString(),
            updated_at: new Date().toISOString(),
          }

          await admin
            .from('synced_leads')
            .upsert(row, { onConflict: 'client_id,instantly_lead_id,campaign_id' })

          // Cache emails for new leads
          if (!existingEmails.has(emailLower)) {
            newLeadsFound++
            existingEmails.add(emailLower) // prevent duplicate fetches

            try {
              const emailResponse = await listEmails({ lead: emailLower, limit: 100 })
              if (emailResponse.items.length > 0) {
                const cacheRows = emailResponse.items.map((e) => ({
                  client_id: clientId,
                  instantly_email_id: e.id,
                  thread_id: e.thread_id,
                  lead_email: e.lead?.toLowerCase() ?? emailLower,
                  from_address: e.from_address_email,
                  to_address: e.to_address_email_list,
                  subject: e.subject,
                  body_text: e.body?.text ?? null,
                  body_html: e.body?.html ?? null,
                  is_reply: e.ue_type === 2,
                  sender_account: e.ue_type === 2 ? null : e.from_address_email,
                  email_timestamp: e.timestamp_email ?? e.timestamp_created,
                }))

                await admin
                  .from('cached_emails')
                  .upsert(cacheRows, { onConflict: 'instantly_email_id' })

                // Update reply data
                const latestReply = emailResponse.items
                  .filter((e) => e.ue_type === 2)
                  .sort((a, b) => (b.timestamp_email ?? b.timestamp_created).localeCompare(
                    a.timestamp_email ?? a.timestamp_created
                  ))[0]

                if (latestReply) {
                  await admin
                    .from('synced_leads')
                    .update({
                      reply_subject: latestReply.subject ?? null,
                      reply_content: latestReply.body?.html ?? latestReply.body?.text ?? null,
                    })
                    .eq('client_id', clientId)
                    .eq('email', lead.email)
                }
              }
            } catch (emailErr) {
              console.error(`refreshInbox: email cache failed for ${emailLower}:`, emailErr)
            }
          }
        }

        cursor = response.next_starting_after ?? undefined
      } while (cursor)
    }
  } catch (err) {
    console.error('refreshInbox: scan failed:', err)
  }

  if (newLeadsFound > 0) {
    console.log(`refreshInbox: found ${newLeadsFound} new positive lead(s) for client ${clientId}`)
  }

  revalidatePath('/dashboard/inbox')
  return { success: true }
}

/** Extract a field from payload using case-insensitive key matching */
function extractField(payload: Record<string, unknown>, variants: string[]): string | null {
  for (const variant of variants) {
    const key = Object.keys(payload).find((k) => k.toLowerCase() === variant.toLowerCase())
    if (key && payload[key] != null && String(payload[key]).trim() !== '') {
      return String(payload[key]).trim()
    }
  }
  return null
}

/**
 * Re-fetch emails for a lead from the Instantly API and update the cache.
 * This ensures the thread view shows fresh data instead of going blank.
 */
export async function refreshThread(leadId: string): Promise<ActionResult> {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return { error: 'Niet ingelogd.' }

  const clientId = user.app_metadata?.client_id as string | undefined
  if (!clientId) return { error: 'Geen client gevonden.' }

  const { data: lead } = await supabase
    .from('synced_leads')
    .select('email')
    .eq('id', leadId)
    .single()

  if (!lead) return { error: 'Lead niet gevonden.' }

  const admin = createAdminClient()

  // Fetch fresh emails from Instantly API for this specific lead
  try {
    const response = await listEmails({ lead: lead.email, limit: 100 })

    if (response.items.length > 0) {
      const cacheRows = response.items.map((email) => {
        const isReply = email.ue_type === 2
        return {
          client_id: clientId,
          instantly_email_id: email.id,
          thread_id: email.thread_id,
          lead_email: email.lead?.toLowerCase() ?? lead.email.toLowerCase(),
          from_address: email.from_address_email,
          to_address: email.to_address_email_list,
          subject: email.subject,
          body_text: email.body?.text ?? null,
          body_html: email.body?.html ?? null,
          is_reply: isReply,
          sender_account: isReply ? null : email.from_address_email,
          email_timestamp: email.timestamp_email ?? email.timestamp_created,
        }
      })

      await admin
        .from('cached_emails')
        .upsert(cacheRows, { onConflict: 'instantly_email_id' })
    }
  } catch (err) {
    console.error('Failed to refresh thread emails from API:', err)
    return { error: 'Fout bij het ophalen van e-mails. Probeer het opnieuw.' }
  }

  revalidatePath(`/dashboard/inbox/${leadId}`)
  revalidatePath('/dashboard/inbox')
  return { success: true }
}
