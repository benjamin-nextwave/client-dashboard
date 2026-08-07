'use client'

import { useState, useTransition } from 'react'
import { createNote, deleteNote, updateNote } from '../_lib/actions'
import type { LeadNote } from '../_lib/types'
import { ColorSwatches } from './color-swatches'
import { DEFAULT_COLOR } from '../_lib/palette'

function formatDateTime(iso: string): string {
  return new Date(iso).toLocaleString('nl-NL', {
    day: '2-digit',
    month: '2-digit',
    year: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
  })
}

export function NotesSection({
  leadId,
  notes,
}: {
  leadId: string
  notes: LeadNote[]
}) {
  const [creating, setCreating] = useState(false)
  const [editingId, setEditingId] = useState<string | null>(null)
  const [body, setBody] = useState('')
  const [color, setColor] = useState<string>(DEFAULT_COLOR)
  const [error, setError] = useState<string | null>(null)
  const [pending, startTransition] = useTransition()

  function startCreate() {
    setEditingId(null)
    setBody('')
    setColor(DEFAULT_COLOR)
    setCreating(true)
  }

  function startEdit(note: LeadNote) {
    setCreating(false)
    setEditingId(note.id)
    setBody(note.body)
    setColor(note.color)
  }

  function reset() {
    setCreating(false)
    setEditingId(null)
    setBody('')
    setColor(DEFAULT_COLOR)
    setError(null)
  }

  function handleSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault()
    setError(null)
    startTransition(async () => {
      const res = editingId
        ? await updateNote(editingId, body, color)
        : await createNote(leadId, body, color)
      if (!res.ok) {
        setError(res.error)
        return
      }
      reset()
    })
  }

  function handleDelete(noteId: string) {
    if (!confirm('Notitie verwijderen?')) return
    startTransition(async () => {
      const res = await deleteNote(noteId)
      if (!res.ok) setError(res.error)
    })
  }

  return (
    <div className="space-y-3">
      {notes.length > 0 && (
        <ul className="space-y-2">
          {notes.map((note) => (
            <li
              key={note.id}
              className="rounded-control border border-l-4 bg-panel p-3"
              style={{ borderLeftColor: note.color, borderColor: '#e5e7eb' }}
            >
              <div className="flex items-start justify-between gap-3">
                <p className="whitespace-pre-wrap break-words text-[12.5px] text-fg">
                  {note.body}
                </p>
                <div className="flex shrink-0 gap-1">
                  <button
                    type="button"
                    onClick={() => startEdit(note)}
                    className="rounded-control p-1 text-faint hover:bg-[var(--brand-08)] hover:text-fg"
                    aria-label="Bewerken"
                  >
                    <svg className="h-3.5 w-3.5" fill="none" viewBox="0 0 24 24" strokeWidth={1.8} stroke="currentColor">
                      <path strokeLinecap="round" strokeLinejoin="round" d="M16.862 4.487l1.687-1.688a1.875 1.875 0 1 1 2.652 2.652L6.832 19.82a4.5 4.5 0 0 1-1.897 1.13l-2.685.8.8-2.685a4.5 4.5 0 0 1 1.13-1.897L16.863 4.487Zm0 0L19.5 7.125" />
                    </svg>
                  </button>
                  <button
                    type="button"
                    onClick={() => handleDelete(note.id)}
                    disabled={pending}
                    className="rounded-control p-1 text-faint hover:bg-[color-mix(in_oklab,var(--c-neg)_10%,transparent)] hover:text-neg disabled:opacity-50"
                    aria-label="Verwijderen"
                  >
                    <svg className="h-3.5 w-3.5" fill="none" viewBox="0 0 24 24" strokeWidth={1.8} stroke="currentColor">
                      <path strokeLinecap="round" strokeLinejoin="round" d="M6 18 18 6M6 6l12 12" />
                    </svg>
                  </button>
                </div>
              </div>
              <p className="mt-1.5 text-[10px] uppercase tracking-wider text-faint">
                {formatDateTime(note.updated_at)}
              </p>
            </li>
          ))}
        </ul>
      )}

      {creating || editingId ? (
        <form onSubmit={handleSubmit} className="rounded-panel border border-line bg-panel p-3">
          <textarea
            value={body}
            onChange={(e) => setBody(e.target.value)}
            disabled={pending}
            rows={3}
            placeholder="Notitie schrijven…"
            className="block w-full resize-y rounded-control border-0 bg-transparent text-[12.5px] text-fg outline-none placeholder:text-faint disabled:opacity-60"
          />
          <div className="mt-2 flex items-center justify-between gap-3 border-t border-line pt-2">
            <ColorSwatches value={color} onChange={setColor} size="sm" />
            <div className="flex gap-2">
              <button
                type="button"
                onClick={reset}
                disabled={pending}
                className="rounded-control px-3 py-1.5 text-[11.5px] font-medium text-muted hover:bg-[var(--brand-08)] disabled:opacity-50"
              >
                Annuleren
              </button>
              <button
                type="submit"
                disabled={pending || !body.trim()}
                className="rounded-control bg-[var(--brand-color)] px-3 py-1.5 text-[11.5px] font-semibold text-white transition-opacity hover:opacity-90 disabled:opacity-50"
              >
                {editingId ? 'Opslaan' : 'Toevoegen'}
              </button>
            </div>
          </div>
        </form>
      ) : (
        <button
          type="button"
          onClick={startCreate}
          className="inline-flex items-center gap-1 rounded-control border border-dashed border-line px-3 py-1.5 text-[11.5px] font-medium text-muted hover:border-[var(--brand-32)] hover:text-fg"
        >
          <svg className="h-3 w-3" fill="none" viewBox="0 0 24 24" strokeWidth={2.4} stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" d="M12 4.5v15m7.5-7.5h-15" />
          </svg>
          Notitie toevoegen
        </button>
      )}

      {error && <p className="text-[11.5px] text-neg">{error}</p>}
    </div>
  )
}
