'use server'

import { revalidatePath } from 'next/cache'
import { createClient } from '@/lib/supabase/server'
import { getClientBranding } from '@/lib/client/get-client-branding'
import { TRAITS_BY_ID, type CustomTrait } from '@/lib/lead-inbox/assistant-traits'
import {
  normalizeSliderValues,
  type SliderValues,
} from '@/lib/lead-inbox/assistant-sliders'
import {
  ASSISTANT_MIGRATION_HINT,
  SLIDERS_MIGRATION_HINT,
  isMissingAssistantTable,
  isMissingSlidersColumn,
} from './assistant-errors'
import type { ActionResult } from './actions'

const MAX_KNOWLEDGE = 8000
const MAX_CUSTOM_TRAITS = 40
const MAX_CUSTOM_TRAIT_LENGTH = 200

async function currentClientId(): Promise<string | null> {
  const branding = await getClientBranding()
  if (!branding?.lead_inbox_visible || !branding.lead_inbox_customer_id) return null
  return branding.id
}

/**
 * Slaat de hele instelling in één keer op. Bewust geen losse velden: het
 * scherm bewerkt alles tegelijk en één upsert houdt de rij consistent.
 */
export async function saveAssistantSettings(input: {
  enabled: boolean
  knowledge: string
  traits: string[]
  customTraits: CustomTrait[]
  sliders: SliderValues
}): Promise<ActionResult> {
  const clientId = await currentClientId()
  if (!clientId) return { ok: false, error: 'Geen toegang tot de lead-inbox.' }

  // Alleen id's die echt bestaan, zodat er geen rommel in de database komt.
  const traits = [...new Set(input.traits)].filter((id) => TRAITS_BY_ID.has(id))

  const customTraits = input.customTraits
    .map((t) => ({ id: t.id, label: t.label.trim().slice(0, MAX_CUSTOM_TRAIT_LENGTH) }))
    .filter((t) => t.id.length > 0 && t.label.length > 0)
    .slice(0, MAX_CUSTOM_TRAITS)

  const supabase = await createClient()
  const row = {
    client_id: clientId,
    enabled: input.enabled,
    knowledge: input.knowledge.slice(0, MAX_KNOWLEDGE),
    traits,
    custom_traits: customTraits,
    updated_at: new Date().toISOString(),
  }

  const { error } = await supabase
    .from('lead_inbox_ai_settings')
    .upsert(
      { ...row, sliders: normalizeSliderValues(input.sliders) },
      { onConflict: 'client_id' }
    )

  if (error) {
    if (isMissingAssistantTable(error)) return { ok: false, error: ASSISTANT_MIGRATION_HINT }
    // Tweede migratie nog niet gedraaid: de rest wél bewaren, zodat de klant
    // zijn eigenschappen en kennisbank niet kwijtraakt aan één ontbrekende
    // kolom, en daarna melden wat er nog moet gebeuren.
    if (isMissingSlidersColumn(error)) {
      const retry = await supabase
        .from('lead_inbox_ai_settings')
        .upsert(row, { onConflict: 'client_id' })
      revalidatePath('/dashboard/lead-inbox')
      return {
        ok: false,
        error: retry.error ? retry.error.message : SLIDERS_MIGRATION_HINT,
      }
    }
    return { ok: false, error: error.message }
  }

  revalidatePath('/dashboard/lead-inbox')
  return { ok: true }
}

/** Alleen de schakelaar rechtsboven, zonder de rest van de instellingen aan te raken. */
export async function setAssistantEnabled(enabled: boolean): Promise<ActionResult> {
  const clientId = await currentClientId()
  if (!clientId) return { ok: false, error: 'Geen toegang tot de lead-inbox.' }

  const supabase = await createClient()
  const { error } = await supabase.from('lead_inbox_ai_settings').upsert(
    { client_id: clientId, enabled, updated_at: new Date().toISOString() },
    { onConflict: 'client_id' }
  )

  if (error) {
    if (isMissingAssistantTable(error)) return { ok: false, error: ASSISTANT_MIGRATION_HINT }
    return { ok: false, error: error.message }
  }

  revalidatePath('/dashboard/lead-inbox')
  return { ok: true }
}
