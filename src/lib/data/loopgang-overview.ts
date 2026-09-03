/**
 * Loopgang voor álle klanten tegelijk — de bron van /admin/loopgang.
 *
 * De pagina is een maandkalender: per dag welke klant wat moet doen, en wat er
 * die dag is gebeurd. Alles wat een datum heeft komt hier vandaan als losse
 * gebeurtenis (zie lib/loopgang/events.ts); wat geen datum heeft — draait de
 * klant, hoeveel is er vandaag verstuurd — staat in de kopregel en in het
 * dagpaneel.
 *
 * Instantly wordt per klant benaderd, met een handvol klanten tegelijk. Alles in
 * één keer parallel afvuren levert bij vijftien klanten al tientallen
 * gelijktijdige aanroepen op, en dan begint Instantly te knijpen. De lengte van
 * het datumbereik kost níéts extra: dagcijfers gaan per campagne in één aanroep,
 * of dat nu twee weken of een half jaar beslaat.
 *
 * Alles wat uit onze eigen database komt (facturen, rapportages, pauzes,
 * meetings, commissies) wordt in één query per soort opgehaald en daarna per
 * klant uitgesorteerd — niet per klant een aparte query.
 */

import { createAdminClient } from '@/lib/supabase/admin'
import { getKixTasks, type KixTask } from './loopgang-kix-tasks'
import { getInstantlyCache } from './loopgang-instantly-cache'
import { getCampaign, getCampaignDailyAnalytics } from '@/lib/instantly/client'
import { describeCampaignStatus, INSTANTLY_CAMPAIGN_STATUS } from '@/lib/instantly/types'
import {
  amsterdamDateString,
  effectiveLeadPriceCents,
  isWeekday,
} from '@/lib/commissions-shared'
import {
  buildPausedRanges,
  getLinkedCampaignRefs,
  isInPausedRange,
  resolveInstantlyApiKeys,
  tryInstantlyKeys,
  type LoopgangPauseEvent,
} from '@/lib/data/loopgang'
import {
  addDays,
  buildCycle,
  lastWorkdayOnOrBefore,
  type CycleMeeting,
  type LoopgangCycle,
  type MeetingOutcome,
} from '@/lib/loopgang/cycle'
import { buildEvents, type LoopgangEvent } from '@/lib/loopgang/events'

/** Hoeveel klanten tegelijk bij Instantly worden opgehaald. */
/**
 * Hoeveel campagnes van dezelfde klant tegelijk worden opgehaald.
 *
 * Zonder deze grens vuurde één klant al zijn campagnes in één keer af — bij
 * Advies & Meer zijn dat er veertien, met twee aanroepen elk, dus 28 verzoeken
 * tegelijk. Maal vijf klanten kwamen er ruim honderd verzoeken in de lucht en
 * begon Instantly te knijpen. Het gevolg was geen foutmelding maar iets veel
 * vervelenders: bij een willekeurige handvol klanten viel het dagvolume weg,
 * elke keer bij andere. Vijf maal drie maal twee is dertig, en dat houdt hij.
 */
const CAMPAIGN_CONCURRENCY = 3
/**
 * Hoeveel werkdagen zonder verzending een campagne stil laat staan.
 *
 * Eén dag zegt niets: een campagne die 's ochtends nog niet is begonnen, of een
 * dag waarop het bestand op was, is niet stilgevallen. Pas als er twee volle
 * werkdagen niets is verstuurd is er echt iets aan de hand.
 */
const STALL_WORKDAYS = 2
/**
 * Hoe ver terug commissieleads worden opgehaald. Een cyclus duurt ongeveer een
 * maand; 120 dagen dekt ook een klant die al een tijd niet gefactureerd is,
 * zonder de hele geschiedenis binnen te trekken.
 */
const COMMISSION_LOOKBACK_DAYS = 120
/**
 * Hoe ver de dagcijfers maximaal teruggehaald worden om de startdatum van een
 * lopende periode te dekken. Een cyclus duurt ongeveer een maand; een half jaar
 * dekt ook een klant die lang heeft stilgestaan.
 */
const ANCHOR_LOOKBACK_DAYS = 180

export interface OverviewCampaign {
  id: string
  name: string
  statusLabel: string
  isPaused: boolean
}

export interface OverviewInvoice {
  id: string
  invoiceDate: string
  amountCents: number | null
  paidAt: string | null
  pdfUrl: string | null
  pdfPath: string | null
  note: string | null
}

export interface OverviewLeadReport {
  id: string
  reportDate: string
  note: string | null
  pdfUrl: string | null
  pdfPath: string | null
}

export interface OverviewMeeting {
  id: string
  cycleAnchor: string
  outcome: MeetingOutcome
  meetingDate: string | null
  note: string | null
  handledAt: string
}

export interface OverviewPause {
  id: string
  action: 'pause' | 'resume'
  occurredAt: string
  note: string | null
}

export interface LoopgangOverviewClient {
  /** Unieke sleutel in het overzicht; gelijk aan het klant-id. */
  key: string
  id: string
  companyName: string
  /**
   * Wat er op het scherm staat. Gelijk aan de bedrijfsnaam — de loopgang maakt
   * geen onderscheid tussen campagnes van dezelfde klant.
   */
  displayName: string
  primaryColor: string
  goLiveDate: string | null
  /** Handmatige start van de lopende campagnemaand; wint als anker van de factuurdatum. */
  cycleStart: string | null
  cycleStartNote: string | null
  /** Vrije aantekening die altijd zichtbaar is zodra deze klant is gekozen. */
  operatorNote: string | null
  /** Verwachte dag waarop het leadplafond wordt bereikt; vervangt werkdag 20. */
  capExpectedDate: string | null
  /** De dag waarop dat is aangegeven; vanaf dan lopen de klokjes voor Kix. */
  capStartedOn: string | null
  capNote: string | null
  /** Laatste dag dat de campagne liep; gevuld zodra de klant is gestopt. */
  stoppedOn: string | null
  stoppedNote: string | null
  dailySendTarget: number
  isOnboarding: boolean

  campaigns: OverviewCampaign[]
  /** De dag waar de volumeteller op slaat: vandaag, of de laatste werkdag in het weekend. */
  volumeDate: string
  volumeDateIsToday: boolean
  sentOnVolumeDate: number
  /**
   * Staat de campagne stil? Waar is: geen verzending vandaag én geen verzending
   * op de laatste twee afgeronde werkdagen. Eén stille dag zegt niets.
   */
  isStalled: boolean
  /** De werkdagen waarop dat is getoetst, zodat het na te rekenen is. */
  stallWorkdays: string[]
  /** Laatste dag met verzending binnen het opgehaalde bereik; null als er geen is. */
  lastSendDate: string | null
  /** Verstuurde mails per dag binnen het opgehaalde bereik. */
  sentByDate: Record<string, number>
  /** Dagen waarop de campagnes bewust stilstonden, binnen het opgehaalde bereik. */
  pausedDates: string[]
  /**
   * Per gepauzeerde dag: de hoeveelste werkdag van díé pauze het is. De kalender
   * kleurt daarop — een pauze van twee dagen is iets anders dan een van drie
   * weken. Weekenden tellen niet mee, die zijn nooit verzenddagen.
   */
  pauseDayByDate: Record<string, number>

  isPaused: boolean
  pausedSince: string | null
  lastPause: OverviewPause | null

  invoices: OverviewInvoice[]
  lastInvoice: OverviewInvoice | null
  lastLeadReport: OverviewLeadReport | null
  /** De afgehandelde meeting die bij het huidige anker hoort. */
  meeting: OverviewMeeting | null

  commissionCentsSinceAnchor: number
  commissionLeadsSinceAnchor: number

  cycle: LoopgangCycle
  events: LoopgangEvent[]
  /** Instantly gaf een fout; de cijfers van deze klant kunnen onvolledig zijn. */
  analyticsError: string | null
  /** Wanneer de cijfers van deze klant voor het laatst zijn opgehaald. */
  analyticsSyncedAt: string | null
}

/** Eén regel in het beheerscherm van de klantenlijst. */
export interface LoopgangClientOption {
  id: string
  companyName: string
  visible: boolean
}

export interface LoopgangOverview {
  today: string
  todayIsWorkday: boolean
  /** De getoonde maand, als YYYY-MM. */
  month: string
  rangeStart: string
  rangeEnd: string
  clients: LoopgangOverviewClient[]
  /** Alle klanten die in de kalender gezet kúnnen worden, ook de uitgevinkte. */
  clientOptions: LoopgangClientOption[]
  /** Alles wat er ooit naar Kix is gestuurd, nieuwste verzending eerst. */
  kixTasks: KixTask[]
  totals: {
    running: number
    stalled: number
    invoicesDue: number
    paymentsOverdue: number
    meetingsToPlan: number
    callsToday: number
    openInvoiceCents: number
  }
}

/**
 * Voert `task` uit over alle items met maximaal `limit` tegelijk. De volgorde
 * van het resultaat volgt de invoer, ongeacht welke taak het eerst klaar is.
 */
async function mapWithLimit<T, R>(
  items: T[],
  limit: number,
  task: (item: T) => Promise<R>
): Promise<R[]> {
  const results = new Array<R>(items.length)
  let cursor = 0

  const workers = Array.from({ length: Math.min(limit, items.length) }, async () => {
    while (cursor < items.length) {
      const index = cursor
      cursor += 1
      results[index] = await task(items[index])
    }
  })

  await Promise.all(workers)
  return results
}

/**
 * De laatste `n` werkdagen vóór vandaag. Vandaag telt niet mee: die dag loopt
 * nog, en 's ochtends heeft niemand verstuurd.
 */
function recentWorkdays(today: string, n: number): string[] {
  const days: string[] = []
  let day = addDays(today, -1)
  for (let i = 0; i < 30 && days.length < n; i += 1) {
    if (isWeekday(day)) days.push(day)
    day = addDays(day, -1)
  }
  return days.reverse()
}

interface ClientRow {
  id: string
  company_name: string
  primary_color: string | null
  go_live_date: string | null
  cap_expected_date: string | null
  cap_started_on: string | null
  cap_note: string | null
  stopped_on: string | null
  stopped_note: string | null
  cycle_start_date: string | null
  cycle_start_note: string | null
  operator_note: string | null
  daily_send_target: number | null
  loopgang_visible: boolean | null
  is_hidden: boolean | null
  onboarding_status: string | null
}

/** De maand `delta` maanden verderop, als YYYY-MM. */
export function shiftMonth(month: string, delta: number): string {
  const [y, m] = month.split('-').map(Number)
  const next = new Date(Date.UTC(y, m - 1 + delta, 1))
  return `${next.getUTCFullYear()}-${String(next.getUTCMonth() + 1).padStart(2, '0')}`
}

/** Eerste en laatste dag van een maand die als YYYY-MM binnenkomt. */
export function monthBounds(month: string): { start: string; end: string } {
  const [y, m] = month.split('-').map(Number)
  const start = `${String(y).padStart(4, '0')}-${String(m).padStart(2, '0')}-01`
  const lastDay = new Date(Date.UTC(y, m, 0)).getUTCDate()
  return { start, end: `${start.slice(0, 8)}${String(lastDay).padStart(2, '0')}` }
}

function emptyOverview(
  today: string,
  month: string,
  clientOptions: LoopgangClientOption[] = []
): LoopgangOverview {
  const { start, end } = monthBounds(month)
  return {
    today,
    todayIsWorkday: isWeekday(today),
    month,
    rangeStart: start,
    rangeEnd: end,
    clients: [],
    clientOptions,
    kixTasks: [],
    totals: {
      running: 0,
      stalled: 0,
      invoicesDue: 0,
      paymentsOverdue: 0,
      meetingsToPlan: 0,
      callsToday: 0,
      openInvoiceCents: 0,
    },
  }
}

export async function getLoopgangOverview(monthInput?: string): Promise<LoopgangOverview> {
  const supabase = createAdminClient()

  const today = amsterdamDateString()
  const todayIsWorkday = isWeekday(today)
  const month = /^\d{4}-\d{2}$/.test(monthInput ?? '') ? (monthInput as string) : today.slice(0, 7)
  // Het venster is bewust een maand ruimer aan beide kanten dan de gekozen
  // maand. De kalender kan op drie maanden staan, en dan moeten de buurmaanden
  // er al in zitten. Dat kost niets: dagcijfers gaan per campagne in één
  // aanroep, ongeacht de lengte van het bereik.
  const bounds = {
    start: monthBounds(shiftMonth(month, -1)).start,
    end: monthBounds(shiftMonth(month, 1)).end,
  }

  // De werkdagen waarop stilstand wordt getoetst. Die kunnen vóór het venster
  // liggen, dus ze bepalen mee hoe ver het terugloopt.
  const stallWorkdays = recentWorkdays(today, STALL_WORKDAYS)

  // Toekomstige dagen leveren niets op, dus daar stopt het ophalen.
  const analyticsStart = [bounds.start, today, ...stallWorkdays].reduce((a, b) => (a < b ? a : b))
  const volumeDate = todayIsWorkday ? today : lastWorkdayOnOrBefore(today)

  const { data: clientRows } = await supabase
    .from('clients')
    .select(
      'id, company_name, primary_color, go_live_date, cycle_start_date, cycle_start_note, operator_note, cap_expected_date, cap_started_on, cap_note, stopped_on, stopped_note, daily_send_target, loopgang_visible, is_hidden, onboarding_status'
    )
    .order('company_name', { ascending: true })

  // Verborgen klanten horen niet in een operationeel overzicht: die draaien niet
  // en hoeven niet gefactureerd te worden.
  const selectable = ((clientRows ?? []) as ClientRow[]).filter((c) => !c.is_hidden)

  const clientOptions: LoopgangClientOption[] = selectable.map((c) => ({
    id: c.id,
    companyName: c.company_name,
    visible: c.loopgang_visible !== false,
  }))

  // Uitgevinkte klanten worden niet eens bij Instantly opgevraagd.
  const clients = selectable.filter((c) => c.loopgang_visible !== false)
  if (clients.length === 0) return emptyOverview(today, month, clientOptions)

  const clientIds = clients.map((c) => c.id)
  const commissionSince = addDays(today, -COMMISSION_LOOKBACK_DAYS)

  const [invoicesResult, reportsResult, meetingsResult, pausesResult, leadsResult] =
    await Promise.all([
      supabase
        .from('client_invoice_marks')
        .select(
          'id, client_id, invoice_date, amount_cents, paid_at, pdf_url, pdf_path, note'
        )
        .in('client_id', clientIds)
        .order('invoice_date', { ascending: false }),
      supabase
        .from('client_lead_reports')
        .select('id, client_id, report_date, note, pdf_url, pdf_path')
        .in('client_id', clientIds)
        .order('report_date', { ascending: false }),
      supabase
        .from('client_evaluation_meetings')
        .select(
          'id, client_id, cycle_anchor, outcome, meeting_date, note, handled_at'
        )
        .in('client_id', clientIds),
      supabase
        .from('client_campaign_pause_events')
        .select('id, client_id, action, occurred_at, note')
        .in('client_id', clientIds)
        .order('occurred_at', { ascending: false }),
      supabase
        .from('operator_commission_leads')
        .select('client_id, entry_date, unit_price_cents, is_half_price, is_rejected')
        .in('client_id', clientIds)
        .gte('entry_date', commissionSince),
    ])

  type Row = Record<string, unknown>

  // De loopgang kent één cyclus per klant. Draait een klant twee campagnes, dan
  // is dat een onderscheid op de klantpagina's — hier tellen ze samen, alsof er
  // simpelweg meerdere campagnes aan dezelfde klant hangen.
  const byClient = (r: Row) => String(r.client_id)
  const invoicesByTrack = groupBy((invoicesResult.data ?? []) as Row[], byClient)
  const reportsByTrack = groupBy((reportsResult.data ?? []) as Row[], byClient)
  const meetingsByTrack = groupBy((meetingsResult.data ?? []) as Row[], byClient)
  const pausesByTrack = groupBy((pausesResult.data ?? []) as Row[], byClient)

  // Commissies komen per klant binnen en worden niet gesplitst: de leads komen
  // uit één stroom en er is geen veld dat zegt bij welke campagne ze horen.
  const leadsByClient = groupBy((leadsResult.data ?? []) as Row[], (r) => String(r.client_id))

  // Het vroegste anker van de klanten in beeld. De periodeweergave begint op de
  // startdatum van een klant, en zonder dagcijfers vanaf die dag zou daar een
  // lege kalender staan — precies de verwarring die we eerder hadden. Meer dan
  // een half jaar terug halen we niet: dan is de periode toch niet meer de
  // lopende.
  const vroegsteAnker = clients.reduce<string | null>((vroegste, client) => {
    const anker = client.cycle_start_date ? String(client.cycle_start_date).slice(0, 10) : null
    if (!anker) return vroegste
    return vroegste === null || anker < vroegste ? anker : vroegste
  }, null)

  const ondergrens = addDays(today, -ANCHOR_LOOKBACK_DAYS)
  const dataStart = [analyticsStart, vroegsteAnker ?? analyticsStart]
    .reduce((a, b) => (a < b ? a : b))
  const bereikStart = dataStart < ondergrens ? ondergrens : dataStart

  // Uit de opgeslagen stand, niet live. Ruim honderd Instantly-aanroepen in één
  // verzoek liepen te vaak deels stuk, en een campagne die stilviel op een lege
  // lijst maakte van een draaiende klant een stilstaande. Verversen doe je met
  // de knop, waar je het ziet gebeuren.
  const cache = await getInstantlyCache()

  const built = clients.map((client) => {
    const entry = cache.get(client.id) ?? null
    const instantly: InstantlySnapshot = {
      campaigns: entry?.snapshot.campaigns ?? [],
      sentPerDay: new Map(Object.entries(entry?.snapshot.sentPerDay ?? {})),
      error: entry ? entry.error : 'Nog niet opgehaald — druk op Ververs cijfers',
    }
    return buildClient(client, instantly, entry?.syncedAt ?? null)
  })

  function buildClient(
    client: ClientRow,
    instantly: InstantlySnapshot,
    syncedAt: string | null
  ): LoopgangOverviewClient {
    const rowKey = client.id

    const invoices: OverviewInvoice[] = (invoicesByTrack.get(rowKey) ?? []).map((r) => ({
      id: String(r.id),
      invoiceDate: String(r.invoice_date).slice(0, 10),
      amountCents: r.amount_cents === null ? null : Number(r.amount_cents),
      paidAt: r.paid_at ? String(r.paid_at).slice(0, 10) : null,
      pdfUrl: (r.pdf_url as string | null) ?? null,
      pdfPath: (r.pdf_path as string | null) ?? null,
      note: (r.note as string | null) ?? null,
    }))

    const leadReports: OverviewLeadReport[] = (reportsByTrack.get(rowKey) ?? []).map((r) => ({
      id: String(r.id),
      reportDate: String(r.report_date).slice(0, 10),
      note: (r.note as string | null) ?? null,
      pdfUrl: (r.pdf_url as string | null) ?? null,
      pdfPath: (r.pdf_path as string | null) ?? null,
    }))

    const meetings: OverviewMeeting[] = (meetingsByTrack.get(rowKey) ?? []).map((r) => ({
      id: String(r.id),
      cycleAnchor: String(r.cycle_anchor).slice(0, 10),
      outcome: r.outcome as MeetingOutcome,
      meetingDate: r.meeting_date ? String(r.meeting_date).slice(0, 10) : null,
      note: (r.note as string | null) ?? null,
      handledAt: String(r.handled_at),
    }))

    const pauseEvents: LoopgangPauseEvent[] = (pausesByTrack.get(rowKey) ?? []).map((r) => ({
      id: String(r.id),
      action: r.action as 'pause' | 'resume',
      occurredAt: String(r.occurred_at),
      note: (r.note as string | null) ?? null,
      campaigns: [],
    }))

    const lastInvoice = invoices[0] ?? null
    const goLiveDate = client.go_live_date ? String(client.go_live_date).slice(0, 10) : null
    const cycleStart = client.cycle_start_date
      ? String(client.cycle_start_date).slice(0, 10)
      : null

    // Het anker bepaalt welke afgehandelde meeting nog meetelt: eentje van een
    // vorige cyclus mag de herinnering van deze cyclus niet stilzetten. Het is
    // dezelfde handmatige startdatum die de cyclus telt — zet je hem opnieuw,
    // dan begint ook de meetingherinnering opnieuw.
    const meeting = cycleStart
      ? (meetings.find((m) => m.cycleAnchor === cycleStart) ?? null)
      : null

    const cycleMeeting: CycleMeeting | null = meeting
      ? { outcome: meeting.outcome, meetingDate: meeting.meetingDate }
      : null

    // De pauzes moeten vóór de cyclus bekend zijn: gepauzeerde dagen tellen niet
    // mee in de werkdagteller, dus ze bepalen mede wanneer er gefactureerd moet
    // worden.
    const pausedRanges = buildPausedRanges(pauseEvents)
    const openPause = pausedRanges.find((r) => r.to === null) ?? null

    const capExpectedDate = client.cap_expected_date
      ? String(client.cap_expected_date).slice(0, 10)
      : null
    const capStartedOn = client.cap_started_on
      ? String(client.cap_started_on).slice(0, 10)
      : null

    const cycle = buildCycle({
      today,
      cycleStart,
      capDate: capExpectedDate,
      stoppedOn: client.stopped_on ? String(client.stopped_on).slice(0, 10) : null,
      lastInvoice: lastInvoice
        ? {
            date: lastInvoice.invoiceDate,
            amountCents: lastInvoice.amountCents,
            paidAt: lastInvoice.paidAt,
          }
        : null,
      meeting: cycleMeeting,
      isPaused: (date) => isInPausedRange(date, pausedRanges),
      pausedNow: openPause !== null,
      pausedSince: openPause?.from ?? null,
    })

    // Commissies vanaf het anker. Afgewezen leads tellen niet mee; een lead die
    // maar half telt levert ook maar de halve commissie op.
    let commissionCents = 0
    let commissionLeads = 0
    if (cycle.anchor) {
      for (const row of leadsByClient.get(client.id) ?? []) {
        if (row.is_rejected === true) continue
        const date = String(row.entry_date).slice(0, 10)
        if (date < cycle.anchor) continue
        commissionCents += effectiveLeadPriceCents(
          Number(row.unit_price_cents) || 0,
          row.is_half_price === true
        )
        commissionLeads += 1
      }
    }

    const sentByDate: Record<string, number> = {}
    const pausedDates: string[] = []
    const pauseDayByDate: Record<string, number> = {}
    const lusStart = bereikStart < bounds.start ? bereikStart : bounds.start
    for (let date = lusStart; date <= bounds.end; date = addDays(date, 1)) {
      const sent = instantly.sentPerDay.get(date) ?? 0
      if (sent > 0) {
        sentByDate[date] = sent
        continue
      }
      const range = pausedRanges.find((r) => date >= r.from && (r.to === null || date <= r.to))
      if (!range) continue
      pausedDates.push(date)
      if (isWeekday(date)) {
        let n = 0
        for (let d = range.from; d <= date; d = addDays(d, 1)) if (isWeekday(d)) n += 1
        pauseDayByDate[date] = n
      }
    }
    // Vandaag valt buiten de getoonde maand zodra je terugbladert, maar de
    // kopregel heeft het cijfer wel nodig.
    const sentOnVolumeDate = instantly.sentPerDay.get(volumeDate) ?? 0
    if (sentOnVolumeDate > 0) sentByDate[volumeDate] = sentOnVolumeDate

    // Stilstand is pas stilstand na twee lege werkdagen. Vandaag telt mee als
    // hij al iets heeft opgeleverd, maar een lege ochtend maakt niemand stil.
    const sentToday = instantly.sentPerDay.get(today) ?? 0
    const isStalled =
      sentToday === 0 && stallWorkdays.every((d) => (instantly.sentPerDay.get(d) ?? 0) === 0)

    const verzenddagen = [...instantly.sentPerDay.entries()]
      .filter(([, n]) => n > 0)
      .map(([d]) => d)
      .sort()
    const lastSendDate = verzenddagen[verzenddagen.length - 1] ?? null

    const result: LoopgangOverviewClient = {
      key: rowKey,
      id: client.id,
      companyName: client.company_name,
      displayName: client.company_name,
      primaryColor: client.primary_color ?? '#6366f1',
      goLiveDate,
      cycleStart,
      cycleStartNote: client.cycle_start_note ?? null,
      operatorNote: client.operator_note ?? null,
      dailySendTarget: client.daily_send_target ?? 900,
      isOnboarding: (client.onboarding_status ?? 'live') === 'onboarding',

      campaigns: instantly.campaigns,
      volumeDate,
      volumeDateIsToday: volumeDate === today,
      sentOnVolumeDate,
      isStalled,
      stallWorkdays,
      lastSendDate,
      sentByDate,
      pausedDates,
      pauseDayByDate,

      isPaused: openPause !== null,
      pausedSince: openPause?.from ?? null,
      lastPause: pauseEvents[0]
        ? {
            id: pauseEvents[0].id,
            action: pauseEvents[0].action,
            occurredAt: pauseEvents[0].occurredAt,
            note: pauseEvents[0].note,
          }
        : null,

      invoices,
      lastInvoice,
      lastLeadReport: leadReports[0] ?? null,
      meeting,

      capExpectedDate,
      capStartedOn,
      capNote: (client.cap_note as string | null) ?? null,
      stoppedOn: client.stopped_on ? String(client.stopped_on).slice(0, 10) : null,
      stoppedNote: (client.stopped_note as string | null) ?? null,

      commissionCentsSinceAnchor: commissionCents,
      commissionLeadsSinceAnchor: commissionLeads,

      cycle,
      events: buildEvents({
        today,
        cycle,
        invoices: invoices.map((i) => ({
          invoiceDate: i.invoiceDate,
          amountCents: i.amountCents,
          paidAt: i.paidAt,
        })),
        reports: leadReports.map((r) => ({ reportDate: r.reportDate })),
        pauses: pauseEvents.map((p) => ({ action: p.action, occurredAt: p.occurredAt })),
        meeting: cycleMeeting,
      }),
      analyticsError: instantly.error,
      analyticsSyncedAt: syncedAt,
    }

    return result
  }

  // Dringendste bovenaan; die volgorde bepaalt ook waar een klant in een
  // volle kalenderdag terechtkomt. Bij gelijke urgentie op naam, zodat het niet
  // per verversing verspringt.
  const sorted = [...built].sort((a, b) => {
    if (b.cycle.urgency !== a.cycle.urgency) return b.cycle.urgency - a.cycle.urgency
    return a.displayName.localeCompare(b.displayName)
  })

  const totals = {
    // Een gepauzeerde klant staat bewust stil; die hoort niet bij de alarmbel.
    running: sorted.filter((c) => !c.isStalled).length,
    stalled: sorted.filter((c) => c.isStalled && !c.isPaused).length,
    // Een gepauzeerde klant haalt werkdag 20 nooit, maar de periode die wél
    // gedraaid heeft moet net zo goed gefactureerd worden. Beide tellen mee.
    invoicesDue: sorted.filter((c) =>
      c.cycle.reminders.some((r) => r.kind === 'invoice-due' || r.kind === 'paused-uninvoiced')
    )
      .length,
    paymentsOverdue: sorted.filter((c) =>
      c.cycle.reminders.some((r) => r.kind === 'payment-overdue' && r.severity === 'urgent')
    ).length,
    meetingsToPlan: sorted.filter((c) =>
      c.cycle.reminders.some((r) => r.kind === 'meeting-schedule')
    ).length,
    callsToday: sorted.filter((c) => c.cycle.callDueToday).length,
    openInvoiceCents: sorted.reduce(
      (sum, c) =>
        sum + c.invoices.filter((i) => !i.paidAt).reduce((s, i) => s + (i.amountCents ?? 0), 0),
      0
    ),
  }

  // De namen komen uit het overzicht: de takentabel bewaart alleen het klant-id,
  // zodat een hernoemde klant ook in de oude taken de nieuwe naam krijgt.
  const kixTasks = await getKixTasks(
    new Map(sorted.map((c) => [c.id, c.displayName]))
  )

  return {
    today,
    todayIsWorkday,
    month,
    rangeStart: bereikStart < bounds.start ? bereikStart : bounds.start,
    rangeEnd: bounds.end,
    clients: sorted,
    clientOptions,
    kixTasks,
    totals,
  }
}

export interface InstantlySnapshot {
  campaigns: OverviewCampaign[]
  sentPerDay: Map<string, number>
  error: string | null
}

export async function getInstantlySnapshot(
  clientId: string,
  rangeStart: string,
  rangeEnd: string
): Promise<InstantlySnapshot> {
  const [refs, apiKeys] = await Promise.all([
    getLinkedCampaignRefs(clientId),
    resolveInstantlyApiKeys(clientId),
  ])

  if (refs.length === 0 || apiKeys.length === 0) {
    return {
      campaigns: [],
      sentPerDay: new Map(),
      error: refs.length === 0 ? 'Geen gekoppelde campagnes' : 'Geen Instantly-sleutel',
    }
  }

  const failed: string[] = []

  const perCampaign = await mapWithLimit(refs, CAMPAIGN_CONCURRENCY, async (ref) => {
    const [statusResult, dailyResult] = await Promise.all([
      tryInstantlyKeys(
        apiKeys,
        (key) => getCampaign(ref.instantlyCampaignId, key).then((c) => c.status),
        (status) => typeof status === 'number'
      ),
      tryInstantlyKeys(
        apiKeys,
        (key) => getCampaignDailyAnalytics(ref.instantlyCampaignId, rangeStart, rangeEnd, key),
        (days) => days.length > 0
      ),
    ])

    if (dailyResult.error) {
      console.error(
        `[loopgang-overview] dagcijfers mislukt client=${clientId} campaign=${ref.instantlyCampaignId}:`,
        dailyResult.error
      )
      failed.push(ref.name)
    }

    return { ref, status: statusResult.value, daily: dailyResult.value ?? [] }
  })

  const sentPerDay = new Map<string, number>()
  for (const { daily } of perCampaign) {
    for (const day of daily) {
      const date = String(day.date).slice(0, 10)
      if (!date) continue
      sentPerDay.set(date, (sentPerDay.get(date) ?? 0) + (Number(day.sent) || 0))
    }
  }

  return {
    campaigns: perCampaign.map(({ ref, status }) => ({
      id: ref.instantlyCampaignId,
      name: ref.name,
      statusLabel: status === null ? 'Onbekend' : describeCampaignStatus(status),
      isPaused: status === INSTANTLY_CAMPAIGN_STATUS.paused,
    })),
    sentPerDay,
    error: failed.length > 0 ? `Geen dagcijfers voor: ${failed.join(', ')}` : null,
  }
}

function groupBy<T>(rows: T[], key: (row: T) => string): Map<string, T[]> {
  const map = new Map<string, T[]>()
  for (const row of rows) {
    const k = key(row)
    const list = map.get(k)
    if (list) list.push(row)
    else map.set(k, [row])
  }
  return map
}
