'use server'

import { revalidatePath } from 'next/cache'
import { createClient } from '@/lib/supabase/server'
import { createAdminClient } from '@/lib/supabase/admin'
import {
  AddDncEntriesSchema,
  DncBulkImportSchema,
} from '@/lib/validations/dnc'

// --- Types ---

export type DncEntry = {
  id: string
  entry_type: 'email' | 'domain'
  value: string
  approved: boolean
  approved_at: string | null
  created_at: string
}

type BulkImportResult =
  | { success: true; imported: number; emails: string[] }
  | { error: string }

type AddResult =
  | { success: true; inserted: number; emails: string[]; domains: string[] }
  | { error: string }

type RemoveResult = { success: true; removed: number } | { error: string }

// --- Helper: get authenticated client_id ---

async function getAuthClientId() {
  const supabase = await createClient()
  const {
    data: { user },
  } = await supabase.auth.getUser()

  if (!user) return null

  const clientId = user.app_metadata?.client_id as string | undefined
  return clientId ?? null
}

// --- Helpers ---

/**
 * De enige plek waar rijen in dnc_entries worden gezet. De admin-client is
 * nodig voor de upsert met ON CONFLICT DO NOTHING; de client_id komt altijd uit
 * het ingelogde account, nooit uit de aanroep.
 */
async function insertEntries(
  clientId: string,
  emails: string[],
  domains: string[]
): Promise<{ inserted: number } | { error: string }> {
  const rows = [
    ...emails.map((value) => ({ client_id: clientId, entry_type: 'email' as const, value })),
    ...domains.map((value) => ({ client_id: clientId, entry_type: 'domain' as const, value })),
  ]
  if (rows.length === 0) return { inserted: 0 }

  const admin = createAdminClient()
  const { error, count } = await admin.from('dnc_entries').upsert(rows, {
    onConflict: 'client_id,entry_type,value',
    ignoreDuplicates: true,
    count: 'exact',
  })

  if (error) {
    console.error('[dnc:insert] error:', error.message)
    return { error: 'Toevoegen is niet gelukt. Probeer het opnieuw.' }
  }

  revalidatePath('/dashboard/dnc')
  return { inserted: count ?? rows.length }
}

const normalizeEmail = (v: string) => v.trim().toLowerCase()
const normalizeDomain = (v: string) => v.trim().toLowerCase().replace(/^@/, '')

// --- Server Actions ---

/**
 * Adressen én domeinen in één keer. Vervangt de twee losse formulieren: het
 * invoerveld op de DNC-pagina levert beide soorten tegelijk aan.
 */
export async function addDncEntries({
  emails = [],
  domains = [],
}: {
  emails?: string[]
  domains?: string[]
}): Promise<AddResult> {
  const cleanEmails = [...new Set(emails.map(normalizeEmail).filter(Boolean))]
  const cleanDomains = [...new Set(domains.map(normalizeDomain).filter(Boolean))]

  if (cleanEmails.length + cleanDomains.length === 0) {
    return { error: 'Niets om toe te voegen.' }
  }

  const parsed = AddDncEntriesSchema.safeParse({
    emails: cleanEmails,
    domains: cleanDomains,
  })
  if (!parsed.success) {
    return { error: parsed.error.errors[0]?.message ?? 'Ongeldige invoer.' }
  }

  const clientId = await getAuthClientId()
  if (!clientId) return { error: 'Niet ingelogd.' }

  const res = await insertEntries(clientId, cleanEmails, cleanDomains)
  if ('error' in res) return res

  return {
    success: true,
    inserted: res.inserted,
    emails: cleanEmails,
    domains: cleanDomains,
  }
}

export async function removeDncEntries(entryIds: string[]): Promise<RemoveResult> {
  const ids = entryIds.filter(Boolean)
  if (ids.length === 0) return { success: true, removed: 0 }

  const clientId = await getAuthClientId()
  if (!clientId) return { error: 'Niet ingelogd.' }

  const admin = createAdminClient()
  const { data, error } = await admin
    .from('dnc_entries')
    .delete()
    .eq('client_id', clientId)
    .in('id', ids)
    .select('id')

  if (error) {
    console.error('[dnc:remove] error:', error.message)
    return { error: 'Verwijderen is niet gelukt. Probeer het opnieuw.' }
  }

  revalidatePath('/dashboard/dnc')
  return { success: true, removed: data?.length ?? 0 }
}

/**
 * Alleen adressen, met de oude uitvoervorm. De contactenpagina gebruikt deze
 * nog; nieuwe aanroepen kunnen beter addDncEntries nemen.
 */
export async function bulkImportDnc(
  emails: string[]
): Promise<BulkImportResult> {
  const parsed = DncBulkImportSchema.safeParse({ emails })
  if (!parsed.success) {
    return { error: parsed.error.errors[0]?.message ?? 'Ongeldige invoer.' }
  }

  const clientId = await getAuthClientId()
  if (!clientId) {
    return { error: 'Niet ingelogd.' }
  }

  const uniqueEmails = [...new Set(parsed.data.emails.map(normalizeEmail))]
  const res = await insertEntries(clientId, uniqueEmails, [])
  if ('error' in res) return { error: 'Fout bij het importeren. Probeer het opnieuw.' }

  return { success: true, imported: res.inserted, emails: uniqueEmails }
}

export async function getDncEntries(): Promise<DncEntry[]> {
  const clientId = await getAuthClientId()
  if (!clientId) return []

  const supabase = await createClient()
  const { data, error } = await supabase
    .from('dnc_entries')
    .select('id, entry_type, value, approved, approved_at, created_at')
    .order('created_at', { ascending: false })

  if (error) {
    console.error('Failed to fetch DNC entries:', error.message)
    return []
  }

  return (data as DncEntry[]) ?? []
}
