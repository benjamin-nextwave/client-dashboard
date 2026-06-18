'use client'

import { useState } from 'react'
import { usePathname, useRouter } from 'next/navigation'

function ymd(d: Date): string {
  const y = d.getFullYear()
  const m = String(d.getMonth() + 1).padStart(2, '0')
  const day = String(d.getDate()).padStart(2, '0')
  return `${y}-${m}-${day}`
}

interface PeriodSelectorProps {
  from: string
  to: string
}

/**
 * Periodekeuze voor de commissie-overzichten. Presets plus een vrij
 * datumbereik. Schrijft de keuze naar de URL (?from=&to=) zodat de
 * servercomponent de juiste data ophaalt.
 */
export function PeriodSelector({ from, to }: PeriodSelectorProps) {
  const router = useRouter()
  const pathname = usePathname() ?? ''
  const [customFrom, setCustomFrom] = useState(from)
  const [customTo, setCustomTo] = useState(to)

  const apply = (nextFrom: string, nextTo: string) => {
    router.push(`${pathname}?from=${nextFrom}&to=${nextTo}`)
  }

  const presets: Array<{ label: string; compute: () => [string, string] }> = [
    {
      label: 'Vandaag',
      compute: () => {
        const t = ymd(new Date())
        return [t, t]
      },
    },
    {
      label: 'Laatste 7 dagen',
      compute: () => {
        const now = new Date()
        const start = new Date(now)
        start.setDate(now.getDate() - 6)
        return [ymd(start), ymd(now)]
      },
    },
    {
      label: 'Deze maand',
      compute: () => {
        const now = new Date()
        return [ymd(new Date(now.getFullYear(), now.getMonth(), 1)), ymd(now)]
      },
    },
    {
      label: 'Vorige maand',
      compute: () => {
        const now = new Date()
        const first = new Date(now.getFullYear(), now.getMonth() - 1, 1)
        const last = new Date(now.getFullYear(), now.getMonth(), 0)
        return [ymd(first), ymd(last)]
      },
    },
  ]

  const isActive = (f: string, t: string) => f === from && t === to

  return (
    <div className="rounded-2xl border border-gray-200 bg-white p-4 shadow-sm">
      <div className="flex flex-wrap items-center gap-2">
        {presets.map((p) => {
          const [f, t] = p.compute()
          const active = isActive(f, t)
          return (
            <button
              key={p.label}
              type="button"
              onClick={() => apply(f, t)}
              className={`rounded-full px-3 py-1.5 text-xs font-semibold transition-all ${
                active
                  ? 'bg-indigo-600 text-white shadow-sm'
                  : 'border border-gray-200 bg-white text-gray-600 hover:border-indigo-300 hover:text-indigo-700'
              }`}
            >
              {p.label}
            </button>
          )
        })}
      </div>

      <div className="mt-3 flex flex-wrap items-end gap-3 border-t border-gray-100 pt-3">
        <div>
          <label className="block text-[11px] font-semibold uppercase tracking-wide text-gray-500">Van</label>
          <input
            type="date"
            value={customFrom}
            max={customTo}
            onChange={(e) => setCustomFrom(e.target.value)}
            className="mt-1 rounded-lg border border-gray-200 bg-gray-50/40 px-3 py-1.5 text-sm text-gray-900 focus:border-indigo-400 focus:bg-white focus:outline-none focus:ring-4 focus:ring-indigo-100"
          />
        </div>
        <div>
          <label className="block text-[11px] font-semibold uppercase tracking-wide text-gray-500">Tot en met</label>
          <input
            type="date"
            value={customTo}
            min={customFrom}
            onChange={(e) => setCustomTo(e.target.value)}
            className="mt-1 rounded-lg border border-gray-200 bg-gray-50/40 px-3 py-1.5 text-sm text-gray-900 focus:border-indigo-400 focus:bg-white focus:outline-none focus:ring-4 focus:ring-indigo-100"
          />
        </div>
        <button
          type="button"
          onClick={() => {
            if (customFrom && customTo && customFrom <= customTo) apply(customFrom, customTo)
          }}
          className="rounded-lg bg-gray-900 px-4 py-2 text-xs font-semibold text-white transition-colors hover:bg-gray-700"
        >
          Toepassen
        </button>
      </div>
    </div>
  )
}
