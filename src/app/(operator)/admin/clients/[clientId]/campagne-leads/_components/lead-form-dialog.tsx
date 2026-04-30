'use client'

import { useState, useTransition, type ReactNode } from 'react'
import { useRouter } from 'next/navigation'
import {
  LABEL_META,
  LEAD_LABELS,
  type CampaignLead,
  type LeadLabel,
} from '@/lib/data/campaign-leads'
import {
  createCampaignLead,
  updateCampaignLead,
} from '@/lib/actions/campaign-leads-actions'

interface Props {
  clientId: string
  trigger: ReactNode
  mode: 'create' | 'edit'
  lead?: CampaignLead
}

interface FormState {
  leadEmail: string
  leadName: string
  leadCompany: string
  sentSubject: string
  sentBody: string
  sentAt: string
  replySubject: string
  replyBody: string
  receivedAt: string
  label: LeadLabel
  notes: string
}

function isoToDatetimeLocal(iso: string | null | undefined): string {
  if (!iso) return ''
  const d = new Date(iso)
  if (Number.isNaN(d.getTime())) return ''
  // YYYY-MM-DDTHH:mm in lokale tijd
  const pad = (n: number) => String(n).padStart(2, '0')
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}T${pad(d.getHours())}:${pad(d.getMinutes())}`
}

function datetimeLocalToIso(value: string): string | null {
  if (!value) return null
  const d = new Date(value)
  if (Number.isNaN(d.getTime())) return null
  return d.toISOString()
}

function emptyForm(): FormState {
  const now = new Date()
  const pad = (n: number) => String(n).padStart(2, '0')
  const local = `${now.getFullYear()}-${pad(now.getMonth() + 1)}-${pad(now.getDate())}T${pad(now.getHours())}:${pad(now.getMinutes())}`
  return {
    leadEmail: '',
    leadName: '',
    leadCompany: '',
    sentSubject: '',
    sentBody: '',
    sentAt: '',
    replySubject: '',
    replyBody: '',
    receivedAt: local,
    label: 'geinteresseerd',
    notes: '',
  }
}

function leadToForm(lead: CampaignLead): FormState {
  return {
    leadEmail: lead.leadEmail,
    leadName: lead.leadName ?? '',
    leadCompany: lead.leadCompany ?? '',
    sentSubject: lead.sentSubject ?? '',
    sentBody: lead.sentBody ?? '',
    sentAt: isoToDatetimeLocal(lead.sentAt),
    replySubject: lead.replySubject ?? '',
    replyBody: lead.replyBody ?? '',
    receivedAt: isoToDatetimeLocal(lead.receivedAt),
    label: lead.label,
    notes: lead.notes ?? '',
  }
}

export function LeadFormDialog({ clientId, trigger, mode, lead }: Props) {
  const router = useRouter()
  const [open, setOpen] = useState(false)
  const [pending, startTransition] = useTransition()
  const [error, setError] = useState<string | null>(null)
  const [form, setForm] = useState<FormState>(() =>
    mode === 'edit' && lead ? leadToForm(lead) : emptyForm()
  )

  const handleOpen = () => {
    setError(null)
    setForm(mode === 'edit' && lead ? leadToForm(lead) : emptyForm())
    setOpen(true)
  }

  const handleClose = () => {
    if (pending) return
    setOpen(false)
  }

  const update = <K extends keyof FormState>(key: K, value: FormState[K]) => {
    setForm((prev) => ({ ...prev, [key]: value }))
  }

  const handleSubmit = (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault()
    setError(null)

    const payload = {
      clientId,
      leadEmail: form.leadEmail.trim(),
      leadName: form.leadName.trim() || null,
      leadCompany: form.leadCompany.trim() || null,
      sentSubject: form.sentSubject.trim() || null,
      sentBody: form.sentBody.trim() || null,
      sentAt: datetimeLocalToIso(form.sentAt),
      replySubject: form.replySubject.trim() || null,
      replyBody: form.replyBody.trim() || null,
      receivedAt: datetimeLocalToIso(form.receivedAt) ?? new Date().toISOString(),
      label: form.label,
      notes: form.notes.trim() || null,
    }

    startTransition(async () => {
      const result =
        mode === 'edit' && lead
          ? await updateCampaignLead({ ...payload, id: lead.id })
          : await createCampaignLead(payload)

      if ('error' in result) {
        setError(result.error)
        return
      }
      setOpen(false)
      router.refresh()
    })
  }

  return (
    <>
      <button type="button" onClick={handleOpen} className="contents">
        {trigger}
      </button>

      {open && (
        <div
          className="fixed inset-0 z-50 flex items-start justify-center overflow-y-auto bg-gray-900/50 p-4 backdrop-blur-sm"
          onClick={handleClose}
        >
          <div
            className="relative my-8 w-full max-w-2xl rounded-2xl bg-white shadow-2xl"
            onClick={(e) => e.stopPropagation()}
          >
            <form onSubmit={handleSubmit}>
              <div className="flex items-start justify-between border-b border-gray-100 px-6 py-4">
                <div>
                  <h2 className="text-lg font-semibold text-gray-900">
                    {mode === 'edit' ? 'Lead bewerken' : 'Lead toevoegen'}
                  </h2>
                  <p className="mt-0.5 text-xs text-gray-500">
                    Velden met * zijn verplicht. De rest mag leeg blijven.
                  </p>
                </div>
                <button
                  type="button"
                  onClick={handleClose}
                  className="rounded-md p-1 text-gray-400 hover:bg-gray-100 hover:text-gray-600"
                >
                  <svg className="h-5 w-5" fill="none" viewBox="0 0 24 24" strokeWidth={1.8} stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" d="M6 18 18 6M6 6l12 12" />
                  </svg>
                </button>
              </div>

              <div className="space-y-5 px-6 py-5">
                {/* Lead identificatie */}
                <Section title="Lead">
                  <div className="grid gap-3 sm:grid-cols-2">
                    <Field label="E-mail" required>
                      <input
                        type="email"
                        required
                        value={form.leadEmail}
                        onChange={(e) => update('leadEmail', e.target.value)}
                        className={inputCls}
                        placeholder="lead@voorbeeld.nl"
                      />
                    </Field>
                    <Field label="Naam">
                      <input
                        type="text"
                        value={form.leadName}
                        onChange={(e) => update('leadName', e.target.value)}
                        className={inputCls}
                        placeholder="Voornaam Achternaam"
                      />
                    </Field>
                  </div>
                  <Field label="Bedrijf">
                    <input
                      type="text"
                      value={form.leadCompany}
                      onChange={(e) => update('leadCompany', e.target.value)}
                      className={inputCls}
                      placeholder="Bedrijfsnaam"
                    />
                  </Field>
                </Section>

                {/* Categorisatie */}
                <Section title="Categorisatie">
                  <div className="grid gap-3 sm:grid-cols-2">
                    <Field label="Label" required>
                      <select
                        required
                        value={form.label}
                        onChange={(e) => update('label', e.target.value as LeadLabel)}
                        className={inputCls}
                      >
                        {LEAD_LABELS.map((l) => (
                          <option key={l} value={l}>
                            {LABEL_META[l].name}
                          </option>
                        ))}
                      </select>
                    </Field>
                    <Field label="Datum reactie ontvangen" required>
                      <input
                        type="datetime-local"
                        required
                        value={form.receivedAt}
                        onChange={(e) => update('receivedAt', e.target.value)}
                        className={inputCls}
                      />
                    </Field>
                  </div>
                </Section>

                {/* Verzonden mail */}
                <Section title="Verzonden mail (optioneel)">
                  <div className="grid gap-3 sm:grid-cols-[1fr_auto]">
                    <Field label="Onderwerp">
                      <input
                        type="text"
                        value={form.sentSubject}
                        onChange={(e) => update('sentSubject', e.target.value)}
                        className={inputCls}
                        placeholder="Onderwerp van de verzonden mail"
                      />
                    </Field>
                    <Field label="Verzonden op">
                      <input
                        type="datetime-local"
                        value={form.sentAt}
                        onChange={(e) => update('sentAt', e.target.value)}
                        className={inputCls}
                      />
                    </Field>
                  </div>
                  <Field label="Inhoud">
                    <textarea
                      rows={4}
                      value={form.sentBody}
                      onChange={(e) => update('sentBody', e.target.value)}
                      className={`${inputCls} resize-y`}
                      placeholder="Plak hier de verzonden mail-tekst…"
                    />
                  </Field>
                </Section>

                {/* Reactie */}
                <Section title="Positieve reactie">
                  <Field label="Onderwerp">
                    <input
                      type="text"
                      value={form.replySubject}
                      onChange={(e) => update('replySubject', e.target.value)}
                      className={inputCls}
                      placeholder="Re: …"
                    />
                  </Field>
                  <Field label="Inhoud">
                    <textarea
                      rows={5}
                      value={form.replyBody}
                      onChange={(e) => update('replyBody', e.target.value)}
                      className={`${inputCls} resize-y`}
                      placeholder="Plak hier de ontvangen reactie…"
                    />
                  </Field>
                </Section>

                <Section title="Notitie">
                  <Field label="">
                    <textarea
                      rows={2}
                      value={form.notes}
                      onChange={(e) => update('notes', e.target.value)}
                      className={`${inputCls} resize-y`}
                      placeholder="Optionele context — wordt ook aan de klant getoond."
                    />
                  </Field>
                </Section>

                {error && (
                  <div className="rounded-lg border border-red-200 bg-red-50 px-3 py-2 text-sm text-red-700">
                    {error}
                  </div>
                )}
              </div>

              <div className="flex items-center justify-end gap-2 border-t border-gray-100 bg-gray-50 px-6 py-4">
                <button
                  type="button"
                  onClick={handleClose}
                  disabled={pending}
                  className="rounded-lg px-4 py-2 text-sm font-semibold text-gray-700 hover:bg-gray-100 disabled:opacity-50"
                >
                  Annuleren
                </button>
                <button
                  type="submit"
                  disabled={pending}
                  className="rounded-lg bg-gray-900 px-4 py-2 text-sm font-semibold text-white shadow-sm transition-colors hover:bg-gray-800 disabled:opacity-60"
                >
                  {pending
                    ? 'Bezig…'
                    : mode === 'edit'
                      ? 'Wijzigingen opslaan'
                      : 'Lead toevoegen'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </>
  )
}

const inputCls =
  'w-full rounded-lg border border-gray-300 bg-white px-3 py-2 text-sm text-gray-900 placeholder-gray-400 shadow-sm transition-colors focus:border-indigo-500 focus:outline-none focus:ring-2 focus:ring-indigo-500/20'

function Section({ title, children }: { title: string; children: ReactNode }) {
  return (
    <div className="rounded-xl border border-gray-200 bg-gray-50/50 p-4">
      <h3 className="mb-3 text-xs font-semibold uppercase tracking-wide text-gray-500">{title}</h3>
      <div className="space-y-3">{children}</div>
    </div>
  )
}

function Field({
  label,
  required,
  children,
}: {
  label: string
  required?: boolean
  children: ReactNode
}) {
  return (
    <label className="block">
      {label && (
        <span className="mb-1 block text-xs font-medium text-gray-700">
          {label} {required && <span className="text-red-500">*</span>}
        </span>
      )}
      {children}
    </label>
  )
}
