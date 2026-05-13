'use client'

import { useState, useTransition, useMemo } from 'react'
import { useRouter } from 'next/navigation'
import type { ControleTaskRow } from '@/lib/data/controle'
import { toggleTaskCompleted, deleteTask } from '../../actions'

function formatTime(iso: string): string {
  const d = new Date(iso)
  return d.toLocaleTimeString('nl-NL', { hour: '2-digit', minute: '2-digit' })
}

function formatDate(iso: string): string {
  const d = new Date(iso)
  return d.toLocaleDateString('nl-NL', { day: 'numeric', month: 'short', year: 'numeric' })
}

interface TaskListProps {
  tasks: ControleTaskRow[]
}

export function TaskList({ tasks }: TaskListProps) {
  const router = useRouter()
  const [filter, setFilter] = useState<'all' | 'open' | 'done'>('open')
  const [search, setSearch] = useState('')
  const [, startTransition] = useTransition()
  const [pendingIds, setPendingIds] = useState<Set<string>>(new Set())

  const filtered = useMemo(() => {
    let result = tasks
    if (filter === 'open') result = result.filter((t) => !t.isCompleted)
    if (filter === 'done') result = result.filter((t) => t.isCompleted)
    if (search.trim()) {
      const q = search.toLowerCase()
      result = result.filter(
        (t) => t.companyName.toLowerCase().includes(q) || t.description.toLowerCase().includes(q)
      )
    }
    return result
  }, [tasks, filter, search])

  // Group filtered tasks by company.
  const grouped = useMemo(() => {
    const groups = new Map<string, { companyName: string; tasks: ControleTaskRow[] }>()
    for (const task of filtered) {
      const existing = groups.get(task.clientId)
      if (existing) {
        existing.tasks.push(task)
      } else {
        groups.set(task.clientId, { companyName: task.companyName, tasks: [task] })
      }
    }
    return Array.from(groups.entries())
  }, [filtered])

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
    <div className="space-y-4">
      {/* Toolbar */}
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div className="relative max-w-md flex-1">
          <svg
            className="pointer-events-none absolute left-4 top-1/2 h-4 w-4 -translate-y-1/2 text-gray-400"
            fill="none"
            viewBox="0 0 24 24"
            strokeWidth={2}
            stroke="currentColor"
          >
            <path strokeLinecap="round" strokeLinejoin="round" d="m21 21-5.197-5.197m0 0A7.5 7.5 0 1 0 5.196 5.196a7.5 7.5 0 0 0 10.607 10.607Z" />
          </svg>
          <input
            type="text"
            placeholder="Zoek taak of klantnaam..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="w-full rounded-xl border border-gray-200 bg-white py-3 pl-11 pr-4 text-sm text-gray-900 placeholder:text-gray-400 shadow-sm transition-all focus:border-indigo-400 focus:outline-none focus:ring-4 focus:ring-indigo-100"
          />
        </div>

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

      {filtered.length === 0 ? (
        <div className="flex flex-col items-center rounded-2xl border border-dashed border-gray-200 bg-gradient-to-b from-gray-50/50 to-white px-6 py-16 text-center">
          <div className="flex h-14 w-14 items-center justify-center rounded-2xl bg-gradient-to-br from-amber-100 to-orange-100">
            <svg className="h-6 w-6 text-amber-500" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" d="M9 12.75 11.25 15 15 9.75M21 12c0 1.268-.63 2.39-1.593 3.068a3.745 3.745 0 0 1-1.043 3.296 3.745 3.745 0 0 1-3.296 1.043A3.745 3.745 0 0 1 12 21c-1.268 0-2.39-.63-3.068-1.593a3.746 3.746 0 0 1-3.296-1.043 3.745 3.745 0 0 1-1.043-3.296A3.745 3.745 0 0 1 3 12c0-1.268.63-2.39 1.593-3.068a3.745 3.745 0 0 1 1.043-3.296 3.746 3.746 0 0 1 3.296-1.043A3.746 3.746 0 0 1 12 3c1.268 0 2.39.63 3.068 1.593a3.746 3.746 0 0 1 3.296 1.043 3.746 3.746 0 0 1 1.043 3.296A3.745 3.745 0 0 1 21 12Z" />
            </svg>
          </div>
          <p className="mt-4 text-sm font-semibold text-gray-900">
            {tasks.length === 0
              ? 'Nog geen taken voor vandaag'
              : filter === 'done'
                ? 'Nog niets afgerond'
                : 'Geen taken gevonden'}
          </p>
          <p className="mt-1 max-w-sm text-xs text-gray-500">
            {tasks.length === 0
              ? 'Doorloop eerst de ochtendcontrole — taken die je daar aanmaakt verschijnen hier vanzelf.'
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
  const total = tasks.length

  return (
    <div className="overflow-hidden rounded-2xl border border-gray-200 bg-white shadow-sm">
      <div className="flex items-center justify-between gap-3 border-b border-gray-100 bg-gradient-to-r from-gray-50 to-white px-5 py-3">
        <h3 className="text-sm font-semibold text-gray-900">{companyName}</h3>
        <div className="text-[11px] font-semibold text-gray-500">
          {openInGroup} / {total} open
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
          task.isCompleted
            ? 'border-emerald-500 bg-emerald-500'
            : 'border-gray-300 bg-white hover:border-indigo-500'
        } ${isPending ? 'opacity-50' : ''}`}
      >
        {task.isCompleted && (
          <svg className="h-4 w-4 text-white" fill="none" viewBox="0 0 24 24" strokeWidth={3} stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" d="m4.5 12.75 6 6 9-13.5" />
          </svg>
        )}
      </button>

      <div className="min-w-0 flex-1">
        <div
          className={`text-sm transition-colors ${
            task.isCompleted ? 'text-gray-400 line-through' : 'text-gray-900'
          }`}
        >
          {task.description}
        </div>
        {task.campaignNames.length > 0 && (
          <div className="mt-1.5 flex flex-wrap items-center gap-1">
            {task.campaignNames.map((name, idx) => (
              <span
                key={idx}
                className={`inline-flex items-center gap-1 rounded-md px-2 py-0.5 text-[10px] font-semibold ${
                  task.isCompleted
                    ? 'bg-gray-100 text-gray-400'
                    : 'bg-indigo-50 text-indigo-700 ring-1 ring-indigo-100'
                }`}
              >
                <svg className="h-2.5 w-2.5" fill="none" viewBox="0 0 24 24" strokeWidth={2.5} stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" d="M9.568 3H5.25A2.25 2.25 0 0 0 3 5.25v4.318c0 .597.237 1.17.659 1.591l9.581 9.581c.699.699 1.78.872 2.607.33a18.095 18.095 0 0 0 5.223-5.223c.542-.827.369-1.908-.33-2.607L11.16 3.66A2.25 2.25 0 0 0 9.568 3Z" />
                  <path strokeLinecap="round" strokeLinejoin="round" d="M6 6h.008v.008H6V6Z" />
                </svg>
                {name}
              </span>
            ))}
          </div>
        )}
        <div className="mt-1 flex flex-wrap items-center gap-2 text-[11px] text-gray-400">
          <span>Aangemaakt {formatDate(task.createdAt)} om {formatTime(task.createdAt)}</span>
          {task.isCompleted && task.completedAt && (
            <>
              <span className="text-gray-300">•</span>
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
