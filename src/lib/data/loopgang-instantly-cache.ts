import { createAdminClient } from '@/lib/supabase/admin'

/**
 * De laatst opgehaalde Instantly-stand per klant.
 *
 * Het overzicht haalde de dagcijfers bij elke laadbeurt live op: per klant elke
 * campagne, en per campagne twee aanroepen. Over negenendertig klanten zijn dat
 * er ruim honderd binnen één serverless-functie. Mislukte er één, dan viel die
 * campagne terug op een lege lijst en leek de klant stil te staan — vandaar het
 * beeld dat er zeven draaiden terwijl het er tien waren, en dat het per
 * verversing verschilde.
 *
 * De pagina leest nu deze tabel en doet zelf geen enkele aanroep meer. Ophalen
 * gebeurt met de verversknop, waar falen zichtbaar is en opnieuw geprobeerd kan
 * worden.
 */

export interface CachedSnapshot {
  campaigns: {
    id: string
    name: string
    statusLabel: string
    isPaused: boolean
  }[]
  /** Verzonden mails per dag, als datum → aantal. */
  sentPerDay: Record<string, number>
}

export interface CacheEntry {
  clientId: string
  snapshot: CachedSnapshot
  error: string | null
  syncedAt: string
}

const LEEG: CachedSnapshot = { campaigns: [], sentPerDay: {} }

function toSnapshot(raw: unknown): CachedSnapshot {
  if (typeof raw !== 'object' || raw === null) return LEEG

  const obj = raw as Record<string, unknown>
  const campaigns = Array.isArray(obj.campaigns)
    ? obj.campaigns.flatMap((c) => {
        if (typeof c !== 'object' || c === null) return []
        const row = c as Record<string, unknown>
        return [
          {
            id: String(row.id ?? ''),
            name: String(row.name ?? ''),
            statusLabel: String(row.statusLabel ?? 'Onbekend'),
            isPaused: row.isPaused === true,
          },
        ]
      })
    : []

  const sentPerDay: Record<string, number> = {}
  if (typeof obj.sentPerDay === 'object' && obj.sentPerDay !== null) {
    for (const [date, value] of Object.entries(obj.sentPerDay as Record<string, unknown>)) {
      const n = Number(value)
      if (Number.isFinite(n)) sentPerDay[date] = n
    }
  }

  return { campaigns, sentPerDay }
}

/** De opgeslagen stand voor alle klanten, opzoekbaar op klant-id. */
export async function getInstantlyCache(): Promise<Map<string, CacheEntry>> {
  const supabase = createAdminClient()

  const { data, error } = await supabase
    .from('loopgang_instantly_cache')
    .select('client_id, snapshot, error, synced_at')

  if (error) {
    console.error(`[loopgang:cache] lezen mislukt: ${error.message}`)
    return new Map()
  }

  const map = new Map<string, CacheEntry>()
  for (const row of data ?? []) {
    map.set(row.client_id as string, {
      clientId: row.client_id as string,
      snapshot: toSnapshot(row.snapshot),
      error: (row.error as string | null) ?? null,
      syncedAt: row.synced_at as string,
    })
  }
  return map
}

/** Schrijft de stand van één klant weg. */
export async function saveInstantlyCache(
  clientId: string,
  snapshot: CachedSnapshot,
  error: string | null
): Promise<boolean> {
  const supabase = createAdminClient()

  const { error: schrijfFout } = await supabase.from('loopgang_instantly_cache').upsert(
    {
      client_id: clientId,
      snapshot,
      error,
      synced_at: new Date().toISOString(),
    },
    { onConflict: 'client_id' }
  )

  if (schrijfFout) {
    console.error(`[loopgang:cache] schrijven mislukt client=${clientId}: ${schrijfFout.message}`)
    return false
  }
  return true
}
