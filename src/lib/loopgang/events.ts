/**
 * De loopgang-cyclus omgezet in losse gebeurtenissen met een datum, zodat ze in
 * een kalender passen.
 *
 * Twee soorten. Wat er is gebeurd komt uit de database en heeft een vaste datum:
 * een verstuurde factuur, een betaling, een rapportage, een pauze. Wat er moet
 * gebeuren wordt afgeleid uit het anker van de cyclus: werkdag 10 mailen voor de
 * evaluatiemeeting, werkdag 20 factureren, twee dagen voor de meeting de analyse.
 *
 * De belherinnering valt elke twee kalenderdagen zolang de meeting niet geregeld
 * is. Alleen de eerstvolgende komt in de kalender, met het nummer van de poging
 * erbij — anders staan er bij een klant die drie weken doorloopt tien identieke
 * blokjes, en dan lees je de kalender niet meer.
 *
 * Puur: alleen ISO-datums in, gebeurtenissen uit. Geen database, geen API.
 */

import {
  ANALYSIS_LEAD_DAYS,
  CALL_INTERVAL_DAYS,
  INVOICE_WORKDAY,
  MEETING_WINDOW_FROM,
  MEETING_WINDOW_TO,
  MEETING_WORKDAY,
  PAYMENT_TERM_DAYS,
  addDays,
  daysBetween,
  type LoopgangCycle,
  type MeetingOutcome,
} from './cycle'

export type EventKind =
  | 'cycle-start'
  | 'invoice-sent'
  | 'invoice-paid'
  | 'invoice-due'
  | 'payment-due'
  | 'lead-report'
  | 'meeting-mail'
  | 'meeting-call'
  | 'meeting-window'
  | 'meeting'
  | 'analysis'
  | 'pause-start'
  | 'pause-resume'

/**
 * `done` is gebeurd, `overdue` had al moeten gebeuren, `due` is vandaag,
 * `upcoming` staat te wachten. De kalender kleurt hierop.
 */
export type EventStatus = 'done' | 'overdue' | 'due' | 'upcoming'

export interface LoopgangEvent {
  date: string
  kind: EventKind
  status: EventStatus
  label: string
  detail: string | null
}

export interface EventInvoice {
  invoiceDate: string
  amountCents: number | null
  paidAt: string | null
}

export interface EventReport {
  reportDate: string
}

export interface EventPause {
  action: 'pause' | 'resume'
  occurredAt: string
}

export interface EventMeeting {
  outcome: MeetingOutcome
  meetingDate: string | null
}

export interface BuildEventsInput {
  today: string
  cycle: LoopgangCycle
  invoices: EventInvoice[]
  reports: EventReport[]
  pauses: EventPause[]
  meeting: EventMeeting | null
}

/** Wat een datum betekent ten opzichte van vandaag. */
function statusFor(date: string, today: string): EventStatus {
  if (date < today) return 'overdue'
  if (date === today) return 'due'
  return 'upcoming'
}

const OUTCOME_LABELS: Record<MeetingOutcome, string> = {
  planned: 'Meeting gepland',
  stop: 'Geen meeting — klant stoppen',
  continue: 'Geen meeting — klant doorpakken',
}

export function buildEvents(input: BuildEventsInput): LoopgangEvent[] {
  const { today, cycle, invoices, reports, pauses, meeting } = input
  const events: LoopgangEvent[] = []

  // --- Wat er is gebeurd ----------------------------------------------------

  for (const invoice of invoices) {
    events.push({
      date: invoice.invoiceDate,
      kind: 'invoice-sent',
      status: 'done',
      label: 'Factuur verstuurd',
      detail: invoice.amountCents === null ? null : formatEuro(invoice.amountCents),
    })

    if (invoice.paidAt) {
      events.push({
        date: invoice.paidAt,
        kind: 'invoice-paid',
        status: 'done',
        label: 'Factuur betaald',
        detail: invoice.amountCents === null ? null : formatEuro(invoice.amountCents),
      })
    } else {
      // Openstaand: de uiterste betaaldag is een echt moment om op te sturen.
      const due = addDays(invoice.invoiceDate, PAYMENT_TERM_DAYS)
      events.push({
        date: due,
        kind: 'payment-due',
        status: statusFor(due, today),
        label: 'Betaaltermijn verstrijkt',
        detail: invoice.amountCents === null ? null : `${formatEuro(invoice.amountCents)} open`,
      })
    }
  }

  for (const report of reports) {
    events.push({
      date: report.reportDate,
      kind: 'lead-report',
      status: 'done',
      label: 'Leadrapportage',
      detail: null,
    })
  }

  for (const pause of pauses) {
    events.push({
      date: pause.occurredAt.slice(0, 10),
      kind: pause.action === 'pause' ? 'pause-start' : 'pause-resume',
      status: 'done',
      label: pause.action === 'pause' ? 'Campagne gepauzeerd' : 'Campagne hervat',
      detail: null,
    })
  }

  // --- Wat er moet gebeuren -------------------------------------------------

  // Zonder startpunt valt er niets te berekenen. En zolang er een pauze loopt
  // staat de cyclus stil: dan hoort er niets te vervallen en niets afgevinkt te
  // worden, dus komt er ook niets in de kalender of in de takenlijst.
  if (!cycle.anchor || cycle.paused) return dedupe(events)

  // Het startpunt zelf, zodat je in de kalender ziet waar de cyclus vandaan telt.
  // In de dagvakjes vervalt dit blokje: daar staat al een groene balk over de
  // volle breedte. In het dagpaneel hoort het er wel bij.
  events.push({
    date: cycle.anchor,
    kind: 'cycle-start',
    status: 'done',
    label: 'Cyclusstart — begin van de periode',
    detail: null,
  })

  if (cycle.invoiceDueDate) {
    events.push({
      date: cycle.invoiceDueDate,
      kind: 'invoice-due',
      status: statusFor(cycle.invoiceDueDate, today),
      label: 'Leadrapportage + factuur',
      detail: `werkdag ${INVOICE_WORKDAY} van de cyclus`,
    })
  }

  if (meeting) {
    // De meeting is afgehandeld; de mail- en belherinneringen vervallen.
    if (meeting.outcome === 'planned' && meeting.meetingDate) {
      events.push({
        date: meeting.meetingDate,
        kind: 'meeting',
        status: meeting.meetingDate < today ? 'done' : statusFor(meeting.meetingDate, today),
        label: 'Evaluatiemeeting',
        detail: null,
      })

      const analysisDate = addDays(meeting.meetingDate, -ANALYSIS_LEAD_DAYS)
      events.push({
        date: analysisDate,
        kind: 'analysis',
        status: meeting.meetingDate < today ? 'done' : statusFor(analysisDate, today),
        label: 'Campagne-analyse maken',
        detail: `${ANALYSIS_LEAD_DAYS} dagen voor de meeting`,
      })
    } else {
      events.push({
        date: cycle.anchor,
        kind: 'meeting',
        status: 'done',
        label: OUTCOME_LABELS[meeting.outcome],
        detail: 'deze cyclus afgehandeld',
      })
    }
  } else {
    if (cycle.meetingReminderStart) {
      events.push({
        date: cycle.meetingReminderStart,
        kind: 'meeting-mail',
        status: statusFor(cycle.meetingReminderStart, today),
        label: 'Kix mailt voor een meeting',
        detail: `werkdag ${MEETING_WORKDAY} van de cyclus`,
      })
    }

    // Alleen de eerstvolgende belpoging, met het nummer erbij.
    if (cycle.nextCallDate && cycle.meetingReminderStart) {
      const attempt =
        Math.floor(
          daysBetween(cycle.meetingReminderStart, cycle.nextCallDate) / CALL_INTERVAL_DAYS
        ) + 1
      events.push({
        date: cycle.nextCallDate,
        kind: 'meeting-call',
        status: statusFor(cycle.nextCallDate, today),
        label: `Bellen voor een meeting (${attempt}e poging)`,
        detail: `daarna elke ${CALL_INTERVAL_DAYS} dagen`,
      })
    }

    if (cycle.meetingWindow) {
      events.push({
        date: cycle.meetingWindow.from,
        kind: 'meeting-window',
        status: statusFor(cycle.meetingWindow.from, today),
        label: 'Meetingvenster opent',
        detail: `dag ${MEETING_WINDOW_FROM} t/m ${MEETING_WINDOW_TO}`,
      })
    }
  }

  return dedupe(events)
}

/**
 * Twee gebeurtenissen van dezelfde soort op dezelfde dag komen voor als een
 * klant meerdere facturen op één datum heeft gehad, of als het anker samenvalt
 * met een gebeurtenis die er al staat. Eén blokje is genoeg.
 */
function dedupe(events: LoopgangEvent[]): LoopgangEvent[] {
  const seen = new Set<string>()
  const out: LoopgangEvent[] = []
  for (const event of events) {
    const key = `${event.date}|${event.kind}`
    if (seen.has(key)) continue
    seen.add(key)
    out.push(event)
  }
  return out.sort((a, b) => a.date.localeCompare(b.date))
}

function formatEuro(cents: number): string {
  return new Intl.NumberFormat('nl-NL', {
    style: 'currency',
    currency: 'EUR',
    minimumFractionDigits: 0,
    maximumFractionDigits: 0,
  }).format(cents / 100)
}
