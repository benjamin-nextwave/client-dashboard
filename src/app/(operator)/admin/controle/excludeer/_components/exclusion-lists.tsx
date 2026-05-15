'use client'

import { useMemo, useState, useTransition } from 'react'
import { useRouter } from 'next/navigation'
import type { ClientListItem } from '@/lib/data/admin-stats'
import { setClientExcluded } from '../../actions'

interface ExclusionListsProps {
  excluded: ClientListItem[]
  available: ClientListItem[]
}

export function ExclusionLists({ excluded, available }: ExclusionListsProps) {
  const router = useRouter()
  const [pendingIds, setPendingIds] = useState<Set<string>>(new Set())
  const [, startTransition] = useTransition()
  const [searchExcluded, setSearchExcluded] = useState('')
  const [searchAvailable, setSearchAvailable] = useState('')

  const filteredExcluded = useMemo(
    () => filterByName(excluded, searchExcluded),
    [excluded, searchExcluded]
  )
  const filteredAvailable = useMemo(
    () => filterByName(available, searchAvailable),
    [available, searchAvailable]
  )

  const handleToggle = (clientId: string, excludedNow: boolean) => {
    setPendingIds((prev) => new Set(prev).add(clientId))
    startTransition(async () => {
      await setClientExcluded(clientId, !excludedNow)
      setPendingIds((prev) => {
        const next = new Set(prev)
        next.delete(clientId)
        return next
      })
      router.refresh()
    })
  }

  return (
    <div className="space-y-8">
      {/* Excluded */}
      <section>
        <SectionHeader
          title="Uitgesloten van Dagelijkse controle"
          count={excluded.length}
          tone="excluded"
        />
        <div className="mt-3">
          <SearchInput
            value={searchExcluded}
            onChange={setSearchExcluded}
            placeholder="Zoek in uitgesloten bedrijven..."
          />
        </div>

        {excluded.length === 0 ? (
          <div className="mt-4 flex flex-col items-center rounded-2xl border border-dashed border-gray-200 bg-gradient-to-b from-gray-50/50 to-white px-6 py-10 text-center">
            <p className="text-sm text-gray-500">Geen bedrijven uitgesloten.</p>
          </div>
        ) : filteredExcluded.length === 0 ? (
          <div className="mt-4 rounded-xl border border-dashed border-gray-200 px-4 py-6 text-center text-xs text-gray-400">
            Geen resultaten voor &ldquo;{searchExcluded}&rdquo;.
          </div>
        ) : (
          <div className="mt-4 grid grid-cols-1 gap-3 md:grid-cols-2 xl:grid-cols-3">
            {filteredExcluded.map((c) => (
              <ClientRow
                key={c.id}
                client={c}
                excluded
                isPending={pendingIds.has(c.id)}
                onToggle={() => handleToggle(c.id, true)}
              />
            ))}
          </div>
        )}
      </section>

      {/* Available */}
      <section>
        <SectionHeader
          title="Overige bedrijven"
          count={available.length}
          tone="available"
        />
        <div className="mt-3">
          <SearchInput
            value={searchAvailable}
            onChange={setSearchAvailable}
            placeholder="Zoek bedrijf om uit te sluiten..."
          />
        </div>

        {available.length === 0 ? (
          <div className="mt-4 flex flex-col items-center rounded-2xl border border-dashed border-gray-200 bg-gradient-to-b from-gray-50/50 to-white px-6 py-10 text-center">
            <p className="text-sm text-gray-500">Alle bedrijven zijn uitgesloten.</p>
          </div>
        ) : filteredAvailable.length === 0 ? (
          <div className="mt-4 rounded-xl border border-dashed border-gray-200 px-4 py-6 text-center text-xs text-gray-400">
            Geen resultaten voor &ldquo;{searchAvailable}&rdquo;.
          </div>
        ) : (
          <div className="mt-4 grid grid-cols-1 gap-3 md:grid-cols-2 xl:grid-cols-3">
            {filteredAvailable.map((c) => (
              <ClientRow
                key={c.id}
                client={c}
                excluded={false}
                isPending={pendingIds.has(c.id)}
                onToggle={() => handleToggle(c.id, false)}
              />
            ))}
          </div>
        )}
      </section>
    </div>
  )
}

function filterByName(list: ClientListItem[], query: string): ClientListItem[] {
  const q = query.trim().toLowerCase()
  if (!q) return list
  return list.filter((c) => c.companyName.toLowerCase().includes(q))
}

function SectionHeader({
  title,
  count,
  tone,
}: {
  title: string
  count: number
  tone: 'excluded' | 'available'
}) {
  const badge =
    tone === 'excluded'
      ? 'bg-rose-50 text-rose-700 ring-rose-200'
      : 'bg-emerald-50 text-emerald-700 ring-emerald-200'
  return (
    <div className="flex items-baseline justify-between">
      <h2 className="text-sm font-semibold uppercase tracking-wide text-gray-500">{title}</h2>
      <span className={`inline-flex items-baseline gap-1 rounded-full px-2.5 py-0.5 text-[11px] font-semibold ring-1 ${badge}`}>
        {count}
      </span>
    </div>
  )
}

function SearchInput({
  value,
  onChange,
  placeholder,
}: {
  value: string
  onChange: (v: string) => void
  placeholder: string
}) {
  return (
    <div className="relative max-w-md">
      <svg
        className="pointer-events-none absolute left-4 top-1/2 h-4 w-4 -translate-y-1/2 text-gray-400"
        fill="none"
        viewBox="0 0 24 24"
        strokeWidth={2}
        stroke="currentColor"
      >
        <path strokeLinecap="round" strokeLinejoin="round" d="m21 21-5.197-5.197m0 0A7.5 7.5 0 1 0 5.196 5.196a7.5 7.5 0 0 0 10.607 10.607Z" />
      </svg>
      <input
        type="text"
        placeholder={placeholder}
        value={value}
        onChange={(e) => onChange(e.target.value)}
        className="w-full rounded-xl border border-gray-200 bg-white py-2.5 pl-11 pr-4 text-sm text-gray-900 placeholder:text-gray-400 shadow-sm transition-all focus:border-indigo-400 focus:outline-none focus:ring-4 focus:ring-indigo-100"
      />
    </div>
  )
}

function ClientRow({
  client,
  excluded,
  isPending,
  onToggle,
}: {
  client: ClientListItem
  excluded: boolean
  isPending: boolean
  onToggle: () => void
}) {
  const accent = client.primaryColor ?? '#6366f1'
  const initials = client.companyName
    .split(/\s+/)
    .slice(0, 2)
    .map((w) => w.charAt(0))
    .join('')
    .toUpperCase()

  return (
    <div className="flex items-center gap-3 rounded-2xl border border-gray-200 bg-white p-3 shadow-sm">
      <div
        className="flex h-10 w-10 flex-shrink-0 items-center justify-center overflow-hidden rounded-xl border border-gray-100 bg-white text-[11px] font-bold text-white shadow-sm"
        style={client.logoUrl ? undefined : { background: `linear-gradient(135deg, ${accent}, ${accent}aa)` }}
      >
        {client.logoUrl ? (
          // eslint-disable-next-line @next/next/no-img-element
          <img src={client.logoUrl} alt={client.companyName} className="h-full w-full object-contain p-1.5" />
        ) : (
          <span className="drop-shadow">{initials}</span>
        )}
      </div>
      <div className="min-w-0 flex-1">
        <div className="truncate text-sm font-semibold text-gray-900">{client.companyName}</div>
        <div className="mt-0.5 text-[11px] text-gray-500">
          {client.status === 'onboarding' ? 'Onboarding' : 'Live'}
        </div>
      </div>
      <button
        type="button"
        onClick={onToggle}
        disabled={isPending}
        className={`inline-flex flex-shrink-0 items-center gap-1.5 rounded-lg px-3 py-2 text-xs font-semibold transition-all disabled:opacity-50 ${
          excluded
            ? 'border border-gray-200 bg-white text-gray-700 hover:border-emerald-300 hover:bg-emerald-50 hover:text-emerald-700'
            : 'bg-gray-900 text-white shadow-sm hover:bg-gray-800'
        }`}
      >
        {excluded ? (
          <>
            <svg className="h-3.5 w-3.5" fill="none" viewBox="0 0 24 24" strokeWidth={2.5} stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" d="M9 15 3 9m0 0 6-6M3 9h12a6 6 0 0 1 0 12h-3" />
            </svg>
            Terugzetten
          </>
        ) : (
          <>
            <svg className="h-3.5 w-3.5" fill="none" viewBox="0 0 24 24" strokeWidth={2.5} stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" d="M18.364 18.364A9 9 0 0 0 5.636 5.636m12.728 12.728A9 9 0 0 1 5.636 5.636m12.728 12.728L5.636 5.636" />
            </svg>
            Excludeer bedrijf
          </>
        )}
      </button>
    </div>
  )
}
