'use client'

import { useState, useEffect, useRef, useCallback } from 'react'

interface Contact {
  email: string
  first_name: string | null
  last_name: string | null
  company_name: string | null
  job_title: string | null
  industry: string | null
  lead_status: string | null
  interest_status: string | null
}

interface ContactListModalProps {
  contacts: Contact[]
  isOpen: boolean
  onClose: () => void
}

const STATUS_LABELS: Record<string, { label: string; className: string }> = {
  contacted: { label: 'Gemaild', className: 'bg-blue-100 text-blue-700' },
  replied: { label: 'Beantwoord', className: 'bg-green-100 text-green-700' },
  bounced: { label: 'Gebounced', className: 'bg-red-100 text-red-700' },
  not_yet_contacted: { label: 'Nog niet gemaild', className: 'bg-gray-100 text-gray-600' },
}

function getStatusBadge(status: string | null) {
  if (!status) return null
  const entry = STATUS_LABELS[status]
  if (!entry) {
    return (
      <span className="inline-flex items-center rounded-full bg-gray-100 px-2.5 py-0.5 text-xs font-medium text-gray-600">
        {status}
      </span>
    )
  }
  return (
    <span
      className={`inline-flex items-center rounded-full px-2.5 py-0.5 text-xs font-medium ${entry.className}`}
    >
      {entry.label}
    </span>
  )
}

function formatName(contact: Contact): string {
  const parts = [contact.first_name, contact.last_name].filter(Boolean)
  return parts.length > 0 ? parts.join(' ') : contact.email
}

export function ContactListModal({ contacts, isOpen, onClose }: ContactListModalProps) {
  const [search, setSearch] = useState('')
  const modalRef = useRef<HTMLDivElement>(null)
  const previousFocusRef = useRef<HTMLElement | null>(null)

  const filteredContacts = contacts.filter((c) => {
    if (!search) return true
    const term = search.toLowerCase()
    return (
      formatName(c).toLowerCase().includes(term) ||
      (c.company_name?.toLowerCase().includes(term) ?? false) ||
      c.email.toLowerCase().includes(term)
    )
  })

  // Focus trap and ESC handling
  const handleKeyDown = useCallback(
    (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        onClose()
        return
      }

      if (e.key === 'Tab' && modalRef.current) {
        const focusable = modalRef.current.querySelectorAll<HTMLElement>(
          'button, [href], input, select, textarea, [tabindex]:not([tabindex="-1"])'
        )
        if (focusable.length === 0) return

        const first = focusable[0]
        const last = focusable[focusable.length - 1]

        if (e.shiftKey && document.activeElement === first) {
          e.preventDefault()
          last.focus()
        } else if (!e.shiftKey && document.activeElement === last) {
          e.preventDefault()
          first.focus()
        }
      }
    },
    [onClose]
  )

  useEffect(() => {
    if (isOpen) {
      previousFocusRef.current = document.activeElement as HTMLElement
      document.addEventListener('keydown', handleKeyDown)
      // Focus the modal after render
      setTimeout(() => modalRef.current?.querySelector('input')?.focus(), 0)
      return () => document.removeEventListener('keydown', handleKeyDown)
    }
  }, [isOpen, handleKeyDown])

  // Reset search when modal closes
  useEffect(() => {
    if (!isOpen) {
      setSearch('')
      previousFocusRef.current?.focus()
    }
  }, [isOpen])

  if (!isOpen) return null

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/50"
      onClick={(e) => {
        if (e.target === e.currentTarget) onClose()
      }}
      role="dialog"
      aria-modal="true"
      aria-label="Contacten in database"
    >
      <div
        ref={modalRef}
        className="mx-4 flex max-h-[80vh] w-full max-w-4xl flex-col rounded-xl bg-white shadow-2xl"
      >
        {/* Header */}
        <div className="flex items-center justify-between border-b px-6 py-4">
          <h2 className="text-lg font-semibold text-gray-900">Contacten in database</h2>
          <button
            type="button"
            onClick={onClose}
            className="rounded-md p-1 text-gray-400 hover:bg-gray-100 hover:text-gray-600"
            aria-label="Sluiten"
          >
            <svg className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" />
            </svg>
          </button>
        </div>

        {/* Search + count */}
        <div className="border-b px-6 py-3">
          <input
            type="text"
            placeholder="Zoek op naam, bedrijf of e-mail..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="w-full rounded-md border border-gray-300 px-3 py-2 text-sm placeholder:text-gray-400 focus:border-brand focus:outline-none focus:ring-1 focus:ring-brand"
          />
          <p className="mt-2 text-xs text-gray-500">{filteredContacts.length} contacten</p>
        </div>

        {/* Table body */}
        <div className="flex-1 overflow-auto px-6 py-2">
          {filteredContacts.length === 0 ? (
            <p className="py-8 text-center text-sm text-gray-500">Geen contacten gevonden.</p>
          ) : (
            <table className="w-full text-left text-sm">
              <thead className="sticky top-0 bg-white">
                <tr className="border-b text-xs font-medium uppercase tracking-wider text-gray-500">
                  <th className="py-3 pr-4">Naam</th>
                  <th className="py-3 pr-4">Bedrijf</th>
                  <th className="py-3 pr-4">Functie</th>
                  <th className="py-3 pr-4">Sector</th>
                  <th className="py-3">Status</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-100">
                {filteredContacts.map((contact) => (
                  <tr key={contact.email} className="hover:bg-gray-50">
                    <td className="py-3 pr-4 font-medium text-gray-900">{formatName(contact)}</td>
                    <td className="py-3 pr-4 text-gray-600">{contact.company_name ?? '—'}</td>
                    <td className="py-3 pr-4 text-gray-600">{contact.job_title ?? '—'}</td>
                    <td className="py-3 pr-4 text-gray-600">{contact.industry ?? '—'}</td>
                    <td className="py-3">
                      <div className="flex items-center gap-1.5">
                        {getStatusBadge(contact.lead_status)}
                        {contact.interest_status === 'positive' && (
                          <span
                            className="inline-block h-2.5 w-2.5 rounded-full bg-green-500"
                            title="Positieve interesse"
                          />
                        )}
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          )}
        </div>
      </div>
    </div>
  )
}
