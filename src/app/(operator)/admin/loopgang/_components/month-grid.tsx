'use client'

import type { EventKind, EventStatus, LoopgangEvent } from '@/lib/loopgang/events'
import type { LoopgangOverviewClient } from '@/lib/data/loopgang-overview'

export interface DayEntry {
  client: LoopgangOverviewClient
  event: LoopgangEvent
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
}

interface Props {
  cells: DayCell[]
  selected: string | null
  onSelect: (date: string) => void
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
  'pause-start': 'pauze',
  'pause-resume': 'hervat',
}

const STATUS_STYLES: Record<EventStatus, string> = {
  done: 'bg-gray-100 text-gray-500',
  overdue: 'bg-rose-100 text-rose-800',
  due: 'bg-amber-100 text-amber-900',
  upcoming: 'bg-indigo-50 text-indigo-700',
}

/** Hoeveel blokjes er in een vakje passen voordat er "+n" onder komt. */
const MAX_CHIPS = 3

export function MonthGrid({ cells, selected, onSelect }: Props) {
  return (
    <div className="overflow-hidden rounded-2xl border border-gray-200 bg-white">
      <div className="grid grid-cols-7 border-b border-gray-100 bg-gray-50">
        {WEEKDAY_HEADS.map((day) => (
          <div
            key={day}
            className="px-2 py-2 text-center text-[10px] font-semibold uppercase tracking-wide text-gray-400"
          >
            {day}
          </div>
        ))}
      </div>

      <div className="grid grid-cols-7">
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
              className={`flex min-h-[104px] flex-col gap-1 border-b border-r border-gray-100 p-1.5 text-left transition-colors ${
                !cell.inMonth
                  ? 'bg-gray-50/60'
                  : cell.isWeekend
                    ? 'bg-gray-50/40'
                    : 'bg-white'
              } ${isSelected ? 'ring-2 ring-inset ring-gray-900' : 'hover:bg-gray-50'}`}
            >
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

                {/* Hoeveel klanten die dag verstuurden. Alleen voor dagen die
                    geweest zijn: van de toekomst weten we het niet. */}
                {!cell.isFuture && cell.inMonth && !cell.isWeekend && (
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
                )}
              </div>

              <div className="flex flex-col gap-0.5">
                {visible.map((entry) => (
                  <span
                    key={`${entry.client.key}-${entry.event.kind}`}
                    title={`${entry.client.displayName} — ${entry.event.label}`}
                    className={`truncate rounded px-1 py-0.5 text-[10px] font-medium leading-tight ${
                      STATUS_STYLES[entry.event.status]
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
              </div>
            </button>
          )
        })}
      </div>
    </div>
  )
}

/**
 * Klantnamen zijn te lang voor een vakje. Het eerste woord is in de praktijk
 * genoeg om ze uit elkaar te houden; de volledige naam staat in de tooltip en
 * in het dagpaneel.
 *
 * Draait een klant twee campagnes, dan is de bedrijfsnaam juist níét genoeg —
 * beide regels zouden dan hetzelfde heten. Daar komt het eerste woord van de
 * campagnenaam achter, of anders het nummer.
 */
export function shortLabel(client: LoopgangOverviewClient): string {
  const name = firstWord(client.companyName)
  if (client.campaignTrackCount < 2) return name
  const suffix = client.campaignTrackName
    ? firstWord(client.campaignTrackName)
    : String(client.campaignTrack)
  return `${name} ${suffix}`
}

function firstWord(value: string): string {
  const first = value.trim().split(/\s+/)[0] ?? value
  return first.length > 12 ? `${first.slice(0, 11)}…` : first
}
