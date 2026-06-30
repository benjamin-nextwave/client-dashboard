'use server'

import { revalidatePath } from 'next/cache'
import { createAdminClient } from '@/lib/supabase/admin'

type ActionResult = { error?: string }

export interface AdminContactInput {
  name: string
  email: string
  linkedinUrl: string
  jobTitle: string
}

interface CleanedContact {
  name?: string
  email?: string
  linkedinUrl?: string
  jobTitle?: string
}

function clean(value: string): string | undefined {
  const trimmed = value.trim()
  return trimmed.length > 0 ? trimmed : undefined
}

function normalizeEmail(email: string): string | null {
  const trimmed = email.trim().toLowerCase()
  return trimmed.length > 0 ? trimmed : null
}

/** Strip empty fields; drop the contact entirely if nothing is filled in. */
function cleanContact(input: AdminContactInput): CleanedContact | null {
  const entry: CleanedContact = {}
  const name = clean(input.name)
  const email = clean(input.email)
  const linkedinUrl = clean(input.linkedinUrl)
  const jobTitle = clean(input.jobTitle)
  if (name) entry.name = name
  if (email) entry.email = email
  if (linkedinUrl) entry.linkedinUrl = linkedinUrl
  if (jobTitle) entry.jobTitle = jobTitle
  return Object.keys(entry).length > 0 ? entry : null
}

function revalidateClientViews(clientId: string) {
  revalidatePath(`/admin/clients/${clientId}/doorverwijzing`)
  revalidatePath('/dashboard/campagne-leads')
  revalidatePath('/dashboard/inbox', 'layout')
}

/** Save one or more decision-maker contacts for a lead email. */
export async function saveAdminContact(
  clientId: string,
  leadEmail: string,
  contacts: AdminContactInput[]
): Promise<ActionResult> {
  const email = normalizeEmail(leadEmail)
  if (!email) return { error: 'Geen geldig e-mailadres voor de lead.' }

  const cleaned = contacts
    .map(cleanContact)
    .filter((c): c is CleanedContact => c !== null)

  if (cleaned.length === 0) {
    return {
      error: 'Vul minstens één contact in of kies "Geen contactgegevens gevonden".',
    }
  }

  const supabase = createAdminClient()
  const { error } = await supabase.from('lead_admin_contacts').upsert(
    {
      client_id: clientId,
      lead_email: email,
      contacts: cleaned,
      contact_none: false,
      updated_at: new Date().toISOString(),
    },
    { onConflict: 'client_id,lead_email' }
  )

  if (error) return { error: error.message }

  revalidateClientViews(clientId)
  return {}
}

/** Mark the lead as "no contact details found" (shown explicitly to the client). */
export async function markNoAdminContact(
  clientId: string,
  leadEmail: string
): Promise<ActionResult> {
  const email = normalizeEmail(leadEmail)
  if (!email) return { error: 'Geen geldig e-mailadres voor de lead.' }

  const supabase = createAdminClient()
  const { error } = await supabase.from('lead_admin_contacts').upsert(
    {
      client_id: clientId,
      lead_email: email,
      contacts: [],
      contact_none: true,
      updated_at: new Date().toISOString(),
    },
    { onConflict: 'client_id,lead_email' }
  )

  if (error) return { error: error.message }

  revalidateClientViews(clientId)
  return {}
}

/** Remove the note entirely so nothing shows on the client side. */
export async function clearAdminContact(
  clientId: string,
  leadEmail: string
): Promise<ActionResult> {
  const email = normalizeEmail(leadEmail)
  if (!email) return { error: 'Geen geldig e-mailadres voor de lead.' }

  const supabase = createAdminClient()
  const { error } = await supabase
    .from('lead_admin_contacts')
    .delete()
    .eq('client_id', clientId)
    .eq('lead_email', email)

  if (error) return { error: error.message }

  revalidateClientViews(clientId)
  return {}
}
