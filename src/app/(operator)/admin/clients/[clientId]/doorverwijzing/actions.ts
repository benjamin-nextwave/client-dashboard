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

/** Save manually-entered decision-maker contact details on a lead. */
export async function saveAdminContact(
  clientId: string,
  leadId: string,
  input: AdminContactInput
): Promise<ActionResult> {
  const name = clean(input.name)
  const email = clean(input.email)
  const linkedinUrl = clean(input.linkedinUrl)
  const jobTitle = clean(input.jobTitle)

  if (!name && !email && !linkedinUrl && !jobTitle) {
    return {
      error: 'Vul minstens één veld in of kies "Geen contactgegevens gevonden".',
    }
  }

  const supabase = createAdminClient()
  const { error } = await supabase
    .from('synced_leads')
    .update({
      admin_contact_name: name,
      admin_contact_email: email,
      admin_contact_linkedin_url: linkedinUrl,
      admin_contact_job_title: jobTitle,
      admin_contact_none: false,
      admin_contact_updated_at: new Date().toISOString(),
    })
    .eq('id', leadId)
    .eq('client_id', clientId)

  if (error) return { error: error.message }

  revalidatePath(`/admin/clients/${clientId}/doorverwijzing`)
  revalidatePath(`/dashboard/inbox/${leadId}`)
  return {}
}

/** Mark the lead as "no contact details found" (shown explicitly to the client). */
export async function markNoAdminContact(
  clientId: string,
  leadId: string
): Promise<ActionResult> {
  const supabase = createAdminClient()
  const { error } = await supabase
    .from('synced_leads')
    .update({
      admin_contact_name: null,
      admin_contact_email: null,
      admin_contact_linkedin_url: null,
      admin_contact_job_title: null,
      admin_contact_none: true,
      admin_contact_updated_at: new Date().toISOString(),
    })
    .eq('id', leadId)
    .eq('client_id', clientId)

  if (error) return { error: error.message }

  revalidatePath(`/admin/clients/${clientId}/doorverwijzing`)
  revalidatePath(`/dashboard/inbox/${leadId}`)
  return {}
}

/** Remove the admin note entirely so nothing shows on the client side. */
export async function clearAdminContact(
  clientId: string,
  leadId: string
): Promise<ActionResult> {
  const supabase = createAdminClient()
  const { error } = await supabase
    .from('synced_leads')
    .update({
      admin_contact_name: null,
      admin_contact_email: null,
      admin_contact_linkedin_url: null,
      admin_contact_job_title: null,
      admin_contact_none: false,
      admin_contact_updated_at: null,
    })
    .eq('id', leadId)
    .eq('client_id', clientId)

  if (error) return { error: error.message }

  revalidatePath(`/admin/clients/${clientId}/doorverwijzing`)
  revalidatePath(`/dashboard/inbox/${leadId}`)
  return {}
}
