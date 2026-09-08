'use client'

import { useEffect, useState, useTransition } from 'react'
import {
  type ControleTaskRow,
  type ManualTaskClientOption,
  type TaskPerson,
} from '@/lib/data/controle'
import { updateTask } from '../actions'
import { Field, NotifyToggle, PersonPicker } from './task-form-fields'

interface Props {
  task: ControleTaskRow
  clientOptions: ManualTaskClientOption[]
  onClose: () => void
  onSaved: () => void
}

export function EditTaskModal({ task, clientOptions, onClose, onSaved }: Props) {
  const [clientId, setClientId] = useState(task.clientId)
  const [assignee, setAssignee] = useState<TaskPerson | ''>(task.assignee ?? '')
  const [requestedBy, setRequestedBy] = useState<TaskPerson | ''>(task.requestedBy ?? '')
  const [description, setDescription] = useState(task.description)
  const [details, setDetails] = useState(task.details ?? '')
  const [notifyOnComplete, setNotifyOnComplete] = useState(task.notifyOnComplete)

  const [error, setError] = useState<string | null>(null)
  const [saving, startSaving] = useTransition()

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => { if (e.key === 'Escape') onClose() }
    window.addEventListener('keydown', onKey)
    return () => window.removeEventListener('keydown', onKey)
  }, [onClose])

  // De klant kan sinds het aanmaken uit de keuzelijst zijn verdwenen. Zonder
  // deze regel zou het veld leeg openen en de taak stilzwijgend verhuizen.
  const clientMissing = !clientOptions.some((c) => c.id === task.clientId)

  function submit() {
    setError(null)
    if (!clientId) return setError('Kies een klant.')
    if (!assignee) return setError('Kies voor wie de taak is.')
    if (!requestedBy) return setError('Kies namens wie de taak is.')
    if (description.trim().length === 0) return setError('Vul de taak in.')

    startSaving(async () => {
      const result = await updateTask({
        taskId: task.id,
        clientId,
        assignee,
        requestedBy,
        task: description,
        details,
        notifyOnComplete,
      })
      if (result.error) {
        setError(result.error)
        return
      }
      onSaved()
    })
  }

  return (
    <div className="fixed inset-0 z-50 flex items-start justify-center overflow-y-auto bg-gray-900/40 p-4 backdrop-blur-sm sm:p-8">
      <div className="w-full max-w-2xl rounded-2xl border border-gray-200 bg-white shadow-2xl">
        <div className="flex items-center justify-between border-b border-gray-100 px-6 py-4">
          <h2 className="text-lg font-semibold tracking-tight text-gray-900">Taak bewerken</h2>
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
              {clientMissing && (
                <option value={task.clientId}>{task.companyName}</option>
              )}
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

          <NotifyToggle
            value={notifyOnComplete}
            onChange={setNotifyOnComplete}
            requestedBy={requestedBy}
          />

          <Field label="Taak">
            <input
              type="text"
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              placeholder="Bijv. Campagne pauzeren en klant informeren"
              className="w-full rounded-xl border border-gray-200 bg-white px-3 py-2.5 text-sm text-gray-900 placeholder:text-gray-400 focus:border-indigo-400 focus:outline-none focus:ring-4 focus:ring-indigo-100"
            />
          </Field>

          <Field
            label="Beschrijving"
            hint="Dit is de tekst zoals hij nu op de taak staat. Wat je hier neerzet wordt letterlijk opgeslagen — er gaat geen model meer overheen. Regels die met een streepje beginnen worden als opsomming getoond, regels zonder streepje als kopje."
          >
            <textarea
              value={details}
              onChange={(e) => setDetails(e.target.value)}
              rows={6}
              placeholder="Leeg laten kan ook."
              className="w-full resize-y rounded-xl border border-gray-200 bg-white px-3 py-2.5 font-mono text-xs leading-relaxed text-gray-900 placeholder:text-gray-400 focus:border-indigo-400 focus:outline-none focus:ring-4 focus:ring-indigo-100"
            />
          </Field>

          {error && (
            <p className="rounded-xl border border-red-200 bg-red-50 px-3 py-2 text-xs font-medium text-red-700">
              {error}
            </p>
          )}
        </div>

        <div className="flex items-center justify-end gap-2 border-t border-gray-100 px-6 py-4">
          <button
            type="button"
            onClick={onClose}
            disabled={saving}
            className="rounded-xl border border-gray-200 bg-white px-4 py-2.5 text-xs font-semibold text-gray-600 transition-colors hover:bg-gray-50 disabled:opacity-50"
          >
            Annuleren
          </button>
          <button
            type="button"
            onClick={submit}
            disabled={saving}
            className="inline-flex items-center gap-1.5 rounded-xl bg-gradient-to-br from-indigo-600 to-violet-600 px-5 py-2.5 text-xs font-bold text-white shadow-sm shadow-indigo-500/30 transition-all hover:-translate-y-0.5 disabled:opacity-50 disabled:hover:translate-y-0"
          >
            {saving ? 'Opslaan…' : 'Opslaan'}
          </button>
        </div>
      </div>
    </div>
  )
}
