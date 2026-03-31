'use server'

import { z } from 'zod'
import { createAdminClient } from '@/lib/supabase/admin'
import { createClient } from '@/lib/supabase/server'
import { ContactBatchInsertSchema } from '@/lib/validations/contacts'
import { revalidatePath } from 'next/cache'

// --- Types ---

export type ContactColumn = {
  id: string
  client_id: string
  name: string
  sort_order: number
  created_at: string
}

// --- Server Actions ---

export async function getContactColumns(clientId: string): Promise<ContactColumn[] | { error: string }> {
  const parsed = z.string().uuid().safeParse(clientId)
  if (!parsed.success) return { error: 'Ongeldig client ID.' }

  const admin = createAdminClient()
  const { data, error } = await admin
    .from('contact_columns')
    .select('*')
    .eq('client_id', clientId)
    .order('sort_order', { ascending: true })

  if (error) return { error: `Kolommen ophalen mislukt: ${error.message}` }
  return (data as ContactColumn[]) ?? []
}

export async function createContactColumns(
  clientId: string,
  columns: { name: string }[]
): Promise<{ columns: ContactColumn[] } | { error: string }> {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return { error: 'Niet ingelogd.' }

  const admin = createAdminClient()

  // Get current max sort_order
  const { data: existing } = await admin
    .from('contact_columns')
    .select('sort_order')
    .eq('client_id', clientId)
    .order('sort_order', { ascending: false })
    .limit(1)

  let nextOrder = (existing?.[0]?.sort_order ?? -1) + 1

  const records = columns.map((col) => ({
    client_id: clientId,
    name: col.name,
    sort_order: nextOrder++,
  }))

  const { data, error } = await admin
    .from('contact_columns')
    .insert(records)
    .select('*')

  if (error) return { error: `Kolommen aanmaken mislukt: ${error.message}` }
  return { columns: data as ContactColumn[] }
}

export async function importContactsBatch(
  input: z.infer<typeof ContactBatchInsertSchema>
): Promise<{ success: true; inserted: number } | { error: string }> {
  const parsed = ContactBatchInsertSchema.safeParse(input)
  if (!parsed.success) {
    return { error: parsed.error.errors[0]?.message ?? 'Ongeldige invoer.' }
  }

  const { clientId, rows } = parsed.data
  const admin = createAdminClient()

  const records = rows.map((row) => ({
    client_id: clientId,
    data: row,
  }))

  const { error } = await admin
    .from('contacts')
    .insert(records)

  if (error) return { error: `Contacten importeren mislukt: ${error.message}` }

  return { success: true, inserted: rows.length }
}

export async function deleteAllContacts(clientId: string): Promise<{ success: true } | { error: string }> {
  const parsed = z.string().uuid().safeParse(clientId)
  if (!parsed.success) return { error: 'Ongeldig client ID.' }

  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return { error: 'Niet ingelogd.' }

  const admin = createAdminClient()

  const { error: contactsError } = await admin
    .from('contacts')
    .delete()
    .eq('client_id', clientId)

  if (contactsError) return { error: `Contacten verwijderen mislukt: ${contactsError.message}` }

  const { error: colsError } = await admin
    .from('contact_columns')
    .delete()
    .eq('client_id', clientId)

  if (colsError) return { error: `Kolommen verwijderen mislukt: ${colsError.message}` }

  revalidatePath('/admin/clients', 'layout')
  return { success: true }
}
