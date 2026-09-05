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
  MAX_CALL_ATTEMPTS,
  URGENT_FROM_ATTEMPT,
  callAttemptFor,
  callDatesFor,
  INVOICE_WORKDAY,
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
  | 'lead-report-due'
  | 'client-report-due'
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

/**
 * De staart achter een meetingtaak: hoeveel dagen er nog zijn om de meeting
 * gehad te hebben, geteld vanaf de dag waarop de taak valt. Telt naar de einddag
 * van de periode, want daarna is er niets meer te evalueren voordat er
 * gefactureerd wordt.
 */
function deadlineTekst(invoiceDueDate: string | null, vanaf: string): string {
  if (!invoiceDueDate) return ''

  const dagen = daysBetween(vanaf, invoiceDueDate)
  if (dagen < 0) return ' — de meeting is over tijd'
  if (dagen === 0) return ' — de meeting moet vandaag gehad zijn'
  if (dagen === 1) return ' — binnen 1 dag meeting gehad hebben'
  return ` — binnen ${dagen} dagen meeting gehad hebben`
}

/** Wat een datum betekent ten opzichte van vandaag. */
function statusFor(date: string, today: string): EventStatus {
  if (date < today) return 'overdue'
  if (date === today) return 'due'
  return 'upcoming'
}

const OUTCOME_LABELS: Record<MeetingOutcome, string> = {
  planned: 'Meeting gepland',
  stop: 'GEEN MEETING — de klant stopt',
  continue: 'GEEN MEETING — de klant zet direct door',
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

      // Twee dagen voor de meeting moet er drie dingen op tafel liggen. Ze
      // staan los van elkaar omdat ze los afgevinkt worden en naar verschillende
      // mensen gaan: de leadrapportage en de factuurinschatting zijn voor de
      // klant, de analyse is intern voor tijdens het gesprek, en het maandrapport
      // gaat naar de klant.
      const analysisDate = addDays(meeting.meetingDate, -ANALYSIS_LEAD_DAYS)
      const gedaan = meeting.meetingDate < today
      const voorbereiding: { kind: EventKind; label: string; detail: string }[] = [
        {
          kind: 'lead-report-due',
          label: 'Leadrapportage maken',
          detail: 'met een inschatting van de totale factuur',
        },
        {
          kind: 'analysis',
          label: 'Intern rapport voor de meeting',
          detail: 'campagne-analyse om het gesprek mee in te gaan',
        },
        {
          kind: 'client-report-due',
          label: 'Maandrapport voor de klant',
          detail: null as unknown as string,
        },
      ]

      for (const taak of voorbereiding) {
        events.push({
          date: analysisDate,
          kind: taak.kind,
          status: gedaan ? 'done' : statusFor(analysisDate, today),
          label: taak.label,
          detail: taak.detail ?? null,
        })
      }
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
    // De afteller staat in het label en niet in de toelichting, want die gaat mee
    // in de mail naar Kix. Hij moet aan de taak zelf kunnen zien hoeveel tijd er
    // nog is, zonder de cyclus te hoeven kennen.
    // Alleen de eerstvolgende poging. Het nummer bepaalt de urgentie: vanaf de
    // derde van vijf, want dan zijn er meer pogingen op dan er over zijn.
    //
    // De eerste poging is een mailtje, de rest bellen. Eerder stond de mail als
    // losse taak op werkdag 10 naast poging 1 van de belronde, en die twee vielen
    // op dezelfde dag — twee regels voor één handeling.
    if (cycle.nextCallDate) {
      const poging =
        callAttemptFor(cycle.nextCallDate, cycle.anchor, cycle.invoiceDueDate) ??
        MAX_CALL_ATTEMPTS
      const urgent = poging >= URGENT_FROM_ATTEMPT
      const resterend = callDatesFor(cycle.anchor, cycle.invoiceDueDate).filter(
        (d) => d > cycle.nextCallDate!
      ).length

      const mailen = poging === 1

      events.push({
        date: cycle.nextCallDate,
        kind: mailen ? 'meeting-mail' : 'meeting-call',
        status: statusFor(cycle.nextCallDate, today),
        label: `${urgent ? '[Urgent] ' : ''}${
          mailen ? 'Mailen' : 'Bellen'
        } voor een meeting (poging ${poging}/${MAX_CALL_ATTEMPTS})${deadlineTekst(
          cycle.invoiceDueDate,
          cycle.nextCallDate
        )}`,
        detail:
          resterend > 0
            ? `daarna nog ${resterend} ${resterend === 1 ? 'poging' : 'pogingen'}`
            : 'laatste belmoment van deze periode',
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
