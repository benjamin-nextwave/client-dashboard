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
const CLIENT_CONCURRENCY = 5
/**
 * Hoe ver terug commissieleads worden opgehaald. Een cyclus duurt ongeveer een
 * maand; 120 dagen dekt ook een klant die al een tijd niet gefactureerd is,
 * zonder de hele geschiedenis binnen te trekken.
 */
const COMMISSION_LOOKBACK_DAYS = 120

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
  id: string
  companyName: string
  primaryColor: string
  goLiveDate: string | null
  dailySendTarget: number
  isOnboarding: boolean

  campaigns: OverviewCampaign[]
  /** De dag waar de volumeteller op slaat: vandaag, of de laatste werkdag in het weekend. */
  volumeDate: string
  volumeDateIsToday: boolean
  sentOnVolumeDate: number
  /** Verstuurde mails per dag binnen het opgehaalde bereik. */
  sentByDate: Record<string, number>
  /** Dagen waarop de campagnes bewust stilstonden, binnen het opgehaalde bereik. */
  pausedDates: string[]

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
}

export interface LoopgangOverview {
  today: string
  todayIsWorkday: boolean
  /** De getoonde maand, als YYYY-MM. */
  month: string
  rangeStart: string
  rangeEnd: string
  clients: LoopgangOverviewClient[]
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

interface ClientRow {
  id: string
  company_name: string
  primary_color: string | null
  go_live_date: string | null
  daily_send_target: number | null
  is_hidden: boolean | null
  onboarding_status: string | null
}

/** Eerste en laatste dag van een maand die als YYYY-MM binnenkomt. */
export function monthBounds(month: string): { start: string; end: string } {
  const [y, m] = month.split('-').map(Number)
  const start = `${String(y).padStart(4, '0')}-${String(m).padStart(2, '0')}-01`
  const lastDay = new Date(Date.UTC(y, m, 0)).getUTCDate()
  return { start, end: `${start.slice(0, 8)}${String(lastDay).padStart(2, '0')}` }
}

function emptyOverview(today: string, month: string): LoopgangOverview {
  const { start, end } = monthBounds(month)
  return {
    today,
    todayIsWorkday: isWeekday(today),
    month,
    rangeStart: start,
    rangeEnd: end,
    clients: [],
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
  const bounds = monthBounds(month)

  // Eén bereik dat zowel de getoonde maand als vandaag dekt: de kalender heeft de
  // maand nodig, de kopregel het volume van vandaag. Toekomstige dagen leveren
  // niets op, dus daar stopt het bereik.
  const analyticsStart = bounds.start < today ? bounds.start : today
  const analyticsEnd = bounds.end > today ? today : bounds.end
  const volumeDate = todayIsWorkday ? today : lastWorkdayOnOrBefore(today)

  const { data: clientRows } = await supabase
    .from('clients')
    .select(
      'id, company_name, primary_color, go_live_date, daily_send_target, is_hidden, onboarding_status'
    )
    .order('company_name', { ascending: true })

  // Verborgen klanten horen niet in een operationeel overzicht: die draaien niet
  // en hoeven niet gefactureerd te worden.
  const clients = ((clientRows ?? []) as ClientRow[]).filter((c) => !c.is_hidden)
  if (clients.length === 0) return emptyOverview(today, month)

  const clientIds = clients.map((c) => c.id)
  const commissionSince = addDays(today, -COMMISSION_LOOKBACK_DAYS)

  const [invoicesResult, reportsResult, meetingsResult, pausesResult, leadsResult] =
    await Promise.all([
      supabase
        .from('client_invoice_marks')
        .select('id, client_id, invoice_date, amount_cents, paid_at, pdf_url, pdf_path, note')
        .in('client_id', clientIds)
        .order('invoice_date', { ascending: false }),
      supabase
        .from('client_lead_reports')
        .select('id, client_id, report_date, note, pdf_url, pdf_path')
        .in('client_id', clientIds)
        .order('report_date', { ascending: false }),
      supabase
        .from('client_evaluation_meetings')
        .select('id, client_id, cycle_anchor, outcome, meeting_date, note, handled_at')
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
  const invoicesByClient = groupBy((invoicesResult.data ?? []) as Row[], (r) => String(r.client_id))
  const reportsByClient = groupBy((reportsResult.data ?? []) as Row[], (r) => String(r.client_id))
  const meetingsByClient = groupBy((meetingsResult.data ?? []) as Row[], (r) => String(r.client_id))
  const pausesByClient = groupBy((pausesResult.data ?? []) as Row[], (r) => String(r.client_id))
  const leadsByClient = groupBy((leadsResult.data ?? []) as Row[], (r) => String(r.client_id))

  const built = await mapWithLimit(clients, CLIENT_CONCURRENCY, async (client) => {
    const invoices: OverviewInvoice[] = (invoicesByClient.get(client.id) ?? []).map((r) => ({
      id: String(r.id),
      invoiceDate: String(r.invoice_date).slice(0, 10),
      amountCents: r.amount_cents === null ? null : Number(r.amount_cents),
      paidAt: r.paid_at ? String(r.paid_at).slice(0, 10) : null,
      pdfUrl: (r.pdf_url as string | null) ?? null,
      pdfPath: (r.pdf_path as string | null) ?? null,
      note: (r.note as string | null) ?? null,
    }))

    const leadReports: OverviewLeadReport[] = (reportsByClient.get(client.id) ?? []).map((r) => ({
      id: String(r.id),
      reportDate: String(r.report_date).slice(0, 10),
      note: (r.note as string | null) ?? null,
      pdfUrl: (r.pdf_url as string | null) ?? null,
      pdfPath: (r.pdf_path as string | null) ?? null,
    }))

    const meetings: OverviewMeeting[] = (meetingsByClient.get(client.id) ?? []).map((r) => ({
      id: String(r.id),
      cycleAnchor: String(r.cycle_anchor).slice(0, 10),
      outcome: r.outcome as MeetingOutcome,
      meetingDate: r.meeting_date ? String(r.meeting_date).slice(0, 10) : null,
      note: (r.note as string | null) ?? null,
      handledAt: String(r.handled_at),
    }))

    const pauseEvents: LoopgangPauseEvent[] = (pausesByClient.get(client.id) ?? []).map((r) => ({
      id: String(r.id),
      action: r.action as 'pause' | 'resume',
      occurredAt: String(r.occurred_at),
      note: (r.note as string | null) ?? null,
      campaigns: [],
    }))

    const lastInvoice = invoices[0] ?? null
    const goLiveDate = client.go_live_date ? String(client.go_live_date).slice(0, 10) : null

    // Het anker bepaalt welke afgehandelde meeting nog meetelt: eentje van een
    // vorige cyclus mag de herinnering van deze cyclus niet stilzetten.
    const anchor = lastInvoice?.invoiceDate ?? goLiveDate ?? null
    const meeting = anchor ? (meetings.find((m) => m.cycleAnchor === anchor) ?? null) : null

    const cycleMeeting: CycleMeeting | null = meeting
      ? { outcome: meeting.outcome, meetingDate: meeting.meetingDate }
      : null

    const cycle = buildCycle({
      today,
      lastInvoice: lastInvoice
        ? {
            date: lastInvoice.invoiceDate,
            amountCents: lastInvoice.amountCents,
            paidAt: lastInvoice.paidAt,
          }
        : null,
      goLiveDate,
      meeting: cycleMeeting,
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

    const pausedRanges = buildPausedRanges(pauseEvents)
    const openPause = pausedRanges.find((r) => r.to === null) ?? null

    const instantly = await getInstantlySnapshot(client.id, analyticsStart, analyticsEnd)

    const sentByDate: Record<string, number> = {}
    const pausedDates: string[] = []
    for (let date = bounds.start; date <= bounds.end; date = addDays(date, 1)) {
      const sent = instantly.sentPerDay.get(date) ?? 0
      if (sent > 0) sentByDate[date] = sent
      else if (isInPausedRange(date, pausedRanges)) pausedDates.push(date)
    }
    // Vandaag valt buiten de getoonde maand zodra je terugbladert, maar de
    // kopregel heeft het cijfer wel nodig.
    const sentOnVolumeDate = instantly.sentPerDay.get(volumeDate) ?? 0
    if (sentOnVolumeDate > 0) sentByDate[volumeDate] = sentOnVolumeDate

    const result: LoopgangOverviewClient = {
      id: client.id,
      companyName: client.company_name,
      primaryColor: client.primary_color ?? '#6366f1',
      goLiveDate,
      dailySendTarget: client.daily_send_target ?? 900,
      isOnboarding: (client.onboarding_status ?? 'live') === 'onboarding',

      campaigns: instantly.campaigns,
      volumeDate,
      volumeDateIsToday: volumeDate === today,
      sentOnVolumeDate,
      sentByDate,
      pausedDates,

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
    }

    return result
  })

  // Dringendste bovenaan; die volgorde bepaalt ook waar een klant in een
  // volle kalenderdag terechtkomt. Bij gelijke urgentie op naam, zodat het niet
  // per verversing verspringt.
  const sorted = [...built].sort((a, b) => {
    if (b.cycle.urgency !== a.cycle.urgency) return b.cycle.urgency - a.cycle.urgency
    return a.companyName.localeCompare(b.companyName)
  })

  const totals = {
    running: sorted.filter((c) => c.sentOnVolumeDate > 0).length,
    stalled: sorted.filter((c) => c.sentOnVolumeDate === 0).length,
    invoicesDue: sorted.filter((c) => c.cycle.reminders.some((r) => r.kind === 'invoice-due'))
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

  return {
    today,
    todayIsWorkday,
    month,
    rangeStart: bounds.start,
    rangeEnd: bounds.end,
    clients: sorted,
    totals,
  }
}

interface InstantlySnapshot {
  campaigns: OverviewCampaign[]
  sentPerDay: Map<string, number>
  error: string | null
}

async function getInstantlySnapshot(
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
  )

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
