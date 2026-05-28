'use client'

import { useState, useTransition } from 'react'
import { useRouter } from 'next/navigation'
import { updateClientCompanySummary } from '../overview-actions'

const AUTHOR_LABELS: Record<string, string> = {
  kix: 'Kix',
  merlijn: 'Merlijn',
  benjamin: 'Benjamin',
}

const AUTHOR_COLORS: Record<string, string> = {
  kix: 'bg-violet-100 text-violet-700 border-violet-200',
  merlijn: 'bg-amber-100 text-amber-700 border-amber-200',
  benjamin: 'bg-emerald-100 text-emerald-700 border-emerald-200',
}

interface LinkedUpdate {
  id: string
  author: string
  message: string
  isUrgent: boolean
  createdAt: string
}

interface Props {
  clientId: string
  initialSummary: string | null
  linkedUpdates: LinkedUpdate[]
}

function formatTimestamp(iso: string): string {
  const d = new Date(iso)
  return d.toLocaleString('nl-NL', {
    day: 'numeric',
    month: 'long',
    year: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
  })
}

export function ClientSummaryCard({ clientId, initialSummary, linkedUpdates }: Props) {
  const router = useRouter()
  const [editing, setEditing] = useState(false)
  const [text, setText] = useState(initialSummary ?? '')
  const [pending, startTransition] = useTransition()

  const handleSave = () => {
    startTransition(async () => {
      await updateClientCompanySummary(clientId, text)
      setEditing(false)
      router.refresh()
    })
  }

  return (
    <section className="rounded-2xl border border-gray-200 bg-white p-6 shadow-sm">
      <div className="mb-4 flex items-center justify-between gap-3">
        <div>
          <h2 className="text-sm font-semibold text-gray-900">Samenvatting bedrijf</h2>
          <p className="text-xs text-gray-500">Korte beschrijving die je snel context geeft over deze klant.</p>
        </div>
        {!editing && (
          <button
            type="button"
            onClick={() => setEditing(true)}
            className="inline-flex items-center gap-1.5 rounded-lg border border-gray-200 bg-white px-3 py-1.5 text-xs font-semibold text-gray-700 shadow-sm transition-colors hover:border-indigo-200 hover:text-indigo-600"
          >
            <svg className="h-3.5 w-3.5" fill="none" viewBox="0 0 24 24" strokeWidth={2} stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" d="m16.862 4.487 1.687-1.688a1.875 1.875 0 1 1 2.652 2.652L6.832 19.82a4.5 4.5 0 0 1-1.897 1.13l-2.685.8.8-2.685a4.5 4.5 0 0 1 1.13-1.897L16.863 4.487Z" />
            </svg>
            Bewerken
          </button>
        )}
      </div>

      {editing ? (
        <div className="space-y-3">
          <textarea
            value={text}
            onChange={(e) => setText(e.target.value)}
            rows={6}
            className="w-full rounded-xl border border-gray-200 bg-white px-3 py-2 text-sm text-gray-900 focus:border-indigo-400 focus:outline-none focus:ring-2 focus:ring-indigo-100"
            placeholder="Wat doet dit bedrijf, wat is hun ICP, bijzonderheden…"
            autoFocus
          />
          <div className="flex gap-2">
            <button
              type="button"
              onClick={handleSave}
              disabled={pending}
              className="rounded-lg bg-gray-900 px-3.5 py-1.5 text-xs font-semibold text-white hover:bg-gray-800 disabled:opacity-50"
            >
              {pending ? 'Opslaan…' : 'Opslaan'}
            </button>
            <button
              type="button"
              onClick={() => { setText(initialSummary ?? ''); setEditing(false) }}
              className="rounded-lg border border-gray-200 bg-white px-3.5 py-1.5 text-xs font-semibold text-gray-700 hover:bg-gray-50"
            >
              Annuleren
            </button>
          </div>
        </div>
      ) : (
        <div className="rounded-xl border border-gray-100 bg-gray-50/50 p-4">
          {initialSummary ? (
            <p className="whitespace-pre-wrap text-sm leading-relaxed text-gray-800">{initialSummary}</p>
          ) : (
            <p className="text-sm italic text-gray-400">Nog geen samenvatting ingevuld.</p>
          )}
        </div>
      )}

      {linkedUpdates.length > 0 && (
        <div className="mt-6 space-y-3 border-t border-gray-100 pt-5">
          <h3 className="text-[11px] font-semibold uppercase tracking-wide text-gray-500">
            Belangrijke updates ({linkedUpdates.length})
          </h3>
          <ul className="space-y-2">
            {linkedUpdates.map((u) => (
              <li
                key={u.id}
                className={`rounded-xl border p-3 shadow-sm ${
                  u.isUrgent
                    ? 'border-red-200 bg-gradient-to-br from-red-50 to-rose-50'
                    : 'border-gray-200 bg-white'
                }`}
              >
                <div className="mb-1 flex items-center gap-2">
                  <span className={`inline-flex items-center rounded-md border px-1.5 py-0.5 text-[10px] font-semibold ${AUTHOR_COLORS[u.author] ?? 'bg-gray-100 text-gray-700 border-gray-200'}`}>
                    {AUTHOR_LABELS[u.author] ?? u.author}
                  </span>
                  {u.isUrgent && (
                    <span className="inline-flex items-center gap-0.5 rounded-md border border-red-200 bg-red-100 px-1.5 py-0.5 text-[10px] font-bold text-red-700">
                      <span>!</span>
                      Urgent
                    </span>
                  )}
                  <span className="text-[10px] text-gray-500">{formatTimestamp(u.createdAt)}</span>
                </div>
                <p className="whitespace-pre-wrap text-sm text-gray-800">{u.message}</p>
              </li>
            ))}
          </ul>
        </div>
      )}
    </section>
  )
}
