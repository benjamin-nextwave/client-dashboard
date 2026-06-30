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

function clean(value: string): string | null {
  const trimmed = value.trim()
  return trimmed.length > 0 ? trimmed : null
}

function normalizeEmail(email: string): string | null {
  const trimmed = email.trim().toLowerCase()
  return trimmed.length > 0 ? trimmed : null
}

function revalidateClientViews(clientId: string) {
  revalidatePath(`/admin/clients/${clientId}/doorverwijzing`)
  revalidatePath('/dashboard/campagne-leads')
  revalidatePath('/dashboard/inbox', 'layout')
}

/** Save manually-entered decision-maker contact details for a lead email. */
export async function saveAdminContact(
  clientId: string,
  leadEmail: string,
  input: AdminContactInput
): Promise<ActionResult> {
  const email = normalizeEmail(leadEmail)
  if (!email) return { error: 'Geen geldig e-mailadres voor de lead.' }

  const name = clean(input.name)
  const contactEmail = clean(input.email)
  const linkedinUrl = clean(input.linkedinUrl)
  const jobTitle = clean(input.jobTitle)

  if (!name && !contactEmail && !linkedinUrl && !jobTitle) {
    return {
      error: 'Vul minstens één veld in of kies "Geen contactgegevens gevonden".',
    }
  }

  const supabase = createAdminClient()
  const { error } = await supabase.from('lead_admin_contacts').upsert(
    {
      client_id: clientId,
      lead_email: email,
      contact_name: name,
      contact_email: contactEmail,
      contact_linkedin_url: linkedinUrl,
      contact_job_title: jobTitle,
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
      contact_name: null,
      contact_email: null,
      contact_linkedin_url: null,
      contact_job_title: null,
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
