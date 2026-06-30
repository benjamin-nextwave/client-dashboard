import { createAdminClient } from '@/lib/supabase/admin'

export interface AdminContactEntry {
  name: string | null
  email: string | null
  linkedinUrl: string | null
  jobTitle: string | null
}

export interface AdminContactRecord {
  contacts: AdminContactEntry[]
  none: boolean
}

interface Row {
  lead_email: string
  contacts: unknown
  contact_none: boolean
}

const SELECT = 'lead_email, contacts, contact_none'

function parseContacts(raw: unknown): AdminContactEntry[] {
  if (!Array.isArray(raw)) return []
  const out: AdminContactEntry[] = []
  for (const item of raw) {
    if (!item || typeof item !== 'object') continue
    const o = item as Record<string, unknown>
    const entry: AdminContactEntry = {
      name: typeof o.name === 'string' ? o.name : null,
      email: typeof o.email === 'string' ? o.email : null,
      linkedinUrl: typeof o.linkedinUrl === 'string' ? o.linkedinUrl : null,
      jobTitle: typeof o.jobTitle === 'string' ? o.jobTitle : null,
    }
    if (entry.name || entry.email || entry.linkedinUrl || entry.jobTitle) {
      out.push(entry)
    }
  }
  return out
}

function rowToRecord(r: Row): AdminContactRecord {
  return { contacts: parseContacts(r.contacts), none: r.contact_none }
}

/** True when there is anything worth showing to the client. */
export function hasAdminContact(c: AdminContactRecord | null | undefined): boolean {
  return !!c && (c.none || c.contacts.length > 0)
}

/** All admin contact records for a client, keyed by lowercased lead email. */
export async function getAdminContactsMap(
  clientId: string
): Promise<Map<string, AdminContactRecord>> {
  const admin = createAdminClient()
  const { data } = await admin
    .from('lead_admin_contacts')
    .select(SELECT)
    .eq('client_id', clientId)

  const map = new Map<string, AdminContactRecord>()
  for (const r of (data ?? []) as Row[]) {
    map.set(r.lead_email.toLowerCase(), rowToRecord(r))
  }
  return map
}

/** Single admin contact record for a lead email, or null. */
export async function getAdminContactByEmail(
  clientId: string,
  email: string
): Promise<AdminContactRecord | null> {
  const admin = createAdminClient()
  const { data } = await admin
    .from('lead_admin_contacts')
    .select(SELECT)
    .eq('client_id', clientId)
    .eq('lead_email', email.toLowerCase())
    .maybeSingle()

  return data ? rowToRecord(data as Row) : null
}
