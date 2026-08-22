import { createClient } from '@/lib/supabase/server'
import type { CustomTrait } from '@/lib/lead-inbox/assistant-traits'
import {
  defaultSliderValues,
  normalizeSliderValues,
  type SliderValues,
} from '@/lib/lead-inbox/assistant-sliders'
import { isMissingAssistantTable, isMissingSlidersColumn } from './assistant-errors'

export interface AssistantSettings {
  enabled: boolean
  knowledge: string
  traits: string[]
  customTraits: CustomTrait[]
  sliders: SliderValues
  /**
   * False wanneer de tabel er nog niet is. De schakelaar blijft dan zichtbaar
   * maar meldt dat de migratie nog moet draaien, in plaats van de hele inbox
   * te laten crashen.
   */
  available: boolean
}

export const DEFAULT_ASSISTANT_SETTINGS: AssistantSettings = {
  enabled: false,
  knowledge: '',
  traits: [],
  customTraits: [],
  sliders: defaultSliderValues(),
  available: true,
}

const COLUMNS_WITHOUT_SLIDERS = 'enabled, knowledge, traits, custom_traits'
const COLUMNS = `${COLUMNS_WITHOUT_SLIDERS}, sliders`

function asStringArray(value: unknown): string[] {
  if (!Array.isArray(value)) return []
  return value.filter((v): v is string => typeof v === 'string')
}

function asCustomTraits(value: unknown): CustomTrait[] {
  if (!Array.isArray(value)) return []
  return value.flatMap((entry) => {
    if (!entry || typeof entry !== 'object') return []
    const obj = entry as { id?: unknown; label?: unknown }
    if (typeof obj.id !== 'string' || typeof obj.label !== 'string') return []
    return [{ id: obj.id, label: obj.label }]
  })
}

/**
 * Instellingen van de antwoord-assistent voor de ingelogde klant. Geeft altijd
 * een bruikbaar object terug: bestaat de rij nog niet, dan de standaardwaarden.
 */
export async function getAssistantSettings(clientId: string): Promise<AssistantSettings> {
  const supabase = await createClient()

  const read = (columns: string) =>
    supabase
      .from('lead_inbox_ai_settings')
      .select(columns)
      .eq('client_id', clientId)
      .maybeSingle()

  let { data, error } = await read(COLUMNS)

  // De schuifregelaars kwamen er in een tweede migratie bij. Draait die nog
  // niet, dan blijft de rest van de instellingen gewoon werken en staan de
  // regelaars op hun middenstand.
  if (error && isMissingSlidersColumn(error)) {
    ;({ data, error } = await read(COLUMNS_WITHOUT_SLIDERS))
  }

  if (error) {
    if (isMissingAssistantTable(error)) {
      return { ...DEFAULT_ASSISTANT_SETTINGS, available: false }
    }
    console.error('[lead-inbox assistant] instellingen lezen mislukt:', error.message)
    return DEFAULT_ASSISTANT_SETTINGS
  }

  if (!data) return DEFAULT_ASSISTANT_SETTINGS

  const row = data as unknown as {
    enabled: boolean | null
    knowledge: string | null
    traits: unknown
    custom_traits: unknown
    sliders: unknown
  }

  return {
    enabled: row.enabled ?? false,
    knowledge: row.knowledge ?? '',
    traits: asStringArray(row.traits),
    customTraits: asCustomTraits(row.custom_traits),
    sliders: normalizeSliderValues(row.sliders),
    available: true,
  }
}
