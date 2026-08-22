import { createClient } from '@/lib/supabase/server'
import type { CustomTrait } from '@/lib/lead-inbox/assistant-traits'
import { isMissingAssistantTable } from './assistant-errors'

export interface AssistantSettings {
  enabled: boolean
  knowledge: string
  traits: string[]
  customTraits: CustomTrait[]
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
  available: true,
}

const COLUMNS = 'enabled, knowledge, traits, custom_traits'

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
  const { data, error } = await supabase
    .from('lead_inbox_ai_settings')
    .select(COLUMNS)
    .eq('client_id', clientId)
    .maybeSingle()

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
  }

  return {
    enabled: row.enabled ?? false,
    knowledge: row.knowledge ?? '',
    traits: asStringArray(row.traits),
    customTraits: asCustomTraits(row.custom_traits),
    available: true,
  }
}
