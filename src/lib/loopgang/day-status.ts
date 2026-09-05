/**
 * Wat er op één dag van je verwacht wordt, per klant.
 *
 * De kalender kleurde tot nu toe alleen of er verstuurd was. Dat zegt of de
 * campagne loopt, maar niet of jij iets moet doen. Een periode van twintig
 * werkdagen valt in twee helften:
 *
 *   werkdag 1 t/m 9    rust — de campagne moet draaien, verder niets
 *   werkdag 10 t/m 20  actie — de evaluatiemeeting moet geregeld worden
 *
 * In de rusthelft staat een vinkje. In de actiehelft een klokje: rood op de
 * dagen dat Kix moet bellen (om de twee dagen), grijs op de tussenliggende
 * dagen, en groen zodra die taak op díé dag ook echt naar Kix is gestuurd. Is de
 * meeting eenmaal geregeld — of blijkt hij niet nodig — dan worden het overal
 * vinkjes: er valt niets meer te plannen.
 *
 * Een pauze bevriest alles. Gepauzeerde dagen tellen niet mee in de werkdag-
 * teller, dus de klokjes schuiven vanzelf mee op.
 *
 * Loopt een klant tegen zijn leadplafond aan, dan begint de actiehelft op de dag
 * dat je dat aangeeft en eindigt de periode op de verwachte capdatum in plaats
 * van op werkdag 20.
 *
 * Puur: alleen datums en de cyclus in, één teken uit. Geen database, geen API.
 */

import { MAX_CALL_ATTEMPTS, callAttemptFor, type LoopgangCycle } from './cycle'
import { isWeekday } from '@/lib/commissions-shared'

/**
 *   rest      rustweken; zorg dat hij draait, verder niets
 *   wait      actieweken, maar vandaag hoeft Kix niet te bellen
 *   call      vandaag neemt Kix contact op — poging 1 tot en met 4
 *   call-last vandaag is de laatste poging; hierna is er geen ronde meer over
 *   sent      die taak is op deze dag naar Kix gestuurd
 *   planned   de meeting staat; er valt niets meer te regelen
 *   continue  geen meeting nodig, de klant gaat door
 *   stop      geen meeting nodig, de klant stopt
 *   paused    de campagne ligt stil; de hele cyclus staat op pauze
 *   null      deze dag valt buiten de periode, of is een weekend
 */
export type DayMark =
  | 'rest'
  | 'wait'
  | 'call'
  | 'call-last'
  | 'sent'
  | 'planned'
  | 'continue'
  | 'stop'
  | 'paused'
  | null

export interface DayStatusInput {
  date: string
  today: string
  cycle: LoopgangCycle
  /** Dagen die in een pauze vielen. */
  pausedDates: Set<string>
  /** De dagen waarop een meetingtaak naar Kix is gestuurd. */
  kixSentDates: Set<string>
  /** Uitkomst van de meeting voor deze periode, als die er is. */
  meetingOutcome: 'planned' | 'stop' | 'continue' | null
  /**
   * De dag waarop is aangegeven dat het leadplafond eraan komt. Vanaf die dag
   * loopt de actiehelft, ook als de werkdagteller nog lang niet op tien staat.
   */
  capStartedOn: string | null
}

export function dayMarkFor(input: DayStatusInput): DayMark {
  const { date, cycle, pausedDates, kixSentDates, meetingOutcome, capStartedOn } = input

  // Zonder startpunt is er geen periode om iets over te zeggen.
  if (!cycle.anchor) return null
  if (date < cycle.anchor) return null

  // Voorbij de einddag houdt de periode op. invoiceDueDate is werkdag 20, of de
  // capdatum als die is gezet — dat verschil zit al in de cyclus.
  if (cycle.invoiceDueDate && date > cycle.invoiceDueDate) return null

  // In het weekend gebeurt er niets, ook niet in de actieweken.
  if (!isWeekday(date)) return null

  if (pausedDates.has(date)) return 'paused'

  // Een gestopte klant heeft geen meeting meer te regelen. De laatste dag krijgt
  // het stopteken, de dagen daarvoor blijven gewoon rustdagen — die zijn immers
  // wel gedraaid.
  if (cycle.stoppedOn) {
    return date === cycle.stoppedOn ? 'stop' : 'rest'
  }

  // Een afgehandelde meeting maakt de hele actiehelft af: gepland, doorgaan of
  // stoppen — in alle drie de gevallen valt er niets meer te bellen.
  if (meetingOutcome !== null) return meetingOutcome

  if (!inActionPhase(date, cycle, capStartedOn)) return 'rest'

  // De verzonden taak wint van de belafspraak: je wil zien op welke dagen je Kix
  // daadwerkelijk hebt benaderd, ook als dat een tussenliggende dag was.
  if (kixSentDates.has(date)) return 'sent'

  // Rood is voorbehouden aan wat niet mag schuiven. Een belpoging mag schuiven —
  // daar zijn er vijf van — dus die is paars, net als al het andere rond de
  // meeting. Alleen de laatste poging kleurt rood: daarna is er geen ronde meer
  // over en wordt het een beslissing in plaats van een herinnering.
  const poging = callAttemptFor(date, cycle.anchor, cycle.invoiceDueDate)
  if (poging === null) return 'wait'

  return poging >= MAX_CALL_ATTEMPTS ? 'call-last' : 'call'
}

/**
 * Vanaf wanneer de actiehelft loopt. Normaal is dat werkdag 10; is het
 * leadplafond aangekondigd, dan de dag waarop dat is gebeurd — dan moet er
 * meteen gebeld worden, ongeacht de teller.
 */
function actionPhaseStart(cycle: LoopgangCycle, capStartedOn: string | null): string | null {
  if (capStartedOn) {
    if (!cycle.meetingReminderStart) return capStartedOn
    return capStartedOn < cycle.meetingReminderStart ? capStartedOn : cycle.meetingReminderStart
  }
  return cycle.meetingReminderStart
}

function inActionPhase(
  date: string,
  cycle: LoopgangCycle,
  capStartedOn: string | null
): boolean {
  const start = actionPhaseStart(cycle, capStartedOn)
  return start !== null && date >= start
}

/** Korte uitleg bij een teken, voor de tooltip in de kalender. */
export const MARK_LABELS: Record<Exclude<DayMark, null>, string> = {
  rest: 'Rustweek — alleen zorgen dat de campagne draait',
  wait: 'Wacht op een meeting — vandaag hoeft Kix niet te bellen',
  call: 'Kix neemt vandaag contact op voor een meeting',
  'call-last': 'Laatste poging — hierna is de belronde op',
  sent: 'Taak op deze dag naar Kix gestuurd',
  planned: 'Meeting staat gepland',
  continue: 'Geen meeting nodig — de klant gaat door',
  stop: 'Geen meeting nodig — de klant stopt',
  paused: 'Campagne gepauzeerd — de hele cyclus staat stil',
}
