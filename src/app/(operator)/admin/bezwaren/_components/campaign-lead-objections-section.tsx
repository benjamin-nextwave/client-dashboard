'use client'

import { useMemo, useState, useTransition } from 'react'
import Link from 'next/link'
import { useRouter } from 'next/navigation'
import {
  LABEL_META,
  type CampaignLeadWithClient,
  type ObjectionStatus,
} from '@/lib/data/campaign-leads'
import { resolveLeadObjection } from '@/lib/actions/campaign-leads-actions'

const DATE_FMT = new Intl.DateTimeFormat('nl-NL', {
  day: 'numeric',
  month: 'short',
  year: 'numeric',
  hour: '2-digit',
  minute: '2-digit',
})

type FilterType = 'pending' | 'approved' | 'rejected' | 'all'

export function CampaignLeadObjectionsSection({
  leads,
}: {
  leads: CampaignLeadWithClient[]
}) {
  const [filter, setFilter] = useState<FilterType>('pending')

  const counts = useMemo(() => {
    const c: Record<ObjectionStatus, number> = { pending: 0, approved: 0, rejected: 0 }
    for (const l of leads) {
      if (l.objectionStatus) c[l.objectionStatus] += 1
    }
    return c
  }, [leads])

  const filtered = useMemo(() => {
    if (filter === 'all') return leads
    return leads.filter((l) => l.objectionStatus === filter)
  }, [leads, filter])

  const tabs: { key: FilterType; label: string; count?: number }[] = [
    { key: 'pending', label: 'Open', count: counts.pending },
    { key: 'approved', label: 'Goedgekeurd', count: counts.approved },
    { key: 'rejected', label: 'Afgekeurd', count: counts.rejected },
    { key: 'all', label: 'Alles', count: leads.length },
  ]

  return (
    <div className="mt-4 space-y-4">
      <div className="flex flex-wrap gap-2">
        {tabs.map((tab) => (
          <button
            key={tab.key}
            type="button"
            onClick={() => setFilter(tab.key)}
            className={`inline-flex items-center gap-1.5 rounded-full px-3 py-1.5 text-xs font-medium transition-colors ${
              filter === tab.key
                ? 'bg-blue-600 text-white'
                : 'border border-gray-200 bg-white text-gray-700 hover:bg-gray-50'
            }`}
          >
            {tab.label}
            {tab.count != null && tab.count > 0 && (
              <span
                className={`rounded-full px-1.5 py-0.5 text-xs ${
                  filter === tab.key ? 'bg-blue-500' : 'bg-amber-100 text-amber-700'
                }`}
              >
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
          {filtered.map((lead) => (
            <ObjectionCard key={lead.id} lead={lead} />
          ))}
        </div>
      )}
    </div>
  )
}

function ObjectionCard({ lead }: { lead: CampaignLeadWithClient }) {
  const router = useRouter()
  const [pending, startTransition] = useTransition()
  const [showReview, setShowReview] = useState(false)
  const [response, setResponse] = useState('')
  const [error, setError] = useState<string | null>(null)
  const meta = LABEL_META[lead.label]

  const handleReview = (decision: 'approved' | 'rejected') => {
    setError(null)
    if (response.trim().length < 5) {
      setError('Geef minimaal 5 tekens toelichting.')
      return
    }
    startTransition(async () => {
      const result = await resolveLeadObjection({
        leadId: lead.id,
        decision,
        response: response.trim(),
      })
      if ('error' in result) {
        setError(result.error)
        return
      }
      setShowReview(false)
      setResponse('')
      router.refresh()
    })
  }

  const statusBadge =
    lead.objectionStatus === 'pending'
      ? 'bg-amber-100 text-amber-800'
      : lead.objectionStatus === 'approved'
        ? 'bg-emerald-100 text-emerald-800'
        : 'bg-rose-100 text-rose-800'

  const statusLabel =
    lead.objectionStatus === 'pending'
      ? 'Open'
      : lead.objectionStatus === 'approved'
        ? 'Goedgekeurd'
        : 'Afgekeurd'

  return (
    <div className="rounded-lg border border-gray-200 bg-white p-4">
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div className="min-w-0 flex-1">
          <div className="flex flex-wrap items-center gap-2">
            <span className="text-sm font-semibold text-gray-900">
              {lead.leadName ?? lead.leadEmail}
            </span>
            <span className={`rounded-full px-2 py-0.5 text-[11px] font-medium ${statusBadge}`}>
              {statusLabel}
            </span>
            <span
              className={`inline-flex items-center gap-1.5 rounded-full border px-2 py-0.5 text-[11px] font-semibold ${meta.badge}`}
            >
              <span className={`h-1.5 w-1.5 rounded-full ${meta.dot}`} />
              {meta.short}
            </span>
          </div>
          <p className="mt-0.5 text-xs text-gray-500">
            {lead.leadEmail} · klant: <span className="font-medium text-gray-700">{lead.clientCompanyName}</span>
            {lead.leadCompany ? ` · ${lead.leadCompany}` : ''}
          </p>
        </div>
        <div className="flex flex-col items-end gap-1 text-right">
          {lead.objectionSubmittedAt && (
            <span className="text-xs text-gray-400">
              Ingediend: {DATE_FMT.format(new Date(lead.objectionSubmittedAt))}
            </span>
          )}
          <Link
            href={`/admin/clients/${lead.clientId}/campagne-leads`}
            className="text-xs font-semibold text-indigo-600 hover:text-indigo-800"
          >
            Open klant →
          </Link>
        </div>
      </div>

      {/* Reactie van de lead (waar het bezwaar over gaat) */}
      {(lead.replySubject || lead.replyBody) && (
        <div className="mt-3 rounded-md border border-gray-100 bg-gray-50 p-3">
          <p className="text-[11px] font-semibold uppercase tracking-wide text-gray-500">
            Reactie van de lead
          </p>
          {lead.replySubject && (
            <p className="mt-1 text-sm font-medium text-gray-900">{lead.replySubject}</p>
          )}
          {lead.replyBody && (
            <p className="mt-1 line-clamp-3 whitespace-pre-wrap text-sm text-gray-700">
              {lead.replyBody}
            </p>
          )}
        </div>
      )}

      {/* Voorgesteld label door klant */}
      {lead.objectionProposedLabel && (
        <div className="mt-3 rounded-md border border-rose-200 bg-rose-50/60 p-3">
          <p className="text-[11px] font-semibold uppercase tracking-wide text-rose-700">
            Voorgesteld label door klant
          </p>
          <div className="mt-1 flex flex-wrap items-center gap-2">
            <span className="text-xs text-gray-500">Huidig:</span>
            <span
              className={`inline-flex items-center gap-1.5 rounded-full border px-2 py-0.5 text-[11px] font-semibold ${meta.badge}`}
            >
              <span className={`h-1.5 w-1.5 rounded-full ${meta.dot}`} />
              {meta.short}
            </span>
            <svg className="h-3.5 w-3.5 text-gray-400" fill="none" viewBox="0 0 24 24" strokeWidth={2} stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" d="M13.5 4.5 21 12m0 0-7.5 7.5M21 12H3" />
            </svg>
            <span className="text-xs text-gray-500">Voorgesteld:</span>
            <span
              className={`inline-flex items-center gap-1.5 rounded-full border px-2 py-0.5 text-[11px] font-semibold ${LABEL_META[lead.objectionProposedLabel].badge}`}
            >
              <span className={`h-1.5 w-1.5 rounded-full ${LABEL_META[lead.objectionProposedLabel].dot}`} />
              {LABEL_META[lead.objectionProposedLabel].short}
            </span>
          </div>
          {lead.objectionProposedLabelNote && (
            <p className="mt-2 whitespace-pre-wrap text-sm text-rose-900">
              {lead.objectionProposedLabelNote}
            </p>
          )}
        </div>
      )}

      {/* Volledig gesprek met de AI-beoordelaar */}
      {lead.objectionText && (
        <details className="mt-3 rounded-md border border-amber-200 bg-amber-50/60 p-3">
          <summary className="cursor-pointer text-[11px] font-semibold uppercase tracking-wide text-amber-700 hover:text-amber-900">
            Gesprek met AI-beoordelaar
          </summary>
          <p className="mt-2 whitespace-pre-wrap text-sm text-amber-900">{lead.objectionText}</p>
        </details>
      )}

      {/* Eerdere beoordeling als die er is */}
      {lead.objectionStatus !== 'pending' && lead.objectionResponse && (
        <div
          className={`mt-3 rounded-md p-3 ${
            lead.objectionStatus === 'approved'
              ? 'border border-emerald-200 bg-emerald-50'
              : 'border border-rose-200 bg-rose-50'
          }`}
        >
          <p
            className={`text-[11px] font-semibold uppercase tracking-wide ${
              lead.objectionStatus === 'approved' ? 'text-emerald-700' : 'text-rose-700'
            }`}
          >
            Toelichting beoordeling
            {lead.objectionResolvedAt && (
              <span className="ml-2 font-normal text-gray-500">
                · {DATE_FMT.format(new Date(lead.objectionResolvedAt))}
              </span>
            )}
          </p>
          <p className="mt-1 whitespace-pre-wrap text-sm text-gray-800">
            {lead.objectionResponse}
          </p>
        </div>
      )}

      {/* Beoordeel-knop / formulier */}
      {lead.objectionStatus === 'pending' && (
        <div className="mt-3 border-t border-gray-100 pt-3">
          {showReview ? (
            <div className="space-y-3">
              <textarea
                value={response}
                onChange={(e) => setResponse(e.target.value)}
                rows={3}
                placeholder="Toelichting bij je beoordeling (zichtbaar voor de klant)…"
                className="w-full rounded-md border border-gray-300 px-3 py-2 text-sm focus:border-indigo-500 focus:outline-none focus:ring-1 focus:ring-indigo-500"
              />
              {error && <p className="text-xs text-red-600">{error}</p>}
              <div className="flex flex-wrap gap-2">
                <button
                  type="button"
                  onClick={() => handleReview('approved')}
                  disabled={pending}
                  className="rounded-md bg-emerald-600 px-4 py-2 text-sm font-semibold text-white hover:bg-emerald-700 disabled:opacity-50"
                >
                  {pending ? 'Verwerken…' : 'Goedkeuren'}
                </button>
                <button
                  type="button"
                  onClick={() => handleReview('rejected')}
                  disabled={pending}
                  className="rounded-md bg-rose-600 px-4 py-2 text-sm font-semibold text-white hover:bg-rose-700 disabled:opacity-50"
                >
                  {pending ? 'Verwerken…' : 'Afkeuren'}
                </button>
                <button
                  type="button"
                  onClick={() => {
                    setShowReview(false)
                    setResponse('')
                    setError(null)
                  }}
                  disabled={pending}
                  className="rounded-md bg-gray-100 px-4 py-2 text-sm font-semibold text-gray-700 hover:bg-gray-200 disabled:opacity-50"
                >
                  Annuleren
                </button>
              </div>
            </div>
          ) : (
            <button
              type="button"
              onClick={() => setShowReview(true)}
              className="rounded-md bg-blue-600 px-4 py-2 text-sm font-semibold text-white hover:bg-blue-700"
            >
              Beoordelen
            </button>
          )}
        </div>
      )}
    </div>
  )
}
