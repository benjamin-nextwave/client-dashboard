'use client'

import { useMemo, useState, useTransition } from 'react'
import { useRouter } from 'next/navigation'
import {
  saveAdminContact,
  markNoAdminContact,
  clearAdminContact,
} from '../actions'

export interface ManagerLead {
  id: string
  email: string
  fullName: string | null
  companyName: string | null
  contact: {
    name: string | null
    email: string | null
    linkedinUrl: string | null
    jobTitle: string | null
    none: boolean
  }
}

interface Props {
  clientId: string
  leads: ManagerLead[]
}

function hasContact(c: ManagerLead['contact']): boolean {
  return c.none || !!(c.name || c.email || c.linkedinUrl || c.jobTitle)
}

export function AdminContactManager({ clientId, leads }: Props) {
  const router = useRouter()
  const [pending, startTransition] = useTransition()

  const [selectedId, setSelectedId] = useState('')
  const [name, setName] = useState('')
  const [email, setEmail] = useState('')
  const [linkedinUrl, setLinkedinUrl] = useState('')
  const [jobTitle, setJobTitle] = useState('')
  const [error, setError] = useState<string | null>(null)
  const [saved, setSaved] = useState(false)

  const selectedLead = useMemo(
    () => leads.find((l) => l.id === selectedId) ?? null,
    [leads, selectedId]
  )

  const handleSelect = (id: string) => {
    setSelectedId(id)
    setError(null)
    setSaved(false)
    const lead = leads.find((l) => l.id === id)
    setName(lead?.contact.name ?? '')
    setEmail(lead?.contact.email ?? '')
    setLinkedinUrl(lead?.contact.linkedinUrl ?? '')
    setJobTitle(lead?.contact.jobTitle ?? '')
  }

  const handleSave = () => {
    if (!selectedLead) return
    setError(null)
    setSaved(false)
    startTransition(async () => {
      const result = await saveAdminContact(clientId, selectedLead.id, {
        name,
        email,
        linkedinUrl,
        jobTitle,
      })
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
      const result = await markNoAdminContact(clientId, selectedLead.id)
      if (result.error) {
        setError(result.error)
        return
      }
      setName('')
      setEmail('')
      setLinkedinUrl('')
      setJobTitle('')
      setSaved(true)
      router.refresh()
    })
  }

  const handleClear = () => {
    if (!selectedLead) return
    setError(null)
    setSaved(false)
    startTransition(async () => {
      const result = await clearAdminContact(clientId, selectedLead.id)
      if (result.error) {
        setError(result.error)
        return
      }
      setName('')
      setEmail('')
      setLinkedinUrl('')
      setJobTitle('')
      setSaved(true)
      router.refresh()
    })
  }

  if (leads.length === 0) {
    return (
      <div className="rounded-2xl border border-gray-200 bg-white p-6 text-sm text-gray-500 shadow-sm">
        Deze klant heeft nog geen positieve leads. Zodra er een lead positief
        reageert, kun je hier contactgegevens van de beslisser toevoegen.
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
          value={selectedId}
          onChange={(e) => handleSelect(e.target.value)}
          className="w-full rounded-xl border border-gray-200 bg-white px-3 py-2.5 text-sm text-gray-900 focus:border-indigo-400 focus:outline-none focus:ring-2 focus:ring-indigo-100"
        >
          <option value="">— Kies een lead —</option>
          {leads.map((lead) => {
            const label = [lead.email, lead.fullName, lead.companyName]
              .filter(Boolean)
              .join(' · ')
            return (
              <option key={lead.id} value={lead.id}>
                {hasContact(lead.contact) ? '● ' : ''}
                {label}
              </option>
            )
          })}
        </select>
        <p className="mt-2 text-[11px] text-gray-400">
          ● = er staat al een notitie klaar voor deze lead.
        </p>
      </section>

      {/* Contact form */}
      {selectedLead && (
        <section className="rounded-2xl border border-gray-200 bg-white p-5 shadow-sm">
          <div className="mb-4">
            <h2 className="text-sm font-semibold text-gray-900">Contactgegevens beslisser</h2>
            <p className="text-xs text-gray-500">
              Alle velden zijn optioneel. Vul in wat je hebt, of klik op
              &ldquo;Geen contactgegevens gevonden&rdquo;.
            </p>
          </div>

          <div className="space-y-4">
            <Field label="Naam" value={name} onChange={setName} placeholder="Bijv. Jan de Vries" />
            <Field
              label="Functietitel"
              value={jobTitle}
              onChange={setJobTitle}
              placeholder="Bijv. HR Manager"
            />
            <Field
              label="E-mailadres"
              value={email}
              onChange={setEmail}
              placeholder="naam@bedrijf.nl"
              type="email"
            />
            <Field
              label="LinkedIn URL"
              value={linkedinUrl}
              onChange={setLinkedinUrl}
              placeholder="https://linkedin.com/in/..."
              type="url"
            />
          </div>

          {error && (
            <p className="mt-4 rounded-lg bg-red-50 px-3 py-2 text-xs text-red-700">{error}</p>
          )}
          {saved && !error && (
            <p className="mt-4 rounded-lg bg-emerald-50 px-3 py-2 text-xs text-emerald-700">
              Opgeslagen. De klant ziet dit nu in de inbox.
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
