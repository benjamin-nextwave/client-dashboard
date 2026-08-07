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
// Eén bron voor de categoriestippen, zodat CRM, Lead inbox en Campagne leads
// dezelfde kleuren tonen.
import { LABEL_DOT } from '../../campagne-leads/_components/lead-meta'
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
    nextAction: r?.nextAction ?? '',
    nextActionAt: r?.nextActionAt ?? '',
    notes: r?.notes ?? '',
  }
}

function Field({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <label className="block">
      <span className="text-[11.5px] font-medium text-muted">{label}</span>
      <span className="mt-1 block">{children}</span>
    </label>
  )
}

const inputClass =
  'block w-full rounded-control border border-line bg-panel px-3 py-2 text-[12.5px] text-fg outline-none transition-colors focus:border-[var(--brand-40)] disabled:bg-track disabled:text-faint'

const primaryButtonClass =
  'rounded-control bg-ink px-4 py-2 text-[12.5px] font-medium text-white transition-opacity hover:opacity-90 disabled:opacity-50'

const ghostButtonClass =
  'rounded-control px-3 py-2 text-[12.5px] font-medium text-muted transition-colors hover:bg-[var(--brand-08)] hover:text-fg'

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
    const patch: CrmRecordPatch = {
      contactName: form.contactName,
      companyName: form.companyName,
      jobTitle: form.jobTitle,
      phone: form.phone,
      website: form.website,
      linkedinUrl: form.linkedinUrl,
      ownerName: form.ownerName,
      priority: form.priority,
      nextAction: form.nextAction,
      nextActionAt: form.nextActionAt,
      notes: form.notes,
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
        className="absolute inset-0 bg-[color-mix(in_oklab,var(--color-ink)_35%,transparent)] backdrop-blur-[2px]"
        onClick={onClose}
        aria-hidden
      />
      <aside className="relative flex h-full w-full max-w-xl flex-col border-l border-line bg-panel shadow-2xl">
        {/* Header */}
        <header className="border-b border-line px-5 py-4">
          <div className="flex items-start gap-3">
            <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-[10px] bg-track text-[12.5px] font-semibold text-muted">
              {initialsOf(entry)}
            </span>
            <div className="min-w-0 flex-1">
              <h2 className="truncate text-[17px] font-semibold tracking-[-0.02em]">
                {displayName(entry)}
              </h2>
              <p className="truncate text-[12.5px] text-muted">
                {company ? `${company} · ` : ''}
                <a
                  href={`mailto:${entry.email}`}
                  className="transition-colors hover:text-fg hover:underline"
                >
                  {entry.email}
                </a>
              </p>
            </div>
            <button
              type="button"
              onClick={onClose}
              className="rounded-control p-1.5 text-faint transition-colors hover:bg-[var(--brand-08)] hover:text-fg"
              aria-label="Sluiten"
            >
              <svg
                className="h-[18px] w-[18px]"
                fill="none"
                viewBox="0 0 24 24"
                strokeWidth={1.8}
                stroke="currentColor"
                strokeLinecap="round"
                strokeLinejoin="round"
                aria-hidden
              >
                <path d="M6 18 18 6M6 6l12 12" />
              </svg>
            </button>
          </div>

          {/* Fase-schakelaar */}
          <div className="mt-3 flex flex-wrap gap-1.5">
            {CRM_STAGES.map((s) => {
              const active = s.id === stage
              return (
                <button
                  key={s.id}
                  type="button"
                  disabled={pending}
                  onClick={() => !active && onStageChange(entry.key, stage, s.id)}
                  title={s.description}
                  className={`inline-flex items-center gap-1.5 rounded-control border px-2.5 py-1 text-[11.5px] font-medium transition-colors disabled:opacity-60 ${
                    active
                      ? 'border-[var(--brand-32)] bg-[var(--brand-10)] text-fg'
                      : 'border-line bg-panel text-muted hover:bg-[var(--brand-08)]'
                  }`}
                >
                  <span
                    className="h-1.5 w-1.5 rounded-full"
                    style={{ background: s.color }}
                    aria-hidden
                  />
                  {s.name}
                </button>
              )
            })}
          </div>

          {/* Automatische classificatie uit de inbox — alleen ter info */}
          <p className="mt-2.5 flex items-center gap-1.5 text-[11px] text-faint">
            <span
              className="h-1.5 w-1.5 rounded-full"
              style={{ background: LABEL_DOT[entry.leadLabel] }}
              aria-hidden
            />
            Inbox-classificatie: {LABEL_META[entry.leadLabel].short}
            {entry.hasReferral && <span className="text-neg">· doorverwijzing bekend</span>}
          </p>
        </header>

        {/* Tabs */}
        <nav className="flex gap-1 border-b border-line px-4">
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
              className={`-mb-px border-b-2 px-3 py-2.5 text-[12.5px] font-medium transition-colors ${
                tab === id
                  ? 'border-brand text-fg'
                  : 'border-transparent text-muted hover:text-fg'
              }`}
            >
              {label}
            </button>
          ))}
        </nav>

        <div className="flex-1 overflow-y-auto px-5 py-4">
          {error && (
            <p className="mb-3 rounded-control border border-[color-mix(in_oklab,var(--color-neg)_28%,transparent)] bg-[color-mix(in_oklab,var(--color-neg)_8%,transparent)] px-3 py-2 text-[11.5px] text-neg">
              {error}
            </p>
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
              </div>

              <div className="rounded-panel border border-line p-3">
                <p className="mb-2 text-[11.5px] font-medium text-muted">Volgende actie</p>
                <div className="grid grid-cols-[1fr_auto] gap-2">
                  <input
                    className={inputClass}
                    value={form.nextAction}
                    onChange={(e) => set('nextAction', e.target.value)}
                    disabled={pending}
                    placeholder="Bijv. Terugbellen over offerte"
                    aria-label="Volgende actie"
                  />
                  <input
                    type="date"
                    className={inputClass}
                    value={form.nextActionAt}
                    onChange={(e) => set('nextActionAt', e.target.value)}
                    disabled={pending}
                    aria-label="Datum volgende actie"
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
                  <span className="text-[11.5px] font-medium text-muted">Labels</span>
                  <button
                    type="button"
                    onClick={onManageLabels}
                    className="text-[11.5px] font-medium text-muted transition-colors hover:text-fg"
                  >
                    Beheren
                  </button>
                </div>
                {labels.length === 0 ? (
                  <p className="rounded-control border border-dashed border-line px-3 py-3 text-[11.5px] text-muted">
                    Nog geen labels aangemaakt.{' '}
                    <button
                      type="button"
                      onClick={onManageLabels}
                      className="font-medium text-fg underline underline-offset-2"
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
                          aria-pressed={active}
                          className={`inline-flex items-center gap-1.5 rounded-control border px-2.5 py-1 text-[11.5px] font-medium transition-colors disabled:opacity-60 ${
                            active
                              ? 'border-[var(--brand-32)] bg-[var(--brand-10)] text-fg'
                              : 'border-line bg-panel text-muted hover:bg-[var(--brand-08)]'
                          }`}
                        >
                          <span
                            className="h-1.5 w-1.5 rounded-full"
                            style={{ background: label.color }}
                          />
                          {label.name}
                        </button>
                      )
                    })}
                  </div>
                )}
              </div>

              <div className="border-t border-line pt-3">
                <button
                  type="button"
                  onClick={handleReset}
                  disabled={pending || entry.record === null}
                  className="text-[11.5px] font-medium text-faint transition-colors hover:text-neg disabled:opacity-40"
                >
                  CRM-gegevens van deze lead wissen
                </button>
                <p className="mt-1 text-[11px] text-faint">
                  De lead en de e-mails in de inbox blijven altijd ongewijzigd.
                </p>
              </div>
            </div>
          )}

          {tab === 'tijdlijn' && (
            <div className="space-y-4">
              <form onSubmit={handleAddActivity} className="rounded-panel border border-line p-3">
                <div className="flex gap-2">
                  <select
                    className={`${inputClass} w-40`}
                    value={activityType}
                    onChange={(e) => setActivityType(e.target.value as CrmActivityType)}
                    disabled={pending}
                    aria-label="Soort activiteit"
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
                    aria-label="Datum activiteit"
                  />
                </div>
                <textarea
                  className={`${inputClass} mt-2 min-h-[70px] resize-y`}
                  value={activityBody}
                  onChange={(e) => setActivityBody(e.target.value)}
                  disabled={pending}
                  placeholder="Wat is er gebeurd of afgesproken?"
                  aria-label="Omschrijving activiteit"
                />
                <div className="mt-2 flex justify-end">
                  <button
                    type="submit"
                    disabled={pending || !activityBody.trim()}
                    className={primaryButtonClass}
                  >
                    Toevoegen
                  </button>
                </div>
              </form>

              {activities.length === 0 ? (
                <p className="rounded-panel border border-dashed border-line px-4 py-8 text-center text-[12.5px] text-muted">
                  Nog geen activiteiten vastgelegd.
                </p>
              ) : (
                <ol className="space-y-2.5">
                  {activities.map((activity) => (
                    <li key={activity.id} className="rounded-panel border border-line p-3">
                      <div className="flex items-center gap-2">
                        <span className="inline-flex items-center gap-1.5 whitespace-nowrap rounded-[5px] border border-line px-[7px] py-0.5 text-[10px] font-medium text-muted">
                          <span
                            className="h-[5px] w-[5px] rounded-full"
                            style={{ background: ACTIVITY_META[activity.type].color }}
                            aria-hidden
                          />
                          {ACTIVITY_META[activity.type].name}
                        </span>
                        <span className="flex-1 text-[11px] tabular-nums text-faint">
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
                              className="rounded-md p-1 text-faint transition-colors hover:bg-[var(--brand-08)] hover:text-fg"
                              aria-label="Bewerken"
                            >
                              <svg
                                className="h-3.5 w-3.5"
                                fill="none"
                                viewBox="0 0 24 24"
                                strokeWidth={1.8}
                                stroke="currentColor"
                                strokeLinecap="round"
                                strokeLinejoin="round"
                                aria-hidden
                              >
                                <path d="m16.862 4.487 1.687-1.688a1.875 1.875 0 1 1 2.652 2.652L10.582 16.07a4.5 4.5 0 0 1-1.897 1.13L6 18l.8-2.685a4.5 4.5 0 0 1 1.13-1.897l8.932-8.931Z" />
                              </svg>
                            </button>
                            <button
                              type="button"
                              onClick={() => handleDeleteActivity(activity.id)}
                              disabled={pending}
                              className="rounded-md p-1 text-faint transition-colors hover:bg-[color-mix(in_oklab,var(--color-neg)_10%,transparent)] hover:text-neg disabled:opacity-50"
                              aria-label="Verwijderen"
                            >
                              <svg
                                className="h-3.5 w-3.5"
                                fill="none"
                                viewBox="0 0 24 24"
                                strokeWidth={1.8}
                                stroke="currentColor"
                                strokeLinecap="round"
                                strokeLinejoin="round"
                                aria-hidden
                              >
                                <path d="m14.74 9-.346 9m-4.788 0L9.26 9m9.968-3.21c.342.052.682.107 1.022.166M18.16 19.673a2.25 2.25 0 0 1-2.244 2.077H8.084a2.25 2.25 0 0 1-2.244-2.077L4.772 5.79m14.456 0a48.108 48.108 0 0 0-3.478-.397m-12 .562c.34-.059.68-.114 1.022-.165" />
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
                            aria-label="Tekst bewerken"
                          />
                          <div className="mt-2 flex justify-end gap-2">
                            <button
                              type="button"
                              onClick={() => setEditingActivityId(null)}
                              className={ghostButtonClass}
                            >
                              Annuleren
                            </button>
                            <button
                              type="button"
                              onClick={() => handleSaveActivity(activity.id, activity.type)}
                              disabled={pending || !editingBody.trim()}
                              className={primaryButtonClass}
                            >
                              Opslaan
                            </button>
                          </div>
                        </div>
                      ) : (
                        <p className="mt-1.5 whitespace-pre-wrap text-[12.5px] leading-[1.6] text-fg">
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
              <p className="rounded-control bg-track px-3 py-2 text-[11px] text-muted">
                Alleen-lezen kopie uit de inbox. Beantwoorden doe je in de Lead Inbox.
              </p>
              <section className="rounded-panel border border-line">
                <header className="border-b border-line px-3 py-2">
                  <p className="text-[11.5px] font-medium text-muted">Reactie van de lead</p>
                  <p className="mt-0.5 truncate text-[12.5px] font-medium text-fg">
                    {entry.replySubject ?? '(geen onderwerp)'}
                  </p>
                  <p className="text-[11px] tabular-nums text-faint">
                    {formatDateTime(entry.receivedAt)}
                  </p>
                </header>
                <p className="max-h-72 overflow-y-auto whitespace-pre-wrap px-3 py-2.5 text-[12.5px] leading-[1.6] text-muted">
                  {entry.replyBody?.trim() || 'Geen tekst beschikbaar.'}
                </p>
              </section>

              <section className="rounded-panel border border-line">
                <header className="border-b border-line px-3 py-2">
                  <p className="text-[11.5px] font-medium text-muted">Ons laatste bericht</p>
                  <p className="mt-0.5 truncate text-[12.5px] font-medium text-fg">
                    {entry.sentSubject ?? '(geen onderwerp)'}
                  </p>
                </header>
                <p className="max-h-72 overflow-y-auto whitespace-pre-wrap px-3 py-2.5 text-[12.5px] leading-[1.6] text-muted">
                  {entry.sentBody?.trim() || 'Geen tekst beschikbaar.'}
                </p>
              </section>
            </div>
          )}
        </div>

        {/* Footer */}
        {tab === 'gegevens' && (
          <footer className="flex items-center justify-between gap-3 border-t border-line bg-track px-5 py-3">
            <span className="text-[11.5px] text-muted">
              {saved && !dirty ? (
                <span className="text-pos">Opgeslagen</span>
              ) : dirty ? (
                'Niet-opgeslagen wijzigingen'
              ) : (
                `Fase: ${STAGE_META[stage].name}`
              )}
            </span>
            <div className="flex gap-2">
              <button type="button" onClick={onClose} className={ghostButtonClass}>
                Sluiten
              </button>
              <button
                type="button"
                onClick={handleSave}
                disabled={pending || !dirty}
                className={primaryButtonClass}
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
