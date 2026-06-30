'use client'

import { useMemo, useState, useTransition } from 'react'
import { useRouter } from 'next/navigation'
import {
  saveAdminContact,
  markNoAdminContact,
  clearAdminContact,
  type AdminContactInput,
} from '../actions'

export type LeadSourceTag = 'inbox' | 'campaign'

export interface ManagerContactEntry {
  name: string | null
  email: string | null
  linkedinUrl: string | null
  jobTitle: string | null
}

export interface ManagerContactRecord {
  contacts: ManagerContactEntry[]
  none: boolean
}

export interface ManagerLead {
  email: string
  fullName: string | null
  companyName: string | null
  sources: LeadSourceTag[]
  contact: ManagerContactRecord | null
}

interface Props {
  clientId: string
  leads: ManagerLead[]
}

function hasContact(c: ManagerContactRecord | null): boolean {
  return !!c && (c.none || c.contacts.length > 0)
}

function emptyEntry(): AdminContactInput {
  return { name: '', email: '', linkedinUrl: '', jobTitle: '' }
}

function toInputs(record: ManagerContactRecord | null): AdminContactInput[] {
  if (!record || record.contacts.length === 0) return [emptyEntry()]
  return record.contacts.map((c) => ({
    name: c.name ?? '',
    email: c.email ?? '',
    linkedinUrl: c.linkedinUrl ?? '',
    jobTitle: c.jobTitle ?? '',
  }))
}

const SOURCE_LABEL: Record<LeadSourceTag, string> = {
  inbox: 'Inbox',
  campaign: 'Campagne',
}

export function AdminContactManager({ clientId, leads }: Props) {
  const router = useRouter()
  const [pending, startTransition] = useTransition()

  const [selectedEmail, setSelectedEmail] = useState('')
  const [entries, setEntries] = useState<AdminContactInput[]>([emptyEntry()])
  const [error, setError] = useState<string | null>(null)
  const [saved, setSaved] = useState(false)

  const selectedLead = useMemo(
    () => leads.find((l) => l.email === selectedEmail) ?? null,
    [leads, selectedEmail]
  )

  const handleSelect = (value: string) => {
    setSelectedEmail(value)
    setError(null)
    setSaved(false)
    const lead = leads.find((l) => l.email === value)
    setEntries(toInputs(lead?.contact ?? null))
  }

  const updateEntry = (index: number, field: keyof AdminContactInput, value: string) => {
    setEntries((prev) =>
      prev.map((e, i) => (i === index ? { ...e, [field]: value } : e))
    )
  }

  const addEntry = () => setEntries((prev) => [...prev, emptyEntry()])

  const removeEntry = (index: number) =>
    setEntries((prev) => (prev.length <= 1 ? prev : prev.filter((_, i) => i !== index)))

  const handleSave = () => {
    if (!selectedLead) return
    setError(null)
    setSaved(false)
    startTransition(async () => {
      const result = await saveAdminContact(clientId, selectedLead.email, entries)
      if (result.error) {
        setError(result.error)
        return
      }
      setSaved(true)
      router.refresh()
    })
  }

  const handleNoContact = () => {
    if (!selectedLead) return
    setError(null)
    setSaved(false)
    startTransition(async () => {
      const result = await markNoAdminContact(clientId, selectedLead.email)
      if (result.error) {
        setError(result.error)
        return
      }
      setEntries([emptyEntry()])
      setSaved(true)
      router.refresh()
    })
  }

  const handleClear = () => {
    if (!selectedLead) return
    setError(null)
    setSaved(false)
    startTransition(async () => {
      const result = await clearAdminContact(clientId, selectedLead.email)
      if (result.error) {
        setError(result.error)
        return
      }
      setEntries([emptyEntry()])
      setSaved(true)
      router.refresh()
    })
  }

  if (leads.length === 0) {
    return (
      <div className="rounded-2xl border border-gray-200 bg-white p-6 text-sm text-gray-500 shadow-sm">
        Deze klant heeft nog geen leads (inbox of campagne). Zodra er een lead
        binnenkomt, kun je hier contactgegevens van de beslisser toevoegen.
      </div>
    )
  }

  return (
    <div className="space-y-6">
      {/* Lead selector */}
      <section className="rounded-2xl border border-gray-200 bg-white p-5 shadow-sm">
        <label htmlFor="lead-select" className="block text-sm font-semibold text-gray-900">
          Selecteer een lead
        </label>
        <p className="mb-3 text-xs text-gray-500">
          Kies de lead die doorverwees. Het e-mailadres is voldoende.
        </p>
        <select
          id="lead-select"
          value={selectedEmail}
          onChange={(e) => handleSelect(e.target.value)}
          className="w-full rounded-xl border border-gray-200 bg-white px-3 py-2.5 text-sm text-gray-900 focus:border-indigo-400 focus:outline-none focus:ring-2 focus:ring-indigo-100"
        >
          <option value="">— Kies een lead —</option>
          {leads.map((lead) => {
            const srcLabel = lead.sources.map((s) => SOURCE_LABEL[s]).join('/')
            const label = [lead.email, lead.fullName, lead.companyName]
              .filter(Boolean)
              .join(' · ')
            return (
              <option key={lead.email} value={lead.email}>
                {hasContact(lead.contact) ? '● ' : ''}
                {label}
                {srcLabel ? ` [${srcLabel}]` : ''}
              </option>
            )
          })}
        </select>
        <p className="mt-2 text-[11px] text-gray-400">
          ● = er staat al een notitie klaar. [Inbox/Campagne] = waar de lead voorkomt.
        </p>
      </section>

      {/* Contact form */}
      {selectedLead && (
        <section className="rounded-2xl border border-gray-200 bg-white p-5 shadow-sm">
          <div className="mb-4">
            <h2 className="text-sm font-semibold text-gray-900">Contactgegevens beslisser(s)</h2>
            <p className="text-xs text-gray-500">
              Voeg één of meerdere contacten toe. Alle velden zijn optioneel —
              vul in wat je hebt, of klik op &ldquo;Geen contactgegevens gevonden&rdquo;.
            </p>
          </div>

          <div className="space-y-4">
            {entries.map((entry, index) => (
              <div
                key={index}
                className="rounded-xl border border-gray-200 bg-gray-50/60 p-4"
              >
                <div className="mb-3 flex items-center justify-between">
                  <span className="text-xs font-semibold uppercase tracking-wide text-gray-500">
                    Contact {index + 1}
                  </span>
                  {entries.length > 1 && (
                    <button
                      type="button"
                      onClick={() => removeEntry(index)}
                      className="rounded-md px-2 py-1 text-xs font-medium text-gray-400 hover:bg-gray-200 hover:text-gray-700"
                    >
                      Verwijderen
                    </button>
                  )}
                </div>
                <div className="space-y-3">
                  <Field
                    label="Naam"
                    value={entry.name}
                    onChange={(v) => updateEntry(index, 'name', v)}
                    placeholder="Bijv. Jan de Vries"
                  />
                  <Field
                    label="Functietitel"
                    value={entry.jobTitle}
                    onChange={(v) => updateEntry(index, 'jobTitle', v)}
                    placeholder="Bijv. HR Manager"
                  />
                  <Field
                    label="E-mailadres"
                    value={entry.email}
                    onChange={(v) => updateEntry(index, 'email', v)}
                    placeholder="naam@bedrijf.nl"
                    type="email"
                  />
                  <Field
                    label="LinkedIn URL"
                    value={entry.linkedinUrl}
                    onChange={(v) => updateEntry(index, 'linkedinUrl', v)}
                    placeholder="https://linkedin.com/in/..."
                    type="url"
                  />
                </div>
              </div>
            ))}
          </div>

          <button
            type="button"
            onClick={addEntry}
            className="mt-3 inline-flex items-center gap-1.5 rounded-lg border border-dashed border-gray-300 px-3 py-2 text-sm font-medium text-gray-600 hover:border-indigo-300 hover:text-indigo-700"
          >
            <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" strokeWidth={2} stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" d="M12 4.5v15m7.5-7.5h-15" />
            </svg>
            Nog een contact toevoegen
          </button>

          {error && (
            <p className="mt-4 rounded-lg bg-red-50 px-3 py-2 text-xs text-red-700">{error}</p>
          )}
          {saved && !error && (
            <p className="mt-4 rounded-lg bg-emerald-50 px-3 py-2 text-xs text-emerald-700">
              Opgeslagen. De klant ziet dit nu bij de lead.
            </p>
          )}

          <div className="mt-5 flex flex-wrap items-center gap-2">
            <button
              type="button"
              onClick={handleSave}
              disabled={pending}
              className="rounded-lg bg-indigo-600 px-4 py-2 text-sm font-semibold text-white shadow-sm hover:bg-indigo-700 disabled:opacity-50"
            >
              {pending ? 'Opslaan…' : 'Opslaan'}
            </button>
            <button
              type="button"
              onClick={handleNoContact}
              disabled={pending}
              className="rounded-lg border border-amber-300 bg-amber-50 px-4 py-2 text-sm font-semibold text-amber-800 hover:bg-amber-100 disabled:opacity-50"
            >
              Geen contactgegevens gevonden
            </button>
            {hasContact(selectedLead.contact) && (
              <button
                type="button"
                onClick={handleClear}
                disabled={pending}
                className="ml-auto rounded-lg px-3 py-2 text-xs font-medium text-gray-500 hover:bg-gray-100 disabled:opacity-50"
              >
                Notitie verwijderen
              </button>
            )}
          </div>
        </section>
      )}
    </div>
  )
}

function Field({
  label,
  value,
  onChange,
  placeholder,
  type = 'text',
}: {
  label: string
  value: string
  onChange: (v: string) => void
  placeholder?: string
  type?: string
}) {
  return (
    <div>
      <label className="mb-1 block text-xs font-medium text-gray-600">{label}</label>
      <input
        type={type}
        value={value}
        onChange={(e) => onChange(e.target.value)}
        placeholder={placeholder}
        className="w-full rounded-xl border border-gray-200 bg-white px-3 py-2 text-sm text-gray-900 focus:border-indigo-400 focus:outline-none focus:ring-2 focus:ring-indigo-100"
      />
    </div>
  )
}
