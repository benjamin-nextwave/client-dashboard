'use client'

import { useState, useMemo } from 'react'
import { useRouter } from 'next/navigation'
import type { ControleClientListItem } from '@/lib/data/controle'

// Tone-systeem voor de kaarten op /admin/controle/ochtend.
//   today     vandaag (0d)            → groen
//   yesterday gisteren (1d)           → geel
//   recent-red eergisteren (2d)       → rood (zonder alarm)
//   alarm     3+ dagen of nooit       → rood met knipperend alarm-icoontje
//
// Het diff-getal wordt in lokale dagen vergeleken, niet in absolute uren, zodat
// een controle van vannacht 23:50 niet als "1 dag geleden" geldt.
function daysAgoLocal(date: Date): number {
  const now = new Date()
  const a = new Date(now.getFullYear(), now.getMonth(), now.getDate()).getTime()
  const b = new Date(date.getFullYear(), date.getMonth(), date.getDate()).getTime()
  return Math.round((a - b) / 86_400_000)
}

type CardTone = 'today' | 'yesterday' | 'recent-red' | 'alarm'

function formatLastChecked(dateStr: string | null): { text: string; tone: CardTone } {
  if (!dateStr) return { text: 'Nog nooit gecheckt', tone: 'alarm' }
  const date = new Date(dateStr)
  const diffDays = daysAgoLocal(date)
  if (diffDays <= 0) return { text: 'Vandaag gecheckt', tone: 'today' }
  if (diffDays === 1) return { text: 'Gisteren gecheckt', tone: 'yesterday' }
  if (diffDays === 2) return { text: 'Eergisteren gecheckt', tone: 'recent-red' }
  return { text: `${diffDays}d geleden gecheckt`, tone: 'alarm' }
}

interface ClientSelectionListProps {
  clients: ControleClientListItem[]
  /** Persona-segment in de URL — bepaalt waar 'Begin de controle' heen springt. */
  persona: 'benjamin' | 'merlijn'
}

export function ClientSelectionList({ clients, persona }: ClientSelectionListProps) {
  const router = useRouter()
  const [selected, setSelected] = useState<Set<string>>(new Set())
  const [search, setSearch] = useState('')
  const [showCart, setShowCart] = useState(false)

  const filtered = useMemo(() => {
    if (!search.trim()) return clients
    const q = search.toLowerCase()
    return clients.filter((c) => c.companyName.toLowerCase().includes(q))
  }, [clients, search])

  const toggle = (id: string) => {
    setSelected((prev) => {
      const next = new Set(prev)
      if (next.has(id)) next.delete(id)
      else next.add(id)
      return next
    })
  }

  const selectedClients = clients.filter((c) => selected.has(c.id))

  const startCheck = () => {
    if (selected.size === 0) return
    const ids = Array.from(selected).join(',')
    router.push(`/admin/controle/ochtend/${persona}/sessie?ids=${ids}`)
  }

  return (
    <>
      {/* Search */}
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
          placeholder="Zoek een klant..."
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          className="w-full rounded-xl border border-gray-200 bg-white py-3 pl-11 pr-4 text-sm text-gray-900 placeholder:text-gray-400 shadow-sm transition-all focus:border-indigo-400 focus:outline-none focus:ring-4 focus:ring-indigo-100"
        />
      </div>

      {/* Grid */}
      {filtered.length === 0 ? (
        <div className="flex flex-col items-center rounded-2xl border border-dashed border-gray-200 bg-gradient-to-b from-gray-50/50 to-white px-6 py-16 text-center">
          <p className="text-sm text-gray-500">Geen klanten gevonden.</p>
        </div>
      ) : (
        <div className="grid grid-cols-1 gap-3 md:grid-cols-2 xl:grid-cols-3">
          {filtered.map((client) => (
            <ClientSelectionCard
              key={client.id}
              client={client}
              checked={selected.has(client.id)}
              onToggle={() => toggle(client.id)}
            />
          ))}
        </div>
      )}

      {/* Bottom bar */}
      <BottomBar
        count={selected.size}
        onShowCart={() => setShowCart(true)}
        onStart={startCheck}
      />

      {/* Cart modal */}
      {showCart && (
        <CartModal
          clients={selectedClients}
          onClose={() => setShowCart(false)}
          onRemove={(id) => toggle(id)}
        />
      )}
    </>
  )
}

function ClientSelectionCard({
  client,
  checked,
  onToggle,
}: {
  client: ControleClientListItem
  checked: boolean
  onToggle: () => void
}) {
  const last = formatLastChecked(client.lastCheckedAt)
  const accent = client.primaryColor ?? '#6366f1'

  const initials = client.companyName
    .split(/\s+/)
    .slice(0, 2)
    .map((w) => w.charAt(0))
    .join('')
    .toUpperCase()

  const toneBadgeClass = {
    today: 'bg-emerald-100 text-emerald-700',
    yesterday: 'bg-amber-100 text-amber-800',
    'recent-red': 'bg-rose-100 text-rose-700',
    alarm: 'bg-rose-600 text-white',
  }[last.tone]

  // Achtergrond + linker accentbalk verschillen per tone — alleen alarm
  // krijgt een extra pulserende ring zodat hij echt opvalt.
  const cardToneClass = checked
    ? 'border-indigo-500 ring-2 ring-indigo-500/30 shadow-indigo-500/10'
    : {
        today: 'border-emerald-200 bg-emerald-50/40 hover:border-emerald-300',
        yesterday: 'border-amber-200 bg-amber-50/40 hover:border-amber-300',
        'recent-red': 'border-rose-200 bg-rose-50/40 hover:border-rose-300',
        alarm: 'border-rose-400 bg-rose-50/70 ring-2 ring-rose-300 hover:border-rose-500',
      }[last.tone]

  const statusBadge = (() => {
    if (client.status === 'onboarding') {
      return (
        <span className="inline-flex items-center gap-1 rounded-md bg-amber-100 px-1.5 py-0.5 text-[10px] font-semibold text-amber-700">
          Onboarding
        </span>
      )
    }
    return (
      <span className="inline-flex items-center gap-1 rounded-md bg-emerald-100 px-1.5 py-0.5 text-[10px] font-semibold text-emerald-700">
        Live
      </span>
    )
  })()

  return (
    <button
      type="button"
      onClick={onToggle}
      className={`group relative isolate overflow-hidden rounded-2xl border text-left shadow-sm transition-all duration-200 hover:-translate-y-0.5 hover:shadow-md ${cardToneClass}`}
    >
      {last.tone === 'alarm' && (
        <div className="pointer-events-none absolute -left-1 -top-1 z-10 flex h-7 w-7 animate-pulse items-center justify-center rounded-full bg-rose-600 text-white shadow-lg shadow-rose-500/50 ring-2 ring-white">
          <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" strokeWidth={2.5} stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" d="M14.857 17.082a23.848 23.848 0 0 0 5.454-1.31A8.967 8.967 0 0 1 18 9.75V9A6 6 0 0 0 6 9v.75a8.967 8.967 0 0 1-2.312 6.022c1.733.64 3.56 1.085 5.455 1.31m5.714 0a24.255 24.255 0 0 1-5.714 0m5.714 0a3 3 0 1 1-5.714 0" />
          </svg>
        </div>
      )}
      <div
        className="absolute inset-x-0 top-0 h-1 opacity-70"
        style={{ background: `linear-gradient(90deg, ${accent}, ${accent}55 60%, transparent)` }}
      />
      <div className="relative p-4">
        <div className="flex items-center gap-3">
          {/* Logo / initials */}
          <div
            className="flex h-12 w-12 flex-shrink-0 items-center justify-center overflow-hidden rounded-xl border border-gray-100 bg-white text-xs font-bold text-white shadow-sm"
            style={client.logoUrl ? undefined : { background: `linear-gradient(135deg, ${accent}, ${accent}aa)` }}
          >
            {client.logoUrl ? (
              // eslint-disable-next-line @next/next/no-img-element
              <img src={client.logoUrl} alt={client.companyName} className="h-full w-full object-contain p-1.5" />
            ) : (
              <span className="drop-shadow">{initials}</span>
            )}
          </div>

          {/* Name + status */}
          <div className="min-w-0 flex-1">
            <div className="truncate text-sm font-semibold text-gray-900">{client.companyName}</div>
            <div className="mt-1 flex items-center gap-1.5">{statusBadge}</div>
          </div>

          {/* Checkbox visual */}
          <div
            className={`flex h-6 w-6 flex-shrink-0 items-center justify-center rounded-md border-2 transition-all ${
              checked ? 'border-indigo-600 bg-indigo-600' : 'border-gray-300 bg-white'
            }`}
          >
            {checked && (
              <svg className="h-4 w-4 text-white" fill="none" viewBox="0 0 24 24" strokeWidth={3} stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" d="m4.5 12.75 6 6 9-13.5" />
              </svg>
            )}
          </div>
        </div>

        {/* Last checked badge */}
        <div className="mt-3 inline-flex items-center gap-1.5 rounded-md px-2 py-1 text-[11px] font-semibold">
          <span className={`inline-flex items-center gap-1 rounded ${toneBadgeClass} px-2 py-0.5`}>
            <svg className="h-3 w-3" fill="none" viewBox="0 0 24 24" strokeWidth={2} stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" d="M12 6v6h4.5m4.5 0a9 9 0 1 1-18 0 9 9 0 0 1 18 0Z" />
            </svg>
            {last.text}
          </span>
        </div>
      </div>
    </button>
  )
}

function BottomBar({
  count,
  onShowCart,
  onStart,
}: {
  count: number
  onShowCart: () => void
  onStart: () => void
}) {
  const disabled = count === 0

  return (
    <div className="fixed inset-x-0 bottom-0 z-30 border-t border-gray-200 bg-white/95 px-6 py-4 shadow-[0_-4px_20px_rgba(0,0,0,0.04)] backdrop-blur-xl lg:px-10">
      <div className="mx-auto flex max-w-[1600px] flex-wrap items-center justify-between gap-3">
        <div className="flex items-center gap-3">
          <div className="relative flex h-12 w-12 items-center justify-center rounded-xl bg-gradient-to-br from-indigo-600 to-violet-600 text-white shadow-lg shadow-indigo-500/30">
            <svg className="h-5 w-5" fill="none" viewBox="0 0 24 24" strokeWidth={2} stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" d="M2.25 3h1.386c.51 0 .955.343 1.087.835l.383 1.437M7.5 14.25a3 3 0 0 0-3 3h15.75m-12.75-3h11.218c1.121-2.3 2.1-4.684 2.924-7.138a60.114 60.114 0 0 0-16.536-1.84M7.5 14.25 5.106 5.272M6 20.25a.75.75 0 1 1-1.5 0 .75.75 0 0 1 1.5 0Zm12.75 0a.75.75 0 1 1-1.5 0 .75.75 0 0 1 1.5 0Z" />
            </svg>
            <span className="absolute -right-1 -top-1 flex h-5 min-w-5 items-center justify-center rounded-full bg-gray-900 px-1.5 text-[10px] font-bold text-white shadow">
              {count}
            </span>
          </div>
          <div>
            <div className="text-sm font-semibold text-gray-900">
              {count} {count === 1 ? 'klant geselecteerd' : 'klanten geselecteerd'}
            </div>
            <div className="text-xs text-gray-500">
              {disabled ? 'Selecteer eerst een of meerdere klanten' : 'Klaar om te beginnen'}
            </div>
          </div>
        </div>

        <div className="flex items-center gap-2">
          <button
            type="button"
            onClick={onShowCart}
            disabled={disabled}
            className="inline-flex items-center gap-2 rounded-xl border border-gray-200 bg-white px-5 py-3 text-sm font-semibold text-gray-700 shadow-sm transition-all hover:border-gray-300 hover:bg-gray-50 disabled:cursor-not-allowed disabled:opacity-40"
          >
            <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" strokeWidth={2} stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" d="M2.036 12.322a1.012 1.012 0 0 1 0-.639C3.423 7.51 7.36 4.5 12 4.5c4.638 0 8.573 3.007 9.963 7.178.07.207.07.431 0 .639C20.577 16.49 16.64 19.5 12 19.5c-4.638 0-8.573-3.007-9.963-7.178Z" />
              <path strokeLinecap="round" strokeLinejoin="round" d="M15 12a3 3 0 1 1-6 0 3 3 0 0 1 6 0Z" />
            </svg>
            Bekijk bedrijven
          </button>
          <button
            type="button"
            onClick={onStart}
            disabled={disabled}
            className="group inline-flex items-center gap-2 rounded-xl bg-gradient-to-br from-indigo-600 via-violet-600 to-fuchsia-600 px-6 py-3 text-sm font-semibold text-white shadow-lg shadow-violet-600/30 transition-all hover:-translate-y-0.5 hover:shadow-xl hover:shadow-violet-600/40 disabled:cursor-not-allowed disabled:opacity-40 disabled:hover:translate-y-0"
          >
            Begin de controle
            <svg className="h-4 w-4 transition-transform group-hover:translate-x-0.5" fill="none" viewBox="0 0 24 24" strokeWidth={2.5} stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" d="M13.5 4.5 21 12m0 0-7.5 7.5M21 12H3" />
            </svg>
          </button>
        </div>
      </div>
    </div>
  )
}

function CartModal({
  clients,
  onClose,
  onRemove,
}: {
  clients: ControleClientListItem[]
  onClose: () => void
  onRemove: (id: string) => void
}) {
  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm"
      onClick={onClose}
    >
      <div
        className="mx-4 w-full max-w-lg rounded-2xl bg-white p-6 shadow-2xl"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="mb-4 flex items-center justify-between">
          <div>
            <h3 className="text-lg font-semibold text-gray-900">Geselecteerde klanten</h3>
            <p className="text-xs text-gray-500">{clients.length} {clients.length === 1 ? 'klant' : 'klanten'} op je lijst</p>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="rounded-lg p-1.5 text-gray-400 transition-colors hover:bg-gray-100 hover:text-gray-700"
          >
            <svg className="h-5 w-5" fill="none" viewBox="0 0 24 24" strokeWidth={2} stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" d="M6 18 18 6M6 6l12 12" />
            </svg>
          </button>
        </div>

        {clients.length === 0 ? (
          <div className="rounded-lg border border-dashed border-gray-200 px-4 py-8 text-center text-sm text-gray-400">
            Nog geen klanten geselecteerd.
          </div>
        ) : (
          <ul className="max-h-[60vh] space-y-2 overflow-y-auto">
            {clients.map((c) => (
              <li
                key={c.id}
                className="flex items-center justify-between gap-3 rounded-xl border border-gray-200 bg-gray-50/60 px-3 py-2.5"
              >
                <div className="min-w-0 flex-1">
                  <div className="truncate text-sm font-semibold text-gray-900">{c.companyName}</div>
                  <div className="text-[11px] text-gray-500">
                    {c.status === 'onboarding' ? 'Onboarding' : 'Live'}
                  </div>
                </div>
                <button
                  type="button"
                  onClick={() => onRemove(c.id)}
                  className="rounded-md p-1.5 text-gray-400 transition-colors hover:bg-red-50 hover:text-red-600"
                >
                  <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" strokeWidth={2} stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" d="m14.74 9-.346 9m-4.788 0L9.26 9m9.968-3.21c.342.052.682.107 1.022.166m-1.022-.165L18.16 19.673a2.25 2.25 0 0 1-2.244 2.077H8.084a2.25 2.25 0 0 1-2.244-2.077L4.772 5.79" />
                  </svg>
                </button>
              </li>
            ))}
          </ul>
        )}
      </div>
    </div>
  )
}
