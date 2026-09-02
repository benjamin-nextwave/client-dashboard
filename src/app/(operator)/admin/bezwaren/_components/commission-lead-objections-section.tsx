'use client'

import { useState, useTransition } from 'react'
import { useRouter } from 'next/navigation'
import { formatEuroCents } from '@/lib/commissions-shared'
import type { CommissionObjectionRow } from '@/lib/data/commission-lead-objections'
import { resolveCommissionLeadObjection } from '../actions'

/**
 * Bezwaren op de leads die in Commissies zijn ingevoerd. Dit gaat over geld: de
 * klant stelt een andere categorie voor, of zegt dat de lead helemaal niet in
 * rekening hoort te worden gebracht.
 *
 * Goedkeuren past de commissieregel zelf aan — categorie, prijs, of afgewezen —
 * zodat het financieel overzicht en de leadpagina meteen kloppen.
 */

function nlDatum(iso: string): string {
  const d = new Date(iso)
  return new Intl.DateTimeFormat('nl-NL', { day: 'numeric', month: 'short', year: 'numeric' }).format(d)
}

export function CommissionLeadObjectionsSection({ rows }: { rows: CommissionObjectionRow[] }) {
  if (rows.length === 0) {
    return (
      <p className="mt-3 rounded-lg border border-gray-200 bg-white px-4 py-6 text-center text-sm text-gray-500">
        Geen bezwaren op commissieleads.
      </p>
    )
  }

  return (
    <ul className="mt-3 space-y-3">
      {rows.map((row) => (
        <Regel key={row.id} row={row} />
      ))}
    </ul>
  )
}

function Regel({ row }: { row: CommissionObjectionRow }) {
  const router = useRouter()
  const [pending, startTransition] = useTransition()
  const [response, setResponse] = useState('')
  const [error, setError] = useState<string | null>(null)

  function beslis(besluit: 'approved' | 'rejected') {
    setError(null)
    startTransition(async () => {
      const result = await resolveCommissionLeadObjection({
        objectionId: row.id,
        besluit,
        response: response.trim() || null,
      })
      if (result.error) {
        setError(result.error)
        return
      }
      router.refresh()
    })
  }

  const open = row.status === 'pending'

  return (
    <li className="rounded-lg border border-gray-200 bg-white p-4">
      <div className="flex flex-wrap items-baseline justify-between gap-2">
        <div className="text-sm font-semibold text-gray-900">{row.clientName}</div>
        <div className="text-xs text-gray-400">{nlDatum(row.submittedAt)}</div>
      </div>

      <div className="mt-1 text-xs text-gray-600">
        {row.leadEmail}
        <span className="text-gray-400"> · lead van {row.entryDate}</span>
      </div>

      <div className="mt-3 grid gap-2 sm:grid-cols-2">
        <div className="rounded-lg bg-gray-50 px-3 py-2">
          <div className="text-[11px] font-semibold uppercase tracking-wide text-gray-400">Nu</div>
          <div className="mt-0.5 text-xs text-gray-900">
            {row.currentCategoryName}
            <span className="ml-2 tabular-nums text-gray-500">
              {formatEuroCents(row.currentAmountCents)}
            </span>
          </div>
        </div>
        <div className="rounded-lg bg-indigo-50 px-3 py-2">
          <div className="text-[11px] font-semibold uppercase tracking-wide text-indigo-500">
            Voorstel klant
          </div>
          <div className="mt-0.5 text-xs text-indigo-900">
            {row.proposedCategoryName}
            {row.proposedPriceCents !== null && (
              <span className="ml-2 tabular-nums text-indigo-600">
                {formatEuroCents(row.proposedPriceCents)}
              </span>
            )}
          </div>
        </div>
      </div>

      <p className="mt-3 whitespace-pre-wrap rounded-lg border border-gray-100 bg-white px-3 py-2 text-xs leading-relaxed text-gray-700">
        {row.reason}
      </p>

      {row.response && (
        <p className="mt-2 whitespace-pre-wrap text-xs text-gray-600">
          <span className="font-semibold">Onze reactie: </span>
          {row.response}
        </p>
      )}

      {open ? (
        <div className="mt-3 space-y-2">
          <textarea
            rows={2}
            value={response}
            onChange={(e) => setResponse(e.target.value)}
            placeholder="Reactie voor de klant (optioneel)"
            className="w-full rounded-lg border border-gray-200 px-3 py-2 text-xs text-gray-900 outline-none focus:border-indigo-400"
          />
          {error && <p className="text-xs font-medium text-rose-600">{error}</p>}
          <div className="flex gap-2">
            <button
              type="button"
              onClick={() => beslis('approved')}
              disabled={pending}
              className="rounded-lg bg-gray-900 px-3 py-1.5 text-xs font-semibold text-white hover:bg-gray-800 disabled:opacity-50"
            >
              {pending ? 'Bezig…' : 'Toekennen'}
            </button>
            <button
              type="button"
              onClick={() => beslis('rejected')}
              disabled={pending}
              className="rounded-lg border border-gray-200 px-3 py-1.5 text-xs font-semibold text-gray-600 hover:bg-gray-50 disabled:opacity-50"
            >
              Afwijzen
            </button>
          </div>
          <p className="text-[11px] text-gray-400">
            Toekennen past de commissieregel zelf aan: de categorie en het bedrag gaan mee, of de
            lead wordt op afgewezen gezet.
          </p>
        </div>
      ) : (
        <p
          className={`mt-3 text-xs font-semibold ${
            row.status === 'approved' ? 'text-emerald-600' : 'text-rose-600'
          }`}
        >
          {row.status === 'approved' ? 'Toegekend' : 'Afgewezen'}
          {row.resolvedAt && (
            <span className="font-normal text-gray-400"> · {nlDatum(row.resolvedAt)}</span>
          )}
        </p>
      )}
    </li>
  )
}
