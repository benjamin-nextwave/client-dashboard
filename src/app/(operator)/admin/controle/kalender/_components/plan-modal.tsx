'use client'

import { useEffect, useState, useTransition } from 'react'
import { useRouter } from 'next/navigation'
import type { ClientListItem } from '@/lib/data/admin-stats'
import type { ControlePersona } from '@/lib/data/controle'
import { createCalendarNote, scheduleCalendarTask } from '../actions'

interface PlanModalProps {
  open: boolean
  clients: ClientListItem[]
  defaultClientId: string | null
  defaultDate: string
  onClose: () => void
}

type PlanKind = 'task' | 'note'

export function PlanModal({
  open,
  clients,
  defaultClientId,
  defaultDate,
  onClose,
}: PlanModalProps) {
  const router = useRouter()
  const [kind, setKind] = useState<PlanKind>('task')
  const [clientId, setClientId] = useState<string>(defaultClientId ?? clients[0]?.id ?? '')
  const [date, setDate] = useState<string>(defaultDate)
  const [title, setTitle] = useState('')
  const [description, setDescription] = useState('')
  const [assignee, setAssignee] = useState<ControlePersona>('benjamin')
  const [error, setError] = useState<string | null>(null)
  const [pending, startTransition] = useTransition()

  useEffect(() => {
    if (!open) return
    setKind('task')
    setClientId(defaultClientId ?? clients[0]?.id ?? '')
    setDate(defaultDate)
    setTitle('')
    setDescription('')
    setAssignee('benjamin')
    setError(null)
  }, [open, defaultClientId, defaultDate, clients])

  useEffect(() => {
    if (!open) return
    function handleEscape(e: KeyboardEvent) {
      if (e.key === 'Escape') onClose()
    }
    window.addEventListener('keydown', handleEscape)
    return () => window.removeEventListener('keydown', handleEscape)
  }, [open, onClose])

  if (!open) return null

  const submit = () => {
    if (!clientId) {
      setError('Kies eerst een klant.')
      return
    }
    if (title.trim().length === 0) {
      setError(kind === 'task' ? 'Beschrijf de taak.' : 'Geef de notitie een titel.')
      return
    }
    setError(null)
    startTransition(async () => {
      const res =
        kind === 'task'
          ? await scheduleCalendarTask({
              clientId,
              eventDate: date,
              description: title,
              assignee,
              campaignName: null,
            })
          : await createCalendarNote({
              clientId,
              eventDate: date,
              title,
              description: description.trim().length > 0 ? description : null,
            })
      if (res.error) {
        setError(res.error)
        return
      }
      onClose()
      router.refresh()
    })
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-gray-900/40 p-4 backdrop-blur-sm">
      <div className="w-full max-w-md overflow-hidden rounded-3xl bg-white shadow-2xl">
        <div className="bg-gradient-to-br from-pink-500 via-fuchsia-500 to-violet-600 px-6 py-4 text-white">
          <div className="flex items-start justify-between">
            <div>
              <div className="text-xs font-semibold uppercase tracking-wider opacity-80">Nieuw inplannen</div>
              <div className="text-2xl font-bold tracking-tight">Wat ga je toevoegen?</div>
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

        <div className="space-y-4 p-5">
          <div className="grid grid-cols-2 gap-2 rounded-2xl bg-gray-100 p-1">
            <button
              type="button"
              onClick={() => setKind('task')}
              className={`rounded-xl px-3 py-2 text-sm font-bold transition-all ${
                kind === 'task'
                  ? 'bg-white text-rose-600 shadow-sm'
                  : 'text-gray-500 hover:text-gray-800'
              }`}
            >
              Taak
            </button>
            <button
              type="button"
              onClick={() => setKind('note')}
              className={`rounded-xl px-3 py-2 text-sm font-bold transition-all ${
                kind === 'note'
                  ? 'bg-white text-amber-600 shadow-sm'
                  : 'text-gray-500 hover:text-gray-800'
              }`}
            >
              Notitie
            </button>
          </div>

          <Field label="Klant">
            <select
              value={clientId}
              onChange={(e) => setClientId(e.target.value)}
              className="w-full rounded-xl border border-gray-200 bg-white px-3 py-2 text-sm text-gray-900 focus:border-fuchsia-400 focus:outline-none focus:ring-2 focus:ring-fuchsia-100"
            >
              {clients.map((c) => (
                <option key={c.id} value={c.id}>
                  {c.companyName}
                </option>
              ))}
            </select>
          </Field>

          <Field label="Datum">
            <input
              type="date"
              value={date}
              onChange={(e) => setDate(e.target.value)}
              className="w-full rounded-xl border border-gray-200 bg-white px-3 py-2 text-sm text-gray-900 focus:border-fuchsia-400 focus:outline-none focus:ring-2 focus:ring-fuchsia-100"
            />
          </Field>

          <Field label={kind === 'task' ? 'Beschrijving' : 'Titel'}>
            <input
              type="text"
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              placeholder={kind === 'task' ? 'bv. DNC-lijst aanvullen' : 'bv. Kick-off call'}
              className="w-full rounded-xl border border-gray-200 bg-white px-3 py-2 text-sm text-gray-900 placeholder:text-gray-400 focus:border-fuchsia-400 focus:outline-none focus:ring-2 focus:ring-fuchsia-100"
            />
          </Field>

          {kind === 'task' ? (
            <Field label="Voor wie">
              <div className="grid grid-cols-2 gap-2 rounded-xl bg-gray-100 p-1">
                {(['benjamin', 'merlijn'] as const).map((p) => (
                  <button
                    key={p}
                    type="button"
                    onClick={() => setAssignee(p)}
                    className={`rounded-lg px-3 py-1.5 text-xs font-bold capitalize transition-all ${
                      assignee === p
                        ? 'bg-white text-fuchsia-600 shadow-sm'
                        : 'text-gray-500 hover:text-gray-800'
                    }`}
                  >
                    {p}
                  </button>
                ))}
              </div>
            </Field>
          ) : (
            <Field label="Extra details (optioneel)">
              <textarea
                value={description}
                onChange={(e) => setDescription(e.target.value)}
                rows={3}
                placeholder="Vrije tekst..."
                className="w-full rounded-xl border border-gray-200 bg-white px-3 py-2 text-sm text-gray-900 placeholder:text-gray-400 focus:border-fuchsia-400 focus:outline-none focus:ring-2 focus:ring-fuchsia-100"
              />
            </Field>
          )}

          {error && (
            <div className="rounded-xl bg-rose-50 px-3 py-2 text-[12px] font-semibold text-rose-700">
              {error}
            </div>
          )}
        </div>

        <div className="flex items-center justify-end gap-2 border-t border-gray-100 bg-gray-50/50 px-5 py-3">
          <button
            type="button"
            onClick={onClose}
            className="rounded-full bg-white px-4 py-2 text-sm font-semibold text-gray-600 ring-1 ring-gray-200 transition-colors hover:bg-gray-50"
          >
            Annuleren
          </button>
          <button
            type="button"
            onClick={submit}
            disabled={pending}
            className="inline-flex items-center gap-1.5 rounded-full bg-gradient-to-r from-pink-500 to-fuchsia-600 px-4 py-2 text-sm font-bold text-white shadow-sm transition-all hover:scale-105 disabled:cursor-not-allowed disabled:opacity-50"
          >
            {pending ? 'Bezig...' : 'Inplannen'}
          </button>
        </div>
      </div>
    </div>
  )
}

function Field({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <label className="block">
      <span className="mb-1 block text-[11px] font-bold uppercase tracking-wider text-gray-500">
        {label}
      </span>
      {children}
    </label>
  )
}
