'use client'

import { useMemo, useState, useTransition } from 'react'
import { useRouter } from 'next/navigation'
import type { LoopgangData, LoopgangDay } from '@/lib/data/loopgang'
import { setClientCampaignsPaused, toggleInvoiceMark } from '../actions'

interface Props {
  clientId: string
  accent: string
  data: LoopgangData
  goLiveDate: string | null
}

const WEEKDAYS = ['ma', 'di', 'wo', 'do', 'vr', 'za', 'zo']
const MONTHS = [
  'januari', 'februari', 'maart', 'april', 'mei', 'juni',
  'juli', 'augustus', 'september', 'oktober', 'november', 'december',
]

export function LoopgangView({ clientId, accent, data, goLiveDate }: Props) {
  const router = useRouter()
  const [pending, startTransition] = useTransition()
  const [message, setMessage] = useState<{ kind: 'ok' | 'error'; text: string } | null>(null)
  const [selected, setSelected] = useState<string | null>(null)

  const today = data.rangeEnd
  const [cursor, setCursor] = useState(() => ({
    year: Number(today.slice(0, 4)),
    month: Number(today.slice(5, 7)),
  }))

  const dayMap = useMemo(() => {
    const map = new Map<string, LoopgangDay>()
    for (const day of data.days) map.set(day.date, day)
    return map
  }, [data.days])

  const grid = useMemo(() => buildGrid(cursor.year, cursor.month), [cursor])

  const monthDays = grid.filter((c) => c.kind === 'day')
  const liveThisMonth = monthDays.filter(
    (c) => dayMap.get(c.iso)?.state === 'live'
  ).length

  const selectedDay = selected ? dayMap.get(selected) ?? null : null
  const anyPaused = data.campaigns.some((c) => c.isPaused)

  function shiftMonth(delta: number) {
    setCursor((prev) => {
      const next = new Date(Date.UTC(prev.year, prev.month - 1 + delta, 1))
      return { year: next.getUTCFullYear(), month: next.getUTCMonth() + 1 }
    })
  }

  function runPauseAction(paused: boolean) {
    setMessage(null)
    startTransition(async () => {
      const result = await setClientCampaignsPaused(clientId, paused)
      if (result.error) {
        setMessage({ kind: 'error', text: result.error })
      } else {
        setMessage({
          kind: 'ok',
          text: paused
            ? `${result.results?.length ?? 0} campagne(s) gepauzeerd in Instantly.`
            : `${result.results?.length ?? 0} campagne(s) hervat in Instantly.`,
        })
      }
      router.refresh()
    })
  }

  function runInvoiceToggle(date: string, marked: boolean) {
    setMessage(null)
    startTransition(async () => {
      const result = await toggleInvoiceMark(clientId, date, marked)
      if (result.error) {
        setMessage({ kind: 'error', text: result.error })
      } else {
        setMessage({
          kind: 'ok',
          text: marked
            ? `Factuur gemarkeerd op ${formatDayLong(date)}.`
            : `Factuurmarkering verwijderd op ${formatDayLong(date)}.`,
        })
      }
      router.refresh()
    })
  }

  return (
    <div className="space-y-5">
      {message && (
        <div
          className={`rounded-xl border px-4 py-2.5 text-xs font-medium ${
            message.kind === 'ok'
              ? 'border-emerald-200 bg-emerald-50 text-emerald-800'
              : 'border-amber-200 bg-amber-50 text-amber-900'
          }`}
        >
          {message.text}
        </div>
      )}

      {data.analyticsError && (
        <div className="rounded-xl border border-amber-200 bg-amber-50 px-4 py-2.5 text-xs text-amber-900">
          Instantly gaf een fout bij het ophalen van de dagcijfers. De kalender kan
          onvolledig zijn. ({data.analyticsError})
        </div>
      )}

      {/* Kerncijfers */}
      <section className="grid grid-cols-2 gap-3 sm:grid-cols-4">
        <Stat
          label="Live sinds laatste pauze"
          value={
            data.daysSinceLastPause === null
              ? data.firstLiveDate
                ? `${daysSince(data.firstLiveDate, today)} dgn`
                : '—'
              : `${data.daysSinceLastPause} dgn`
          }
          hint={
            data.lastPauseAt
              ? `Laatste pauze ${formatDayLong(data.lastPauseAt.slice(0, 10))}`
              : goLiveDate
                ? `Nooit gepauzeerd · go-live ${formatDayLong(goLiveDate)}`
                : 'Nooit gepauzeerd'
          }
          accent={accent}
        />
        <Stat
          label="Verzenddagen in die periode"
          value={`${data.liveDaysSinceLastPause}`}
          hint={`${data.totalLiveDays} verzenddagen in 12 maanden`}
          accent={accent}
        />
        <Stat
          label="Sinds laatste factuur"
          value={
            data.daysSinceLastInvoice === null ? '—' : `${data.daysSinceLastInvoice} dgn`
          }
          hint={
            data.lastInvoiceDate
              ? formatDayLong(data.lastInvoiceDate)
              : 'Nog geen factuur gemarkeerd'
          }
          accent={accent}
          warn={data.daysSinceLastInvoice !== null && data.daysSinceLastInvoice >= 30}
        />
        <Stat
          label="Laatste verzending"
          value={data.lastLiveDate ? formatDayShort(data.lastLiveDate) : '—'}
          hint={
            data.firstLiveDate
              ? `Eerste verzending ${formatDayShort(data.firstLiveDate)}`
              : 'Geen verzendingen gevonden'
          }
          accent={accent}
        />
      </section>

      {/* Campagnes + pauzeknop */}
      <section className="rounded-2xl border border-gray-200 bg-white p-5 shadow-sm">
        <div className="flex flex-wrap items-start justify-between gap-4">
          <div className="min-w-0">
            <h2 className="text-sm font-semibold text-gray-900">
              Gekoppelde campagnes ({data.campaigns.length})
            </h2>
            <p className="mt-0.5 text-xs text-gray-500">
              Pauzeren raakt alle campagnes hieronder tegelijk in Instantly.
            </p>
            <div className="mt-3 flex flex-wrap gap-2">
              {data.campaigns.length === 0 && (
                <span className="text-xs italic text-gray-400">
                  Nog geen campagnes gekoppeld — voeg ze toe op de bewerken-pagina.
                </span>
              )}
              {data.campaigns.map((c) => (
                <span
                  key={c.instantlyCampaignId}
                  className={`inline-flex items-center gap-1.5 rounded-full border px-3 py-1 text-xs font-medium ${
                    c.isPaused
                      ? 'border-amber-200 bg-amber-50 text-amber-800'
                      : c.status === null
                        ? 'border-gray-200 bg-gray-50 text-gray-500'
                        : 'border-emerald-200 bg-emerald-50 text-emerald-800'
                  }`}
                  title={c.instantlyCampaignId}
                >
                  <span
                    className={`inline-block h-1.5 w-1.5 rounded-full ${
                      c.isPaused
                        ? 'bg-amber-500'
                        : c.status === null
                          ? 'bg-gray-400'
                          : 'bg-emerald-500'
                    }`}
                  />
                  {c.name}
                  <span className="text-[10px] font-normal opacity-70">{c.statusLabel}</span>
                </span>
              ))}
            </div>
          </div>

          <div className="flex shrink-0 flex-col items-end gap-2">
            <button
              type="button"
              disabled={pending || data.campaigns.length === 0}
              onClick={() => runPauseAction(!anyPaused)}
              className={`inline-flex items-center gap-2 rounded-xl px-4 py-2.5 text-xs font-semibold text-white shadow-sm transition-colors disabled:opacity-50 ${
                anyPaused
                  ? 'bg-emerald-600 hover:bg-emerald-700'
                  : 'bg-amber-600 hover:bg-amber-700'
              }`}
            >
              {anyPaused ? <PlayIcon /> : <PauseIcon />}
              {pending
                ? 'Bezig…'
                : anyPaused
                  ? 'Alle campagnes hervatten'
                  : 'Alle campagnes pauzeren'}
            </button>
            <span className="text-[10px] text-gray-400">
              Werkt alleen op de live omgeving
            </span>
          </div>
        </div>
      </section>

      {/* Kalender */}
      <section className="rounded-2xl border border-gray-200 bg-white p-5 shadow-sm">
        <div className="flex items-center justify-between gap-3">
          <div>
            <h2 className="text-sm font-semibold text-gray-900">
              {MONTHS[cursor.month - 1]} {cursor.year}
            </h2>
            <p className="text-xs text-gray-500">
              {liveThisMonth} dag{liveThisMonth === 1 ? '' : 'en'} live deze maand
            </p>
          </div>
          <div className="flex items-center gap-1">
            <NavButton label="Vorige maand" onClick={() => shiftMonth(-1)}>
              <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" strokeWidth={2} stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" d="M15.75 19.5 8.25 12l7.5-7.5" />
              </svg>
            </NavButton>
            <button
              type="button"
              onClick={() =>
                setCursor({ year: Number(today.slice(0, 4)), month: Number(today.slice(5, 7)) })
              }
              className="rounded-lg border border-gray-200 px-2.5 py-1.5 text-[11px] font-semibold text-gray-600 hover:border-gray-300 hover:text-gray-900"
            >
              Vandaag
            </button>
            <NavButton label="Volgende maand" onClick={() => shiftMonth(1)}>
              <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" strokeWidth={2} stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" d="m8.25 4.5 7.5 7.5-7.5 7.5" />
              </svg>
            </NavButton>
          </div>
        </div>

        <div className="mt-4 grid grid-cols-7 gap-1 px-1 pb-1.5 text-center text-[10px] font-bold uppercase tracking-wider text-gray-400">
          {WEEKDAYS.map((d) => (
            <div key={d}>{d}</div>
          ))}
        </div>

        <div className="grid grid-cols-7 gap-1.5">
          {grid.map((cell) => {
            if (cell.kind === 'empty') {
              return <div key={cell.key} className="aspect-square" />
            }
            const day = dayMap.get(cell.iso)
            const isToday = cell.iso === today
            const isSelected = cell.iso === selected
            const isFuture = cell.iso > today
            return (
              <button
                key={cell.key}
                type="button"
                onClick={() => setSelected(isSelected ? null : cell.iso)}
                className={`relative flex aspect-square flex-col items-center justify-center rounded-xl border text-left transition-all hover:-translate-y-0.5 ${
                  dayClasses(day, isFuture)
                } ${
                  isSelected
                    ? 'ring-2 ring-indigo-400 ring-offset-1'
                    : isToday
                      ? 'ring-2 ring-gray-900/20'
                      : ''
                }`}
                title={dayTitle(cell.iso, day)}
              >
                <span className="text-xs font-semibold tabular-nums">{cell.day}</span>
                {day && day.sent > 0 && (
                  <span className="text-[9px] font-medium tabular-nums opacity-70">
                    {day.sent}
                  </span>
                )}
                {day?.invoiced && (
                  <span
                    className="absolute right-1 top-1 inline-block h-1.5 w-1.5 rounded-full bg-indigo-500"
                    aria-hidden
                  />
                )}
              </button>
            )
          })}
        </div>

        <div className="mt-4 flex flex-wrap items-center gap-x-4 gap-y-2 border-t border-gray-100 pt-3 text-[11px] text-gray-500">
          <Legend className="border-emerald-200 bg-emerald-100" label="Live (mails verstuurd)" />
          <Legend className="border-amber-200 bg-amber-100" label="Gepauzeerd" />
          <Legend className="border-gray-200 bg-gray-50" label="Geen verzending" />
          <span className="inline-flex items-center gap-1.5">
            <span className="inline-block h-1.5 w-1.5 rounded-full bg-indigo-500" />
            Factuur verstuurd
          </span>
        </div>
      </section>

      {/* Dagdetail */}
      {selected && (
        <section className="rounded-2xl border border-gray-200 bg-white p-5 shadow-sm">
          <div className="flex flex-wrap items-center justify-between gap-3">
            <div>
              <h2 className="text-sm font-semibold text-gray-900">
                {formatDayLong(selected)}
              </h2>
              <p className="mt-0.5 text-xs text-gray-500">
                {selectedDay
                  ? selectedDay.state === 'live'
                    ? `Live — ${selectedDay.sent} mails verstuurd door ${selectedDay.activeCampaigns} campagne(s).`
                    : selectedDay.state === 'paused'
                      ? 'Gepauzeerd — campagnes stonden die dag stil.'
                      : 'Geen verzending die dag.'
                  : 'Buiten het venster van 12 maanden — geen cijfers beschikbaar.'}
              </p>
            </div>
            <button
              type="button"
              disabled={pending}
              onClick={() => runInvoiceToggle(selected, !selectedDay?.invoiced)}
              className={`inline-flex items-center gap-2 rounded-xl px-4 py-2.5 text-xs font-semibold shadow-sm transition-colors disabled:opacity-50 ${
                selectedDay?.invoiced
                  ? 'border border-indigo-200 bg-indigo-50 text-indigo-700 hover:bg-indigo-100'
                  : 'bg-indigo-600 text-white hover:bg-indigo-700'
              }`}
            >
              {selectedDay?.invoiced ? <CheckIcon /> : <EuroIcon />}
              {selectedDay?.invoiced ? 'Factuurmarkering weghalen' : 'Factuur verstuurd'}
            </button>
          </div>
        </section>
      )}

      {/* Geschiedenis */}
      <section className="grid gap-4 md:grid-cols-2">
        <HistoryCard
          title="Pauzes & hervattingen"
          empty="Nog nooit gepauzeerd via het dashboard."
          count={data.pauseEvents.length}
        >
          {data.pauseEvents.slice(0, 8).map((e) => (
            <li key={e.id} className="flex items-start gap-2.5 py-1.5">
              <span
                className={`mt-1 inline-block h-1.5 w-1.5 shrink-0 rounded-full ${
                  e.action === 'pause' ? 'bg-amber-500' : 'bg-emerald-500'
                }`}
              />
              <div className="min-w-0">
                <div className="text-xs font-medium text-gray-800">
                  {e.action === 'pause' ? 'Gepauzeerd' : 'Hervat'} ·{' '}
                  {formatDayLong(e.occurredAt.slice(0, 10))}
                </div>
                <div className="text-[11px] text-gray-500">
                  {e.campaigns.length} campagne(s)
                  {e.campaigns.some((c) => !c.ok) && ' — deels mislukt'}
                </div>
              </div>
            </li>
          ))}
        </HistoryCard>

        <HistoryCard
          title="Verstuurde facturen"
          empty="Nog geen facturen gemarkeerd."
          count={data.invoiceMarks.length}
        >
          {data.invoiceMarks.slice(0, 8).map((m) => (
            <li key={m.id} className="flex items-start gap-2.5 py-1.5">
              <span className="mt-1 inline-block h-1.5 w-1.5 shrink-0 rounded-full bg-indigo-500" />
              <div className="text-xs font-medium text-gray-800">
                {formatDayLong(m.invoiceDate)}
              </div>
            </li>
          ))}
        </HistoryCard>
      </section>
    </div>
  )
}

function dayClasses(day: LoopgangDay | undefined, isFuture: boolean): string {
  if (isFuture) return 'border-dashed border-gray-200 bg-white text-gray-300'
  if (!day) return 'border-gray-100 bg-white text-gray-300'
  if (day.state === 'live') return 'border-emerald-200 bg-emerald-100 text-emerald-900'
  if (day.state === 'paused') return 'border-amber-200 bg-amber-100 text-amber-900'
  return 'border-gray-200 bg-gray-50 text-gray-400'
}

function dayTitle(iso: string, day: LoopgangDay | undefined): string {
  if (!day) return `${formatDayLong(iso)} — geen gegevens`
  if (day.state === 'live') return `${formatDayLong(iso)} — ${day.sent} mails verstuurd`
  if (day.state === 'paused') return `${formatDayLong(iso)} — gepauzeerd`
  return `${formatDayLong(iso)} — geen verzending`
}

function Stat({
  label,
  value,
  hint,
  accent,
  warn,
}: {
  label: string
  value: string
  hint: string
  accent: string
  warn?: boolean
}) {
  return (
    <div className="rounded-2xl border border-gray-200 bg-white p-4 shadow-sm">
      <div className="text-[10px] font-semibold uppercase tracking-wide text-gray-400">
        {label}
      </div>
      <div
        className={`mt-1 text-xl font-semibold tabular-nums ${
          warn ? 'text-amber-600' : 'text-gray-900'
        }`}
        style={warn ? undefined : { color: accent }}
      >
        {value}
      </div>
      <div className="mt-0.5 text-[11px] leading-snug text-gray-500">{hint}</div>
    </div>
  )
}

function HistoryCard({
  title,
  empty,
  count,
  children,
}: {
  title: string
  empty: string
  count: number
  children: React.ReactNode
}) {
  return (
    <div className="rounded-2xl border border-gray-200 bg-white p-5 shadow-sm">
      <h2 className="text-sm font-semibold text-gray-900">{title}</h2>
      {count > 0 ? (
        <ul className="mt-2 divide-y divide-gray-100">{children}</ul>
      ) : (
        <p className="mt-2 text-xs italic text-gray-400">{empty}</p>
      )}
    </div>
  )
}

function Legend({ className, label }: { className: string; label: string }) {
  return (
    <span className="inline-flex items-center gap-1.5">
      <span className={`inline-block h-3 w-3 rounded border ${className}`} />
      {label}
    </span>
  )
}

function NavButton({
  label,
  onClick,
  children,
}: {
  label: string
  onClick: () => void
  children: React.ReactNode
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      aria-label={label}
      title={label}
      className="rounded-lg border border-gray-200 p-1.5 text-gray-500 hover:border-gray-300 hover:text-gray-900"
    >
      {children}
    </button>
  )
}

function PauseIcon() {
  return (
    <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" strokeWidth={2} stroke="currentColor">
      <path strokeLinecap="round" strokeLinejoin="round" d="M15.75 5.25v13.5m-7.5-13.5v13.5" />
    </svg>
  )
}

function PlayIcon() {
  return (
    <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" strokeWidth={2} stroke="currentColor">
      <path strokeLinecap="round" strokeLinejoin="round" d="M5.25 5.653c0-.856.917-1.398 1.667-.986l11.54 6.347a1.125 1.125 0 0 1 0 1.972l-11.54 6.347a1.125 1.125 0 0 1-1.667-.986V5.653Z" />
    </svg>
  )
}

function EuroIcon() {
  return (
    <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" strokeWidth={2} stroke="currentColor">
      <path strokeLinecap="round" strokeLinejoin="round" d="M14.25 7.5a4.5 4.5 0 0 0-4.243 3H14.25m-4.243 0a4.5 4.5 0 0 0 0 3m0-3H6m4.007 3H6m4.007 0a4.5 4.5 0 0 0 4.243 3M21 12a9 9 0 1 1-18 0 9 9 0 0 1 18 0Z" />
    </svg>
  )
}

function CheckIcon() {
  return (
    <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" strokeWidth={2} stroke="currentColor">
      <path strokeLinecap="round" strokeLinejoin="round" d="m4.5 12.75 6 6 9-13.5" />
    </svg>
  )
}

interface GridCell {
  key: string
  kind: 'empty' | 'day'
  day: number
  iso: string
}

function buildGrid(year: number, month: number): GridCell[] {
  // JS geeft 0=zondag; de kalender begint op maandag.
  const firstWeekday = new Date(Date.UTC(year, month - 1, 1)).getUTCDay()
  const startOffset = (firstWeekday + 6) % 7
  const lastDay = new Date(Date.UTC(year, month, 0)).getUTCDate()

  const cells: GridCell[] = []
  for (let i = 0; i < startOffset; i++) {
    cells.push({ key: `pre-${i}`, kind: 'empty', day: 0, iso: '' })
  }
  for (let d = 1; d <= lastDay; d++) {
    cells.push({
      key: `day-${d}`,
      kind: 'day',
      day: d,
      iso: `${year}-${String(month).padStart(2, '0')}-${String(d).padStart(2, '0')}`,
    })
  }
  while (cells.length % 7 !== 0) {
    cells.push({ key: `post-${cells.length}`, kind: 'empty', day: 0, iso: '' })
  }
  return cells
}

function formatDayLong(iso: string): string {
  const [y, m, d] = iso.split('-').map(Number)
  return `${d} ${MONTHS[m - 1]} ${y}`
}

function formatDayShort(iso: string): string {
  const [, m, d] = iso.split('-').map(Number)
  return `${d} ${MONTHS[m - 1].slice(0, 3)}`
}

function daysSince(fromIso: string, toIso: string): number {
  const from = Date.parse(`${fromIso}T00:00:00Z`)
  const to = Date.parse(`${toIso}T00:00:00Z`)
  return Math.round((to - from) / 86_400_000)
}
