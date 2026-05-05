'use client'

import { useState, useTransition } from 'react'
import {
  assignLabel,
  createLabel,
  deleteLabel,
  unassignLabel,
} from '../_lib/actions'
import type { UserLabel } from '../_lib/types'
import { ColorSwatches } from './color-swatches'
import { DEFAULT_COLOR } from '../_lib/palette'

export function LabelsManager({
  leadId,
  assigned,
  available,
}: {
  leadId: string
  assigned: UserLabel[]
  available: UserLabel[]
}) {
  const [picker, setPicker] = useState(false)
  const [creating, setCreating] = useState(false)
  const [name, setName] = useState('')
  const [color, setColor] = useState<string>(DEFAULT_COLOR)
  const [error, setError] = useState<string | null>(null)
  const [pending, startTransition] = useTransition()

  const assignedIds = new Set(assigned.map((l) => l.id))

  function toggleAssign(label: UserLabel) {
    setError(null)
    startTransition(async () => {
      const fn = assignedIds.has(label.id) ? unassignLabel : assignLabel
      const res = await fn(leadId, label.id)
      if (!res.ok) setError(res.error)
    })
  }

  function handleCreate(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault()
    setError(null)
    startTransition(async () => {
      const res = await createLabel(name, color)
      if (!res.ok) {
        setError(res.error)
        return
      }
      setName('')
      setCreating(false)
    })
  }

  function handleDelete(labelId: string) {
    if (!confirm('Label definitief verwijderen? Alle koppelingen worden ook verwijderd.')) return
    setError(null)
    startTransition(async () => {
      const res = await deleteLabel(labelId)
      if (!res.ok) setError(res.error)
    })
  }

  return (
    <div>
      <div className="flex flex-wrap items-center gap-2">
        {assigned.map((label) => (
          <span
            key={label.id}
            className="inline-flex items-center gap-1.5 rounded-full bg-gray-100 px-2.5 py-1 text-xs font-medium text-gray-700"
          >
            <span
              className="h-2 w-2 rounded-full"
              style={{ backgroundColor: label.color }}
              aria-hidden
            />
            {label.name}
            <button
              type="button"
              onClick={() => toggleAssign(label)}
              disabled={pending}
              className="rounded-full p-0.5 hover:bg-gray-200 disabled:opacity-50"
              aria-label={`Verwijder label ${label.name}`}
            >
              <svg className="h-3 w-3" fill="none" viewBox="0 0 24 24" strokeWidth={2.4} stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" d="M6 18 18 6M6 6l12 12" />
              </svg>
            </button>
          </span>
        ))}
        <button
          type="button"
          onClick={() => setPicker((v) => !v)}
          className="inline-flex items-center gap-1 rounded-full border border-dashed border-gray-300 px-2.5 py-1 text-xs font-medium text-gray-600 hover:border-gray-400 hover:text-gray-900"
        >
          <svg className="h-3 w-3" fill="none" viewBox="0 0 24 24" strokeWidth={2.4} stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" d="M12 4.5v15m7.5-7.5h-15" />
          </svg>
          Label
        </button>
      </div>

      {picker && (
        <div className="mt-3 rounded-lg border border-gray-200 bg-white p-3 shadow-sm">
          <p className="mb-2 text-[11px] font-semibold uppercase tracking-wider text-gray-500">
            Labels toewijzen
          </p>
          <div className="flex flex-wrap gap-1.5">
            {available.length === 0 && (
              <p className="text-xs text-gray-500">Nog geen labels aangemaakt.</p>
            )}
            {available.map((label) => {
              const isAssigned = assignedIds.has(label.id)
              return (
                <span
                  key={label.id}
                  className="inline-flex items-center gap-1 rounded-full border border-gray-200 bg-white pl-2 pr-1 py-0.5"
                >
                  <button
                    type="button"
                    onClick={() => toggleAssign(label)}
                    disabled={pending}
                    className={`inline-flex items-center gap-1.5 text-xs font-medium ${isAssigned ? 'text-gray-900' : 'text-gray-600 hover:text-gray-900'} disabled:opacity-50`}
                  >
                    <span
                      className="h-2 w-2 rounded-full"
                      style={{ backgroundColor: label.color }}
                      aria-hidden
                    />
                    {label.name}
                    {isAssigned && (
                      <svg className="h-3 w-3 text-emerald-600" fill="none" viewBox="0 0 24 24" strokeWidth={2.5} stroke="currentColor">
                        <path strokeLinecap="round" strokeLinejoin="round" d="m4.5 12.75 6 6 9-13.5" />
                      </svg>
                    )}
                  </button>
                  <button
                    type="button"
                    onClick={() => handleDelete(label.id)}
                    disabled={pending}
                    className="rounded-full p-0.5 text-gray-400 hover:bg-rose-50 hover:text-rose-600 disabled:opacity-50"
                    title="Label definitief verwijderen"
                    aria-label={`Verwijder label ${label.name}`}
                  >
                    <svg className="h-3 w-3" fill="none" viewBox="0 0 24 24" strokeWidth={2.4} stroke="currentColor">
                      <path strokeLinecap="round" strokeLinejoin="round" d="M6 18 18 6M6 6l12 12" />
                    </svg>
                  </button>
                </span>
              )
            })}
          </div>

          {creating ? (
            <form onSubmit={handleCreate} className="mt-3 space-y-2">
              <div>
                <label className="text-[11px] font-semibold uppercase tracking-wider text-gray-500">
                  Naam
                </label>
                <input
                  type="text"
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  disabled={pending}
                  placeholder="Bijv. Belangrijk"
                  className="mt-1 block w-full rounded-md border border-gray-300 px-2.5 py-1.5 text-sm outline-none focus:border-gray-400 disabled:opacity-60"
                />
              </div>
              <div>
                <label className="text-[11px] font-semibold uppercase tracking-wider text-gray-500">
                  Kleur
                </label>
                <div className="mt-1">
                  <ColorSwatches value={color} onChange={setColor} size="sm" />
                </div>
              </div>
              <div className="flex justify-end gap-2 pt-1">
                <button
                  type="button"
                  onClick={() => setCreating(false)}
                  disabled={pending}
                  className="rounded-md px-3 py-1.5 text-xs font-medium text-gray-600 hover:bg-gray-100 disabled:opacity-50"
                >
                  Annuleren
                </button>
                <button
                  type="submit"
                  disabled={pending || !name.trim()}
                  className="rounded-md bg-gray-900 px-3 py-1.5 text-xs font-medium text-white hover:bg-gray-800 disabled:opacity-50"
                >
                  Aanmaken
                </button>
              </div>
            </form>
          ) : (
            <button
              type="button"
              onClick={() => setCreating(true)}
              className="mt-3 inline-flex items-center gap-1 text-xs font-medium text-gray-700 hover:text-gray-900"
            >
              <svg className="h-3 w-3" fill="none" viewBox="0 0 24 24" strokeWidth={2.4} stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" d="M12 4.5v15m7.5-7.5h-15" />
              </svg>
              Nieuw label
            </button>
          )}
        </div>
      )}

      {error && <p className="mt-2 text-xs text-rose-700">{error}</p>}
    </div>
  )
}
