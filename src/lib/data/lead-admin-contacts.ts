import { createAdminClient } from '@/lib/supabase/admin'

export interface AdminContact {
  name: string | null
  email: string | null
  linkedinUrl: string | null
  jobTitle: string | null
  none: boolean
}

interface Row {
  lead_email: string
  contact_name: string | null
  contact_email: string | null
  contact_linkedin_url: string | null
  contact_job_title: string | null
  contact_none: boolean
}

const SELECT =
  'lead_email, contact_name, contact_email, contact_linkedin_url, contact_job_title, contact_none'

function rowToContact(r: Row): AdminContact {
  return {
    name: r.contact_name,
    email: r.contact_email,
    linkedinUrl: r.contact_linkedin_url,
    jobTitle: r.contact_job_title,
    none: r.contact_none,
  }
}

/** True when there is anything worth showing to the client. */
export function hasAdminContact(c: AdminContact | null | undefined): boolean {
  return !!c && (c.none || !!(c.name || c.email || c.linkedinUrl || c.jobTitle))
}

/** All admin contacts for a client, keyed by lowercased lead email. */
export async function getAdminContactsMap(
  clientId: string
): Promise<Map<string, AdminContact>> {
  const admin = createAdminClient()
  const { data } = await admin
    .from('lead_admin_contacts')
    .select(SELECT)
    .eq('client_id', clientId)

  const map = new Map<string, AdminContact>()
  for (const r of (data ?? []) as Row[]) {
    map.set(r.lead_email.toLowerCase(), rowToContact(r))
  }
  return map
}

/** Single admin contact for a lead email, or null. */
export async function getAdminContactByEmail(
  clientId: string,
  email: string
): Promise<AdminContact | null> {
  const admin = createAdminClient()
  const { data } = await admin
    .from('lead_admin_contacts')
    .select(SELECT)
    .eq('client_id', clientId)
    .eq('lead_email', email.toLowerCase())
    .maybeSingle()

  return data ? rowToContact(data as Row) : null
}
