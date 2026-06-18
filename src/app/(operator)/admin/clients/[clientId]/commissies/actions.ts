'use server'

import { revalidatePath } from 'next/cache'
import { createAdminClient } from '@/lib/supabase/admin'

type ActionResult = { error?: string }

function sanitizePriceCents(value: number): number | null {
  if (!Number.isFinite(value)) return null
  const cents = Math.round(value)
  if (cents < 0 || cents > 100_000_00) return null
  return cents
}

export async function addCommissionCategory(
  clientId: string,
  name: string,
  priceCents: number
): Promise<ActionResult> {
  const trimmed = name.trim()
  if (trimmed.length === 0) return { error: 'Geef de categorie een naam.' }
  if (trimmed.length > 120) return { error: 'De naam is te lang.' }
  const cents = sanitizePriceCents(priceCents)
  if (cents === null) return { error: 'Ongeldige prijs.' }

  const supabase = createAdminClient()

  // Volgende position = huidige max + 1 (eenvoudige sortering).
  const { data: existing } = await supabase
    .from('operator_client_commission_categories')
    .select('position')
    .eq('client_id', clientId)
    .order('position', { ascending: false })
    .limit(1)
  const nextPosition = (existing?.[0]?.position ?? -1) + 1

  const { error } = await supabase
    .from('operator_client_commission_categories')
    .insert({
      client_id: clientId,
      name: trimmed,
      price_cents: cents,
      position: nextPosition,
    })

  if (error) {
    if (error.code === '23505') return { error: 'Deze categorie bestaat al voor deze klant.' }
    return { error: error.message }
  }
  revalidatePath(`/admin/clients/${clientId}/commissies`)
  return {}
}

export async function updateCommissionCategory(
  clientId: string,
  categoryId: string,
  name: string,
  priceCents: number
): Promise<ActionResult> {
  const trimmed = name.trim()
  if (trimmed.length === 0) return { error: 'Geef de categorie een naam.' }
  if (trimmed.length > 120) return { error: 'De naam is te lang.' }
  const cents = sanitizePriceCents(priceCents)
  if (cents === null) return { error: 'Ongeldige prijs.' }

  const supabase = createAdminClient()
  const { error } = await supabase
    .from('operator_client_commission_categories')
    .update({ name: trimmed, price_cents: cents, updated_at: new Date().toISOString() })
    .eq('id', categoryId)
    .eq('client_id', clientId)

  if (error) {
    if (error.code === '23505') return { error: 'Er bestaat al een categorie met deze naam.' }
    return { error: error.message }
  }
  revalidatePath(`/admin/clients/${clientId}/commissies`)
  return {}
}

export async function deleteCommissionCategory(
  clientId: string,
  categoryId: string
): Promise<ActionResult> {
  const supabase = createAdminClient()
  const { error } = await supabase
    .from('operator_client_commission_categories')
    .delete()
    .eq('id', categoryId)
    .eq('client_id', clientId)

  if (error) return { error: error.message }
  revalidatePath(`/admin/clients/${clientId}/commissies`)
  return {}
}
