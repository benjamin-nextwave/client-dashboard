'use server'

import { revalidatePath } from 'next/cache'
import { createAdminClient } from '@/lib/supabase/admin'
import { amsterdamDateString } from '@/lib/commissions-shared'
import { getInstantlySnapshot } from '@/lib/data/loopgang-overview'
import { saveInstantlyCache } from '@/lib/data/loopgang-instantly-cache'
import { addDays } from '@/lib/loopgang/cycle'

// Auth volgt het bestaande admin-patroon: middleware gate't /admin op
// user_role='operator'. Acties draaien met service_role (RLS bypass).

const OVERVIEW_PATH = '/admin/loopgang'

/**
 * Hoe ver terug de dagcijfers worden opgehaald. Een halfjaar dekt de langst
 * denkbare lopende periode, ook bij een klant die maanden heeft stilgestaan.
 */
const LOOKBACK_DAYS = 180

/**
 * Hoeveel klanten er per aanroep worden opgehaald.
 *
 * Bewust klein. De vorige opzet deed alle klanten in één verzoek en liep daarmee
 * tegen de grens van een serverless-functie; wat er dan niet af kwam viel stil
 * terug op nul. In brokjes van vier blijft elke aanroep ruim binnen de tijd, en
 * ziet het scherm de voortgang.
 */
const BATCH = 4

export interface SyncBatchResult {
  error?: string
  /** De klanten die in deze ronde zijn opgehaald. */
  done?: { id: string; name: string; sentToday: number; error: string | null }[]
}

/**
 * Haalt de Instantly-cijfers op voor een handvol klanten en legt ze vast.
 *
 * Geeft per klant terug wat eruit kwam, inclusief de fout als er een was. Anders
 * dan bij het laden van de pagina mag het hier mislukken: je ziet het gebeuren
 * en kunt opnieuw drukken.
 */
export async function syncInstantlyBatchAction(
  clientIds: string[]
): Promise<SyncBatchResult> {
  if (clientIds.length === 0) return { done: [] }
  if (clientIds.length > BATCH) {
    return { error: `Hooguit ${BATCH} klanten per keer.` }
  }

  const today = amsterdamDateString()
  const vanaf = addDays(today, -LOOKBACK_DAYS)

  const supabase = createAdminClient()
  const { data: rows } = await supabase
    .from('clients')
    .select('id, company_name')
    .in('id', clientIds)

  const namen = new Map((rows ?? []).map((r) => [r.id as string, r.company_name as string]))

  const done: NonNullable<SyncBatchResult['done']> = []

  for (const clientId of clientIds) {
    if (!namen.has(clientId)) continue

    try {
      const snapshot = await getInstantlySnapshot(clientId, vanaf, today)
      const sentPerDay = Object.fromEntries(snapshot.sentPerDay)

      await saveInstantlyCache(
        clientId,
        { campaigns: snapshot.campaigns, sentPerDay },
        snapshot.error
      )

      done.push({
        id: clientId,
        name: namen.get(clientId) as string,
        sentToday: sentPerDay[today] ?? 0,
        error: snapshot.error,
      })
    } catch (err) {
      const message = err instanceof Error ? err.message : 'onbekende fout'
      console.error(`[loopgang:sync] client=${clientId} mislukt: ${message}`)

      // Ook een mislukte poging wordt vastgelegd, zodat het scherm laat zien dat
      // deze klant een probleem heeft in plaats van stilletjes nul te tonen.
      await saveInstantlyCache(clientId, { campaigns: [], sentPerDay: {} }, message)
      done.push({ id: clientId, name: namen.get(clientId) as string, sentToday: 0, error: message })
    }
  }

  console.log(`[loopgang:sync] ${done.length} klanten opgehaald`)
  revalidatePath(OVERVIEW_PATH)
  return { done }
}

/** De klanten die in de loopgang staan, in de volgorde waarin ze opgehaald worden. */
export async function listSyncTargetsAction(): Promise<{ id: string; name: string }[]> {
  const supabase = createAdminClient()
  const { data } = await supabase
    .from('clients')
    .select('id, company_name')
    .eq('loopgang_visible', true)
    .order('company_name')

  return (data ?? []).map((r) => ({ id: r.id as string, name: r.company_name as string }))
}
