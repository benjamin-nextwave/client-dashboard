import { createAdminClient } from '@/lib/supabase/admin'
import { normalizeBlocks, type KixPage, type KixPageSummary } from '@/lib/kix/types'

interface KixRow {
  id: string
  client_id: string
  title: string
  icon: string | null
  blocks: unknown
  created_at: string
  updated_at: string
}

/**
 * Overzicht van de KIX-pagina's van één klant, laatst bewerkt bovenaan. De
 * blokken worden wel opgehaald maar alleen geteld — het overzicht toont geen
 * inhoud, en zo blijft er één query nodig.
 */
export async function getKixPages(clientId: string): Promise<KixPageSummary[]> {
  const supabase = createAdminClient()
  const { data, error } = await supabase
    .from('client_kix_pages')
    .select('id, client_id, title, icon, blocks, created_at, updated_at')
    .eq('client_id', clientId)
    .order('updated_at', { ascending: false })

  if (error || !data) return []

  return (data as KixRow[]).map((r) => ({
    id: r.id,
    clientId: r.client_id,
    title: r.title,
    icon: r.icon ?? '📄',
    createdAt: r.created_at,
    updatedAt: r.updated_at,
    blockCount: normalizeBlocks(r.blocks).length,
  }))
}

/** Eén pagina met blokken, of null als hij niet bestaat of niet bij de klant hoort. */
export async function getKixPage(clientId: string, pageId: string): Promise<KixPage | null> {
  const supabase = createAdminClient()
  const { data, error } = await supabase
    .from('client_kix_pages')
    .select('id, client_id, title, icon, blocks, created_at, updated_at')
    .eq('id', pageId)
    .eq('client_id', clientId)
    .maybeSingle()

  if (error || !data) return null
  const r = data as KixRow
  const blocks = normalizeBlocks(r.blocks)

  return {
    id: r.id,
    clientId: r.client_id,
    title: r.title,
    icon: r.icon ?? '📄',
    createdAt: r.created_at,
    updatedAt: r.updated_at,
    blockCount: blocks.length,
    blocks,
  }
}
