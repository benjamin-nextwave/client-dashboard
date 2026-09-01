'use client'

import { useMemo, useState } from 'react'
import Link from 'next/link'
import { formatEuroCents, isWeekday } from '@/lib/commissions-shared'
import type { LoopgangOverview } from '@/lib/data/loopgang-overview'
import { addDays } from '@/lib/loopgang/cycle'
import { DayPanel } from './day-panel'
import { MonthGrid, type DayCell, type DayEntry } from './month-grid'

interface Props {
  overview: LoopgangOverview
}

const MONTH_NAMES = [
  'januari', 'februari', 'maart', 'april', 'mei', 'juni',
  'juli', 'augustus', 'september', 'oktober', 'november', 'december',
]
const WEEKDAY_NAMES = [
  'zondag', 'maandag', 'dinsdag', 'woensdag', 'donderdag', 'vrijdag', 'zaterdag',
]

type Focus = 'all' | 'action' | 'invoice' | 'meeting' | 'stalled'

const FOCUS_LABELS: Record<Focus, string> = {
  all: 'Alles',
  action: 'Vraagt actie',
  invoice: 'Factuur open',
  meeting: 'Meeting regelen',
  stalled: 'Staat stil',
}

export function CalendarView({ overview }: Props) {
  const [selectedClients, setSelectedClients] = useState<string[]>([])
  const [focus, setFocus] = useState<Focus>('all')
  const [selectedDate, setSelectedDate] = useState<string>(() =>
    overview.today.slice(0, 7) === overview.month ? overview.today : overview.rangeStart
  )

  const clients = useMemo(() => {
    return overview.clients.filter((client) => {
      if (selectedClients.length > 0 && !selectedClients.includes(client.id)) return false

      switch (focus) {
        case 'action':
          return client.cycle.reminders.some((r) => r.severity !== 'info')
        case 'invoice':
          return client.cycle.reminders.some(
            (r) =>
              r.kind === 'invoice-due' || (r.kind === 'payment-overdue' && r.severity === 'urgent')
          )
        case 'meeting':
          return client.cycle.reminders.some((r) => r.kind === 'meeting-schedule')
        case 'stalled':
          return client.sentOnVolumeDate === 0
        default:
          return true
      }
    })
  }, [overview.clients, selectedClients, focus])

  const cells = useMemo(
    () => buildCells(overview.month, overview.today, clients),
    [overview.month, overview.today, clients]
  )

  const entriesForSelected = useMemo(
    () => cells.find((c) => c.date === selectedDate)?.entries ?? [],
    [cells, selectedDate]
  )

  function toggleClient(id: string) {
    setSelectedClients((prev) =>
      prev.includes(id) ? prev.filter((c) => c !== id) : [...prev, id]
    )
  }

  const [year, month] = overview.month.split('-').map(Number)
  const prevMonth = shiftMonth(overview.month, -1)
  const nextMonth = shiftMonth(overview.month, 1)

  return (
    <div className="space-y-5">
      {/* Vandaag + kerncijfers */}
      <section className="rounded-2xl border border-gray-200 bg-white p-5">
        <div className="flex flex-wrap items-end justify-between gap-4">
          <div>
            <div className="text-[11px] font-semibold uppercase tracking-wide text-gray-400">
              Vandaag
            </div>
            <div className="mt-0.5 text-lg font-semibold tracking-tight text-gray-900">
              {formatDayLong(overview.today)}
            </div>
            <div className="mt-0.5 text-[11px] text-gray-500">
              {overview.todayIsWorkday
                ? 'Werkdag — verzendvolume telt vandaag mee.'
                : 'Geen werkdag — de volumecijfers slaan op de laatste werkdag.'}
            </div>
          </div>

          <div className="grid grid-cols-2 gap-x-6 gap-y-2 sm:grid-cols-4">
            <Stat label="Draait" value={overview.totals.running} tone="ok" />
            <Stat label="Staat stil" value={overview.totals.stalled} tone="warn" />
            <Stat label="Factuur te laat" value={overview.totals.invoicesDue} tone="bad" />
            <Stat label="Meeting regelen" value={overview.totals.meetingsToPlan} tone="warn" />
          </div>
        </div>

        <div className="mt-4 flex flex-wrap gap-2 border-t border-gray-100 pt-4 text-[11px]">
          <Pill
            tone={overview.totals.callsToday > 0 ? 'warn' : 'muted'}
            text={`${overview.totals.callsToday} klant(en) vandaag bellen voor een meeting`}
          />
          <Pill
            tone={overview.totals.paymentsOverdue > 0 ? 'bad' : 'muted'}
            text={`${overview.totals.paymentsOverdue} factuur/facturen over de betaaltermijn`}
          />
          <Pill
            tone="muted"
            text={`Openstaand: ${formatEuroCents(overview.totals.openInvoiceCents)}`}
          />
        </div>
      </section>

      {/* Filters */}
      <section className="space-y-3">
        <div className="flex flex-wrap gap-1.5">
          {(Object.keys(FOCUS_LABELS) as Focus[]).map((key) => (
            <button
              key={key}
              type="button"
              onClick={() => setFocus(key)}
              className={`rounded-full px-3.5 py-1.5 text-[11px] font-semibold transition-colors ${
                focus === key
                  ? 'bg-gray-900 text-white'
                  : 'border border-gray-200 bg-white text-gray-600 hover:bg-gray-50'
              }`}
            >
              {FOCUS_LABELS[key]}
            </button>
          ))}
        </div>

        <div className="flex flex-wrap items-center gap-1.5">
          <span className="mr-1 text-[10px] font-semibold uppercase tracking-wide text-gray-400">
            Klanten
          </span>
          {overview.clients.map((client) => {
            const active = selectedClients.includes(client.id)
            return (
              <button
                key={client.id}
                type="button"
                onClick={() => toggleClient(client.id)}
                aria-pressed={active}
                className={`rounded-full px-3 py-1 text-[11px] font-medium transition-colors ${
                  active
                    ? 'bg-indigo-600 text-white'
                    : 'border border-gray-200 bg-white text-gray-600 hover:bg-gray-50'
                }`}
              >
                {client.companyName}
              </button>
            )
          })}
          {selectedClients.length > 0 && (
            <button
              type="button"
              onClick={() => setSelectedClients([])}
              className="ml-1 text-[11px] font-semibold text-gray-400 hover:text-gray-900"
            >
              wis selectie
            </button>
          )}
        </div>
      </section>

      {/* Maandnavigatie */}
      <div className="flex items-center justify-between gap-3">
        <h2 className="text-sm font-semibold text-gray-900">
          {MONTH_NAMES[(month ?? 1) - 1]} {year}
        </h2>
        <div className="flex items-center gap-1.5">
          <MonthLink month={prevMonth} label="← vorige" />
          <MonthLink month={overview.today.slice(0, 7)} label="vandaag" />
          <MonthLink month={nextMonth} label="volgende →" />
        </div>
      </div>

      {/* Kalender + dagpaneel */}
      <div className="grid gap-4 lg:grid-cols-[minmax(0,1fr)_340px]">
        <MonthGrid cells={cells} selected={selectedDate} onSelect={setSelectedDate} />
        <div className="lg:sticky lg:top-20 lg:self-start">
          <DayPanel
            date={selectedDate}
            today={overview.today}
            clients={clients}
            entries={entriesForSelected}
          />
        </div>
      </div>
    </div>
  )
}

function MonthLink({ month, label }: { month: string; label: string }) {
  return (
    <Link
      href={`/admin/loopgang?maand=${month}`}
      className="rounded-lg border border-gray-200 bg-white px-3 py-1.5 text-[11px] font-semibold text-gray-600 transition-colors hover:border-gray-300 hover:bg-gray-50"
    >
      {label}
    </Link>
  )
}

function Stat({
  label,
  value,
  tone,
}: {
  label: string
  value: number
  tone: 'ok' | 'warn' | 'bad'
}) {
  const color =
    tone === 'ok' ? 'text-emerald-600' : tone === 'warn' ? 'text-amber-600' : 'text-rose-600'
  return (
    <div>
      <div className="text-[10px] font-semibold uppercase tracking-wide text-gray-400">{label}</div>
      <div className={`text-lg font-semibold tabular-nums ${value === 0 ? 'text-gray-300' : color}`}>
        {value}
      </div>
    </div>
  )
}

function Pill({ text, tone }: { text: string; tone: 'muted' | 'warn' | 'bad' }) {
  const styles =
    tone === 'bad'
      ? 'border-rose-200 bg-rose-50 text-rose-900'
      : tone === 'warn'
        ? 'border-amber-200 bg-amber-50 text-amber-900'
        : 'border-gray-200 bg-gray-50 text-gray-600'
  return <span className={`rounded-full border px-3 py-1 font-medium ${styles}`}>{text}</span>
}

/**
 * De vakjes van het maandraster, inclusief de dagen van de vorige en volgende
 * maand die de eerste en laatste week aanvullen. De week begint op maandag.
 */
function buildCells(
  month: string,
  today: string,
  clients: LoopgangOverview['clients']
): DayCell[] {
  const [year, monthNumber] = month.split('-').map(Number)
  const first = new Date(Date.UTC(year, monthNumber - 1, 1))
  const daysInMonth = new Date(Date.UTC(year, monthNumber, 0)).getUTCDate()

  // getUTCDay: 0 = zondag. Wij beginnen op maandag, dus zondag schuift naar 6.
  const offset = (first.getUTCDay() + 6) % 7
  const gridStart = addDays(`${month}-01`, -offset)
  const cellCount = Math.ceil((offset + daysInMonth) / 7) * 7

  // Één keer alle gebeurtenissen op datum zetten, zodat elk vakje alleen nog
  // hoeft op te zoeken. De klantvolgorde is de urgentievolgorde uit de
  // datalaag; die bepaalt ook welke blokjes als eerste in een vol vakje passen.
  const byDate = new Map<string, DayEntry[]>()
  for (const client of clients) {
    for (const event of client.events) {
      const list = byDate.get(event.date)
      if (list) list.push({ client, event })
      else byDate.set(event.date, [{ client, event }])
    }
  }

  const cells: DayCell[] = []
  for (let i = 0; i < cellCount; i += 1) {
    const date = addDays(gridStart, i)
    const inMonth = date.slice(0, 7) === month
    const weekend = !isWeekday(date)

    // Alleen werkdagen tellen mee in "hoeveel klanten draaiden er": in het
    // weekend stuurt niemand, en dan zou elke zaterdag rood staan.
    const running = weekend ? 0 : clients.filter((c) => (c.sentByDate[date] ?? 0) > 0).length

    cells.push({
      date,
      dayNumber: Number(date.slice(8, 10)),
      inMonth,
      isWeekend: weekend,
      isToday: date === today,
      isFuture: date > today,
      entries: byDate.get(date) ?? [],
      running,
      total: clients.length,
    })
  }

  return cells
}

function shiftMonth(month: string, delta: number): string {
  const [y, m] = month.split('-').map(Number)
  const next = new Date(Date.UTC(y, m - 1 + delta, 1))
  return `${next.getUTCFullYear()}-${String(next.getUTCMonth() + 1).padStart(2, '0')}`
}

function formatDayLong(iso: string): string {
  const [y, m, d] = iso.split('-').map(Number)
  if (!y || !m || !d) return iso
  const date = new Date(Date.UTC(y, m - 1, d))
  return `${WEEKDAY_NAMES[date.getUTCDay()]} ${d} ${MONTH_NAMES[m - 1]} ${y}`
}
