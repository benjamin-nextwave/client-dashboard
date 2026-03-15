'use client'

import { useState, useMemo, useTransition } from 'react'
import { useRouter } from 'next/navigation'
import { reviewObjection } from '@/lib/actions/objection-actions'

interface Objection {
  id: string
  email: string
  first_name: string | null
  last_name: string | null
  company_name: string | null
  objection_status: string
  objection_data: {
    showed_intent?: boolean
    asked_question?: boolean
    reason?: string
    submitted_at?: string
    reviewed_at?: string
    response?: string
  } | null
  client_id: string
  client_company_name: string
}

interface ObjectionListProps {
  objections: Objection[]
}

type FilterType = 'all' | 'submitted' | 'approved' | 'rejected'

export function ObjectionList({ objections }: ObjectionListProps) {
  const [filter, setFilter] = useState<FilterType>('submitted')

  const filtered = useMemo(() => {
    if (filter === 'all') return objections
    return objections.filter((o) => o.objection_status === filter)
  }, [objections, filter])

  const submittedCount = objections.filter((o) => o.objection_status === 'submitted').length

  return (
    <div className="mt-6 space-y-4">
      {/* Filter tabs */}
      <div className="flex gap-2">
        {([
          { key: 'submitted', label: 'Open', count: submittedCount },
          { key: 'approved', label: 'Goedgekeurd' },
          { key: 'rejected', label: 'Afgekeurd' },
          { key: 'all', label: 'Alles' },
        ] as const).map((tab) => (
          <button
            key={tab.key}
            type="button"
            onClick={() => setFilter(tab.key)}
            className={`inline-flex items-center gap-1.5 rounded-full px-3 py-1.5 text-xs font-medium transition-colors ${
              filter === tab.key
                ? 'bg-blue-600 text-white'
                : 'bg-white text-gray-700 border border-gray-200 hover:bg-gray-50'
            }`}
          >
            {tab.label}
            {'count' in tab && tab.count != null && tab.count > 0 && (
              <span className={`rounded-full px-1.5 py-0.5 text-xs ${
                filter === tab.key ? 'bg-blue-500' : 'bg-amber-100 text-amber-700'
              }`}>
                {tab.count}
              </span>
            )}
          </button>
        ))}
      </div>

      {filtered.length === 0 ? (
        <div className="rounded-lg bg-gray-50 p-8 text-center text-sm text-gray-500">
          Geen bezwaren gevonden.
        </div>
      ) : (
        <div className="space-y-3">
          {filtered.map((objection) => (
            <ObjectionCard key={objection.id} objection={objection} />
          ))}
        </div>
      )}
    </div>
  )
}

function ObjectionCard({ objection }: { objection: Objection }) {
  const [showReview, setShowReview] = useState(false)
  const [response, setResponse] = useState('')
  const [isPending, startTransition] = useTransition()
  const router = useRouter()

  const name = [objection.first_name, objection.last_name].filter(Boolean).join(' ') || objection.email
  const data = objection.objection_data

  async function handleReview(decision: 'approved' | 'rejected') {
    startTransition(async () => {
      const result = await reviewObjection(objection.id, decision, response.trim())
      if (!result.error) {
        setShowReview(false)
        setResponse('')
        router.refresh()
      }
    })
  }

  return (
    <div className="rounded-lg border border-gray-200 bg-white">
      <div className="px-4 py-3">
        {/* Header */}
        <div className="flex items-start justify-between">
          <div>
            <div className="flex items-center gap-2">
              <span className="text-sm font-medium text-gray-900">{name}</span>
              <span className={`rounded-full px-2 py-0.5 text-xs font-medium ${
                objection.objection_status === 'submitted'
                  ? 'bg-amber-100 text-amber-800'
                  : objection.objection_status === 'approved'
                    ? 'bg-green-100 text-green-800'
                    : 'bg-red-100 text-red-800'
              }`}>
                {objection.objection_status === 'submitted'
                  ? 'Open'
                  : objection.objection_status === 'approved'
                    ? 'Goedgekeurd'
                    : 'Afgekeurd'}
              </span>
            </div>
            <p className="text-xs text-gray-500">
              {objection.email} &middot; {objection.company_name ?? 'Onbekend bedrijf'} &middot; Klant: {objection.client_company_name}
            </p>
          </div>
          {data?.submitted_at && (
            <span className="text-xs text-gray-400">
              {new Date(data.submitted_at).toLocaleDateString('nl-NL', { day: 'numeric', month: 'short', year: 'numeric', hour: '2-digit', minute: '2-digit' })}
            </span>
          )}
        </div>

        {/* Answers */}
        <div className="mt-3 grid grid-cols-2 gap-3">
          <div className="rounded-md bg-gray-50 px-3 py-2">
            <p className="text-xs text-gray-500">Intentie voor afspraak?</p>
            <p className="text-sm font-medium text-gray-900">
              {data?.showed_intent ? 'Ja' : 'Nee'}
            </p>
          </div>
          <div className="rounded-md bg-gray-50 px-3 py-2">
            <p className="text-xs text-gray-500">Inhoudelijke vraag?</p>
            <p className="text-sm font-medium text-gray-900">
              {data?.asked_question ? 'Ja' : 'Nee'}
            </p>
          </div>
        </div>

        {/* Reason */}
        {data?.reason && (
          <div className="mt-3 rounded-md bg-gray-50 px-3 py-2">
            <p className="text-xs text-gray-500">Reden bezwaar</p>
            <p className="mt-0.5 text-sm text-gray-700">{data.reason}</p>
          </div>
        )}

        {/* Previous response (if already reviewed) */}
        {data?.response && (
          <div className={`mt-3 rounded-md px-3 py-2 ${
            objection.objection_status === 'approved' ? 'bg-green-50' : 'bg-red-50'
          }`}>
            <p className="text-xs text-gray-500">Toelichting</p>
            <p className="mt-0.5 text-sm text-gray-700">{data.response}</p>
          </div>
        )}

        {/* Review actions */}
        {objection.objection_status === 'submitted' && (
          <>
            {showReview ? (
              <div className="mt-3 space-y-3 border-t border-gray-100 pt-3">
                <textarea
                  value={response}
                  onChange={(e) => setResponse(e.target.value)}
                  rows={3}
                  placeholder="Toelichting bij je beoordeling (zichtbaar voor de klant)..."
                  className="w-full rounded-md border border-gray-300 px-3 py-2 text-sm focus:border-blue-500 focus:outline-none focus:ring-1 focus:ring-blue-500"
                />
                <div className="flex gap-2">
                  <button
                    type="button"
                    onClick={() => handleReview('approved')}
                    disabled={isPending}
                    className="rounded-md bg-green-600 px-4 py-2 text-sm font-medium text-white hover:bg-green-700 disabled:opacity-50"
                  >
                    {isPending ? 'Verwerken...' : 'Goedkeuren'}
                  </button>
                  <button
                    type="button"
                    onClick={() => handleReview('rejected')}
                    disabled={isPending}
                    className="rounded-md bg-red-600 px-4 py-2 text-sm font-medium text-white hover:bg-red-700 disabled:opacity-50"
                  >
                    {isPending ? 'Verwerken...' : 'Afkeuren'}
                  </button>
                  <button
                    type="button"
                    onClick={() => { setShowReview(false); setResponse('') }}
                    className="rounded-md bg-gray-100 px-4 py-2 text-sm font-medium text-gray-700 hover:bg-gray-200"
                  >
                    Annuleren
                  </button>
                </div>
              </div>
            ) : (
              <div className="mt-3 border-t border-gray-100 pt-3">
                <button
                  type="button"
                  onClick={() => setShowReview(true)}
                  className="rounded-md bg-blue-600 px-4 py-2 text-sm font-medium text-white hover:bg-blue-700"
                >
                  Beoordelen
                </button>
              </div>
            )}
          </>
        )}
      </div>
    </div>
  )
}
