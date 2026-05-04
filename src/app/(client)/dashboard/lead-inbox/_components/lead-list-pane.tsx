'use client'

import Link from 'next/link'
import { useSearchParams, useSelectedLayoutSegment } from 'next/navigation'
import { useMemo } from 'react'
import type { LeadWithStatus, LeadClassification } from '../_lib/types'
import { CLASSIFICATION_BADGE, CLASSIFICATION_LABEL } from '../_lib/labels'

function formatRelative(iso: string): string {
  const date = new Date(iso)
  const now = new Date()
  const sameDay =
    date.getFullYear() === now.getFullYear() &&
    date.getMonth() === now.getMonth() &&
    date.getDate() === now.getDate()
  if (sameDay) {
    return date.toLocaleTimeString('nl-NL', { hour: '2-digit', minute: '2-digit' })
  }
  const sevenDays = 7 * 24 * 60 * 60 * 1000
  if (now.getTime() - date.getTime() < sevenDays) {
    return date.toLocaleDateString('nl-NL', { weekday: 'short' })
  }
  return date.toLocaleDateString('nl-NL', { day: '2-digit', month: '2-digit' })
}

function snippetFromLead(lead: LeadWithStatus): string {
  // Toon altijd snippet van laatste klant-reply (= meest recente inbound).
  const inbound = [...lead.replies]
    .filter((r) => r.direction !== 'outbound')
    .sort(
      (a, b) =>
        new Date(b.received_at).getTime() - new Date(a.received_at).getTime()
    )
  const last = inbound[0]
  if (!last?.body) return ''
  const cleaned = last.body.replace(/\s+/g, ' ').trim()
  return cleaned.length > 140 ? `${cleaned.slice(0, 140)}…` : cleaned
}

export function LeadListPane({ leads }: { leads: LeadWithStatus[] }) {
  const params = useSearchParams()
  const activeFilter = params.get('classification') as LeadClassification | null
  const selectedSegment = useSelectedLayoutSegment()

  const filtered = useMemo(() => {
    const base = activeFilter
      ? leads.filter(
          (l) => l.classification === activeFilter && !l.awaitingOurReply
        )
      : leads.filter((l) => l.awaitingOurReply)
    return [...base].sort(
      (a, b) =>
        new Date(b.last_reply_at).getTime() - new Date(a.last_reply_at).getTime()
    )
  }, [leads, activeFilter])

  if (filtered.length === 0) {
    return (
      <div className="flex flex-1 items-center justify-center px-6 py-12 text-center">
        <div>
          <h3 className="text-base font-semibold text-gray-900">Geen leads</h3>
          <p className="mt-1 text-sm text-gray-600">
            {activeFilter
              ? `Geen beantwoorde leads in "${CLASSIFICATION_LABEL[activeFilter]}".`
              : 'Geen leads die op antwoord wachten. Mooi opgeruimd.'}
          </p>
        </div>
      </div>
    )
  }

  return (
    <ul className="flex-1 divide-y divide-gray-100 overflow-y-auto">
      {filtered.map((lead) => {
        const isSelected = selectedSegment === lead.id
        const href = activeFilter
          ? `/dashboard/lead-inbox/${lead.id}?classification=${activeFilter}`
          : `/dashboard/lead-inbox/${lead.id}`
        return (
          <li key={lead.id}>
            <Link
              href={href}
              className={[
                'block px-4 py-3 transition-colors',
                isSelected
                  ? 'bg-[var(--color-brand)]/10 border-l-2 border-[var(--color-brand)]'
                  : 'border-l-2 border-transparent hover:bg-gray-50',
              ].join(' ')}
            >
              <div className="flex items-baseline justify-between gap-3">
                <p className="truncate text-sm font-semibold text-gray-900">
                  {lead.name || lead.email}
                </p>
                <span className="shrink-0 text-xs text-gray-500">
                  {formatRelative(lead.last_reply_at)}
                </span>
              </div>
              <p className="mt-0.5 truncate text-xs text-gray-600">{lead.email}</p>
              <p className="mt-1 line-clamp-2 text-xs text-gray-600">
                {snippetFromLead(lead)}
              </p>
              <div className="mt-2 flex items-center gap-2">
                <span
                  className={`inline-flex rounded-full px-2 py-0.5 text-[10px] font-medium ${CLASSIFICATION_BADGE[lead.classification]}`}
                >
                  {CLASSIFICATION_LABEL[lead.classification]}
                </span>
                {lead.pendingOutboundCount > 0 && (
                  <span className="inline-flex items-center gap-1 rounded-full bg-blue-100 px-2 py-0.5 text-[10px] font-medium text-blue-800">
                    <span className="h-1.5 w-1.5 animate-pulse rounded-full bg-blue-500" />
                    Wordt verzonden
                  </span>
                )}
              </div>
            </Link>
          </li>
        )
      })}
    </ul>
  )
}
