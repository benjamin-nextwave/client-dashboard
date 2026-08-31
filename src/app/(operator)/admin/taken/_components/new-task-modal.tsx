'use client'

import { useEffect, useState, useTransition } from 'react'
import {
  TASK_PERSONS,
  TASK_PERSON_LABEL,
  type ManualTaskClientOption,
  type TaskPerson,
} from '@/lib/data/controle'
import { addTask } from '../actions'

interface Props {
  clientOptions: ManualTaskClientOption[]
  onClose: () => void
  onAdded: () => void
}

export function NewTaskModal({ clientOptions, onClose, onAdded }: Props) {
  const [clientId, setClientId] = useState('')
  const [assignee, setAssignee] = useState<TaskPerson | ''>('')
  const [requestedBy, setRequestedBy] = useState<TaskPerson | ''>('')
  const [task, setTask] = useState('')
  const [raw, setRaw] = useState('')

  const [preview, setPreview] = useState<string | null>(null)
  const [previewFor, setPreviewFor] = useState('')
  const [checking, setChecking] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [saving, startSaving] = useTransition()

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => { if (e.key === 'Escape') onClose() }
    window.addEventListener('keydown', onKey)
    return () => window.removeEventListener('keydown', onKey)
  }, [onClose])

  // De voorvertoning hoort bij de tekst waarvoor hij is gemaakt. Typt iemand
  // verder, dan is hij niet meer geldig en verdwijnt hij.
  const previewStale = preview !== null && raw.trim() !== previewFor

  async function runPreview() {
    const text = raw.trim()
    if (text.length === 0) return
    setChecking(true)
    setError(null)
    try {
      const res = await fetch('/api/admin/taken/beschrijving', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ text }),
      })
      const data = (await res.json()) as { text?: string; error?: string }
      if (!res.ok) {
        setPreview(null)
        setError(data.error ?? 'Het opschonen is mislukt.')
        return
      }
      setPreview(data.text ?? '')
      setPreviewFor(text)
    } catch {
      setError('Het opschonen is mislukt. Probeer het opnieuw.')
    } finally {
      setChecking(false)
    }
  }

  function submit() {
    setError(null)
    if (!clientId) return setError('Kies een klant.')
    if (!assignee) return setError('Kies voor wie de taak is.')
    if (!requestedBy) return setError('Kies namens wie de taak is.')
    if (task.trim().length === 0) return setError('Vul de taak in.')

    startSaving(async () => {
      const result = await addTask({
        clientId,
        assignee,
        requestedBy,
        task,
        rawDescription: raw,
      })
      if (result.error) {
        setError(result.error)
        return
      }
      onAdded()
    })
  }

  const busy = saving || checking

  return (
    <div className="fixed inset-0 z-50 flex items-start justify-center overflow-y-auto bg-gray-900/40 p-4 backdrop-blur-sm sm:p-8">
      <div className="w-full max-w-2xl rounded-2xl border border-gray-200 bg-white shadow-2xl">
        <div className="flex items-center justify-between border-b border-gray-100 px-6 py-4">
          <h2 className="text-lg font-semibold tracking-tight text-gray-900">Nieuwe taak</h2>
          <button
            type="button"
            onClick={onClose}
            aria-label="Sluiten"
            className="flex h-8 w-8 items-center justify-center rounded-lg text-gray-400 transition-colors hover:bg-gray-100 hover:text-gray-700"
          >
            <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" strokeWidth={2} stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" d="M6 18 18 6M6 6l12 12" />
            </svg>
          </button>
        </div>

        <div className="space-y-5 px-6 py-5">
          <Field label="Klant">
            <select
              value={clientId}
              onChange={(e) => setClientId(e.target.value)}
              className="w-full rounded-xl border border-gray-200 bg-white px-3 py-2.5 text-sm text-gray-900 focus:border-indigo-400 focus:outline-none focus:ring-4 focus:ring-indigo-100"
            >
              <option value="">Kies een klant…</option>
              {clientOptions.map((c) => (
                <option key={c.id} value={c.id}>{c.companyName}</option>
              ))}
            </select>
          </Field>

          <div className="grid gap-4 sm:grid-cols-2">
            <Field label="Voor wie">
              <PersonPicker value={assignee} onChange={setAssignee} name="voor" />
            </Field>
            <Field label="Namens wie">
              <PersonPicker value={requestedBy} onChange={setRequestedBy} name="namens" />
            </Field>
          </div>

          <Field label="Taak">
            <input
              type="text"
              value={task}
              onChange={(e) => setTask(e.target.value)}
              placeholder="Bijv. Campagne pauzeren en klant informeren"
              className="w-full rounded-xl border border-gray-200 bg-white px-3 py-2.5 text-sm text-gray-900 placeholder:text-gray-400 focus:border-indigo-400 focus:outline-none focus:ring-4 focus:ring-indigo-100"
            />
          </Field>

          <Field
            label="Beschrijving"
            hint="Optioneel. Wordt automatisch omgezet naar een feitelijke opsomming — oordelen, stemming en aandrang vallen weg. Alleen die opsomming wordt opgeslagen, jouw tekst niet."
          >
            <textarea
              value={raw}
              onChange={(e) => setRaw(e.target.value)}
              rows={5}
              placeholder="Schrijf op wat er speelt. Hoe je het opschrijft maakt niet uit — er wordt toch een zakelijke lijst van gemaakt."
              className="w-full resize-y rounded-xl border border-gray-200 bg-white px-3 py-2.5 text-sm text-gray-900 placeholder:text-gray-400 focus:border-indigo-400 focus:outline-none focus:ring-4 focus:ring-indigo-100"
            />
            {raw.trim().length > 0 && (
              <div className="mt-2 flex items-center gap-3">
                <button
                  type="button"
                  onClick={runPreview}
                  disabled={busy}
                  className="inline-flex items-center gap-1.5 rounded-lg border border-gray-200 bg-white px-3 py-1.5 text-xs font-semibold text-gray-700 shadow-sm transition-colors hover:border-indigo-200 hover:text-indigo-700 disabled:opacity-50"
                >
                  {checking ? 'Bezig…' : preview ? 'Opnieuw omzetten' : 'Toon wat er wordt opgeslagen'}
                </button>
                {previewStale && (
                  <span className="text-[11px] text-amber-600">
                    Tekst gewijzigd — de voorvertoning hieronder is verouderd.
                  </span>
                )}
              </div>
            )}
            {preview !== null && (
              <div className="mt-2 rounded-xl border border-emerald-200 bg-emerald-50/60 px-3 py-2.5">
                <div className="mb-1 text-[10px] font-bold uppercase tracking-wide text-emerald-700">
                  Dit wordt opgeslagen
                </div>
                <pre className="whitespace-pre-wrap font-sans text-xs leading-relaxed text-gray-800">{preview}</pre>
              </div>
            )}
          </Field>

          {error && (
            <p className="rounded-xl border border-red-200 bg-red-50 px-3 py-2 text-xs font-medium text-red-700">
              {error}
            </p>
          )}
        </div>

        <div className="flex items-center justify-between gap-3 border-t border-gray-100 px-6 py-4">
          <p className="text-[11px] text-gray-400">
            De beschrijving wordt bij het opslaan nog een keer gecontroleerd.
          </p>
          <div className="flex gap-2">
            <button
              type="button"
              onClick={onClose}
              disabled={busy}
              className="rounded-xl border border-gray-200 bg-white px-4 py-2.5 text-xs font-semibold text-gray-600 transition-colors hover:bg-gray-50 disabled:opacity-50"
            >
              Annuleren
            </button>
            <button
              type="button"
              onClick={submit}
              disabled={busy}
              className="inline-flex items-center gap-1.5 rounded-xl bg-gradient-to-br from-indigo-600 to-violet-600 px-5 py-2.5 text-xs font-bold text-white shadow-sm shadow-indigo-500/30 transition-all hover:-translate-y-0.5 disabled:opacity-50 disabled:hover:translate-y-0"
            >
              {saving ? 'Opslaan…' : 'Taak aanmaken'}
            </button>
          </div>
        </div>
      </div>
    </div>
  )
}

function Field({
  label,
  hint,
  children,
}: {
  label: string
  hint?: string
  children: React.ReactNode
}) {
  return (
    <div>
      <label className="mb-1.5 block text-xs font-bold uppercase tracking-wide text-gray-500">
        {label}
      </label>
      {hint && <p className="mb-2 text-[11px] leading-snug text-gray-500">{hint}</p>}
      {children}
    </div>
  )
}

function PersonPicker({
  value,
  onChange,
  name,
}: {
  value: TaskPerson | ''
  onChange: (v: TaskPerson) => void
  name: string
}) {
  return (
    <div className="inline-flex w-full rounded-xl border border-gray-200 bg-gray-50 p-1">
      {TASK_PERSONS.map((p) => (
        <button
          key={p}
          type="button"
          onClick={() => onChange(p)}
          aria-pressed={value === p}
          aria-label={`${name}: ${TASK_PERSON_LABEL[p]}`}
          className={`flex-1 rounded-lg px-2 py-2 text-xs font-semibold transition-all ${
            value === p ? 'bg-white text-gray-900 shadow-sm' : 'text-gray-500 hover:text-gray-900'
          }`}
        >
          {TASK_PERSON_LABEL[p]}
        </button>
      ))}
    </div>
  )
}
