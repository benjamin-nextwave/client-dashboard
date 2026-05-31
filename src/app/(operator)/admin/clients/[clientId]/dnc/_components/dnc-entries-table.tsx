'use client'

import { useState, useTransition } from 'react'
import { useRouter } from 'next/navigation'
import { toggleDncApproval, deleteDncEntryAdmin } from '../actions'

interface Entry {
  id: string
  entryType: 'email' | 'domain'
  value: string
  approved: boolean
  approvedAt: string | null
  createdAt: string
}

interface Props {
  clientId: string
  entries: Entry[]
}

type FilterMode = 'all' | 'email' | 'domain'

function formatDate(iso: string): string {
  return new Date(iso).toLocaleDateString('nl-NL', {
    day: 'numeric',
    month: 'short',
    year: 'numeric',
  })
}

export function DncEntriesTable({ clientId, entries }: Props) {
  const router = useRouter()
  const [filter, setFilter] = useState<FilterMode>('all')
  const [query, setQuery] = useState('')
  const [pending, startTransition] = useTransition()
  const [acting, setActing] = useState<string | null>(null)

  const exportHref = `/api/admin/clients/${clientId}/dnc/export`

  const filtered = entries.filter((e) => {
    if (filter !== 'all' && e.entryType !== filter) return false
    if (query.trim().length === 0) return true
    return e.value.toLowerCase().includes(query.trim().toLowerCase())
  })

  const handleApprove = (entryId: string, next: boolean) => {
    setActing(entryId)
    startTransition(async () => {
      await toggleDncApproval(clientId, entryId, next)
      router.refresh()
      setActing(null)
    })
  }

  const handleDelete = (entryId: string) => {
    if (!confirm('Weet je zeker dat je deze entry wilt verwijderen?')) return
    setActing(entryId)
    startTransition(async () => {
      await deleteDncEntryAdmin(clientId, entryId)
      router.refresh()
      setActing(null)
    })
  }

  return (
    <section className="rounded-2xl border border-gray-200 bg-white shadow-sm">
      <div className="flex flex-wrap items-center gap-3 border-b border-gray-100 p-5">
        <div className="flex-1">
          <h2 className="text-sm font-semibold text-gray-900">Ingediende adressen en domeinen</h2>
          <p className="text-xs text-gray-500">Vink aan om te markeren als doorgevoerd — de klant ziet dit dan in zijn DNC-lijst.</p>
        </div>
        <a
          href={exportHref}
          className="inline-flex items-center gap-1.5 rounded-lg bg-gray-900 px-3 py-1.5 text-xs font-semibold text-white shadow-sm hover:bg-gray-800"
        >
          <svg className="h-3.5 w-3.5" fill="none" viewBox="0 0 24 24" strokeWidth={2} stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" d="M3 16.5v2.25A2.25 2.25 0 0 0 5.25 21h13.5A2.25 2.25 0 0 0 21 18.75V16.5M16.5 12 12 16.5m0 0L7.5 12m4.5 4.5V3" />
          </svg>
          E-mails exporteren (CSV)
        </a>
      </div>

      <div className="flex flex-wrap items-center gap-3 border-b border-gray-100 px-5 py-3">
        <div className="flex rounded-lg border border-gray-200 bg-gray-50 p-0.5">
          {(['all', 'email', 'domain'] as const).map((mode) => (
            <button
              key={mode}
              type="button"
              onClick={() => setFilter(mode)}
              className={`rounded-md px-2.5 py-1 text-xs font-semibold transition-colors ${
                filter === mode ? 'bg-white text-gray-900 shadow-sm' : 'text-gray-500 hover:text-gray-700'
              }`}
            >
              {mode === 'all' ? 'Alles' : mode === 'email' ? 'E-mails' : 'Domeinen'}
            </button>
          ))}
        </div>
        <input
          type="text"
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          placeholder="Zoek op adres of domein…"
          className="flex-1 rounded-lg border border-gray-200 bg-white px-3 py-1.5 text-xs text-gray-900 focus:border-indigo-400 focus:outline-none focus:ring-2 focus:ring-indigo-100"
        />
        <span className="text-xs text-gray-500">{filtered.length} / {entries.length}</span>
      </div>

      {filtered.length === 0 ? (
        <div className="p-10 text-center text-sm text-gray-500">
          {entries.length === 0 ? 'Nog geen DNC-vermeldingen.' : 'Geen vermeldingen gevonden met deze filter.'}
        </div>
      ) : (
        <div className="overflow-x-auto">
          <table className="min-w-full divide-y divide-gray-100">
            <thead className="bg-gray-50">
              <tr>
                <th className="w-12 px-4 py-2.5 text-left text-[10px] font-semibold uppercase tracking-wide text-gray-500">OK</th>
                <th className="px-4 py-2.5 text-left text-[10px] font-semibold uppercase tracking-wide text-gray-500">Type</th>
                <th className="px-4 py-2.5 text-left text-[10px] font-semibold uppercase tracking-wide text-gray-500">Waarde</th>
                <th className="px-4 py-2.5 text-left text-[10px] font-semibold uppercase tracking-wide text-gray-500">Status</th>
                <th className="px-4 py-2.5 text-left text-[10px] font-semibold uppercase tracking-wide text-gray-500">Toegevoegd</th>
                <th className="px-4 py-2.5 text-right text-[10px] font-semibold uppercase tracking-wide text-gray-500">Actie</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-50">
              {filtered.map((entry) => {
                const isActing = acting === entry.id && pending
                return (
                  <tr key={entry.id} className="hover:bg-gray-50/50">
                    <td className="px-4 py-3">
                      <input
                        type="checkbox"
                        checked={entry.approved}
                        disabled={isActing}
                        onChange={(e) => handleApprove(entry.id, e.target.checked)}
                        className="h-4 w-4 rounded border-gray-300 text-emerald-600 focus:ring-emerald-500 disabled:opacity-50"
                        title={entry.approved ? 'Markeer als in verwerking' : 'Markeer als doorgevoerd'}
                      />
                    </td>
                    <td className="px-4 py-3">
                      <span className="inline-flex items-center rounded-md bg-gray-100 px-1.5 py-0.5 text-[10px] font-semibold uppercase tracking-wide text-gray-700">
                        {entry.entryType === 'email' ? 'E-mail' : 'Domein'}
                      </span>
                    </td>
                    <td className="px-4 py-3 font-mono text-sm text-gray-900">{entry.value}</td>
                    <td className="px-4 py-3">
                      {entry.approved ? (
                        <span className="inline-flex items-center gap-1 rounded-md border border-emerald-200 bg-emerald-50 px-2 py-0.5 text-[11px] font-semibold text-emerald-700">
                          <svg className="h-3 w-3" fill="none" viewBox="0 0 24 24" strokeWidth={3} stroke="currentColor">
                            <path strokeLinecap="round" strokeLinejoin="round" d="m4.5 12.75 6 6 9-13.5" />
                          </svg>
                          Doorgevoerd
                        </span>
                      ) : (
                        <span className="inline-flex items-center gap-1 rounded-md border border-blue-200 bg-blue-50 px-2 py-0.5 text-[11px] font-semibold text-blue-700">
                          <svg className="h-3 w-3 animate-spin" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                            <circle cx="12" cy="12" r="9" strokeWidth={3} strokeLinecap="round" strokeDasharray="40 60" />
                          </svg>
                          In verwerking
                        </span>
                      )}
                    </td>
                    <td className="px-4 py-3 text-xs text-gray-500">{formatDate(entry.createdAt)}</td>
                    <td className="px-4 py-3 text-right">
                      <button
                        type="button"
                        onClick={() => handleDelete(entry.id)}
                        disabled={isActing}
                        className="text-xs font-semibold text-red-600 hover:text-red-800 disabled:opacity-50"
                      >
                        Verwijderen
                      </button>
                    </td>
                  </tr>
                )
              })}
            </tbody>
          </table>
        </div>
      )}
    </section>
  )
}
