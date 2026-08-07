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
            className="inline-flex items-center gap-1.5 rounded-full bg-track px-2.5 py-1 text-[11.5px] font-medium text-fg"
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
              className="rounded-full p-0.5 hover:bg-line disabled:opacity-50"
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
          className="inline-flex items-center gap-1 rounded-full border border-dashed border-line px-2.5 py-1 text-[11.5px] font-medium text-muted hover:border-[var(--brand-32)] hover:text-fg"
        >
          <svg className="h-3 w-3" fill="none" viewBox="0 0 24 24" strokeWidth={2.4} stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" d="M12 4.5v15m7.5-7.5h-15" />
          </svg>
          Label
        </button>
      </div>

      {picker && (
        <div className="mt-3 rounded-panel border border-line bg-panel p-3">
          <p className="mb-2 text-[11px] font-semibold uppercase tracking-wider text-muted">
            Labels toewijzen
          </p>
          <div className="flex flex-wrap gap-1.5">
            {available.length === 0 && (
              <p className="text-[11.5px] text-muted">Nog geen labels aangemaakt.</p>
            )}
            {available.map((label) => {
              const isAssigned = assignedIds.has(label.id)
              return (
                <span
                  key={label.id}
                  className="inline-flex items-center gap-1 rounded-full border border-line bg-panel pl-2 pr-1 py-0.5"
                >
                  <button
                    type="button"
                    onClick={() => toggleAssign(label)}
                    disabled={pending}
                    className={`inline-flex items-center gap-1.5 text-[11.5px] font-medium ${isAssigned ? 'text-fg' : 'text-muted hover:text-fg'} disabled:opacity-50`}
                  >
                    <span
                      className="h-2 w-2 rounded-full"
                      style={{ backgroundColor: label.color }}
                      aria-hidden
                    />
                    {label.name}
                    {isAssigned && (
                      <svg className="h-3 w-3 text-pos" fill="none" viewBox="0 0 24 24" strokeWidth={2.5} stroke="currentColor">
                        <path strokeLinecap="round" strokeLinejoin="round" d="m4.5 12.75 6 6 9-13.5" />
                      </svg>
                    )}
                  </button>
                  <button
                    type="button"
                    onClick={() => handleDelete(label.id)}
                    disabled={pending}
                    className="rounded-full p-0.5 text-faint hover:bg-[color-mix(in_oklab,var(--c-neg)_10%,transparent)] hover:text-neg disabled:opacity-50"
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
                <label className="text-[11px] font-semibold uppercase tracking-wider text-muted">
                  Naam
                </label>
                <input
                  type="text"
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  disabled={pending}
                  placeholder="Bijv. Belangrijk"
                  className="mt-1 block w-full rounded-control border border-line px-2.5 py-1.5 text-[12.5px] outline-none focus:border-[var(--brand-color)] disabled:opacity-60"
                />
              </div>
              <div>
                <label className="text-[11px] font-semibold uppercase tracking-wider text-muted">
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
                  className="rounded-control px-3 py-1.5 text-[11.5px] font-medium text-muted hover:bg-[var(--brand-08)] disabled:opacity-50"
                >
                  Annuleren
                </button>
                <button
                  type="submit"
                  disabled={pending || !name.trim()}
                  className="rounded-control bg-[var(--brand-color)] px-3 py-1.5 text-[11.5px] font-semibold text-white transition-opacity hover:opacity-90 disabled:opacity-50"
                >
                  Aanmaken
                </button>
              </div>
            </form>
          ) : (
            <button
              type="button"
              onClick={() => setCreating(true)}
              className="mt-3 inline-flex items-center gap-1 text-[11.5px] font-medium text-fg hover:text-fg"
            >
              <svg className="h-3 w-3" fill="none" viewBox="0 0 24 24" strokeWidth={2.4} stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" d="M12 4.5v15m7.5-7.5h-15" />
              </svg>
              Nieuw label
            </button>
          )}
        </div>
      )}

      {error && <p className="mt-2 text-[11.5px] text-neg">{error}</p>}
    </div>
  )
}
