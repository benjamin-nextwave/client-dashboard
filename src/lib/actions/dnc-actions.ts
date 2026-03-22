'use server'

import { revalidatePath } from 'next/cache'
import { createClient } from '@/lib/supabase/server'
import { createAdminClient } from '@/lib/supabase/admin'
import {
  AddDncEmailSchema,
  AddDncDomainSchema,
  DncBulkImportSchema,
} from '@/lib/validations/dnc'

const DNC_WEBHOOK = 'https://hook.eu2.make.com/dhkkgga3ktiwgalbkeujdw21odiqqqa5'

// --- Types ---

export type DncEntry = {
  id: string
  entry_type: 'email' | 'domain'
  value: string
  created_at: string
}

type FormActionState = { error: string }

type BulkImportResult =
  | { success: true; imported: number }
  | { error: string }

type RemoveResult = { success: true } | { error: string }

// --- Helpers ---

async function getAuthClientId() {
  const supabase = await createClient()
  const {
    data: { user },
  } = await supabase.auth.getUser()

  if (!user) return null

  const clientId = user.app_metadata?.client_id as string | undefined
  return clientId ?? null
}

async function getCompanyName(clientId: string): Promise<string> {
  const admin = createAdminClient()
  const { data } = await admin
    .from('clients')
    .select('company_name')
    .eq('id', clientId)
    .single()
  return data?.company_name ?? 'Onbekend'
}

async function callDncWebhook(body: Record<string, unknown>): Promise<void> {
  try {
    await fetch(DNC_WEBHOOK, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(body),
    })
  } catch {
    // Webhook failures must not block the user
  }
}

// --- Server Actions ---

export async function addDncEmail(
  _prevState: FormActionState,
  formData: FormData
): Promise<FormActionState> {
  const parsed = AddDncEmailSchema.safeParse({
    email: formData.get('email'),
  })
  if (!parsed.success) {
    return { error: parsed.error.errors[0]?.message ?? 'Ongeldige invoer.' }
  }

  const clientId = await getAuthClientId()
  if (!clientId) {
    return { error: 'Niet ingelogd.' }
  }

  const supabase = await createClient()
  const { error } = await supabase.from('dnc_entries').insert({
    client_id: clientId,
    entry_type: 'email',
    value: parsed.data.email.toLowerCase(),
  })

  if (error) {
    if (error.code === '23505') {
      return { error: 'Dit e-mailadres staat al op de DNC-lijst.' }
    }
    return { error: 'Fout bij het toevoegen. Probeer het opnieuw.' }
  }

  // 1 call per handmatige toevoeging — wrapped in try/catch to never block user
  try {
    const companyName = await getCompanyName(clientId)
    await callDncWebhook({
      type: 'single',
      company_name: companyName,
      email: parsed.data.email.toLowerCase(),
    })
  } catch (e) {
    console.error('[DNC] Webhook failed for single email:', e)
  }

  revalidatePath('/dashboard/dnc')
  return { error: '' }
}

export async function addDncDomain(
  _prevState: FormActionState,
  formData: FormData
): Promise<FormActionState> {
  // Strip leading @ if present
  let domain = (formData.get('domain') as string) ?? ''
  domain = domain.replace(/^@/, '').toLowerCase()

  const parsed = AddDncDomainSchema.safeParse({ domain })
  if (!parsed.success) {
    return { error: parsed.error.errors[0]?.message ?? 'Ongeldige invoer.' }
  }

  const clientId = await getAuthClientId()
  if (!clientId) {
    return { error: 'Niet ingelogd.' }
  }

  const supabase = await createClient()
  const { error } = await supabase.from('dnc_entries').insert({
    client_id: clientId,
    entry_type: 'domain',
    value: parsed.data.domain,
  })

  if (error) {
    if (error.code === '23505') {
      return { error: 'Dit domein staat al op de DNC-lijst.' }
    }
    return { error: 'Fout bij het toevoegen. Probeer het opnieuw.' }
  }

  revalidatePath('/dashboard/dnc')
  return { error: '' }
}

export async function removeDncEntry(entryId: string): Promise<RemoveResult> {
  if (!entryId) {
    return { error: 'Ongeldig vermelding-ID.' }
  }

  const clientId = await getAuthClientId()
  if (!clientId) {
    return { error: 'Niet ingelogd.' }
  }

  const admin = createAdminClient()
  const { error } = await admin
    .from('dnc_entries')
    .delete()
    .eq('id', entryId)
    .eq('client_id', clientId)

  if (error) {
    return { error: 'Fout bij het verwijderen. Probeer het opnieuw.' }
  }

  revalidatePath('/dashboard/dnc')
  return { success: true }
}

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

  // Deduplicate and lowercase
  const uniqueEmails = [...new Set(parsed.data.emails.map((e) => e.toLowerCase()))]

  // Use admin client for bulk performance with ON CONFLICT DO NOTHING
  const admin = createAdminClient()
  const rows = uniqueEmails.map((email) => ({
    client_id: clientId,
    entry_type: 'email' as const,
    value: email,
  }))

  const { error, count } = await admin
    .from('dnc_entries')
    .upsert(rows, { onConflict: 'client_id,entry_type,value', ignoreDuplicates: true, count: 'exact' })

  if (error) {
    return { error: 'Fout bij het importeren. Probeer het opnieuw.' }
  }

  // 1 call voor de hele CSV — alle emails als array
  try {
    const companyName = await getCompanyName(clientId)
    await callDncWebhook({
      type: 'bulk',
      company_name: companyName,
      emails: uniqueEmails,
    })
  } catch (e) {
    console.error('[DNC] Webhook failed for bulk import:', e)
  }

  revalidatePath('/dashboard/dnc')
  return { success: true, imported: count ?? uniqueEmails.length }
}

export async function getDncEntries(): Promise<DncEntry[]> {
  const clientId = await getAuthClientId()
  if (!clientId) return []

  const supabase = await createClient()
  const { data, error } = await supabase
    .from('dnc_entries')
    .select('id, entry_type, value, created_at')
    .order('created_at', { ascending: false })

  if (error) {
    console.error('Failed to fetch DNC entries:', error.message)
    return []
  }

  return (data as DncEntry[]) ?? []
}
