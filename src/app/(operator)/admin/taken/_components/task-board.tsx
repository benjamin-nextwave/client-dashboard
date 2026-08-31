'use client'

import { useState, useTransition, useMemo } from 'react'
import { useRouter } from 'next/navigation'
import {
  TASK_PERSON_LABEL,
  type ControleTaskRow,
  type ManualTaskClientOption,
  type TaskPerson,
} from '@/lib/data/controle'
import { toggleTaskCompleted, deleteTask } from '../../controle/actions'
import { useTasksRealtime } from '@/hooks/use-tasks-realtime'
import { NewTaskModal } from './new-task-modal'

function formatTime(iso: string): string {
  return new Date(iso).toLocaleTimeString('nl-NL', { hour: '2-digit', minute: '2-digit' })
}

function formatDate(iso: string): string {
  return new Date(iso).toLocaleDateString('nl-NL', { day: 'numeric', month: 'short', year: 'numeric' })
}

function formatPlanDate(iso: string): string {
  return new Date(iso).toLocaleDateString('nl-NL', { weekday: 'short', day: 'numeric', month: 'long' })
}

function todayIsoLocal(): string {
  const d = new Date()
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`
}

function isFutureTask(iso: string): boolean {
  const d = new Date(iso)
  const key = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`
  return key > todayIsoLocal()
}

/** Vaste kleur per persoon, zodat je in één lijst ziet van wie een taak is. */
const PERSON_CHIP: Record<TaskPerson, string> = {
  benjamin: 'bg-indigo-50 text-indigo-700 ring-indigo-200',
  merlijn: 'bg-teal-50 text-teal-700 ring-teal-200',
  kix: 'bg-fuchsia-50 text-fuchsia-700 ring-fuchsia-200',
}

interface Props {
  tasks: ControleTaskRow[]
  clientOptions: ManualTaskClientOption[]
}

export function TaskBoard({ tasks, clientOptions }: Props) {
  const router = useRouter()
  // Zonder persona: elke wijziging aan de tabel — ook vanuit een extern
  // project — ververst deze lijst.
  useTasksRealtime()

  const [filter, setFilter] = useState<'all' | 'open' | 'done'>('open')
  const [person, setPerson] = useState<TaskPerson | 'iedereen'>('iedereen')
  const [search, setSearch] = useState('')
  const [hideFuture, setHideFuture] = useState(true)
  const [, startTransition] = useTransition()
  const [pendingIds, setPendingIds] = useState<Set<string>>(new Set())
  const [addOpen, setAddOpen] = useState(false)

  const hiddenFutureCount = useMemo(
    () => tasks.filter((t) => !t.isCompleted && isFutureTask(t.createdAt)).length,
    [tasks]
  )

  const filtered = useMemo(() => {
    let result = tasks
    if (filter === 'open') result = result.filter((t) => !t.isCompleted)
    if (filter === 'done') result = result.filter((t) => t.isCompleted)
    if (person !== 'iedereen') result = result.filter((t) => t.assignee === person)
    if (hideFuture) result = result.filter((t) => !isFutureTask(t.createdAt))
    if (search.trim()) {
      const q = search.toLowerCase()
      result = result.filter(
        (t) =>
          t.companyName.toLowerCase().includes(q) ||
          t.description.toLowerCase().includes(q) ||
          (t.details ?? '').toLowerCase().includes(q)
      )
    }
    return result
  }, [tasks, filter, person, search, hideFuture])

  const grouped = useMemo(() => {
    const groups = new Map<string, { companyName: string; tasks: ControleTaskRow[] }>()
    for (const task of filtered) {
      const existing = groups.get(task.clientId)
      if (existing) existing.tasks.push(task)
      else groups.set(task.clientId, { companyName: task.companyName, tasks: [task] })
    }
    return Array.from(groups.entries())
  }, [filtered])

  const openCount = tasks.filter((t) => !t.isCompleted).length

  const handleToggle = (taskId: string, currentlyCompleted: boolean) => {
    setPendingIds((prev) => new Set(prev).add(taskId))
    startTransition(async () => {
      await toggleTaskCompleted(taskId, !currentlyCompleted)
      setPendingIds((prev) => {
        const next = new Set(prev)
        next.delete(taskId)
        return next
      })
      router.refresh()
    })
  }

  const handleDelete = (taskId: string) => {
    if (!confirm('Deze taak verwijderen?')) return
    setPendingIds((prev) => new Set(prev).add(taskId))
    startTransition(async () => {
      await deleteTask(taskId)
      router.refresh()
    })
  }

  return (
    <div className="space-y-5">
      {/* Kop met de knop die er niet omheen te kijken valt */}
      <div className="flex flex-wrap items-center justify-between gap-4 rounded-2xl border border-gray-200 bg-white px-6 py-5 shadow-sm">
        <div>
          <h1 className="text-2xl font-semibold tracking-tight text-gray-900">Taken</h1>
          <p className="mt-0.5 text-sm text-gray-500">
            {openCount === 0
              ? 'Alles afgerond.'
              : `${openCount} open ${openCount === 1 ? 'taak' : 'taken'} van iedereen bij elkaar.`}
          </p>
        </div>
        <button
          type="button"
          onClick={() => setAddOpen(true)}
          className="inline-flex items-center gap-2 rounded-2xl bg-gradient-to-br from-indigo-600 to-violet-600 px-6 py-3.5 text-sm font-bold text-white shadow-lg shadow-indigo-500/30 transition-all hover:-translate-y-0.5 hover:shadow-xl hover:shadow-indigo-500/40"
        >
          <svg className="h-5 w-5" fill="none" viewBox="0 0 24 24" strokeWidth={2.5} stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" d="M12 4.5v15m7.5-7.5h-15" />
          </svg>
          Nieuwe taak
        </button>
      </div>

      {/* Filters */}
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div className="relative max-w-md flex-1">
          <svg
            className="pointer-events-none absolute left-4 top-1/2 h-4 w-4 -translate-y-1/2 text-gray-400"
            fill="none" viewBox="0 0 24 24" strokeWidth={2} stroke="currentColor"
          >
            <path strokeLinecap="round" strokeLinejoin="round" d="m21 21-5.197-5.197m0 0A7.5 7.5 0 1 0 5.196 5.196a7.5 7.5 0 0 0 10.607 10.607Z" />
          </svg>
          <input
            type="text"
            placeholder="Zoek taak, klant of beschrijving..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="w-full rounded-xl border border-gray-200 bg-white py-3 pl-11 pr-4 text-sm text-gray-900 placeholder:text-gray-400 shadow-sm transition-all focus:border-indigo-400 focus:outline-none focus:ring-4 focus:ring-indigo-100"
          />
        </div>

        <div className="flex flex-wrap items-center gap-2">
          <div className="inline-flex rounded-xl border border-gray-200 bg-gray-50 p-1">
            {(['iedereen', 'benjamin', 'merlijn', 'kix'] as const).map((p) => (
              <button
                key={p}
                type="button"
                onClick={() => setPerson(p)}
                className={`rounded-lg px-3 py-2 text-xs font-semibold transition-all ${
                  person === p ? 'bg-white text-gray-900 shadow-sm' : 'text-gray-500 hover:text-gray-900'
                }`}
              >
                {p === 'iedereen' ? 'Iedereen' : TASK_PERSON_LABEL[p]}
              </button>
            ))}
          </div>

          <button
            type="button"
            onClick={() => setHideFuture((v) => !v)}
            aria-pressed={hideFuture}
            className={`inline-flex items-center gap-1.5 rounded-xl px-3 py-2 text-xs font-semibold transition-all ${
              hideFuture
                ? 'bg-blue-600 text-white shadow-sm shadow-blue-500/30 hover:bg-blue-700'
                : 'border border-gray-200 bg-white text-gray-600 hover:bg-gray-50'
            }`}
            title={
              hideFuture
                ? 'Ingeplande taken voor later worden verborgen. Klik om ze ook te tonen.'
                : 'Alle taken zichtbaar — klik om toekomstige te verbergen.'
            }
          >
            Enkel taken voor nu
            {hideFuture && hiddenFutureCount > 0 && (
              <span className="ml-0.5 rounded-md bg-white/25 px-1.5 py-0.5 text-[10px] font-bold">
                {hiddenFutureCount} verborgen
              </span>
            )}
          </button>

          <div className="inline-flex rounded-xl border border-gray-200 bg-gray-50 p-1">
            {(['open', 'done', 'all'] as const).map((f) => (
              <button
                key={f}
                type="button"
                onClick={() => setFilter(f)}
                className={`rounded-lg px-3 py-2 text-xs font-semibold transition-all ${
                  filter === f ? 'bg-white text-gray-900 shadow-sm' : 'text-gray-500 hover:text-gray-900'
                }`}
              >
                {f === 'open' ? 'Te doen' : f === 'done' ? 'Afgerond' : 'Alles'}
              </button>
            ))}
          </div>
        </div>
      </div>

      {filtered.length === 0 ? (
        <div className="flex flex-col items-center rounded-2xl border border-dashed border-gray-200 bg-gradient-to-b from-gray-50/50 to-white px-6 py-16 text-center">
          <div className="flex h-14 w-14 items-center justify-center rounded-2xl bg-gradient-to-br from-indigo-100 to-violet-100">
            <svg className="h-6 w-6 text-indigo-500" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" d="M9 12.75 11.25 15 15 9.75M21 12a9 9 0 1 1-18 0 9 9 0 0 1 18 0Z" />
            </svg>
          </div>
          <p className="mt-4 text-sm font-semibold text-gray-900">
            {tasks.length === 0
              ? 'Nog geen taken'
              : filter === 'done'
                ? 'Nog niets afgerond'
                : 'Geen taken gevonden'}
          </p>
          <p className="mt-1 max-w-sm text-xs text-gray-500">
            {tasks.length === 0
              ? 'Maak er een aan met de knop hierboven, of doorloop een ochtendcontrole.'
              : 'Pas je filter of zoekterm aan om meer taken te zien.'}
          </p>
        </div>
      ) : (
        <div className="space-y-4">
          {grouped.map(([clientId, group]) => (
            <ClientTaskGroup
              key={clientId}
              companyName={group.companyName}
              tasks={group.tasks}
              pendingIds={pendingIds}
              onToggle={handleToggle}
              onDelete={handleDelete}
            />
          ))}
        </div>
      )}

      {addOpen && (
        <NewTaskModal
          clientOptions={clientOptions}
          onClose={() => setAddOpen(false)}
          onAdded={() => {
            setAddOpen(false)
            router.refresh()
          }}
        />
      )}
    </div>
  )
}

function ClientTaskGroup({
  companyName,
  tasks,
  pendingIds,
  onToggle,
  onDelete,
}: {
  companyName: string
  tasks: ControleTaskRow[]
  pendingIds: Set<string>
  onToggle: (id: string, completed: boolean) => void
  onDelete: (id: string) => void
}) {
  const openInGroup = tasks.filter((t) => !t.isCompleted).length

  return (
    <div className="overflow-hidden rounded-2xl border border-gray-200 bg-white shadow-sm">
      <div className="flex items-center justify-between gap-3 border-b border-gray-100 bg-gradient-to-r from-gray-50 to-white px-5 py-3">
        <h3 className="text-sm font-semibold text-gray-900">{companyName}</h3>
        <div className="text-[11px] font-semibold text-gray-500">
          {openInGroup} / {tasks.length} open
        </div>
      </div>
      <ul className="divide-y divide-gray-100">
        {tasks.map((task) => (
          <TaskRow
            key={task.id}
            task={task}
            isPending={pendingIds.has(task.id)}
            onToggle={() => onToggle(task.id, task.isCompleted)}
            onDelete={() => onDelete(task.id)}
          />
        ))}
      </ul>
    </div>
  )
}

function TaskRow({
  task,
  isPending,
  onToggle,
  onDelete,
}: {
  task: ControleTaskRow
  isPending: boolean
  onToggle: () => void
  onDelete: () => void
}) {
  return (
    <li className={`flex items-start gap-3 px-5 py-3 transition-colors ${task.isCompleted ? 'bg-gray-50/40' : ''}`}>
      <button
        type="button"
        onClick={onToggle}
        disabled={isPending}
        aria-label={task.isCompleted ? 'Markeer als open' : 'Markeer als afgerond'}
        className={`mt-0.5 flex h-6 w-6 flex-shrink-0 items-center justify-center rounded-md border-2 transition-all ${
          task.isCompleted ? 'border-emerald-500 bg-emerald-500' : 'border-gray-300 bg-white hover:border-indigo-500'
        } ${isPending ? 'opacity-50' : ''}`}
      >
        {task.isCompleted && (
          <svg className="h-4 w-4 text-white" fill="none" viewBox="0 0 24 24" strokeWidth={3} stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" d="m4.5 12.75 6 6 9-13.5" />
          </svg>
        )}
      </button>

      <div className="min-w-0 flex-1">
        <div className="mb-1 flex flex-wrap items-center gap-1.5">
          {task.assignee && (
            <span className={`inline-flex items-center gap-1 rounded-md px-2 py-0.5 text-[10px] font-bold uppercase tracking-wide ring-1 ${PERSON_CHIP[task.assignee]}`}>
              {TASK_PERSON_LABEL[task.assignee]}
            </span>
          )}
          {task.requestedBy && (
            <span className="text-[10px] font-medium text-gray-400">
              namens {TASK_PERSON_LABEL[task.requestedBy]}
            </span>
          )}
          {isFutureTask(task.createdAt) && !task.isCompleted && (
            <span className="inline-flex items-center gap-1 rounded-md bg-blue-100 px-2 py-0.5 text-[10px] font-bold text-blue-800 ring-1 ring-blue-200">
              Plan: {formatPlanDate(task.createdAt)}
            </span>
          )}
        </div>

        <div className={`whitespace-pre-wrap text-sm transition-colors ${task.isCompleted ? 'text-gray-400 line-through' : 'text-gray-900'}`}>
          {task.description}
        </div>

        {task.details && (
          <div className={`mt-2 whitespace-pre-wrap rounded-lg border-l-2 border-gray-200 bg-gray-50/70 py-2 pl-3 pr-2 text-xs leading-relaxed ${task.isCompleted ? 'text-gray-400' : 'text-gray-600'}`}>
            {task.details}
          </div>
        )}

        {task.campaignNames.length > 0 && (
          <div className="mt-1.5 flex flex-wrap items-center gap-1">
            {task.campaignNames.map((name, idx) => (
              <span
                key={idx}
                className={`inline-flex items-center gap-1 rounded-md px-2 py-0.5 text-[10px] font-semibold ${
                  task.isCompleted ? 'bg-gray-100 text-gray-400' : 'bg-indigo-50 text-indigo-700 ring-1 ring-indigo-100'
                }`}
              >
                {name}
              </span>
            ))}
          </div>
        )}

        <div className="mt-1 flex flex-wrap items-center gap-2 text-[11px] text-gray-400">
          {!isFutureTask(task.createdAt) && (
            <span>Aangemaakt {formatDate(task.createdAt)} om {formatTime(task.createdAt)}</span>
          )}
          {task.isCompleted && task.completedAt && (
            <>
              {!isFutureTask(task.createdAt) && <span className="text-gray-300">•</span>}
              <span className="text-emerald-600">Afgerond {formatTime(task.completedAt)}</span>
            </>
          )}
        </div>
      </div>

      <button
        type="button"
        onClick={onDelete}
        disabled={isPending}
        aria-label="Taak verwijderen"
        className="flex h-7 w-7 flex-shrink-0 items-center justify-center rounded-md text-gray-300 transition-colors hover:bg-red-50 hover:text-red-600 disabled:opacity-50"
      >
        <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" strokeWidth={2} stroke="currentColor">
          <path strokeLinecap="round" strokeLinejoin="round" d="m14.74 9-.346 9m-4.788 0L9.26 9m9.968-3.21c.342.052.682.107 1.022.166m-1.022-.165L18.16 19.673a2.25 2.25 0 0 1-2.244 2.077H8.084a2.25 2.25 0 0 1-2.244-2.077L4.772 5.79" />
        </svg>
      </button>
    </li>
  )
}
