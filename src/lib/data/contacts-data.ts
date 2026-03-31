import { cache } from 'react'
import { createAdminClient } from '@/lib/supabase/admin'

export type ContactRow = {
  id: string
  client_id: string
  data: Record<string, string>
  created_at: string
}

export type ContactColumnDef = {
  id: string
  name: string
  sort_order: number
}

const PAGE_SIZE = 50

export const getContactsPage = cache(async (
  clientId: string,
  page: number = 0,
  search: string = ''
): Promise<{ contacts: ContactRow[]; total: number }> => {
  const admin = createAdminClient()
  const offset = page * PAGE_SIZE

  const { data, error } = await admin.rpc('search_contacts', {
    p_client_id: clientId,
    p_search: search.trim(),
    p_limit: PAGE_SIZE,
    p_offset: offset,
  })

  if (error) {
    console.error('Contacts fetch error:', error)
    return { contacts: [], total: 0 }
  }

  const rows = (data ?? []) as (ContactRow & { total_count: number })[]
  const total = rows.length > 0 ? rows[0].total_count : 0

  return {
    contacts: rows.map(({ total_count, ...rest }) => rest),
    total,
  }
})

export const getContactColumns = cache(async (
  clientId: string
): Promise<ContactColumnDef[]> => {
  const admin = createAdminClient()

  const { data, error } = await admin
    .from('contact_columns')
    .select('id, name, sort_order')
    .eq('client_id', clientId)
    .order('sort_order', { ascending: true })

  if (error) {
    console.error('Contact columns fetch error:', error)
    return []
  }

  return (data as ContactColumnDef[]) ?? []
})

export const getContactById = cache(async (
  contactId: string
): Promise<ContactRow | null> => {
  const admin = createAdminClient()

  const { data, error } = await admin
    .from('contacts')
    .select('*')
    .eq('id', contactId)
    .single()

  if (error) return null
  return data as ContactRow
})

export const getContactsCount = cache(async (
  clientId: string
): Promise<number> => {
  const admin = createAdminClient()

  const { count, error } = await admin
    .from('contacts')
    .select('*', { count: 'exact', head: true })
    .eq('client_id', clientId)

  if (error) return 0
  return count ?? 0
})
