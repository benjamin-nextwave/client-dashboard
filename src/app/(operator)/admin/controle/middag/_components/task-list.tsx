'use client'

import { useState, useTransition, useMemo } from 'react'
import { useRouter } from 'next/navigation'
import type { ControleTaskRow, ManualTaskClientOption } from '@/lib/data/controle'
import { toggleTaskCompleted, deleteTask, addManualTask } from '../../actions'

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
  clientOptions: ManualTaskClientOption[]
  /** Persona-context — wordt meegegeven aan de AddManualTaskModal. */
  persona: 'benjamin' | 'merlijn'
}

export function TaskList({ tasks, clientOptions, persona }: TaskListProps) {
  const router = useRouter()
  const [filter, setFilter] = useState<'all' | 'open' | 'done'>('open')
  const [search, setSearch] = useState('')
  const [, startTransition] = useTransition()
  const [pendingIds, setPendingIds] = useState<Set<string>>(new Set())
  const [addOpen, setAddOpen] = useState(false)

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

        <div className="flex items-center gap-2">
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
          <button
            type="button"
            onClick={() => setAddOpen(true)}
            className="inline-flex items-center gap-1.5 rounded-xl bg-gradient-to-br from-amber-500 to-orange-500 px-3.5 py-2.5 text-xs font-semibold text-white shadow-sm shadow-orange-500/30 transition-all hover:-translate-y-0.5 hover:shadow-md hover:shadow-orange-500/40"
          >
            <svg className="h-3.5 w-3.5" fill="none" viewBox="0 0 24 24" strokeWidth={2.5} stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" d="M12 4.5v15m7.5-7.5h-15" />
            </svg>
            Taak toevoegen
          </button>
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
              ? 'Nog geen taken'
              : filter === 'done'
                ? 'Nog niets afgerond'
                : 'Geen taken gevonden'}
          </p>
          <p className="mt-1 max-w-sm text-xs text-gray-500">
            {tasks.length === 0
              ? 'Doorloop een ochtendcontrole — taken die je daar aanmaakt verschijnen hier en blijven staan tot je ze afvinkt of verwijdert.'
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
        <AddTaskModal
          clientOptions={clientOptions}
          persona={persona}
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

function AddTaskModal({
  clientOptions,
  persona,
  onClose,
  onAdded,
}: {
  clientOptions: ManualTaskClientOption[]
  persona: 'benjamin' | 'merlijn'
  onClose: () => void
  onAdded: () => void
}) {
  const [clientId, setClientId] = useState<string>('')
  const [clientSearch, setClientSearch] = useState('')
  const [campaignMode, setCampaignMode] = useState<'existing' | 'new'>('existing')
  const [existingCampaign, setExistingCampaign] = useState<string>('')
  const [newCampaign, setNewCampaign] = useState('')
  const [description, setDescription] = useState('')
  const [error, setError] = useState<string | null>(null)
  const [isSubmitting, startTransition] = useTransition()

  const filteredClients = useMemo(() => {
    const q = clientSearch.trim().toLowerCase()
    if (!q) return clientOptions
    return clientOptions.filter((c) => c.companyName.toLowerCase().includes(q))
  }, [clientOptions, clientSearch])

  const chosenClient = clientOptions.find((c) => c.id === clientId) ?? null
  const availableCampaigns = chosenClient?.campaignNames ?? []

  // Zodra de operator een klant zonder bekende campagnes kiest, schakelen we
  // direct naar 'new' zodat hij niet vastloopt op een lege dropdown.
  const effectiveMode: 'existing' | 'new' =
    availableCampaigns.length === 0 ? 'new' : campaignMode

  const handleSelectClient = (id: string) => {
    setClientId(id)
    setExistingCampaign('')
    setNewCampaign('')
    const opt = clientOptions.find((c) => c.id === id)
    setCampaignMode(opt && opt.campaignNames.length > 0 ? 'existing' : 'new')
  }

  const canSubmit =
    clientId.length > 0 &&
    description.trim().length > 0 &&
    (effectiveMode === 'new' ? newCampaign.trim().length >= 0 : true)

  const handleSubmit = () => {
    if (!canSubmit) return
    setError(null)
    const campaignName =
      effectiveMode === 'existing'
        ? existingCampaign.trim() || null
        : newCampaign.trim() || null

    startTransition(async () => {
      const result = await addManualTask({
        clientId,
        campaignName,
        description: description.trim(),
        assignee: persona,
      })
      if (result.error) {
        setError(result.error)
        return
      }
      onAdded()
    })
  }

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 px-4 backdrop-blur-sm"
      onClick={onClose}
    >
      <div
        className="w-full max-w-xl rounded-2xl bg-white p-6 shadow-2xl"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="mb-4 flex items-start justify-between gap-3">
          <div>
            <h3 className="text-lg font-semibold text-gray-900">Taak toevoegen</h3>
            <p className="text-xs text-gray-500">
              Kies een klant, koppel aan een campagne en beschrijf de taak.
            </p>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="rounded-lg p-1.5 text-gray-400 transition-colors hover:bg-gray-100 hover:text-gray-700"
          >
            <svg className="h-5 w-5" fill="none" viewBox="0 0 24 24" strokeWidth={2} stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" d="M6 18 18 6M6 6l12 12" />
            </svg>
          </button>
        </div>

        <div className="space-y-5">
          {/* Stap 1: klant kiezen */}
          <div>
            <label className="text-[11px] font-semibold uppercase tracking-wide text-gray-500">
              1. Klant
            </label>
            <div className="mt-2">
              <input
                type="text"
                value={clientSearch}
                onChange={(e) => setClientSearch(e.target.value)}
                placeholder="Zoek een klant..."
                className="w-full rounded-lg border border-gray-200 bg-white px-3 py-2 text-sm text-gray-900 placeholder:text-gray-400 transition-all focus:border-indigo-400 focus:outline-none focus:ring-4 focus:ring-indigo-100"
              />
              <div className="mt-2 max-h-40 overflow-y-auto rounded-lg border border-gray-200 bg-gray-50/50">
                {filteredClients.length === 0 ? (
                  <div className="px-3 py-2 text-xs text-gray-400">Geen klanten.</div>
                ) : (
                  <ul>
                    {filteredClients.map((c) => (
                      <li key={c.id}>
                        <button
                          type="button"
                          onClick={() => handleSelectClient(c.id)}
                          className={`flex w-full items-center justify-between gap-2 px-3 py-2 text-left text-sm transition-colors ${
                            clientId === c.id
                              ? 'bg-indigo-50 font-semibold text-indigo-700'
                              : 'text-gray-700 hover:bg-white'
                          }`}
                        >
                          <span className="truncate">{c.companyName}</span>
                          {clientId === c.id && (
                            <svg className="h-4 w-4 flex-shrink-0" fill="none" viewBox="0 0 24 24" strokeWidth={3} stroke="currentColor">
                              <path strokeLinecap="round" strokeLinejoin="round" d="m4.5 12.75 6 6 9-13.5" />
                            </svg>
                          )}
                        </button>
                      </li>
                    ))}
                  </ul>
                )}
              </div>
            </div>
          </div>

          {/* Stap 2: campagne kiezen */}
          <div>
            <label className="text-[11px] font-semibold uppercase tracking-wide text-gray-500">
              2. Campagne {chosenClient ? `(${chosenClient.companyName})` : ''}
            </label>
            {!chosenClient ? (
              <div className="mt-2 rounded-lg border border-dashed border-gray-200 px-3 py-3 text-xs text-gray-400">
                Kies eerst een klant.
              </div>
            ) : (
              <div className="mt-2 space-y-2">
                {availableCampaigns.length > 0 && (
                  <div className="inline-flex rounded-lg border border-gray-200 bg-gray-50 p-1">
                    {(['existing', 'new'] as const).map((m) => (
                      <button
                        key={m}
                        type="button"
                        onClick={() => setCampaignMode(m)}
                        className={`rounded-md px-3 py-1.5 text-[11px] font-semibold transition-all ${
                          effectiveMode === m
                            ? 'bg-white text-gray-900 shadow-sm'
                            : 'text-gray-500 hover:text-gray-900'
                        }`}
                      >
                        {m === 'existing' ? 'Bestaande' : 'Nieuwe'}
                      </button>
                    ))}
                  </div>
                )}

                {effectiveMode === 'existing' && availableCampaigns.length > 0 ? (
                  <select
                    value={existingCampaign}
                    onChange={(e) => setExistingCampaign(e.target.value)}
                    className="w-full rounded-lg border border-gray-200 bg-white px-3 py-2 text-sm text-gray-900 transition-all focus:border-indigo-400 focus:outline-none focus:ring-4 focus:ring-indigo-100"
                  >
                    <option value="">— Kies een campagne —</option>
                    {availableCampaigns.map((name) => (
                      <option key={name} value={name}>{name}</option>
                    ))}
                  </select>
                ) : (
                  <input
                    type="text"
                    value={newCampaign}
                    onChange={(e) => setNewCampaign(e.target.value)}
                    placeholder="Typ een nieuwe campagnenaam (optioneel)"
                    className="w-full rounded-lg border border-gray-200 bg-white px-3 py-2 text-sm text-gray-900 placeholder:text-gray-400 transition-all focus:border-indigo-400 focus:outline-none focus:ring-4 focus:ring-indigo-100"
                  />
                )}
              </div>
            )}
          </div>

          {/* Stap 3: omschrijving */}
          <div>
            <label className="text-[11px] font-semibold uppercase tracking-wide text-gray-500">
              3. Taak
            </label>
            <textarea
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              rows={3}
              placeholder="Beschrijf wat er moet gebeuren..."
              className="mt-2 w-full resize-y rounded-lg border border-gray-200 bg-white px-3 py-2 text-sm text-gray-900 placeholder:text-gray-400 transition-all focus:border-indigo-400 focus:outline-none focus:ring-4 focus:ring-indigo-100"
            />
          </div>

          {error && (
            <div className="rounded-lg border border-red-200 bg-red-50 px-3 py-2 text-xs text-red-700">
              {error}
            </div>
          )}

          <div className="flex flex-wrap items-center justify-end gap-2 border-t border-gray-100 pt-4">
            <button
              type="button"
              onClick={onClose}
              className="inline-flex items-center gap-1.5 rounded-lg border border-gray-200 bg-white px-4 py-2 text-xs font-semibold text-gray-700 transition-colors hover:bg-gray-50"
            >
              Annuleren
            </button>
            <button
              type="button"
              onClick={handleSubmit}
              disabled={!canSubmit || isSubmitting}
              className="inline-flex items-center gap-1.5 rounded-lg bg-gradient-to-br from-amber-500 to-orange-500 px-4 py-2 text-xs font-semibold text-white shadow-sm shadow-orange-500/30 transition-all hover:-translate-y-0.5 hover:shadow-md disabled:cursor-not-allowed disabled:opacity-40 disabled:hover:translate-y-0"
            >
              {isSubmitting ? 'Bezig met opslaan...' : 'Taak opslaan'}
            </button>
          </div>
        </div>
      </div>
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
