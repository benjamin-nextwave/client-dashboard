'use client'

import type { EventKind, EventStatus, LoopgangEvent } from '@/lib/loopgang/events'
import { MARK_LABELS, type DayMark } from '@/lib/loopgang/day-status'
import type { LoopgangOverviewClient } from '@/lib/data/loopgang-overview'

export interface DayEntry {
  client: LoopgangOverviewClient
  event: LoopgangEvent
}

/**
 * De kleur van een dagvakje.
 *
 *   groen   er is verstuurd
 *   oranje  pauze, maar nog kort — de eerste drie werkdagen
 *   rood    pauze die te lang duurt, of een werkdag zonder verzending terwijl
 *           de campagne wel had moeten draaien
 *   null    valt buiten de beoordeling: weekend, toekomst, of vóór het
 *           startpunt van de cyclus
 *
 * Bij meerdere klanten in beeld telt het somber­ste geval: alleen als iedereen
 * verstuurde is het vakje groen.
 */
export type DayTone = 'green' | 'orange' | 'red' | null

/** Vanaf welke werkdag van een pauze het vakje rood wordt in plaats van oranje. */
export const PAUSE_ORANGE_DAYS = 3

/** Een taak die op deze dag naar Kix ging. */
export interface KixMark {
  client: string
  label: string
  /** Hoe vaak de taak in totaal is verstuurd; 1 bij de eerste keer. */
  count: number
  done: boolean
}

export interface DayCell {
  date: string
  dayNumber: number
  inMonth: boolean
  isWeekend: boolean
  isToday: boolean
  isFuture: boolean
  entries: DayEntry[]
  /** Aantal klanten dat die dag verstuurde, en hoeveel er in beeld zijn. */
  running: number
  total: number
  tone: DayTone
  /**
   * Klanten waarvan de campagneperiode op deze dag begint — het anker waar de
   * werkdagteller vanaf loopt.
   */
  /** Taken die op deze dag naar Kix zijn gestuurd. */
  kixSent: KixMark[]
  /**
   * Wat er die dag van je verwacht wordt. Alleen gevuld bij één gekozen klant:
   * over twintig klanten tegelijk is er geen enkel teken dat ergens op slaat.
   */
  mark: DayMark
  periodStart: string[]
  /**
   * Klanten waarvan de campagneperiode op deze dag eindigt: werkdag 20 vanaf de
   * startdatum, met de pauzedagen eruit gerekend. Dat is de dag waarop de
   * leadrapportage en de factuur de deur uit moeten.
   */
  periodEnd: string[]
}

interface Props {
  cells: DayCell[]
  selected: string | null
  onSelect: (date: string) => void
  /** Kop boven het raster; gebruikt bij de driemaandsweergave. */
  title?: string
  /**
   * Zeven kolommen voor een maand of week, één voor de dagweergave. Bij één
   * kolom vervalt de weekdagbalk: die zegt niets over een enkele dag.
   */
  columns?: 7 | 1
  /**
   * De weekdagbalk klopt alleen als het raster op maandag begint. De
   * periodeweergave begint op de startdatum van de klant, dus daar vervalt hij.
   */
  showWeekdays?: boolean
}

const WEEKDAY_HEADS = ['ma', 'di', 'wo', 'do', 'vr', 'za', 'zo']

/**
 * Korte tekst per soort gebeurtenis. In een kalendervakje is geen ruimte voor
 * "Leadrapportage + factuur"; de volledige tekst staat in het dagpaneel.
 */
const SHORT_LABEL: Record<EventKind, string> = {
  'cycle-start': 'start',
  'invoice-sent': 'factuur ✓',
  'invoice-paid': 'betaald ✓',
  'invoice-due': 'factuur',
  'payment-due': 'betaling',
  'lead-report': 'rapportage ✓',
  'meeting-mail': 'mailen',
  'meeting-call': 'bellen',
  'meeting-window': 'venster',
  meeting: 'meeting',
  analysis: 'analyse',
  'lead-report-due': 'leadrapport',
  'client-report-due': 'maandrapport',
  'pause-start': 'pauze',
  'pause-resume': 'hervat',
}

const STATUS_STYLES: Record<EventStatus, string> = {
  done: 'bg-gray-100 text-gray-500',
  overdue: 'bg-rose-100 text-rose-800',
  due: 'bg-amber-100 text-amber-900',
  upcoming: 'bg-indigo-50 text-indigo-700',
}

/**
 * Alles wat met de evaluatiemeeting te maken heeft krijgt paars, ongeacht of het
 * vandaag moet of al gebeurd is. Dat is de enige draad die door de hele tweede
 * helft van een periode loopt — mailen, bellen, het venster, de meeting zelf en
 * de analyse eromheen — en die hoor je in één oogopslag terug te vinden.
 */
const MEETING_KINDS = new Set<EventKind>([
  'meeting',
  'meeting-mail',
  'meeting-call',
  'meeting-window',
  'analysis',
  'lead-report-due',
  'client-report-due',
])

const MEETING_STYLE = 'bg-purple-100 text-purple-800'

/**
 * Het teken in de hoek van een dagvakje, en zijn kleur.
 *
 * Een vinkje betekent "hier hoef je niets te doen", een klokje "hier wordt op je
 * gewacht". Bewust getekend en geen emoji: die nemen geen tekstkleur aan, en het
 * hele punt is dat rood, grijs en groen uit elkaar te houden zijn.
 */
const MARK_STYLES: Record<Exclude<DayMark, null>, { shape: 'check' | 'clock' | 'pause'; className: string }> = {
  rest: { shape: 'check', className: 'text-gray-300' },
  wait: { shape: 'clock', className: 'text-gray-300' },
  call: { shape: 'clock', className: 'text-rose-500' },
  sent: { shape: 'clock', className: 'text-emerald-500' },
  planned: { shape: 'check', className: 'text-purple-600' },
  continue: { shape: 'check', className: 'text-emerald-600' },
  stop: { shape: 'check', className: 'text-rose-600' },
  paused: { shape: 'pause', className: 'text-amber-500' },
}

function MarkIcon({ mark }: { mark: Exclude<DayMark, null> }) {
  const { shape, className } = MARK_STYLES[mark]

  return (
    <svg
      className={`h-3.5 w-3.5 shrink-0 ${className}`}
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth={2.4}
      strokeLinecap="round"
      strokeLinejoin="round"
      aria-hidden="true"
    >
      {shape === 'check' && <path d="m5 13 4 4L19 7" />}
      {shape === 'clock' && (
        <>
          <circle cx="12" cy="12" r="8.5" />
          <path d="M12 7.5V12l3 2" />
        </>
      )}
      {shape === 'pause' && <path d="M9 6v12M15 6v12" />}
    </svg>
  )
}

/**
 * De achtergrond per kleur. Zacht genoeg om de blokjes erop leesbaar te houden;
 * het gaat om het patroon over de maand, niet om één vakje.
 */
const TONE_STYLES: Record<Exclude<DayTone, null>, string> = {
  green: 'bg-emerald-100',
  orange: 'bg-amber-100',
  red: 'bg-rose-100',
}

/** Hoeveel blokjes er in een vakje passen voordat er "+n" onder komt. */
const MAX_CHIPS = 3

export function MonthGrid({
  cells,
  selected,
  onSelect,
  title,
  columns = 7,
  showWeekdays = true,
}: Props) {
  return (
    <div className="bg-white">
      {title && (
        <div className="border-b border-gray-100 px-3 py-2 text-[11px] font-semibold text-gray-700">
          {title}
        </div>
      )}

      {columns === 7 && showWeekdays && (
        <div className="grid grid-cols-7 border-b border-gray-100 bg-gray-50/70">
          {WEEKDAY_HEADS.map((day) => (
            <div
              key={day}
              className="px-2 py-2 text-center text-[10px] font-semibold uppercase tracking-wide text-gray-400"
            >
              {day}
            </div>
          ))}
        </div>
      )}

      <div className={columns === 7 ? 'grid grid-cols-7' : 'grid grid-cols-1'}>
        {cells.map((cell) => {
          const isSelected = selected === cell.date
          const visible = cell.entries.slice(0, MAX_CHIPS)
          const hidden = cell.entries.length - visible.length

          return (
            <button
              key={cell.date}
              type="button"
              onClick={() => onSelect(cell.date)}
              aria-pressed={isSelected}
              className={`flex ${
                columns === 1 ? 'min-h-[180px]' : 'min-h-[104px]'
              } flex-col gap-1 border-b border-r border-gray-100 p-1.5 text-left transition-colors ${
                !cell.inMonth
                  ? 'bg-gray-50/60'
                  : cell.tone
                    ? TONE_STYLES[cell.tone]
                    : cell.isWeekend
                      ? 'bg-gray-50/40'
                      : 'bg-white'
              } ${isSelected ? 'ring-2 ring-inset ring-gray-900' : 'hover:brightness-95'}`}
            >
              {/* Begin en einde van een periode zijn de twee harde ankers in de
                  maand; die verdienen een streep over de volle breedte en niet
                  een blokje tussen de rest. Het einde staat bovenaan: valt er op
                  één dag een einde en een start samen, dan sluit de oude periode
                  af voordat de nieuwe begint. */}
              {(cell.periodEnd.length > 0 || cell.periodStart.length > 0) && (
                <div className="-mx-1.5 -mt-1.5 mb-0.5 flex flex-col">
                  {cell.periodEnd.length > 0 && (
                    <div
                      title={`Einde periode: ${cell.periodEnd.join(', ')}`}
                      className="border-t-2 border-gray-900 bg-gray-900 px-1.5 py-0.5 text-[9px] font-semibold uppercase tracking-wide text-white"
                    >
                      einde periode{namesSuffix(cell.periodEnd)}
                    </div>
                  )}
                  {cell.periodStart.length > 0 && (
                    <div
                      title={`Start periode: ${cell.periodStart.join(', ')}`}
                      className="border-t-2 border-emerald-600 bg-emerald-600 px-1.5 py-0.5 text-[9px] font-semibold uppercase tracking-wide text-white"
                    >
                      start periode{namesSuffix(cell.periodStart)}
                    </div>
                  )}
                </div>
              )}

              <div className="flex items-center justify-between gap-1">
                <span
                  className={`flex h-5 min-w-5 items-center justify-center rounded-full px-1 text-[11px] font-semibold tabular-nums ${
                    cell.isToday
                      ? 'bg-gray-900 text-white'
                      : cell.inMonth
                        ? 'text-gray-700'
                        : 'text-gray-300'
                  }`}
                >
                  {cell.dayNumber}
                </span>

                {/* Bij één klant staat hier wat er die dag van je verwacht
                    wordt; bij meer klanten hoeveel er die dag verstuurden. Die
                    twee sluiten elkaar uit: een teken over "de meeting moet
                    geregeld worden" slaat nergens op bij twintig klanten
                    tegelijk. */}
                {cell.mark !== null ? (
                  <span title={MARK_LABELS[cell.mark]}>
                    <MarkIcon mark={cell.mark} />
                  </span>
                ) : (
                  !cell.isFuture &&
                  cell.inMonth &&
                  !cell.isWeekend && (
                    <span
                      className={`text-[10px] font-semibold tabular-nums ${
                        cell.running === 0
                          ? 'text-gray-300'
                          : cell.running === cell.total
                            ? 'text-emerald-600'
                            : 'text-amber-600'
                      }`}
                    >
                      {cell.running}/{cell.total}
                    </span>
                  )
                )}
              </div>

              <div className="flex flex-col gap-0.5">
                {visible.map((entry) => (
                  <span
                    key={`${entry.client.key}-${entry.event.kind}`}
                    title={`${entry.client.displayName} — ${entry.event.label}`}
                    className={`truncate rounded px-1 py-0.5 text-[10px] font-medium leading-tight ${
                      MEETING_KINDS.has(entry.event.kind)
                        ? MEETING_STYLE
                        : STATUS_STYLES[entry.event.status]
                    }`}
                  >
                    {shortLabel(entry.client)} · {SHORT_LABEL[entry.event.kind]}
                  </span>
                ))}
                {hidden > 0 && (
                  <span className="px-1 text-[10px] font-semibold text-gray-400">
                    +{hidden} meer
                  </span>
                )}

                {/* Wat er die dag naar Kix is gegaan. Eigen kleur, want dit is
                    geen gebeurtenis in de cyclus maar iets dat jij hebt gedaan —
                    en het is precies wat je zoekt als je je afvraagt of je hem
                    hier al aan herinnerd hebt. */}
                {cell.kixSent.map((mark) => (
                  <span
                    key={`kix-${mark.client}-${mark.label}`}
                    title={`Naar Kix: ${mark.client} — ${mark.label} (${mark.count}x verstuurd)`}
                    className={`truncate rounded px-1 py-0.5 text-[10px] font-medium leading-tight ${
                      mark.done ? 'bg-gray-100 text-gray-400' : 'bg-indigo-100 text-indigo-800'
                    }`}
                  >
                    kix → {mark.client.split(/\s+/)[0]}
                    {mark.count > 1 ? ` ${mark.count}×` : ''}
                  </span>
                ))}
              </div>
            </button>
          )
        })}
      </div>
    </div>
  )
}

/**
 * Achter "start periode" of "einde periode" past nog één klantnaam. Bij meer
 * klanten op dezelfde dag past er geen enkele, en zegt het aantal meer dan een
 * willekeurige eerste naam.
 */
function namesSuffix(names: string[]): string {
  if (names.length === 0) return ''
  return names.length === 1 ? ` · ${names[0]}` : ` · ${names.length} klanten`
}

/**
 * Klantnamen zijn te lang voor een vakje. Het eerste woord is in de praktijk
 * genoeg om ze uit elkaar te houden; de volledige naam staat in de tooltip en
 * in het dagpaneel.
 */
export function shortLabel(client: LoopgangOverviewClient): string {
  const parts = client.companyName.trim().split(/\s+/)
  const first = parts[0] || client.companyName
  return first.length > 12 ? `${first.slice(0, 11)}…` : first
}
