'use client'

import { useMemo } from 'react'
import type { CalendarItem, CalendarLiveWindow } from '@/lib/data/controle-kalender'

interface MonthGridProps {
  year: number
  month: number
  items: CalendarItem[]
  liveWindow: CalendarLiveWindow | null
  onClickDay: (date: string) => void
}

const WEEKDAYS_NL = ['ma', 'di', 'wo', 'do', 'vr', 'za', 'zo']

interface DayBucket {
  taskOpen: number
  taskDone: number
  timeline: number
  note: number
}

export function MonthGrid({ year, month, items, liveWindow, onClickDay }: MonthGridProps) {
  const grid = useMemo(() => buildGrid(year, month), [year, month])

  const buckets = useMemo(() => {
    const map = new Map<string, DayBucket>()
    for (const it of items) {
      const b = map.get(it.date) ?? { taskOpen: 0, taskDone: 0, timeline: 0, note: 0 }
      if (it.kind === 'task-open') b.taskOpen += 1
      else if (it.kind === 'task-done') b.taskDone += 1
      else if (it.kind === 'timeline') b.timeline += 1
      else if (it.kind === 'note') b.note += 1
      map.set(it.date, b)
    }
    return map
  }, [items])

  const todayIso = useMemo(() => {
    const d = new Date()
    return formatIso(d.getFullYear(), d.getMonth() + 1, d.getDate())
  }, [])

  return (
    <div className="mt-4">
      <div className="grid grid-cols-7 gap-1 px-1 pb-2 text-center text-[10px] font-bold uppercase tracking-wider text-fuchsia-700/70">
        {WEEKDAYS_NL.map((d) => (
          <div key={d}>{d}</div>
        ))}
      </div>
      <div className="grid grid-cols-7 gap-1.5">
        {grid.map((cell) => {
          if (cell.kind === 'empty') {
            return <div key={cell.key} className="aspect-square rounded-2xl" />
          }
          const inLive = isInLiveWindow(cell.iso, liveWindow)
          const bucket = buckets.get(cell.iso)
          const isToday = cell.iso === todayIso
          const hasAny = bucket && (bucket.taskOpen + bucket.taskDone + bucket.timeline + bucket.note) > 0
          return (
            <button
              key={cell.key}
              type="button"
              onClick={() => onClickDay(cell.iso)}
              className={`group relative flex aspect-square flex-col rounded-2xl border p-1.5 text-left transition-all ${
                inLive
                  ? 'bg-white hover:-translate-y-0.5 hover:shadow-md'
                  : 'bg-gray-50/80 hover:bg-gray-100'
              } ${
                isToday
                  ? 'border-fuchsia-400 ring-2 ring-fuchsia-200'
                  : 'border-gray-100'
              }`}
            >
              <div className="flex items-start justify-between gap-1">
                <span
                  className={`flex h-6 w-6 items-center justify-center rounded-full text-xs font-bold ${
                    isToday
                      ? 'bg-fuchsia-500 text-white'
                      : inLive
                        ? 'text-gray-700'
                        : 'text-gray-400'
                  }`}
                >
                  {cell.day}
                </span>
              </div>
              {hasAny && bucket && (
                <div className="mt-auto flex flex-wrap items-center gap-1">
                  {bucket.taskOpen > 0 && (
                    <CountDot color="bg-rose-500" count={bucket.taskOpen} />
                  )}
                  {bucket.taskDone > 0 && (
                    <CountDot color="bg-emerald-500" count={bucket.taskDone} />
                  )}
                  {bucket.timeline > 0 && (
                    <CountDot color="bg-sky-500" count={bucket.timeline} />
                  )}
                  {bucket.note > 0 && (
                    <CountDot color="bg-amber-500" count={bucket.note} />
                  )}
                </div>
              )}
            </button>
          )
        })}
      </div>
    </div>
  )
}

function CountDot({ color, count }: { color: string; count: number }) {
  if (count <= 1) {
    return <span className={`inline-block h-2.5 w-2.5 rounded-full ${color}`} aria-hidden />
  }
  return (
    <span
      className={`inline-flex h-4 min-w-4 items-center justify-center rounded-full px-1 text-[9px] font-bold leading-none text-white ${color}`}
    >
      {count}
    </span>
  )
}

interface GridCell {
  key: string
  kind: 'empty' | 'day'
  day: number
  iso: string
}

function buildGrid(year: number, month: number): GridCell[] {
  // 0=Sun, 1=Mon, ... in JS. Convert to ma-first (0=Mon, 6=Sun).
  const firstWeekday = new Date(Date.UTC(year, month - 1, 1)).getUTCDay()
  const startOffset = (firstWeekday + 6) % 7

  const lastDay = new Date(Date.UTC(year, month, 0)).getUTCDate()

  const cells: GridCell[] = []
  for (let i = 0; i < startOffset; i++) {
    cells.push({ key: `empty-pre-${i}`, kind: 'empty', day: 0, iso: '' })
  }
  for (let d = 1; d <= lastDay; d++) {
    cells.push({
      key: `day-${d}`,
      kind: 'day',
      day: d,
      iso: formatIso(year, month, d),
    })
  }
  // Pad to a multiple of 7 so the last row is complete.
  while (cells.length % 7 !== 0) {
    cells.push({ key: `empty-post-${cells.length}`, kind: 'empty', day: 0, iso: '' })
  }
  return cells
}

function formatIso(year: number, month: number, day: number): string {
  const y = String(year).padStart(4, '0')
  const m = String(month).padStart(2, '0')
  const d = String(day).padStart(2, '0')
  return `${y}-${m}-${d}`
}

function isInLiveWindow(iso: string, window: CalendarLiveWindow | null): boolean {
  if (!window) return true // no client selected → don't grey anything
  if (!window.startDate && !window.endDate) return true
  if (window.startDate && iso < window.startDate) return false
  if (window.endDate && iso > window.endDate) return false
  return true
}
