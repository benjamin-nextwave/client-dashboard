'use client'

import { useState, useTransition } from 'react'
import {
  addActivity,
  deleteActivity,
  resetRecord,
  saveRecord,
  setRecordLabels,
  updateActivity,
} from '../_lib/actions'
import {
  ACTIVITY_META,
  CRM_ACTIVITY_TYPES,
  CRM_PRIORITIES,
  CRM_STAGES,
  STAGE_META,
} from '../_lib/constants'
import { LABEL_META } from '@/lib/data/campaign-leads'
import type {
  CrmActivityType,
  CrmEntry,
  CrmLabel,
  CrmPriority,
  CrmRecord,
  CrmRecordPatch,
  CrmStageId,
} from '../_lib/types'
import {
  displayCompany,
  displayName,
  formatDateTime,
  initialsOf,
  priorityOf,
  stageOf,
  todayInput,
} from '../_lib/view'

type Tab = 'gegevens' | 'tijdlijn' | 'email'

type FormState = {
  contactName: string
  companyName: string
  jobTitle: string
  phone: string
  website: string
  linkedinUrl: string
  ownerName: string
  priority: CrmPriority
  dealValue: string
  expectedCloseDate: string
  nextAction: string
  nextActionAt: string
  notes: string
}

function formFrom(entry: CrmEntry): FormState {
  const r = entry.record
  return {
    contactName: r?.contactName ?? entry.leadName ?? '',
    companyName: r?.companyName ?? entry.leadCompany ?? '',
    jobTitle: r?.jobTitle ?? '',
    phone: r?.phone ?? '',
    website: r?.website ?? '',
    linkedinUrl: r?.linkedinUrl ?? '',
    ownerName: r?.ownerName ?? '',
    priority: priorityOf(entry),
    dealValue: r && r.dealValue !== null ? String(r.dealValue) : '',
    expectedCloseDate: r?.expectedCloseDate ?? '',
    nextAction: r?.nextAction ?? '',
    nextActionAt: r?.nextActionAt ?? '',
    notes: r?.notes ?? '',
  }
}

function Field({
  label,
  children,
}: {
  label: string
  children: React.ReactNode
}) {
  return (
    <label className="block">
      <span className="text-[11px] font-semibold uppercase tracking-wider text-gray-500">
        {label}
      </span>
      <span className="mt-1 block">{children}</span>
    </label>
  )
}

const inputClass =
  'block w-full rounded-lg border border-gray-300 bg-white px-3 py-2 text-sm text-gray-900 outline-none transition focus:border-gray-900 disabled:bg-gray-50 disabled:text-gray-500'

export function CrmDetail({
  entry,
  labels,
  onClose,
  onRecordChange,
  onRecordReset,
  onStageChange,
  onManageLabels,
}: {
  entry: CrmEntry
  labels: CrmLabel[]
  onClose: () => void
  onRecordChange: (leadKey: string, record: CrmRecord) => void
  onRecordReset: (leadKey: string) => void
  onStageChange: (key: string, from: CrmStageId, to: CrmStageId) => void
  onManageLabels: () => void
}) {
  const [tab, setTab] = useState<Tab>('gegevens')
  const [form, setForm] = useState<FormState>(() => formFrom(entry))
  const [dirty, setDirty] = useState(false)
  const [saved, setSaved] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [pending, startTransition] = useTransition()

  const [activityType, setActivityType] = useState<CrmActivityType>('notitie')
  const [activityBody, setActivityBody] = useState('')
  const [activityDate, setActivityDate] = useState(todayInput())
  const [editingActivityId, setEditingActivityId] = useState<string | null>(null)
  const [editingBody, setEditingBody] = useState('')

  const stage = stageOf(entry)
  const assignedIds = new Set(entry.record?.labelIds ?? [])
  const activities = entry.record?.activities ?? []

  function set<K extends keyof FormState>(key: K, value: FormState[K]) {
    setForm((f) => ({ ...f, [key]: value }))
    setDirty(true)
    setSaved(false)
  }

  function apply(record: CrmRecord) {
    onRecordChange(entry.key, record)
  }

  function handleSave() {
    setError(null)
    const parsedValue = form.dealValue.trim().replace(',', '.')
    const patch: CrmRecordPatch = {
      contactName: form.contactName,
      companyName: form.companyName,
      jobTitle: form.jobTitle,
      phone: form.phone,
      website: form.website,
      linkedinUrl: form.linkedinUrl,
      ownerName: form.ownerName,
      priority: form.priority,
      dealValue: parsedValue === '' ? null : Number(parsedValue),
      expectedCloseDate: form.expectedCloseDate,
      nextAction: form.nextAction,
      nextActionAt: form.nextActionAt,
      notes: form.notes,
    }
    if (patch.dealValue !== null && !Number.isFinite(patch.dealValue as number)) {
      setError('Dealwaarde moet een getal zijn.')
      return
    }
    startTransition(async () => {
      const res = await saveRecord(entry.key, patch)
      if (!res.ok) {
        setError(res.error)
        return
      }
      apply(res.value)
      setForm(formFrom({ ...entry, record: res.value }))
      setDirty(false)
      setSaved(true)
    })
  }

  function toggleLabel(labelId: string) {
    setError(null)
    const next = new Set(assignedIds)
    if (next.has(labelId)) next.delete(labelId)
    else next.add(labelId)
    startTransition(async () => {
      const res = await setRecordLabels(entry.key, [...next])
      if (!res.ok) {
        setError(res.error)
        return
      }
      apply(res.value)
    })
  }

  function handleAddActivity(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault()
    setError(null)
    const occurredAt = activityDate ? new Date(activityDate).toISOString() : null
    startTransition(async () => {
      const res = await addActivity(entry.key, activityType, activityBody, occurredAt)
      if (!res.ok) {
        setError(res.error)
        return
      }
      apply(res.value)
      setActivityBody('')
    })
  }

  function handleSaveActivity(activityId: string, type: CrmActivityType) {
    setError(null)
    startTransition(async () => {
      const res = await updateActivity(entry.key, activityId, type, editingBody, null)
      if (!res.ok) {
        setError(res.error)
        return
      }
      apply(res.value)
      setEditingActivityId(null)
    })
  }

  function handleDeleteActivity(activityId: string) {
    if (!confirm('Deze tijdlijn-regel verwijderen?')) return
    setError(null)
    startTransition(async () => {
      const res = await deleteActivity(entry.key, activityId)
      if (!res.ok) {
        setError(res.error)
        return
      }
      apply(res.value)
    })
  }

  function handleReset() {
    if (
      !confirm(
        'Alle CRM-gegevens van deze lead wissen (fase, velden, labels, tijdlijn)?\n\n' +
          'De lead zelf en de e-mails in de inbox blijven ongewijzigd.'
      )
    )
      return
    setError(null)
    startTransition(async () => {
      const res = await resetRecord(entry.key)
      if (!res.ok) {
        setError(res.error)
        return
      }
      onRecordReset(entry.key)
      setForm(formFrom({ ...entry, record: null }))
      setDirty(false)
    })
  }

  const company = displayCompany(entry)

  return (
    <div className="fixed inset-0 z-40 flex justify-end">
      <div
        className="absolute inset-0 bg-gray-900/30 backdrop-blur-[2px]"
        onClick={onClose}
        aria-hidden
      />
      <aside className="relative flex h-full w-full max-w-xl flex-col bg-white shadow-2xl">
        {/* Header */}
        <header className="border-b border-gray-100 px-5 py-4">
          <div className="flex items-start gap-3">
            <span className="flex h-11 w-11 shrink-0 items-center justify-center rounded-full bg-gray-900 text-sm font-semibold text-white">
              {initialsOf(entry)}
            </span>
            <div className="min-w-0 flex-1">
              <h2 className="truncate text-lg font-semibold text-gray-900">
                {displayName(entry)}
              </h2>
              <p className="truncate text-sm text-gray-500">
                {company ? `${company} · ` : ''}
                <a href={`mailto:${entry.email}`} className="hover:text-gray-900 hover:underline">
                  {entry.email}
                </a>
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
          </div>

          {/* Fase-schakelaar */}
          <div className="mt-3 flex flex-wrap gap-1.5">
            {CRM_STAGES.map((s) => (
              <button
                key={s.id}
                type="button"
                disabled={pending}
                onClick={() => s.id !== stage && onStageChange(entry.key, stage, s.id)}
                className={`rounded-full border px-2.5 py-1 text-xs font-medium transition disabled:opacity-60 ${
                  s.id === stage
                    ? s.chip
                    : 'border-gray-200 bg-white text-gray-500 hover:border-gray-300 hover:text-gray-900'
                }`}
              >
                {s.name}
              </button>
            ))}
          </div>

          {/* Automatische classificatie uit de inbox — alleen ter info */}
          <p className="mt-2.5 flex items-center gap-1.5 text-[11px] text-gray-400">
            <span className={`h-1.5 w-1.5 rounded-full ${LABEL_META[entry.leadLabel].dot}`} />
            Inbox-classificatie: {LABEL_META[entry.leadLabel].short}
            {entry.hasReferral && <span className="text-rose-600">· doorverwijzing bekend</span>}
          </p>
        </header>

        {/* Tabs */}
        <nav className="flex gap-1 border-b border-gray-100 px-4">
          {(
            [
              ['gegevens', 'Gegevens'],
              ['tijdlijn', `Tijdlijn${activities.length > 0 ? ` (${activities.length})` : ''}`],
              ['email', 'E-mail'],
            ] as const
          ).map(([id, label]) => (
            <button
              key={id}
              type="button"
              onClick={() => setTab(id)}
              className={`-mb-px border-b-2 px-3 py-2.5 text-sm font-medium transition ${
                tab === id
                  ? 'border-gray-900 text-gray-900'
                  : 'border-transparent text-gray-500 hover:text-gray-800'
              }`}
            >
              {label}
            </button>
          ))}
        </nav>

        <div className="flex-1 overflow-y-auto px-5 py-4">
          {error && (
            <p className="mb-3 rounded-lg bg-rose-50 px-3 py-2 text-xs text-rose-700">{error}</p>
          )}

          {tab === 'gegevens' && (
            <div className="space-y-4">
              <div className="grid grid-cols-2 gap-3">
                <Field label="Contactpersoon">
                  <input
                    className={inputClass}
                    value={form.contactName}
                    onChange={(e) => set('contactName', e.target.value)}
                    disabled={pending}
                  />
                </Field>
                <Field label="Functie">
                  <input
                    className={inputClass}
                    value={form.jobTitle}
                    onChange={(e) => set('jobTitle', e.target.value)}
                    disabled={pending}
                    placeholder="Bijv. Operations Manager"
                  />
                </Field>
                <Field label="Bedrijf">
                  <input
                    className={inputClass}
                    value={form.companyName}
                    onChange={(e) => set('companyName', e.target.value)}
                    disabled={pending}
                  />
                </Field>
                <Field label="Telefoon">
                  <input
                    className={inputClass}
                    value={form.phone}
                    onChange={(e) => set('phone', e.target.value)}
                    disabled={pending}
                    placeholder="+31 6 ..."
                  />
                </Field>
                <Field label="Website">
                  <input
                    className={inputClass}
                    value={form.website}
                    onChange={(e) => set('website', e.target.value)}
                    disabled={pending}
                    placeholder="https://"
                  />
                </Field>
                <Field label="LinkedIn">
                  <input
                    className={inputClass}
                    value={form.linkedinUrl}
                    onChange={(e) => set('linkedinUrl', e.target.value)}
                    disabled={pending}
                    placeholder="https://linkedin.com/in/..."
                  />
                </Field>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <Field label="Prioriteit">
                  <select
                    className={inputClass}
                    value={form.priority}
                    onChange={(e) => set('priority', e.target.value as CrmPriority)}
                    disabled={pending}
                  >
                    {CRM_PRIORITIES.map((p) => (
                      <option key={p.id} value={p.id}>
                        {p.name}
                      </option>
                    ))}
                  </select>
                </Field>
                <Field label="Eigenaar">
                  <input
                    className={inputClass}
                    value={form.ownerName}
                    onChange={(e) => set('ownerName', e.target.value)}
                    disabled={pending}
                    placeholder="Wie pakt deze lead op?"
                  />
                </Field>
                <Field label="Dealwaarde (€)">
                  <input
                    className={inputClass}
                    value={form.dealValue}
                    onChange={(e) => set('dealValue', e.target.value)}
                    disabled={pending}
                    inputMode="decimal"
                    placeholder="0"
                  />
                </Field>
                <Field label="Verwachte sluitdatum">
                  <input
                    type="date"
                    className={inputClass}
                    value={form.expectedCloseDate}
                    onChange={(e) => set('expectedCloseDate', e.target.value)}
                    disabled={pending}
                  />
                </Field>
              </div>

              <div className="rounded-xl border border-gray-200 p-3">
                <p className="mb-2 text-[11px] font-semibold uppercase tracking-wider text-gray-500">
                  Volgende actie
                </p>
                <div className="grid grid-cols-[1fr_auto] gap-2">
                  <input
                    className={inputClass}
                    value={form.nextAction}
                    onChange={(e) => set('nextAction', e.target.value)}
                    disabled={pending}
                    placeholder="Bijv. Terugbellen over offerte"
                  />
                  <input
                    type="date"
                    className={inputClass}
                    value={form.nextActionAt}
                    onChange={(e) => set('nextActionAt', e.target.value)}
                    disabled={pending}
                  />
                </div>
              </div>

              <Field label="Notities">
                <textarea
                  className={`${inputClass} min-h-[110px] resize-y`}
                  value={form.notes}
                  onChange={(e) => set('notes', e.target.value)}
                  disabled={pending}
                  placeholder="Vrije aantekeningen over deze lead…"
                />
              </Field>

              {/* Labels */}
              <div>
                <div className="mb-2 flex items-center justify-between">
                  <span className="text-[11px] font-semibold uppercase tracking-wider text-gray-500">
                    Labels
                  </span>
                  <button
                    type="button"
                    onClick={onManageLabels}
                    className="text-xs font-medium text-gray-600 hover:text-gray-900"
                  >
                    Beheren
                  </button>
                </div>
                {labels.length === 0 ? (
                  <p className="rounded-lg border border-dashed border-gray-200 px-3 py-3 text-xs text-gray-500">
                    Nog geen labels aangemaakt.{' '}
                    <button
                      type="button"
                      onClick={onManageLabels}
                      className="font-medium text-gray-900 underline"
                    >
                      Maak er één
                    </button>
                    .
                  </p>
                ) : (
                  <div className="flex flex-wrap gap-1.5">
                    {labels.map((label) => {
                      const active = assignedIds.has(label.id)
                      return (
                        <button
                          key={label.id}
                          type="button"
                          onClick={() => toggleLabel(label.id)}
                          disabled={pending}
                          className={`inline-flex items-center gap-1.5 rounded-full border px-2.5 py-1 text-xs font-medium transition disabled:opacity-60 ${
                            active
                              ? 'border-transparent'
                              : 'border-gray-200 bg-white text-gray-600 hover:border-gray-300'
                          }`}
                          style={
                            active
                              ? { backgroundColor: `${label.color}1a`, color: label.color }
                              : undefined
                          }
                        >
                          <span
                            className="h-2 w-2 rounded-full"
                            style={{ backgroundColor: label.color }}
                          />
                          {label.name}
                        </button>
                      )
                    })}
                  </div>
                )}
              </div>

              <div className="border-t border-gray-100 pt-3">
                <button
                  type="button"
                  onClick={handleReset}
                  disabled={pending || entry.record === null}
                  className="text-xs font-medium text-gray-400 hover:text-rose-600 disabled:opacity-40"
                >
                  CRM-gegevens van deze lead wissen
                </button>
                <p className="mt-1 text-[11px] text-gray-400">
                  De lead en de e-mails in de inbox blijven altijd ongewijzigd.
                </p>
              </div>
            </div>
          )}

          {tab === 'tijdlijn' && (
            <div className="space-y-4">
              <form onSubmit={handleAddActivity} className="rounded-xl border border-gray-200 p-3">
                <div className="flex gap-2">
                  <select
                    className={`${inputClass} w-40`}
                    value={activityType}
                    onChange={(e) => setActivityType(e.target.value as CrmActivityType)}
                    disabled={pending}
                  >
                    {CRM_ACTIVITY_TYPES.filter((a) => a.id !== 'fase').map((a) => (
                      <option key={a.id} value={a.id}>
                        {a.name}
                      </option>
                    ))}
                  </select>
                  <input
                    type="date"
                    className={inputClass}
                    value={activityDate}
                    onChange={(e) => setActivityDate(e.target.value)}
                    disabled={pending}
                  />
                </div>
                <textarea
                  className={`${inputClass} mt-2 min-h-[70px] resize-y`}
                  value={activityBody}
                  onChange={(e) => setActivityBody(e.target.value)}
                  disabled={pending}
                  placeholder="Wat is er gebeurd of afgesproken?"
                />
                <div className="mt-2 flex justify-end">
                  <button
                    type="submit"
                    disabled={pending || !activityBody.trim()}
                    className="rounded-lg bg-gray-900 px-4 py-1.5 text-sm font-medium text-white hover:bg-gray-800 disabled:opacity-50"
                  >
                    Toevoegen
                  </button>
                </div>
              </form>

              {activities.length === 0 ? (
                <p className="rounded-xl border border-dashed border-gray-200 px-4 py-8 text-center text-sm text-gray-500">
                  Nog geen activiteiten vastgelegd.
                </p>
              ) : (
                <ol className="space-y-2.5">
                  {activities.map((activity) => (
                    <li key={activity.id} className="rounded-xl border border-gray-200 p-3">
                      <div className="flex items-center gap-2">
                        <span
                          className={`rounded-full px-2 py-0.5 text-[10px] font-semibold ${ACTIVITY_META[activity.type].chip}`}
                        >
                          {ACTIVITY_META[activity.type].name}
                        </span>
                        <span className="flex-1 text-[11px] text-gray-400">
                          {formatDateTime(activity.occurredAt)}
                        </span>
                        {activity.type !== 'fase' && (
                          <>
                            <button
                              type="button"
                              onClick={() => {
                                setEditingActivityId(activity.id)
                                setEditingBody(activity.body)
                              }}
                              className="rounded p-1 text-gray-400 hover:bg-gray-100 hover:text-gray-700"
                              aria-label="Bewerken"
                            >
                              <svg className="h-3.5 w-3.5" fill="none" viewBox="0 0 24 24" strokeWidth={1.8} stroke="currentColor">
                                <path strokeLinecap="round" strokeLinejoin="round" d="m16.862 4.487 1.687-1.688a1.875 1.875 0 1 1 2.652 2.652L10.582 16.07a4.5 4.5 0 0 1-1.897 1.13L6 18l.8-2.685a4.5 4.5 0 0 1 1.13-1.897l8.932-8.931Z" />
                              </svg>
                            </button>
                            <button
                              type="button"
                              onClick={() => handleDeleteActivity(activity.id)}
                              disabled={pending}
                              className="rounded p-1 text-gray-400 hover:bg-rose-50 hover:text-rose-600 disabled:opacity-50"
                              aria-label="Verwijderen"
                            >
                              <svg className="h-3.5 w-3.5" fill="none" viewBox="0 0 24 24" strokeWidth={1.8} stroke="currentColor">
                                <path strokeLinecap="round" strokeLinejoin="round" d="m14.74 9-.346 9m-4.788 0L9.26 9m9.968-3.21c.342.052.682.107 1.022.166M18.16 19.673a2.25 2.25 0 0 1-2.244 2.077H8.084a2.25 2.25 0 0 1-2.244-2.077L4.772 5.79m14.456 0a48.108 48.108 0 0 0-3.478-.397m-12 .562c.34-.059.68-.114 1.022-.165" />
                              </svg>
                            </button>
                          </>
                        )}
                      </div>
                      {editingActivityId === activity.id ? (
                        <div className="mt-2">
                          <textarea
                            className={`${inputClass} min-h-[70px] resize-y`}
                            value={editingBody}
                            onChange={(e) => setEditingBody(e.target.value)}
                            disabled={pending}
                          />
                          <div className="mt-2 flex justify-end gap-2">
                            <button
                              type="button"
                              onClick={() => setEditingActivityId(null)}
                              className="rounded-lg px-3 py-1.5 text-xs font-medium text-gray-600 hover:bg-gray-100"
                            >
                              Annuleren
                            </button>
                            <button
                              type="button"
                              onClick={() => handleSaveActivity(activity.id, activity.type)}
                              disabled={pending || !editingBody.trim()}
                              className="rounded-lg bg-gray-900 px-3 py-1.5 text-xs font-medium text-white hover:bg-gray-800 disabled:opacity-50"
                            >
                              Opslaan
                            </button>
                          </div>
                        </div>
                      ) : (
                        <p className="mt-1.5 whitespace-pre-wrap text-sm text-gray-800">
                          {activity.body}
                        </p>
                      )}
                    </li>
                  ))}
                </ol>
              )}
            </div>
          )}

          {tab === 'email' && (
            <div className="space-y-4">
              <p className="rounded-lg bg-gray-50 px-3 py-2 text-[11px] text-gray-500">
                Alleen-lezen kopie uit de inbox. Beantwoorden doe je in de Lead Inbox.
              </p>
              <section className="rounded-xl border border-gray-200">
                <header className="border-b border-gray-100 px-3 py-2">
                  <p className="text-[11px] font-semibold uppercase tracking-wider text-gray-500">
                    Reactie van de lead
                  </p>
                  <p className="mt-0.5 truncate text-sm font-medium text-gray-900">
                    {entry.replySubject ?? '(geen onderwerp)'}
                  </p>
                  <p className="text-[11px] text-gray-400">{formatDateTime(entry.receivedAt)}</p>
                </header>
                <p className="max-h-72 overflow-y-auto whitespace-pre-wrap px-3 py-2.5 text-sm text-gray-700">
                  {entry.replyBody?.trim() || 'Geen tekst beschikbaar.'}
                </p>
              </section>

              <section className="rounded-xl border border-gray-200">
                <header className="border-b border-gray-100 px-3 py-2">
                  <p className="text-[11px] font-semibold uppercase tracking-wider text-gray-500">
                    Ons laatste bericht
                  </p>
                  <p className="mt-0.5 truncate text-sm font-medium text-gray-900">
                    {entry.sentSubject ?? '(geen onderwerp)'}
                  </p>
                </header>
                <p className="max-h-72 overflow-y-auto whitespace-pre-wrap px-3 py-2.5 text-sm text-gray-700">
                  {entry.sentBody?.trim() || 'Geen tekst beschikbaar.'}
                </p>
              </section>
            </div>
          )}
        </div>

        {/* Footer */}
        {tab === 'gegevens' && (
          <footer className="flex items-center justify-between gap-3 border-t border-gray-100 bg-gray-50/70 px-5 py-3">
            <span className="text-xs text-gray-500">
              {saved && !dirty ? (
                <span className="text-emerald-600">Opgeslagen</span>
              ) : dirty ? (
                'Niet-opgeslagen wijzigingen'
              ) : (
                `Fase: ${STAGE_META[stage].name}`
              )}
            </span>
            <div className="flex gap-2">
              <button
                type="button"
                onClick={onClose}
                className="rounded-lg px-3 py-2 text-sm font-medium text-gray-600 hover:bg-gray-100"
              >
                Sluiten
              </button>
              <button
                type="button"
                onClick={handleSave}
                disabled={pending || !dirty}
                className="rounded-lg bg-gray-900 px-4 py-2 text-sm font-medium text-white hover:bg-gray-800 disabled:opacity-50"
              >
                {pending ? 'Opslaan…' : 'Opslaan'}
              </button>
            </div>
          </footer>
        )}
      </aside>
    </div>
  )
}
