'use client'

import { useState, useTransition } from 'react'
import { useRouter } from 'next/navigation'
import { publishProposal, clearProposal } from '../actions'

interface Props {
  clientId: string
  currentTitle: string | null
  currentBody: string | null
  publishedAt: string | null
  acknowledgedAt: string | null
}

function formatDateTime(iso: string): string {
  return new Date(iso).toLocaleString('nl-NL', {
    day: 'numeric',
    month: 'short',
    year: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
  })
}

export function ProposalEditor({
  clientId,
  currentTitle,
  currentBody,
  publishedAt,
  acknowledgedAt,
}: Props) {
  const router = useRouter()
  const [pending, startTransition] = useTransition()
  const [title, setTitle] = useState(currentTitle ?? '')
  const [body, setBody] = useState(currentBody ?? '')
  const [error, setError] = useState<string | null>(null)
  const [published, setPublished] = useState(false)

  const hasExisting = !!publishedAt
  const isAcknowledged = !!acknowledgedAt && (!publishedAt || new Date(acknowledgedAt) >= new Date(publishedAt))

  const handlePublish = () => {
    setError(null)
    setPublished(false)
    startTransition(async () => {
      const result = await publishProposal(clientId, title, body)
      if (result.error) {
        setError(result.error)
      } else {
        setPublished(true)
        setTimeout(() => setPublished(false), 3000)
        router.refresh()
      }
    })
  }

  const handleClear = () => {
    if (!confirm('Voorstel verwijderen? De klant kan het daarna niet meer zien.')) return
    setError(null)
    startTransition(async () => {
      const result = await clearProposal(clientId)
      if (result.error) setError(result.error)
      else {
        setTitle('')
        setBody('')
        router.refresh()
      }
    })
  }

  return (
    <section className="rounded-2xl border border-gray-200 bg-white p-6 shadow-sm">
      <div className="mb-5 flex items-start justify-between gap-4 border-b border-gray-100 pb-4">
        <div>
          <h2 className="text-sm font-semibold text-gray-900">Campagnevoorstel</h2>
          <p className="mt-0.5 text-xs text-gray-500">
            Schrijf een tekstueel voorstel voor een campagnewijziging. Na publicatie verschijnt het
            in het klantdashboard ter goedkeuring.
          </p>
        </div>
        {hasExisting && (
          <div className="flex-shrink-0 text-right">
            {isAcknowledged ? (
              <span className="inline-flex items-center gap-1 rounded-full bg-emerald-50 px-2.5 py-1 text-[10px] font-semibold text-emerald-700 ring-1 ring-emerald-200">
                <svg className="h-3 w-3" fill="none" viewBox="0 0 24 24" strokeWidth={3} stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" d="m4.5 12.75 6 6 9-13.5" />
                </svg>
                Goedgekeurd
              </span>
            ) : (
              <span className="inline-flex items-center gap-1 rounded-full bg-amber-50 px-2.5 py-1 text-[10px] font-semibold text-amber-700 ring-1 ring-amber-200">
                Wacht op goedkeuring
              </span>
            )}
            <div className="mt-1 text-[10px] text-gray-400">
              Gepubliceerd {formatDateTime(publishedAt!)}
            </div>
          </div>
        )}
      </div>

      {error && (
        <div className="mb-4 rounded-xl border border-red-200 bg-red-50 p-3 text-sm text-red-700">
          {error}
        </div>
      )}

      <div className="space-y-3">
        <div>
          <label className="mb-1 block text-[11px] font-semibold uppercase tracking-wide text-gray-500">
            Titel
          </label>
          <input
            type="text"
            value={title}
            onChange={(e) => setTitle(e.target.value)}
            placeholder="Bv. Wijziging targetting regio Zuid-Holland"
            disabled={pending}
            className="w-full rounded-xl border border-gray-200 bg-white px-4 py-2.5 text-sm shadow-sm focus:border-indigo-400 focus:outline-none focus:ring-4 focus:ring-indigo-100 disabled:opacity-50"
          />
        </div>
        <div>
          <label className="mb-1 block text-[11px] font-semibold uppercase tracking-wide text-gray-500">
            Beschrijving
          </label>
          <textarea
            value={body}
            onChange={(e) => setBody(e.target.value)}
            rows={6}
            placeholder="Beschrijf het voorstel in detail: wat wil je wijzigen, waarom, en wat verwacht je als resultaat..."
            disabled={pending}
            className="w-full rounded-xl border border-gray-200 bg-white px-4 py-2.5 text-sm shadow-sm focus:border-indigo-400 focus:outline-none focus:ring-4 focus:ring-indigo-100 disabled:opacity-50"
          />
        </div>
      </div>

      <div className="mt-4 flex flex-wrap items-center gap-2">
        <button
          type="button"
          onClick={handlePublish}
          disabled={pending || !title.trim() || !body.trim()}
          className="inline-flex items-center gap-2 rounded-xl bg-gray-900 px-5 py-2.5 text-sm font-semibold text-white shadow-sm transition-all hover:bg-indigo-600 hover:shadow-md disabled:cursor-not-allowed disabled:bg-gray-200 disabled:text-gray-400"
        >
          {published ? (
            <>
              <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" strokeWidth={3} stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" d="m4.5 12.75 6 6 9-13.5" />
              </svg>
              Gepubliceerd
            </>
          ) : hasExisting ? (
            'Voorstel bijwerken en publiceren'
          ) : (
            'Publiceer voorstel in klantdashboard'
          )}
        </button>
        {hasExisting && (
          <button
            type="button"
            onClick={handleClear}
            disabled={pending}
            className="text-xs font-medium text-red-600 hover:text-red-700 disabled:opacity-50"
          >
            Voorstel verwijderen
          </button>
        )}
      </div>
    </section>
  )
}
