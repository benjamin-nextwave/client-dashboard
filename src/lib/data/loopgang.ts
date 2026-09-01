import { createAdminClient } from '@/lib/supabase/admin'
import { getCampaign, getCampaignDailyAnalytics } from '@/lib/instantly/client'
import { describeCampaignStatus, INSTANTLY_CAMPAIGN_STATUS } from '@/lib/instantly/types'
import { isOutboundBlocked } from '@/lib/safety/write-guard'

/**
 * Loopgang — hoe lang draait een klant al, en wanneer stond hij stil?
 *
 * Instantly bewaart geen geschiedenis van pauzeermomenten. Wat het wél geeft
 * zijn dagcijfers per campagne. Daaruit leiden we af of er die dag iets is
 * verstuurd; dat is de enige harde bron voor "stond deze klant toen live".
 * Onze eigen pauzelog (client_campaign_pause_events) legt daar bovenop wat een
 * bewuste pauze was — anders is een weekend niet te onderscheiden van een
 * stilgezette campagne.
 *
 * Meerdere campagnes tellen als één klant: stuurde er die dag één iets, dan
 * stond de klant die dag live.
 */

export type LoopgangDayState = 'live' | 'paused' | 'quiet'

export interface LoopgangDay {
  /** ISO yyyy-mm-dd */
  date: string
  state: LoopgangDayState
  sent: number
  /** Hoeveel van de gekoppelde campagnes die dag iets hebben verstuurd. */
  activeCampaigns: number
  invoiced: boolean
}

export interface LoopgangCampaign {
  instantlyCampaignId: string
  name: string
  /** Uit Instantly; null als de campagne niet opgehaald kon worden. */
  status: number | null
  statusLabel: string
  isPaused: boolean
  source: 'lead-inbox' | 'client-campaigns'
}

export interface LoopgangPauseEvent {
  id: string
  action: 'pause' | 'resume'
  occurredAt: string
  note: string | null
  campaigns: Array<{ id: string; name: string; ok: boolean; error?: string }>
}

export interface LoopgangInvoiceMark {
  id: string
  invoiceDate: string
  note: string | null
  createdAt: string
}

export interface LoopgangData {
  campaigns: LoopgangCampaign[]
  days: LoopgangDay[]
  pauseEvents: LoopgangPauseEvent[]
  invoiceMarks: LoopgangInvoiceMark[]
  rangeStart: string
  rangeEnd: string
  /** Eerste dag waarop er ooit (binnen het venster) iets is verstuurd. */
  firstLiveDate: string | null
  lastLiveDate: string | null
  totalLiveDays: number
  lastPauseAt: string | null
  /** Kalenderdagen sinds het laatste pauzemoment; null als er nooit is gepauzeerd. */
  daysSinceLastPause: number | null
  /** Verzenddagen sinds het laatste pauzemoment (of sinds de start). */
  liveDaysSinceLastPause: number
  lastInvoiceDate: string | null
  daysSinceLastInvoice: number | null
  /** Alle gekoppelde campagnes staan gepauzeerd (of er zijn er geen actieve). */
  allPaused: boolean
  /** Instantly gaf een fout terug bij het ophalen; cijfers kunnen onvolledig zijn. */
  analyticsError: string | null
}

const WINDOW_DAYS = 365

export function isoDay(date: Date): string {
  return date.toISOString().slice(0, 10)
}

function addDays(iso: string, amount: number): string {
  const d = new Date(`${iso}T00:00:00Z`)
  d.setUTCDate(d.getUTCDate() + amount)
  return isoDay(d)
}

function daysBetween(fromIso: string, toIso: string): number {
  const from = Date.parse(`${fromIso}T00:00:00Z`)
  const to = Date.parse(`${toIso}T00:00:00Z`)
  return Math.round((to - from) / 86_400_000)
}

/**
 * De sleutels die deze klant kunnen ontsluiten, in volgorde van waarschijnlijkheid.
 *
 * Er is geen enkele sleutel die het overal doet. Klanten met een eigen workspace
 * zijn alléén met hun eigen sleutel te lezen; bij een flink deel van de klanten
 * is die eigen sleutel verlopen (401) of hoort hij bij een workspace die de
 * campagne niet meer bevat (404), en werkt juist de gedeelde sleutel. Daarom
 * proberen we ze allebei in plaats van er één te kiezen.
 */
export async function resolveInstantlyApiKeys(clientId: string): Promise<string[]> {
  const supabase = createAdminClient()
  const { data } = await supabase
    .from('clients')
    .select('instantly_api_key')
    .eq('id', clientId)
    .single()

  const own = (data?.instantly_api_key as string | null) || null
  const shared = process.env.INSTANTLY_API_KEY || null

  return [...new Set([own, shared].filter((k): k is string => !!k && k.length > 0))]
}

/**
 * Voert een Instantly-aanroep uit met elke sleutel tot er één bruikbaar
 * antwoord geeft. Een lege uitkomst telt niet als bruikbaar maar wordt wel
 * bewaard: geeft geen enkele sleutel iets, dan is "leeg" nog altijd een beter
 * antwoord dan een fout.
 *
 * De testgrendel is geen sleutelprobleem — die gooit meteen door, want met een
 * andere sleutel gaat het net zo min lukken.
 */
export async function tryInstantlyKeys<T>(
  keys: string[],
  call: (apiKey: string) => Promise<T>,
  isUseful: (value: T) => boolean
): Promise<{ value: T | null; error: unknown }> {
  let fallback: T | null = null
  let lastError: unknown = null

  for (const key of keys) {
    try {
      const value = await call(key)
      if (isUseful(value)) return { value, error: null }
      if (fallback === null) fallback = value
    } catch (err) {
      if (isOutboundBlocked(err)) throw err
      lastError = err
    }
  }

  return { value: fallback, error: fallback === null ? lastError : null }
}

/**
 * Alle Instantly-campagnes die aan deze klant hangen. Twee bronnen, want ze
 * bestaan allebei nog: de lead-inbox-koppeling op de bewerken-pagina
 * (clients.lead_inbox_customer_id -> campaigns) en de oudere client_campaigns.
 * Dubbele campagne-id's vallen weg.
 */
export async function getLinkedCampaignRefs(
  clientId: string
): Promise<Array<{ instantlyCampaignId: string; name: string; source: LoopgangCampaign['source'] }>> {
  const supabase = createAdminClient()
  const refs = new Map<string, { instantlyCampaignId: string; name: string; source: LoopgangCampaign['source'] }>()

  const { data: client } = await supabase
    .from('clients')
    .select('lead_inbox_customer_id')
    .eq('id', clientId)
    .single()

  if (client?.lead_inbox_customer_id) {
    const { data: rows } = await supabase
      .from('campaigns')
      .select('instantly_campaign_id, name, is_active')
      .eq('customer_id', client.lead_inbox_customer_id)
      .eq('is_active', true)
      .order('created_at', { ascending: true })

    for (const row of rows ?? []) {
      const id = row.instantly_campaign_id as string | null
      if (!id) continue
      refs.set(id, {
        instantlyCampaignId: id,
        name: (row.name as string) ?? id,
        source: 'lead-inbox',
      })
    }
  }

  const { data: legacy } = await supabase
    .from('client_campaigns')
    .select('campaign_id, campaign_name')
    .eq('client_id', clientId)

  for (const row of legacy ?? []) {
    const id = row.campaign_id as string | null
    if (!id || refs.has(id)) continue
    refs.set(id, {
      instantlyCampaignId: id,
      name: (row.campaign_name as string) ?? id,
      source: 'client-campaigns',
    })
  }

  return [...refs.values()]
}

export async function getLoopgangData(clientId: string): Promise<LoopgangData> {
  const rangeEnd = isoDay(new Date())
  const rangeStart = addDays(rangeEnd, -WINDOW_DAYS)

  const [refs, apiKeys, pauseEvents, invoiceMarks] = await Promise.all([
    getLinkedCampaignRefs(clientId),
    resolveInstantlyApiKeys(clientId),
    getPauseEvents(clientId),
    getInvoiceMarks(clientId),
  ])

  const analyticsErrors: string[] = []

  // Statussen en dagcijfers per campagne naast elkaar ophalen; bij één klant
  // gaat het om een handvol campagnes.
  const perCampaign = await Promise.all(
    refs.map(async (ref) => {
      const [statusResult, dailyResult] = await Promise.all([
        tryInstantlyKeys(
          apiKeys,
          (key) => getCampaign(ref.instantlyCampaignId, key).then((c) => c.status),
          (status) => typeof status === 'number'
        ),
        tryInstantlyKeys(
          apiKeys,
          (key) =>
            getCampaignDailyAnalytics(ref.instantlyCampaignId, rangeStart, rangeEnd, key),
          (days) => days.length > 0
        ),
      ])

      if (statusResult.error) {
        console.error(
          `[loopgang] status ophalen mislukt campagne=${ref.instantlyCampaignId}:`,
          statusResult.error
        )
      }
      if (dailyResult.error) {
        console.error(
          `[loopgang] dagcijfers ophalen mislukt campagne=${ref.instantlyCampaignId}:`,
          dailyResult.error
        )
        analyticsErrors.push(ref.name)
      }

      return {
        ref,
        status: statusResult.value,
        daily: dailyResult.value ?? [],
      }
    })
  )

  const analyticsError =
    analyticsErrors.length > 0
      ? `Geen dagcijfers voor: ${analyticsErrors.join(', ')}`
      : null

  const campaigns: LoopgangCampaign[] = perCampaign.map(({ ref, status }) => ({
    instantlyCampaignId: ref.instantlyCampaignId,
    name: ref.name,
    status,
    statusLabel: status === null ? 'Onbekend' : describeCampaignStatus(status),
    isPaused: status === INSTANTLY_CAMPAIGN_STATUS.paused,
    source: ref.source,
  }))

  // Dagcijfers samenvoegen over alle campagnes heen.
  const sentPerDay = new Map<string, { sent: number; activeCampaigns: number }>()
  for (const { daily } of perCampaign) {
    for (const day of daily) {
      const date = String(day.date).slice(0, 10)
      if (!date) continue
      const sent = Number(day.sent) || 0
      const bucket = sentPerDay.get(date) ?? { sent: 0, activeCampaigns: 0 }
      bucket.sent += sent
      if (sent > 0) bucket.activeCampaigns += 1
      sentPerDay.set(date, bucket)
    }
  }

  const invoicedDates = new Set(invoiceMarks.map((m) => m.invoiceDate))
  const pausedRanges = buildPausedRanges(pauseEvents)

  const days: LoopgangDay[] = []
  for (let date = rangeStart; date <= rangeEnd; date = addDays(date, 1)) {
    const bucket = sentPerDay.get(date)
    const sent = bucket?.sent ?? 0
    const state: LoopgangDayState =
      sent > 0 ? 'live' : isInPausedRange(date, pausedRanges) ? 'paused' : 'quiet'
    days.push({
      date,
      state,
      sent,
      activeCampaigns: bucket?.activeCampaigns ?? 0,
      invoiced: invoicedDates.has(date),
    })
  }

  const liveDays = days.filter((d) => d.state === 'live')
  const firstLiveDate = liveDays[0]?.date ?? null
  const lastLiveDate = liveDays[liveDays.length - 1]?.date ?? null

  const lastPause = pauseEvents.find((e) => e.action === 'pause') ?? null
  const lastPauseAt = lastPause?.occurredAt ?? null
  const lastPauseDay = lastPauseAt ? lastPauseAt.slice(0, 10) : null

  const sinceDay = lastPauseDay ?? firstLiveDate
  const liveDaysSinceLastPause = sinceDay
    ? liveDays.filter((d) => d.date >= sinceDay).length
    : 0

  const lastInvoiceDate = invoiceMarks[0]?.invoiceDate ?? null

  const activeCampaigns = campaigns.filter(
    (c) => c.status !== null && c.status !== INSTANTLY_CAMPAIGN_STATUS.paused
  )

  return {
    campaigns,
    days,
    pauseEvents,
    invoiceMarks,
    rangeStart,
    rangeEnd,
    firstLiveDate,
    lastLiveDate,
    totalLiveDays: liveDays.length,
    lastPauseAt,
    daysSinceLastPause: lastPauseDay ? daysBetween(lastPauseDay, rangeEnd) : null,
    liveDaysSinceLastPause,
    lastInvoiceDate,
    daysSinceLastInvoice: lastInvoiceDate ? daysBetween(lastInvoiceDate, rangeEnd) : null,
    allPaused: campaigns.length > 0 && activeCampaigns.length === 0,
    analyticsError,
  }
}

async function getPauseEvents(clientId: string): Promise<LoopgangPauseEvent[]> {
  const supabase = createAdminClient()
  const { data } = await supabase
    .from('client_campaign_pause_events')
    .select('id, action, occurred_at, note, campaigns')
    .eq('client_id', clientId)
    .order('occurred_at', { ascending: false })

  return (data ?? []).map((row) => ({
    id: row.id as string,
    action: row.action as 'pause' | 'resume',
    occurredAt: row.occurred_at as string,
    note: (row.note as string | null) ?? null,
    campaigns: Array.isArray(row.campaigns)
      ? (row.campaigns as LoopgangPauseEvent['campaigns'])
      : [],
  }))
}

async function getInvoiceMarks(clientId: string): Promise<LoopgangInvoiceMark[]> {
  const supabase = createAdminClient()
  const { data } = await supabase
    .from('client_invoice_marks')
    .select('id, invoice_date, note, created_at')
    .eq('client_id', clientId)
    .order('invoice_date', { ascending: false })

  return (data ?? []).map((row) => ({
    id: row.id as string,
    invoiceDate: String(row.invoice_date).slice(0, 10),
    note: (row.note as string | null) ?? null,
    createdAt: row.created_at as string,
  }))
}

export interface PausedRange {
  from: string
  /** null = nog steeds gepauzeerd. */
  to: string | null
}

/**
 * Zet de pauzelog om in aaneengesloten periodes. Meerdere pauzes achter elkaar
 * zonder hervatting tellen als één periode; een hervatting sluit hem af.
 */
export function buildPausedRanges(events: LoopgangPauseEvent[]): PausedRange[] {
  const chronological = [...events].sort((a, b) =>
    a.occurredAt.localeCompare(b.occurredAt)
  )

  const ranges: PausedRange[] = []
  let open: PausedRange | null = null

  for (const event of chronological) {
    const day = event.occurredAt.slice(0, 10)
    if (event.action === 'pause') {
      if (!open) {
        open = { from: day, to: null }
        ranges.push(open)
      }
    } else if (open) {
      open.to = day
      open = null
    }
  }

  // Een openstaande periode houdt geen einddatum: to === null betekent
  // "loopt nog", en isInPausedRange leest dat als tot vandaag.
  return ranges
}

export function isInPausedRange(date: string, ranges: PausedRange[]): boolean {
  return ranges.some((r) => date >= r.from && (r.to === null || date <= r.to))
}
