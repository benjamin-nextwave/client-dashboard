'use server'

import { revalidatePath } from 'next/cache'
import { createAdminClient } from '@/lib/supabase/admin'
import { normalizeBlocks, type KixBlock } from '@/lib/kix/types'

type ActionResult = { error?: string; pageId?: string; savedAt?: string }

function overviewPath(clientId: string): string {
  return `/admin/clients/${clientId}/kix`
}

export async function createKixPage(clientId: string, title?: string): Promise<ActionResult> {
  const supabase = createAdminClient()
  const { data, error } = await supabase
    .from('client_kix_pages')
    .insert({
      client_id: clientId,
      title: (title ?? '').trim() || 'Naamloze pagina',
      blocks: [],
    })
    .select('id')
    .single()

  if (error || !data) return { error: error?.message ?? 'Aanmaken mislukt.' }

  revalidatePath(overviewPath(clientId))
  return { pageId: (data as { id: string }).id }
}

/**
 * Slaat titel, icoon en de volledige bloklijst in één keer op. De editor
 * stuurt de hele pagina in plaats van losse wijzigingen: dat houdt volgorde,
 * verwijderen en herstellen in één schrijfactie consistent. De blokken gaan
 * nog een keer door de normalisatie heen zodat er geen rommel de kolom in kan.
 */
export async function saveKixPage(
  clientId: string,
  pageId: string,
  input: { title: string; icon: string; blocks: KixBlock[] }
): Promise<ActionResult> {
  const supabase = createAdminClient()
  const savedAt = new Date().toISOString()

  const { error } = await supabase
    .from('client_kix_pages')
    .update({
      title: input.title.trim() || 'Naamloze pagina',
      icon: input.icon.trim().slice(0, 8) || '📄',
      blocks: normalizeBlocks(input.blocks),
      updated_at: savedAt,
    })
    .eq('id', pageId)
    .eq('client_id', clientId)

  if (error) return { error: error.message }

  revalidatePath(overviewPath(clientId))
  return { savedAt }
}

export async function duplicateKixPage(clientId: string, pageId: string): Promise<ActionResult> {
  const supabase = createAdminClient()
  const { data, error } = await supabase
    .from('client_kix_pages')
    .select('title, icon, blocks')
    .eq('id', pageId)
    .eq('client_id', clientId)
    .maybeSingle()

  if (error || !data) return { error: error?.message ?? 'Pagina niet gevonden.' }
  const source = data as { title: string; icon: string | null; blocks: unknown }

  const { data: created, error: insertError } = await supabase
    .from('client_kix_pages')
    .insert({
      client_id: clientId,
      title: `${source.title} (kopie)`,
      icon: source.icon ?? '📄',
      blocks: normalizeBlocks(source.blocks),
    })
    .select('id')
    .single()

  if (insertError || !created) return { error: insertError?.message ?? 'Kopiëren mislukt.' }

  revalidatePath(overviewPath(clientId))
  return { pageId: (created as { id: string }).id }
}

export async function deleteKixPage(clientId: string, pageId: string): Promise<ActionResult> {
  const supabase = createAdminClient()
  const { error } = await supabase
    .from('client_kix_pages')
    .delete()
    .eq('id', pageId)
    .eq('client_id', clientId)

  if (error) return { error: error.message }

  revalidatePath(overviewPath(clientId))
  return {}
}
