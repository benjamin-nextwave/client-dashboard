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
        className="absolute inset-0 bg-[color-mix(in_oklab,var(--color-ink)_45%,transparent)] backdrop-blur-sm"
        onClick={onClose}
        aria-hidden
      />
      <div className="relative flex max-h-[85vh] w-full max-w-lg flex-col overflow-hidden rounded-panel bg-panel shadow-2xl ring-1 ring-line">
        <header className="flex items-center justify-between border-b border-line px-5 py-4">
          <div>
            <h2 className="text-[15px] font-semibold text-fg">Labels beheren</h2>
            <p className="mt-0.5 text-[11.5px] text-muted">
              Eigen labels om leads te ordenen. Los van de automatische classificatie.
            </p>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="rounded-control p-1.5 text-faint hover:bg-track hover:text-muted"
            aria-label="Sluiten"
          >
            <svg className="h-5 w-5" fill="none" viewBox="0 0 24 24" strokeWidth={1.8} stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" d="M6 18 18 6M6 6l12 12" />
            </svg>
          </button>
        </header>

        <div className="flex-1 overflow-y-auto px-5 py-4">
          {labels.length === 0 ? (
            <p className="rounded-panel border border-dashed border-line px-4 py-6 text-center text-[12.5px] text-muted">
              Nog geen labels. Maak er hieronder één aan.
            </p>
          ) : (
            <ul className="space-y-1.5">
              {labels.map((label) => (
                <li
                  key={label.id}
                  className="rounded-panel border border-line px-3 py-2.5"
                >
                  {editingId === label.id ? (
                    <div className="space-y-2.5">
                      <input
                        type="text"
                        value={editName}
                        onChange={(e) => setEditName(e.target.value)}
                        disabled={pending}
                        maxLength={40}
                        className="block w-full rounded-control border border-line px-3 py-1.5 text-[12.5px] outline-none focus:border-[var(--brand-40)]"
                      />
                      <ColorSwatches value={editColor} onChange={setEditColor} />
                      <div className="flex justify-end gap-2">
                        <button
                          type="button"
                          onClick={() => setEditingId(null)}
                          disabled={pending}
                          className="rounded-control px-3 py-1.5 text-[11.5px] font-medium text-muted hover:bg-track"
                        >
                          Annuleren
                        </button>
                        <button
                          type="button"
                          onClick={() => handleSaveEdit(label.id)}
                          disabled={pending || !editName.trim()}
                          className="rounded-control bg-ink px-3 py-1.5 text-[11.5px] font-medium text-white hover:opacity-90 disabled:opacity-50"
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
                      <span className="min-w-0 flex-1 truncate text-[12.5px] font-medium text-fg">
                        {label.name}
                      </span>
                      <span className="shrink-0 text-[11.5px] text-faint">
                        {usageCount.get(label.id) ?? 0}×
                      </span>
                      <button
                        type="button"
                        onClick={() => startEdit(label)}
                        className="rounded-control p-1.5 text-faint hover:bg-track hover:text-muted"
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
                        className="rounded-control p-1.5 text-faint hover:bg-[color-mix(in_oklab,var(--color-neg)_8%,transparent)] hover:text-neg disabled:opacity-50"
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

        <form onSubmit={handleCreate} className="border-t border-line bg-track px-5 py-4">
          <p className="mb-2 text-[11.5px] font-medium text-muted">
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
              className="min-w-0 flex-1 rounded-control border border-line bg-panel px-3 py-2 text-[12.5px] outline-none focus:border-[var(--brand-40)]"
            />
            <button
              type="submit"
              disabled={pending || !name.trim()}
              className="shrink-0 rounded-control bg-ink px-4 py-2 text-[12.5px] font-medium text-white hover:opacity-90 disabled:opacity-50"
            >
              Toevoegen
            </button>
          </div>
          <div className="mt-3">
            <ColorSwatches value={color} onChange={setColor} />
          </div>
          {error && <p className="mt-3 text-[11.5px] text-neg">{error}</p>}
        </form>
      </div>
    </div>
  )
}
