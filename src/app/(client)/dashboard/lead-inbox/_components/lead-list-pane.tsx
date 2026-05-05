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
  const isTrash = params.get('view') === 'trash'
  const selectedSegment = useSelectedLayoutSegment()

  const filtered = useMemo(() => {
    let base: LeadWithStatus[]
    if (isTrash) {
      base = leads.filter((l) => !!l.deleted_at)
    } else {
      const active = leads.filter((l) => !l.deleted_at)
      base = activeFilter
        ? active.filter(
            (l) => l.classification === activeFilter && !l.awaitingOurReply
          )
        : active.filter((l) => l.awaitingOurReply)
    }
    return [...base].sort(
      (a, b) =>
        new Date(b.last_reply_at).getTime() - new Date(a.last_reply_at).getTime()
    )
  }, [leads, activeFilter, isTrash])

  if (filtered.length === 0) {
    return (
      <div className="flex flex-1 items-center justify-center px-6 py-12 text-center">
        <div>
          <h3 className="text-base font-semibold text-gray-900">Geen leads</h3>
          <p className="mt-1 text-sm text-gray-600">
            {isTrash
              ? 'De prullenbak is leeg.'
              : activeFilter
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
        const qs = isTrash
          ? '?view=trash'
          : activeFilter
            ? `?classification=${activeFilter}`
            : ''
        const href = `/dashboard/lead-inbox/${lead.id}${qs}`
        return (
          <li key={lead.id}>
            <Link
              href={href}
              className={[
                'block px-4 py-4 transition-colors',
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
              <p className="mt-1.5 truncate text-xs text-gray-600">
                {snippetFromLead(lead)}
              </p>
              <div className="mt-2.5 flex flex-wrap items-center gap-2">
                <span
                  className={`inline-flex rounded-full px-2 py-0.5 text-[10px] font-medium ${CLASSIFICATION_BADGE[lead.classification]}`}
                >
                  {CLASSIFICATION_LABEL[lead.classification]}
                </span>
                {lead.labels.slice(0, 3).map((label) => (
                  <span
                    key={label.id}
                    className="inline-flex items-center gap-1 rounded-full bg-gray-100 px-2 py-0.5 text-[10px] font-medium text-gray-700"
                  >
                    <span
                      className="h-1.5 w-1.5 rounded-full"
                      style={{ backgroundColor: label.color }}
                      aria-hidden
                    />
                    {label.name}
                  </span>
                ))}
                {lead.labels.length > 3 && (
                  <span className="text-[10px] text-gray-500">
                    +{lead.labels.length - 3}
                  </span>
                )}
                {lead.noteCount > 0 && (
                  <span
                    className="inline-flex items-center gap-1 text-[10px] text-gray-500"
                    title={`${lead.noteCount} notitie${lead.noteCount === 1 ? '' : 's'}`}
                  >
                    <svg
                      className="h-3 w-3"
                      fill="none"
                      viewBox="0 0 24 24"
                      strokeWidth={1.8}
                      stroke="currentColor"
                      aria-hidden
                    >
                      <path
                        strokeLinecap="round"
                        strokeLinejoin="round"
                        d="M16.862 4.487l1.687-1.688a1.875 1.875 0 1 1 2.652 2.652L6.832 19.82a4.5 4.5 0 0 1-1.897 1.13l-2.685.8.8-2.685a4.5 4.5 0 0 1 1.13-1.897L16.863 4.487Zm0 0L19.5 7.125"
                      />
                    </svg>
                    {lead.noteCount}
                  </span>
                )}
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
