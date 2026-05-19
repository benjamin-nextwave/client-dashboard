'use client'

import { useEffect, useState, useTransition } from 'react'
import { useRouter } from 'next/navigation'
import type { CalendarItem } from '@/lib/data/controle-kalender'
import { toggleTaskCompleted, deleteTask, deleteCalendarNote } from '../actions'

interface DayDetailModalProps {
  open: boolean
  date: string | null
  items: CalendarItem[]
  showClient: boolean
  onClose: () => void
  onPlan: (date: string) => void
}

const MONTHS_NL_LONG = [
  'januari', 'februari', 'maart', 'april', 'mei', 'juni',
  'juli', 'augustus', 'september', 'oktober', 'november', 'december',
]

const WEEKDAYS_NL_LONG = [
  'zondag', 'maandag', 'dinsdag', 'woensdag', 'donderdag', 'vrijdag', 'zaterdag',
]

export function DayDetailModal({
  open,
  date,
  items,
  showClient,
  onClose,
  onPlan,
}: DayDetailModalProps) {
  const router = useRouter()
  const [pendingId, setPendingId] = useState<string | null>(null)
  const [, startTransition] = useTransition()

  useEffect(() => {
    if (!open) return
    function handleEscape(e: KeyboardEvent) {
      if (e.key === 'Escape') onClose()
    }
    window.addEventListener('keydown', handleEscape)
    return () => window.removeEventListener('keydown', handleEscape)
  }, [open, onClose])

  if (!open || !date) return null

  const dateLabel = formatDayLabel(date)

  const runWithRefresh = (id: string, fn: () => Promise<{ error?: string }>) => {
    setPendingId(id)
    startTransition(async () => {
      const res = await fn()
      setPendingId(null)
      if (res.error) {
        alert(res.error)
        return
      }
      router.refresh()
    })
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-gray-900/40 p-4 backdrop-blur-sm">
      <div className="w-full max-w-lg overflow-hidden rounded-3xl bg-white shadow-2xl">
        <div className="bg-gradient-to-br from-pink-500 via-fuchsia-500 to-violet-600 px-6 py-4 text-white">
          <div className="flex items-start justify-between">
            <div>
              <div className="text-xs font-semibold uppercase tracking-wider opacity-80">
                {WEEKDAYS_NL_LONG[new Date(date + 'T00:00:00Z').getUTCDay()]}
              </div>
              <div className="text-2xl font-bold tracking-tight">{dateLabel}</div>
            </div>
            <button
              type="button"
              onClick={onClose}
              aria-label="Sluiten"
              className="inline-flex h-9 w-9 items-center justify-center rounded-full bg-white/15 transition-colors hover:bg-white/25"
            >
              <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" strokeWidth={2.5} stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" d="M6 18 18 6M6 6l12 12" />
              </svg>
            </button>
          </div>
        </div>

        <div className="max-h-[60vh] overflow-y-auto p-5">
          {items.length === 0 ? (
            <div className="rounded-2xl bg-gray-50 p-6 text-center text-sm text-gray-500">
              Nog niets gepland op deze dag.
            </div>
          ) : (
            <ul className="space-y-2">
              {items.map((item) => (
                <li key={item.id}>
                  <ItemCard
                    item={item}
                    showClient={showClient}
                    pending={pendingId === item.id}
                    onToggleTask={() =>
                      item.taskId &&
                      runWithRefresh(item.id, () =>
                        toggleTaskCompleted(item.taskId!, item.kind !== 'task-done')
                      )
                    }
                    onDeleteTask={() =>
                      item.taskId &&
                      runWithRefresh(item.id, () => deleteTask(item.taskId!))
                    }
                    onDeleteNote={() =>
                      item.noteId &&
                      runWithRefresh(item.id, () => deleteCalendarNote(item.noteId!))
                    }
                  />
                </li>
              ))}
            </ul>
          )}
        </div>

        <div className="flex items-center justify-end gap-2 border-t border-gray-100 bg-gray-50/50 px-5 py-3">
          <button
            type="button"
            onClick={() => onPlan(date)}
            className="inline-flex items-center gap-1.5 rounded-full bg-gradient-to-r from-pink-500 to-fuchsia-600 px-4 py-2 text-sm font-bold text-white shadow-sm transition-all hover:scale-105"
          >
            <svg className="h-3.5 w-3.5" fill="none" viewBox="0 0 24 24" strokeWidth={3} stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" d="M12 4.5v15m7.5-7.5h-15" />
            </svg>
            Plannen op deze dag
          </button>
        </div>
      </div>
    </div>
  )
}

function ItemCard({
  item,
  showClient,
  pending,
  onToggleTask,
  onDeleteTask,
  onDeleteNote,
}: {
  item: CalendarItem
  showClient: boolean
  pending: boolean
  onToggleTask: () => void
  onDeleteTask: () => void
  onDeleteNote: () => void
}) {
  const meta = getMeta(item.kind)
  return (
    <div className={`rounded-2xl border p-3 ${meta.bg} ${meta.border}`}>
      <div className="flex items-start gap-3">
        <div
          className={`mt-0.5 flex h-7 w-7 flex-shrink-0 items-center justify-center rounded-full text-white ${meta.dot}`}
        >
          {meta.icon}
        </div>
        <div className="min-w-0 flex-1">
          <div className="flex items-center gap-2">
            <span className={`text-[10px] font-bold uppercase tracking-wider ${meta.label}`}>
              {meta.title}
            </span>
            {item.taskAssignee && (
              <span className="rounded-full bg-white px-1.5 py-0.5 text-[10px] font-bold uppercase tracking-wider text-gray-600 ring-1 ring-gray-200">
                {item.taskAssignee}
              </span>
            )}
          </div>
          <div className="mt-0.5 text-sm font-semibold text-gray-900">{item.title}</div>
          {item.description && (
            <div className="mt-0.5 text-xs text-gray-600">{item.description}</div>
          )}
          {showClient && (
            <div className="mt-1.5 inline-flex items-center gap-1.5 text-[11px] font-medium text-gray-500">
              <span
                className="inline-block h-2 w-2 rounded-full"
                style={{ background: item.clientColor ?? '#a855f7' }}
              />
              {item.clientName}
            </div>
          )}
        </div>
        <div className="flex flex-col gap-1">
          {(item.kind === 'task-open' || item.kind === 'task-done') && (
            <>
              <button
                type="button"
                disabled={pending}
                onClick={onToggleTask}
                className="inline-flex h-7 w-7 items-center justify-center rounded-full bg-white text-gray-500 ring-1 ring-gray-200 transition-colors hover:bg-emerald-50 hover:text-emerald-600 disabled:opacity-40"
                aria-label={item.kind === 'task-done' ? 'Markeer open' : 'Markeer afgerond'}
                title={item.kind === 'task-done' ? 'Markeer open' : 'Markeer afgerond'}
              >
                {item.kind === 'task-done' ? (
                  <svg className="h-3.5 w-3.5" fill="none" viewBox="0 0 24 24" strokeWidth={2.5} stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" d="M9 14.25 16.5 21.75M9 14.25l5.46-5.46 4.54-7.54-12 12Z" />
                  </svg>
                ) : (
                  <svg className="h-3.5 w-3.5" fill="none" viewBox="0 0 24 24" strokeWidth={3} stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" d="m4.5 12.75 6 6 9-13.5" />
                  </svg>
                )}
              </button>
              <button
                type="button"
                disabled={pending}
                onClick={onDeleteTask}
                className="inline-flex h-7 w-7 items-center justify-center rounded-full bg-white text-gray-400 ring-1 ring-gray-200 transition-colors hover:bg-rose-50 hover:text-rose-600 disabled:opacity-40"
                aria-label="Verwijder taak"
              >
                <svg className="h-3.5 w-3.5" fill="none" viewBox="0 0 24 24" strokeWidth={2.5} stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" d="M14.74 9l-.346 9m-4.788 0L9.26 9m9.968-3.21c.342.052.682.107 1.022.166m-1.022-.165L18.16 19.673a2.25 2.25 0 0 1-2.244 2.077H8.084a2.25 2.25 0 0 1-2.244-2.077L4.772 5.79m14.456 0a48.108 48.108 0 0 0-3.478-.397m-12 .562c.34-.059.68-.114 1.022-.165m0 0a48.11 48.11 0 0 1 3.478-.397m7.5 0v-.916c0-1.18-.91-2.164-2.09-2.201a51.964 51.964 0 0 0-3.32 0c-1.18.037-2.09 1.022-2.09 2.201v.916m7.5 0a48.667 48.667 0 0 0-7.5 0" />
                </svg>
              </button>
            </>
          )}
          {item.kind === 'note' && (
            <button
              type="button"
              disabled={pending}
              onClick={onDeleteNote}
              className="inline-flex h-7 w-7 items-center justify-center rounded-full bg-white text-gray-400 ring-1 ring-gray-200 transition-colors hover:bg-rose-50 hover:text-rose-600 disabled:opacity-40"
              aria-label="Verwijder notitie"
            >
              <svg className="h-3.5 w-3.5" fill="none" viewBox="0 0 24 24" strokeWidth={2.5} stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" d="M14.74 9l-.346 9m-4.788 0L9.26 9m9.968-3.21c.342.052.682.107 1.022.166m-1.022-.165L18.16 19.673a2.25 2.25 0 0 1-2.244 2.077H8.084a2.25 2.25 0 0 1-2.244-2.077L4.772 5.79m14.456 0a48.108 48.108 0 0 0-3.478-.397m-12 .562c.34-.059.68-.114 1.022-.165m0 0a48.11 48.11 0 0 1 3.478-.397m7.5 0v-.916c0-1.18-.91-2.164-2.09-2.201a51.964 51.964 0 0 0-3.32 0c-1.18.037-2.09 1.022-2.09 2.201v.916m7.5 0a48.667 48.667 0 0 0-7.5 0" />
              </svg>
            </button>
          )}
        </div>
      </div>
    </div>
  )
}

function getMeta(kind: CalendarItem['kind']): {
  title: string
  bg: string
  border: string
  dot: string
  label: string
  icon: React.ReactNode
} {
  switch (kind) {
    case 'task-open':
      return {
        title: 'Open taak',
        bg: 'bg-rose-50/60',
        border: 'border-rose-200',
        dot: 'bg-rose-500',
        label: 'text-rose-700',
        icon: <Icon path="M12 9v3.75m-9.303 3.376c-.866 1.5.217 3.374 1.948 3.374h14.71c1.732 0 2.814-1.874 1.948-3.374L13.949 3.378c-.866-1.5-3.032-1.5-3.898 0L2.697 16.126ZM12 15.75h.007v.008H12v-.008Z" />,
      }
    case 'task-done':
      return {
        title: 'Afgerond',
        bg: 'bg-emerald-50/60',
        border: 'border-emerald-200',
        dot: 'bg-emerald-500',
        label: 'text-emerald-700',
        icon: <Icon path="m4.5 12.75 6 6 9-13.5" />,
      }
    case 'timeline':
      return {
        title: 'Overzicht-event',
        bg: 'bg-sky-50/60',
        border: 'border-sky-200',
        dot: 'bg-sky-500',
        label: 'text-sky-700',
        icon: <Icon path="M12 6v6h4.5m4.5 0a9 9 0 1 1-18 0 9 9 0 0 1 18 0Z" />,
      }
    case 'note':
      return {
        title: 'Notitie',
        bg: 'bg-amber-50/60',
        border: 'border-amber-200',
        dot: 'bg-amber-500',
        label: 'text-amber-700',
        icon: <Icon path="M16.862 4.487l1.687-1.688a1.875 1.875 0 1 1 2.652 2.652L10.582 16.07a4.5 4.5 0 0 1-1.897 1.13L6 18l.8-2.685a4.5 4.5 0 0 1 1.13-1.897l8.932-8.931Zm0 0L19.5 7.125M18 14v4.75A2.25 2.25 0 0 1 15.75 21H5.25A2.25 2.25 0 0 1 3 18.75V8.25A2.25 2.25 0 0 1 5.25 6H10" />,
      }
  }
}

function Icon({ path }: { path: string }) {
  return (
    <svg className="h-3.5 w-3.5" fill="none" viewBox="0 0 24 24" strokeWidth={2.5} stroke="currentColor">
      <path strokeLinecap="round" strokeLinejoin="round" d={path} />
    </svg>
  )
}

function formatDayLabel(iso: string): string {
  const d = new Date(iso + 'T00:00:00Z')
  if (Number.isNaN(d.getTime())) return iso
  return `${d.getUTCDate()} ${MONTHS_NL_LONG[d.getUTCMonth()]} ${d.getUTCFullYear()}`
}
