'use client'

import { useState, useTransition } from 'react'
import { createCrmLabel, deleteCrmLabel, updateCrmLabel } from '../_lib/actions'
import { DEFAULT_LABEL_COLOR } from '../_lib/constants'
import type { CrmLabel } from '../_lib/types'
import { ColorSwatches } from './color-swatches'

export function LabelManager({
  labels,
  usageCount,
  onClose,
  onCreated,
  onUpdated,
  onDeleted,
}: {
  labels: CrmLabel[]
  usageCount: Map<string, number>
  onClose: () => void
  onCreated: (label: CrmLabel) => void
  onUpdated: (label: CrmLabel) => void
  onDeleted: (labelId: string) => void
}) {
  const [name, setName] = useState('')
  const [color, setColor] = useState(DEFAULT_LABEL_COLOR)
  const [editingId, setEditingId] = useState<string | null>(null)
  const [editName, setEditName] = useState('')
  const [editColor, setEditColor] = useState(DEFAULT_LABEL_COLOR)
  const [error, setError] = useState<string | null>(null)
  const [pending, startTransition] = useTransition()

  function handleCreate(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault()
    setError(null)
    startTransition(async () => {
      const res = await createCrmLabel(name, color)
      if (!res.ok) {
        setError(res.error)
        return
      }
      onCreated(res.value)
      setName('')
      setColor(DEFAULT_LABEL_COLOR)
    })
  }

  function startEdit(label: CrmLabel) {
    setEditingId(label.id)
    setEditName(label.name)
    setEditColor(label.color)
    setError(null)
  }

  function handleSaveEdit(labelId: string) {
    setError(null)
    startTransition(async () => {
      const res = await updateCrmLabel(labelId, editName, editColor)
      if (!res.ok) {
        setError(res.error)
        return
      }
      onUpdated(res.value)
      setEditingId(null)
    })
  }

  function handleDelete(label: CrmLabel) {
    const used = usageCount.get(label.id) ?? 0
    const suffix = used > 0 ? ` Het label hangt nu aan ${used} lead(s).` : ''
    if (!confirm(`Label "${label.name}" verwijderen?${suffix}`)) return
    setError(null)
    startTransition(async () => {
      const res = await deleteCrmLabel(label.id)
      if (!res.ok) {
        setError(res.error)
        return
      }
      onDeleted(label.id)
    })
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
      <div
        className="absolute inset-0 bg-gray-900/40 backdrop-blur-sm"
        onClick={onClose}
        aria-hidden
      />
      <div className="relative flex max-h-[85vh] w-full max-w-lg flex-col overflow-hidden rounded-2xl bg-white shadow-2xl ring-1 ring-gray-900/5">
        <header className="flex items-center justify-between border-b border-gray-100 px-5 py-4">
          <div>
            <h2 className="text-base font-semibold text-gray-900">Labels beheren</h2>
            <p className="mt-0.5 text-xs text-gray-500">
              Eigen labels om leads te ordenen. Los van de automatische classificatie.
            </p>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="rounded-lg p-1.5 text-gray-400 hover:bg-gray-100 hover:text-gray-700"
            aria-label="Sluiten"
          >
            <svg className="h-5 w-5" fill="none" viewBox="0 0 24 24" strokeWidth={1.8} stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" d="M6 18 18 6M6 6l12 12" />
            </svg>
          </button>
        </header>

        <div className="flex-1 overflow-y-auto px-5 py-4">
          {labels.length === 0 ? (
            <p className="rounded-xl border border-dashed border-gray-200 px-4 py-6 text-center text-sm text-gray-500">
              Nog geen labels. Maak er hieronder één aan.
            </p>
          ) : (
            <ul className="space-y-1.5">
              {labels.map((label) => (
                <li
                  key={label.id}
                  className="rounded-xl border border-gray-200 px-3 py-2.5"
                >
                  {editingId === label.id ? (
                    <div className="space-y-2.5">
                      <input
                        type="text"
                        value={editName}
                        onChange={(e) => setEditName(e.target.value)}
                        disabled={pending}
                        maxLength={40}
                        className="block w-full rounded-lg border border-gray-300 px-3 py-1.5 text-sm outline-none focus:border-gray-900"
                      />
                      <ColorSwatches value={editColor} onChange={setEditColor} />
                      <div className="flex justify-end gap-2">
                        <button
                          type="button"
                          onClick={() => setEditingId(null)}
                          disabled={pending}
                          className="rounded-lg px-3 py-1.5 text-xs font-medium text-gray-600 hover:bg-gray-100"
                        >
                          Annuleren
                        </button>
                        <button
                          type="button"
                          onClick={() => handleSaveEdit(label.id)}
                          disabled={pending || !editName.trim()}
                          className="rounded-lg bg-gray-900 px-3 py-1.5 text-xs font-medium text-white hover:bg-gray-800 disabled:opacity-50"
                        >
                          Opslaan
                        </button>
                      </div>
                    </div>
                  ) : (
                    <div className="flex items-center gap-3">
                      <span
                        className="h-3 w-3 shrink-0 rounded-full"
                        style={{ backgroundColor: label.color }}
                        aria-hidden
                      />
                      <span className="min-w-0 flex-1 truncate text-sm font-medium text-gray-900">
                        {label.name}
                      </span>
                      <span className="shrink-0 text-xs text-gray-400">
                        {usageCount.get(label.id) ?? 0}×
                      </span>
                      <button
                        type="button"
                        onClick={() => startEdit(label)}
                        className="rounded-lg p-1.5 text-gray-400 hover:bg-gray-100 hover:text-gray-700"
                        aria-label={`Bewerk ${label.name}`}
                      >
                        <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" strokeWidth={1.8} stroke="currentColor">
                          <path strokeLinecap="round" strokeLinejoin="round" d="m16.862 4.487 1.687-1.688a1.875 1.875 0 1 1 2.652 2.652L10.582 16.07a4.5 4.5 0 0 1-1.897 1.13L6 18l.8-2.685a4.5 4.5 0 0 1 1.13-1.897l8.932-8.931Z" />
                        </svg>
                      </button>
                      <button
                        type="button"
                        onClick={() => handleDelete(label)}
                        disabled={pending}
                        className="rounded-lg p-1.5 text-gray-400 hover:bg-rose-50 hover:text-rose-600 disabled:opacity-50"
                        aria-label={`Verwijder ${label.name}`}
                      >
                        <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" strokeWidth={1.8} stroke="currentColor">
                          <path strokeLinecap="round" strokeLinejoin="round" d="m14.74 9-.346 9m-4.788 0L9.26 9m9.968-3.21c.342.052.682.107 1.022.166m-1.022-.165L18.16 19.673a2.25 2.25 0 0 1-2.244 2.077H8.084a2.25 2.25 0 0 1-2.244-2.077L4.772 5.79m14.456 0a48.108 48.108 0 0 0-3.478-.397m-12 .562c.34-.059.68-.114 1.022-.165m0 0a48.11 48.11 0 0 1 3.478-.397m7.5 0v-.916c0-1.18-.91-2.164-2.09-2.201a51.964 51.964 0 0 0-3.32 0c-1.18.037-2.09 1.022-2.09 2.201v.916m7.5 0a48.667 48.667 0 0 0-7.5 0" />
                        </svg>
                      </button>
                    </div>
                  )}
                </li>
              ))}
            </ul>
          )}
        </div>

        <form onSubmit={handleCreate} className="border-t border-gray-100 bg-gray-50/70 px-5 py-4">
          <p className="mb-2 text-[11px] font-semibold uppercase tracking-wider text-gray-500">
            Nieuw label
          </p>
          <div className="flex gap-2">
            <input
              type="text"
              value={name}
              onChange={(e) => setName(e.target.value)}
              disabled={pending}
              maxLength={40}
              placeholder="Bijv. Warm, Enterprise, Regio Zuid"
              className="min-w-0 flex-1 rounded-lg border border-gray-300 bg-white px-3 py-2 text-sm outline-none focus:border-gray-900"
            />
            <button
              type="submit"
              disabled={pending || !name.trim()}
              className="shrink-0 rounded-lg bg-gray-900 px-4 py-2 text-sm font-medium text-white hover:bg-gray-800 disabled:opacity-50"
            >
              Toevoegen
            </button>
          </div>
          <div className="mt-3">
            <ColorSwatches value={color} onChange={setColor} />
          </div>
          {error && <p className="mt-3 text-xs text-rose-700">{error}</p>}
        </form>
      </div>
    </div>
  )
}
