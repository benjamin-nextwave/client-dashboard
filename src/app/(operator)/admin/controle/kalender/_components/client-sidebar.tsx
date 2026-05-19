'use client'

import { useMemo, useState } from 'react'
import type { ClientListItem } from '@/lib/data/admin-stats'

interface ClientSidebarProps {
  clients: ClientListItem[]
  selectedClientId: string | null
  onSelect: (clientId: string | null) => void
}

export function ClientSidebar({ clients, selectedClientId, onSelect }: ClientSidebarProps) {
  const [search, setSearch] = useState('')

  const filtered = useMemo(() => {
    if (!search.trim()) return clients
    const q = search.toLowerCase()
    return clients.filter((c) => c.companyName.toLowerCase().includes(q))
  }, [clients, search])

  return (
    <div className="rounded-3xl bg-gradient-to-br from-sky-50 via-cyan-50 to-violet-50 p-1 shadow-sm ring-1 ring-sky-100">
      <div className="flex h-full flex-col rounded-[1.4rem] bg-white p-3">
        <button
          type="button"
          onClick={() => onSelect(null)}
          className={`group flex items-center gap-2 rounded-2xl px-3 py-2.5 text-left text-sm font-bold transition-all ${
            selectedClientId === null
              ? 'bg-gradient-to-r from-fuchsia-500 to-pink-500 text-white shadow-md'
              : 'bg-fuchsia-50 text-fuchsia-700 hover:bg-fuchsia-100'
          }`}
        >
          <span
            className={`inline-flex h-7 w-7 items-center justify-center rounded-full text-xs font-bold ${
              selectedClientId === null
                ? 'bg-white/25 text-white'
                : 'bg-white text-fuchsia-600'
            }`}
          >
            <svg className="h-3.5 w-3.5" fill="none" viewBox="0 0 24 24" strokeWidth={2.5} stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" d="M3.75 6A2.25 2.25 0 0 1 6 3.75h2.25A2.25 2.25 0 0 1 10.5 6v2.25a2.25 2.25 0 0 1-2.25 2.25H6a2.25 2.25 0 0 1-2.25-2.25V6ZM3.75 15.75A2.25 2.25 0 0 1 6 13.5h2.25a2.25 2.25 0 0 1 2.25 2.25V18a2.25 2.25 0 0 1-2.25 2.25H6A2.25 2.25 0 0 1 3.75 18v-2.25ZM13.5 6a2.25 2.25 0 0 1 2.25-2.25H18A2.25 2.25 0 0 1 20.25 6v2.25A2.25 2.25 0 0 1 18 10.5h-2.25a2.25 2.25 0 0 1-2.25-2.25V6ZM13.5 15.75a2.25 2.25 0 0 1 2.25-2.25H18a2.25 2.25 0 0 1 2.25 2.25V18A2.25 2.25 0 0 1 18 20.25h-2.25A2.25 2.25 0 0 1 13.5 18v-2.25Z" />
            </svg>
          </span>
          Alle bedrijven
        </button>

        <div className="mt-3 px-1">
          <div className="relative">
            <svg
              className="pointer-events-none absolute left-2.5 top-1/2 h-3.5 w-3.5 -translate-y-1/2 text-gray-400"
              fill="none"
              viewBox="0 0 24 24"
              strokeWidth={2}
              stroke="currentColor"
            >
              <path strokeLinecap="round" strokeLinejoin="round" d="m21 21-5.197-5.197m0 0A7.5 7.5 0 1 0 5.196 5.196a7.5 7.5 0 0 0 10.607 10.607Z" />
            </svg>
            <input
              type="text"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder="Zoek klant..."
              className="w-full rounded-xl border border-gray-200 bg-white py-1.5 pl-8 pr-2 text-xs text-gray-900 placeholder:text-gray-400 transition-all focus:border-fuchsia-400 focus:outline-none focus:ring-2 focus:ring-fuchsia-100"
            />
          </div>
        </div>

        <div className="mt-3 flex-1 space-y-1 overflow-y-auto pr-0.5" style={{ maxHeight: 'calc(100vh - 320px)' }}>
          {filtered.length === 0 ? (
            <div className="px-3 py-6 text-center text-xs text-gray-400">
              Geen klanten gevonden.
            </div>
          ) : (
            filtered.map((client) => {
              const selected = client.id === selectedClientId
              const color = client.primaryColor ?? '#a855f7'
              return (
                <button
                  key={client.id}
                  type="button"
                  onClick={() => onSelect(client.id)}
                  className={`flex w-full items-center gap-2 rounded-xl px-2.5 py-2 text-left text-sm transition-all ${
                    selected
                      ? 'bg-fuchsia-50 font-bold text-fuchsia-800 ring-2 ring-fuchsia-200'
                      : 'text-gray-700 hover:bg-gray-50'
                  }`}
                >
                  <span
                    className="inline-block h-2.5 w-2.5 flex-shrink-0 rounded-full"
                    style={{ background: color }}
                  />
                  <span className="truncate">{client.companyName}</span>
                </button>
              )
            })
          )}
        </div>
      </div>
    </div>
  )
}
