/**
 * De loopgang-cyclus: wanneer moet er gefactureerd worden, wanneer moet er een
 * evaluatiemeeting staan, en wanneer moet Kix bellen.
 *
 * Alles hier is afgeleid, niets wordt opgeslagen. Het anker van de cyclus is de
 * laatste factuurdatum, of de livegang als er nog niet gefactureerd is. Zodra er
 * een factuur bijkomt schuift het anker op en beginnen alle tellers opnieuw —
 * dat is precies wat "de teller begint opnieuw" betekent, zonder dat er ergens
 * een status hoeft te worden bijgewerkt die uit de pas kan gaan lopen.
 *
 * De ideale cyclus die we najagen:
 *   dag 1        campagne start (of de vorige factuur)
 *   werkdag 10   Kix mailt voor een evaluatiemeeting; vanaf dan elke 2 dagen bellen
 *   dag 23-31    de evaluatiemeeting zelf
 *   2 dagen ervoor  campagne-analyse maken
 *   werkdag 20   leadrapportage + factuur de deur uit
 *
 * Werkdagen zijn maandag tot en met vrijdag; feestdagen tellen gewoon mee, net
 * als in de commissieberekening. De belherinnering telt kálenderdagen — die
 * loopt dus door in het weekend, bewust.
 *
 * Deze module bevat uitsluitend pure functies op ISO-datums (YYYY-MM-DD), zodat
 * elk moment na te rekenen is zonder database of API.
 */

import { isWeekday } from '@/lib/commissions-shared'

/** Werkdag waarop de leadrapportage en de factuur de deur uit moeten. */
export const INVOICE_WORKDAY = 20
/** Werkdag waarop Kix moet gaan mailen voor een evaluatiemeeting. */
export const MEETING_WORKDAY = 10
/** Kalenderdagen tussen twee belpogingen zolang de meeting niet staat. */
export const CALL_INTERVAL_DAYS = 2
/** Hoeveel dagen vóór de meeting de campagne-analyse gemaakt moet zijn. */
export const ANALYSIS_LEAD_DAYS = 2
/** Betaaltermijn in kalenderdagen na de factuurdatum. */
export const PAYMENT_TERM_DAYS = 14
/** Het venster (kalenderdagen vanaf dag 1) waarin de evaluatiemeeting hoort te vallen. */
export const MEETING_WINDOW_FROM = 23
export const MEETING_WINDOW_TO = 31

/**
 * Hoe lang een pauze mag duren voordat een niet-gefactureerde periode dringend
 * wordt. Een campagne staat vaak een dag stil zonder dat er iets aan de hand is;
 * duurt het langer, dan wacht er werk dat gedaan moet worden.
 */
export const PAUSE_GRACE_DAYS = 2

/** Voorbij deze grens stoppen de zoeklussen; een cyclus duurt nooit een jaar. */
const MAX_SCAN_DAYS = 400

export function addDays(iso: string, amount: number): string {
  const d = new Date(`${iso}T00:00:00Z`)
  d.setUTCDate(d.getUTCDate() + amount)
  return d.toISOString().slice(0, 10)
}

/** Kalenderdagen van `fromIso` tot `toIso`; negatief als `toIso` eerder ligt. */
export function daysBetween(fromIso: string, toIso: string): number {
  const from = Date.parse(`${fromIso}T00:00:00Z`)
  const to = Date.parse(`${toIso}T00:00:00Z`)
  return Math.round((to - from) / 86_400_000)
}

/**
 * Zegt of een dag in een pauze viel. Gepauzeerde dagen tellen nergens mee: staat
 * een klant twee weken stil, dan schuift zijn hele cyclus twee weken op in
 * plaats van dat de factuurherinnering afgaat over een periode waarin niets is
 * verstuurd. Dat is wat "een pauze overbruggen" betekent.
 */
export type PausePredicate = (date: string) => boolean

const NEVER_PAUSED: PausePredicate = () => false

/**
 * Werkdagen van `fromIso` tot en met `toIso`, beide meegeteld, zonder de dagen
 * die in een pauze vielen. De ankerdag zelf is werkdag 1 — daarom inclusief.
 * Valt het anker in het weekend, dan staat de teller op 0 tot de eerstvolgende
 * maandag.
 */
export function countWorkdays(
  fromIso: string,
  toIso: string,
  isPaused: PausePredicate = NEVER_PAUSED
): number {
  if (toIso < fromIso) return 0
  let count = 0
  for (let d = fromIso; d <= toIso; d = addDays(d, 1)) {
    if (isWeekday(d) && !isPaused(d)) count += 1
  }
  return count
}

/** Kalenderdagen van `fromIso` tot en met `toIso`, zonder de gepauzeerde dagen. */
export function countDays(
  fromIso: string,
  toIso: string,
  isPaused: PausePredicate = NEVER_PAUSED
): number {
  if (toIso < fromIso) return 0
  let count = 0
  for (let d = fromIso; d <= toIso; d = addDays(d, 1)) {
    if (!isPaused(d)) count += 1
  }
  return count
}

/**
 * De datum waarop de werkdagteller vanaf `fromIso` op `n` komt te staan.
 * Geeft null als dat buiten het zoekvenster valt.
 */
export function nthWorkdayFrom(
  fromIso: string,
  n: number,
  isPaused: PausePredicate = NEVER_PAUSED
): string | null {
  return nthMatchingDay(fromIso, n, (day) => isWeekday(day) && !isPaused(day))
}

/** Idem, maar tellend in kalenderdagen in plaats van werkdagen. */
export function nthDayFrom(
  fromIso: string,
  n: number,
  isPaused: PausePredicate = NEVER_PAUSED
): string | null {
  return nthMatchingDay(fromIso, n, (day) => !isPaused(day))
}

function nthMatchingDay(
  fromIso: string,
  n: number,
  matches: (day: string) => boolean
): string | null {
  if (n < 1) return null
  let count = 0
  let day = fromIso
  for (let i = 0; i < MAX_SCAN_DAYS; i += 1) {
    if (matches(day)) {
      count += 1
      if (count === n) return day
    }
    day = addDays(day, 1)
  }
  return null
}

/** De laatste werkdag op of vóór `iso`. */
export function lastWorkdayOnOrBefore(iso: string): string {
  let day = iso
  for (let i = 0; i < 7; i += 1) {
    if (isWeekday(day)) return day
    day = addDays(day, -1)
  }
  return iso
}

export type MeetingOutcome = 'planned' | 'stop' | 'continue'

export interface CycleMeeting {
  outcome: MeetingOutcome
  /** Gevuld bij outcome 'planned'. */
  meetingDate: string | null
}

export interface CycleInvoice {
  date: string
  amountCents: number | null
  /** null = nog niet betaald. */
  paidAt: string | null
}

export interface CycleInput {
  today: string
  /**
   * De dag waarop de lopende campagnemaand begon — het enige anker dat er is.
   *
   * Bewust niet af te leiden uit een factuurdatum of de livegang. Alleen de
   * operator weet welke periode een factuur dekt, en een factuur die te laat de
   * deur uit ging zegt niets over wanneer de volgende maand is begonnen. Zonder
   * deze datum telt er niets, en dat hoort ook: dan is er geen periode.
   */
  cycleStart?: string | null
  /** Laatste factuur; bepaalt de betaalherinnering en of de periode al afgerekend is. */
  lastInvoice: CycleInvoice | null
  /** De afgehandelde meeting die bij het huidige anker hoort, als die er is. */
  meeting: CycleMeeting | null
  /**
   * De dag waarop het leadplafond wordt verwacht. Is die gezet, dan eindigt de
   * periode daar in plaats van op werkdag 20: de cap maakt de maand af, niet de
   * teller.
   */
  capDate?: string | null
  /**
   * De laatste dag dat de campagne liep. Is die gezet, dan is de klant gestopt:
   * de periode eindigt daar en alles rond de campagne vervalt. Wat blijft is de
   * betaling — een gestopte klant met een openstaande factuur moet je blijven
   * zien.
   */
  stoppedOn?: string | null
  /** Welke dagen in een pauze vielen; die tellen nergens mee. */
  isPaused?: PausePredicate
  /** Loopt er op dit moment een pauze? Zo ja, ligt de hele cyclus stil. */
  pausedNow?: boolean
  /** Sinds wanneer die pauze loopt, voor de melding op het scherm. */
  pausedSince?: string | null
}

export type ReminderKind =
  | 'no-anchor'
  | 'cycle-restart'
  | 'paused'
  | 'paused-uninvoiced'
  | 'invoice-due'
  | 'payment-overdue'
  | 'meeting-schedule'
  | 'meeting-call'
  | 'campaign-analysis'
  | 'meeting-upcoming'

export type ReminderSeverity = 'info' | 'warn' | 'urgent'

export interface LoopgangReminder {
  kind: ReminderKind
  severity: ReminderSeverity
  title: string
  detail: string | null
}

export interface LoopgangCycle {
  /** De datum waar de cyclus vanaf telt; null als hij niet te bepalen is. */
  anchor: string | null
  anchorSource: 'cycle-start' | null
  /** Werkdag van de cyclus waarop we vandaag staan; 0 zolang het anker in de toekomst ligt. */
  workday: number
  calendarDay: number
  /** Datum waarop werkdag 10 valt — start van de meeting- en belherinneringen. */
  meetingReminderStart: string | null
  /**
   * De einddag van de periode: leadrapportage en factuur. Normaal werkdag 20,
   * en de verwachte capdatum zodra die is gezet.
   */
  invoiceDueDate: string | null
  /** Loopt deze periode af op een aangekondigd leadplafond in plaats van op werkdag 20? */
  endsOnCap: boolean
  /** De laatste dag dat de campagne liep; null zolang de klant doorgaat. */
  stoppedOn: string | null
  /** Kalenderdagen 23 t/m 31, het venster voor de evaluatiemeeting. */
  meetingWindow: { from: string; to: string } | null
  /** Moet er vandaag gebeld worden voor een meeting? */
  callDueToday: boolean
  /** Eerstvolgende beldag; null als er niet (meer) gebeld hoeft te worden. */
  nextCallDate: string | null
  /** Is de meeting voor dit anker al afgehandeld? */
  meetingHandled: boolean
  /** Ligt de cyclus op dit moment stil? Dan komen er geen herinneringen. */
  paused: boolean
  pausedSince: string | null
  reminders: LoopgangReminder[]
  /** Hoger = dringender. Voor het sorteren van het overzicht. */
  urgency: number
}

const SEVERITY_WEIGHT: Record<ReminderSeverity, number> = {
  urgent: 100,
  warn: 30,
  info: 5,
}

function nlDate(iso: string): string {
  const [y, m, d] = iso.split('-').map(Number)
  if (!y || !m || !d) return iso
  return new Intl.DateTimeFormat('nl-NL', {
    day: 'numeric',
    month: 'short',
  }).format(new Date(Date.UTC(y, m - 1, d)))
}

function plural(n: number, one: string, many: string): string {
  return `${n} ${n === 1 ? one : many}`
}

/**
 * De melding over een openstaande factuur. Staat los van de cyclus: geld dat
 * niet binnen is blijft opgehaald moeten worden, ook als de campagne stilligt.
 */
function paymentReminder(
  lastInvoice: CycleInvoice | null,
  today: string
): LoopgangReminder | null {
  if (!lastInvoice || lastInvoice.paidAt) return null

  const openDays = daysBetween(lastInvoice.date, today)
  if (openDays > PAYMENT_TERM_DAYS) {
    return {
      kind: 'payment-overdue',
      severity: 'urgent',
      title: 'Factuur niet betaald',
      detail: `${plural(openDays, 'dag', 'dagen')} open, termijn is ${PAYMENT_TERM_DAYS} dagen.`,
    }
  }
  return {
    kind: 'payment-overdue',
    severity: 'info',
    title: 'Factuur staat open',
    detail: `Betaaltermijn loopt tot ${nlDate(addDays(lastInvoice.date, PAYMENT_TERM_DAYS))}.`,
  }
}

export function buildCycle(input: CycleInput): LoopgangCycle {
  const { today, lastInvoice, meeting } = input
  const isPaused = input.isPaused ?? NEVER_PAUSED
  const pausedNow = input.pausedNow ?? false
  const pausedSince = input.pausedSince ?? null
  const cycleStart = input.cycleStart ?? null

  // Alleen de handmatig gezette startdatum telt. Eerder schoof het anker mee met
  // de laatste factuur, waardoor een factuur die een dag te laat de deur uit ging
  // de hele volgende periode een dag opschoof zonder dat iemand dat besloot.
  const anchor = cycleStart
  const anchorSource: LoopgangCycle['anchorSource'] = cycleStart ? 'cycle-start' : null

  const reminders: LoopgangReminder[] = []

  if (!anchor) {
    reminders.push({
      kind: 'no-anchor',
      severity: 'info',
      title: 'Cyclusstart nog niet gezet',
      detail:
        'Zonder startdatum telt de werkdagteller niet en komt er geen factuurmoment. Zet hem met de knop Cyclusstart.',
    })
    return {
      anchor: null,
      anchorSource: null,
      workday: 0,
      calendarDay: 0,
      meetingReminderStart: null,
      invoiceDueDate: null,
      endsOnCap: false,
      stoppedOn: null,
      meetingWindow: null,
      callDueToday: false,
      nextCallDate: null,
      meetingHandled: false,
      paused: pausedNow,
      pausedSince,
      reminders,
      urgency: 0,
    }
  }

  const workday = countWorkdays(anchor, today, isPaused)
  const calendarDay = countDays(anchor, today, isPaused)

  const meetingReminderStart = nthWorkdayFrom(anchor, MEETING_WORKDAY, isPaused)
  const werkdag20 = nthWorkdayFrom(anchor, INVOICE_WORKDAY, isPaused)

  // De cap wint van de teller: is het plafond aangekondigd, dan houdt de periode
  // daar op, ook als er nog werkdagen over waren.
  const capDate = input.capDate ?? null
  const endsOnCap = capDate !== null && capDate >= anchor

  // Een gestopte klant loopt tot zijn stopdag en niet verder. Die wint ook van
  // de cap: als er allebei iets staat is de campagne feitelijk op de stopdag
  // opgehouden.
  const stoppedOn = input.stoppedOn && input.stoppedOn >= anchor ? input.stoppedOn : null
  const invoiceDueDate = stoppedOn ?? (endsOnCap ? capDate : werkdag20)
  const windowFrom = nthDayFrom(anchor, MEETING_WINDOW_FROM, isPaused)
  const windowTo = nthDayFrom(anchor, MEETING_WINDOW_TO, isPaused)
  const meetingWindow = windowFrom && windowTo ? { from: windowFrom, to: windowTo } : null

  const meetingHandled = meeting !== null

  // Een gestopte klant heeft geen campagne meer om over te vergaderen. Alles wat
  // met de cyclus te maken heeft vervalt; alleen de factuur en de betaling
  // blijven staan, want die verdwijnen niet doordat iemand stopt.
  if (stoppedOn) {
    const gefactureerd = lastInvoice !== null && lastInvoice.date >= anchor

    if (!gefactureerd) {
      reminders.push({
        kind: 'invoice-due',
        severity: 'urgent',
        title: 'Eindfactuur versturen',
        detail: `Campagne gestopt op ${nlDate(stoppedOn)}; de laatste periode is nog niet gefactureerd.`,
      })
    }

    const betaling = paymentReminder(lastInvoice, today)
    if (betaling) reminders.push(betaling)

    return {
      anchor,
      anchorSource,
      workday,
      calendarDay,
      meetingReminderStart: null,
      invoiceDueDate,
      endsOnCap: false,
      stoppedOn,
      meetingWindow: null,
      callDueToday: false,
      nextCallDate: null,
      meetingHandled,
      paused: pausedNow,
      pausedSince,
      reminders,
      urgency: reminders.reduce((sum, r) => sum + SEVERITY_WEIGHT[r.severity], 0),
    }
  }

  // Een lopende pauze legt de hele cyclus stil: geen factuurherinnering, geen
  // belronde, niets dat als taak naar Kix gaat. De tellers hierboven staan al
  // stil omdat gepauzeerde dagen niet meetellen; wat hier wegvalt zijn de
  // herinneringen die anders over een stilstaande periode zouden afgaan.
  if (pausedNow) {
    const days = pausedSince ? daysBetween(pausedSince, today) : 0
    reminders.push({
      kind: 'paused',
      severity: 'warn',
      title: 'Gepauzeerd',
      detail: pausedSince
        ? `Staat ${plural(days, 'dag', 'dagen')} stil sinds ${nlDate(pausedSince)}. De cyclus telt zolang niet door.`
        : 'De cyclus telt zolang niet door.',
    })

    // Een pauze zet de cyclus stil, geen openstaande rekening. Zonder deze
    // melding verdwijnt een onbetaalde factuur uit beeld zodra de campagne
    // wordt gepauzeerd — juist bij een klant die stopt is dat het enige wat er
    // nog te bewaken valt.
    const payment = paymentReminder(lastInvoice, today)
    if (payment) reminders.push(payment)

    // De periode die vóór de pauze heeft gedraaid moet nog gefactureerd worden.
    // Dit is de belangrijkste melding van allemaal: een campagne gaat pas weer
    // live nadat de factuur eruit is, want die factuur bevestigt dat er
    // consensus is over de leadrapportage. Zonder deze regel bevriest de
    // werkdagteller op bijvoorbeeld 15, wordt werkdag 20 nooit gehaald, en
    // blijft een klant maandenlang stilstaan zonder dat iemand iets hoort.
    const periodInvoiced = lastInvoice !== null && lastInvoice.date >= anchor
    if (!periodInvoiced && workday > 0) {
      const stillDays = pausedSince ? daysBetween(pausedSince, today) : 0
      reminders.push({
        kind: 'paused-uninvoiced',
        severity: stillDays > PAUSE_GRACE_DAYS ? 'urgent' : 'warn',
        title: 'Leadrapportage + factuur nog niet verstuurd',
        detail: `${plural(workday, 'werkdag', 'werkdagen')} gedraaid sinds ${nlDate(
          anchor
        )} en daarna stilgezet. De campagne kan pas weer live als de factuur eruit is.`,
      })
    }

    return {
      anchor,
      anchorSource,
      workday,
      calendarDay,
      meetingReminderStart,
      invoiceDueDate,
      endsOnCap,
      stoppedOn,
      meetingWindow,
      callDueToday: false,
      nextCallDate: null,
      meetingHandled,
      paused: true,
      pausedSince,
      reminders,
      urgency: reminders.reduce((sum, r) => sum + SEVERITY_WEIGHT[r.severity], 0),
    }
  }

  // Belherinnering: vanaf werkdag 10 elke 2 kalenderdagen, dus ook in het
  // weekend. Telt vanaf de dag dat de teller op 10 kwam te staan, niet vanaf het
  // anker — anders zou de eerste belronde op een willekeurig moment vallen.
  let callDueToday = false
  let nextCallDate: string | null = null
  const callWindowOpen =
    !meetingHandled && meetingReminderStart !== null && today >= meetingReminderStart

  if (callWindowOpen && meetingReminderStart) {
    const elapsed = daysBetween(meetingReminderStart, today)
    callDueToday = elapsed % CALL_INTERVAL_DAYS === 0
    nextCallDate = callDueToday
      ? today
      : addDays(today, CALL_INTERVAL_DAYS - (elapsed % CALL_INTERVAL_DAYS))
  }

  // --- Facturatie -----------------------------------------------------------

  // Is er over deze periode al gefactureerd, dan is hij klaar. Het anker schuift
  // niet vanzelf mee — dat is precies de bedoeling — dus wat er dan nog moet
  // gebeuren is: de volgende periode starten. Zonder deze melding zou de teller
  // stilletjes doortellen naar werkdag 30 en zou "factuur versturen" rood
  // blijven staan voor een factuur die al de deur uit is.
  const periodInvoiced = lastInvoice !== null && lastInvoice.date >= anchor

  if (periodInvoiced) {
    reminders.push({
      kind: 'cycle-restart',
      severity: workday > INVOICE_WORKDAY ? 'urgent' : 'warn',
      title: 'Volgende periode nog niet gestart',
      detail: `Gefactureerd op ${nlDate(lastInvoice.date)}. De teller staat op werkdag ${workday} en loopt door tot je de cyclusstart op de nieuwe begindag zet.`,
    })
  } else if (workday >= INVOICE_WORKDAY) {
    const over = workday - INVOICE_WORKDAY
    reminders.push({
      kind: 'invoice-due',
      severity: 'urgent',
      title: 'Leadrapportage + factuur versturen',
      detail:
        over === 0
          ? `Vandaag is werkdag ${INVOICE_WORKDAY} sinds ${nlDate(anchor)}.`
          : `${plural(over, 'werkdag', 'werkdagen')} over tijd — werkdag ${INVOICE_WORKDAY} was ${
              invoiceDueDate ? nlDate(invoiceDueDate) : 'eerder'
            }.`,
    })
  }

  const payment = paymentReminder(lastInvoice, today)
  if (payment) reminders.push(payment)

  // --- Evaluatiemeeting -----------------------------------------------------

  if (!meetingHandled && meetingReminderStart && today >= meetingReminderStart) {
    reminders.push({
      kind: 'meeting-schedule',
      severity: workday >= INVOICE_WORKDAY ? 'urgent' : 'warn',
      title: 'Evaluatiemeeting nog niet ingepland',
      detail: `Kix moet mailen voor een afspraak; loopt sinds ${nlDate(meetingReminderStart)}.`,
    })

    reminders.push({
      kind: 'meeting-call',
      severity: callDueToday ? 'warn' : 'info',
      title: callDueToday ? 'Vandaag bellen voor de meeting' : 'Belronde loopt',
      detail: callDueToday
        ? 'Elke 2 dagen bellen tot de meeting is afgehandeld.'
        : nextCallDate
          ? `Volgende belpoging ${nlDate(nextCallDate)}.`
          : null,
    })
  }

  if (meeting?.outcome === 'planned' && meeting.meetingDate) {
    const daysUntil = daysBetween(today, meeting.meetingDate)
    const analysisDate = addDays(meeting.meetingDate, -ANALYSIS_LEAD_DAYS)

    if (daysUntil >= 0 && today >= analysisDate) {
      reminders.push({
        kind: 'campaign-analysis',
        severity: 'warn',
        title: 'Campagne-analyse maken',
        detail: `Meeting ${
          daysUntil === 0 ? 'vandaag' : `over ${plural(daysUntil, 'dag', 'dagen')}`
        }, op ${nlDate(meeting.meetingDate)}.`,
      })
    } else if (daysUntil > 0) {
      reminders.push({
        kind: 'meeting-upcoming',
        severity: 'info',
        title: `Meeting ${nlDate(meeting.meetingDate)}`,
        detail: `Over ${plural(daysUntil, 'dag', 'dagen')}. Analyse maken op ${nlDate(analysisDate)}.`,
      })
    }
  }

  const urgency = reminders.reduce((sum, r) => sum + SEVERITY_WEIGHT[r.severity], 0)

  return {
    anchor,
    anchorSource,
    workday,
    calendarDay,
    meetingReminderStart,
    invoiceDueDate,
    endsOnCap,
    stoppedOn,
    meetingWindow,
    callDueToday,
    nextCallDate,
    meetingHandled,
    paused: false,
    pausedSince,
    reminders,
    urgency,
  }
}
