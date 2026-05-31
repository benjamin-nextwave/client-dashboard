'use client'

import { useState, useTransition } from 'react'
import { useRouter } from 'next/navigation'
import { updateClientDncSectors } from '../actions'

interface Props {
  clientId: string
  initialSectors: string[]
  accent: string
}

export function DncSectorsEditor({ clientId, initialSectors, accent }: Props) {
  const router = useRouter()
  const [sectors, setSectors] = useState<string[]>(initialSectors)
  const [draft, setDraft] = useState('')
  const [pending, startTransition] = useTransition()

  const save = (next: string[]) => {
    setSectors(next)
    startTransition(async () => {
      await updateClientDncSectors(clientId, next)
      router.refresh()
    })
  }

  const handleAdd = () => {
    const value = draft.trim()
    if (value.length === 0) return
    if (sectors.some((s) => s.toLowerCase() === value.toLowerCase())) {
      setDraft('')
      return
    }
    save([...sectors, value])
    setDraft('')
  }

  const handleRemove = (index: number) => {
    save(sectors.filter((_, i) => i !== index))
  }

  return (
    <section className="rounded-2xl border border-gray-200 bg-white p-5 shadow-sm">
      <div className="mb-3 flex items-center justify-between gap-3">
        <div>
          <h2 className="text-sm font-semibold text-gray-900">Sectoren om uit te sluiten</h2>
          <p className="text-xs text-gray-500">Typ een sector en druk op + (of Enter) om toe te voegen.</p>
        </div>
        {pending && <span className="text-[11px] text-gray-400">Opslaan…</span>}
      </div>

      <div className="flex flex-wrap gap-2">
        {sectors.map((sector, idx) => (
          <span
            key={`${sector}-${idx}`}
            className="inline-flex items-center gap-1.5 rounded-full border bg-white px-3 py-1 text-xs font-medium text-gray-800 shadow-sm"
            style={{ borderColor: `${accent}55` }}
          >
            <span
              className="inline-block h-1.5 w-1.5 rounded-full"
              style={{ background: accent }}
            />
            {sector}
            <button
              type="button"
              onClick={() => handleRemove(idx)}
              disabled={pending}
              className="ml-0.5 rounded-full p-0.5 text-gray-400 hover:bg-gray-100 hover:text-red-600 disabled:opacity-50"
              aria-label={`Verwijder ${sector}`}
            >
              <svg className="h-3 w-3" fill="none" viewBox="0 0 24 24" strokeWidth={2.5} stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" d="M6 18 18 6M6 6l12 12" />
              </svg>
            </button>
          </span>
        ))}
        {sectors.length === 0 && (
          <span className="text-xs italic text-gray-400">Nog geen sectoren toegevoegd.</span>
        )}
      </div>

      <div className="mt-4 flex gap-2">
        <input
          type="text"
          value={draft}
          onChange={(e) => setDraft(e.target.value)}
          onKeyDown={(e) => {
            if (e.key === 'Enter') {
              e.preventDefault()
              handleAdd()
            }
          }}
          placeholder="Bijv. recruitment, vastgoed, callcenters…"
          className="flex-1 rounded-lg border border-gray-200 bg-white px-3 py-2 text-sm text-gray-900 focus:border-indigo-400 focus:outline-none focus:ring-2 focus:ring-indigo-100"
        />
        <button
          type="button"
          onClick={handleAdd}
          disabled={pending || draft.trim().length === 0}
          className="inline-flex items-center gap-1 rounded-lg bg-gray-900 px-3 py-2 text-xs font-semibold text-white shadow-sm hover:bg-gray-800 disabled:opacity-50"
        >
          <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" strokeWidth={2.5} stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" d="M12 4.5v15m7.5-7.5h-15" />
          </svg>
          Sector
        </button>
      </div>
    </section>
  )
}
