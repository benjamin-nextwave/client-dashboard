'use client'

import { useState } from 'react'
import type { ThreadItem, OutboundReplyStatus } from '../_lib/types'

function formatDateTime(iso: string): string {
  const d = new Date(iso)
  return d.toLocaleString('nl-NL', {
    day: '2-digit',
    month: '2-digit',
    year: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
  })
}

function snippet(text: string, max = 120): string {
  const cleaned = text.replace(/\s+/g, ' ').trim()
  return cleaned.length > max ? `${cleaned.slice(0, max)}…` : cleaned
}

const STATUS_BADGE: Record<
  OutboundReplyStatus,
  { label: string; className: string }
> = {
  queued: {
    label: 'Wordt verzonden',
    className: 'bg-blue-100 text-blue-800',
  },
  sending: {
    label: 'Wordt verzonden',
    className: 'bg-blue-100 text-blue-800',
  },
  sent: {
    label: 'Verzonden',
    className: 'bg-emerald-100 text-emerald-800',
  },
  failed: {
    label: 'Verzending mislukt',
    className: 'bg-rose-100 text-rose-800',
  },
}

export function RepliesThread({ items }: { items: ThreadItem[] }) {
  // Buildthread is chronologisch (oudste eerst). Outlook-stijl: nieuwste bovenaan.
  const ordered = [...items].reverse()
  const newestId = ordered[0]?.id
  const [expanded, setExpanded] = useState<Set<string>>(
    () => new Set(newestId ? [newestId] : [])
  )

  if (ordered.length === 0) {
    return (
      <div className="rounded-xl border border-gray-200 bg-white px-6 py-8 text-sm text-gray-600">
        Geen replies in deze thread.
      </div>
    )
  }

  function toggle(id: string) {
    setExpanded((prev) => {
      const next = new Set(prev)
      if (next.has(id)) next.delete(id)
      else next.add(id)
      return next
    })
  }

  return (
    <ol className="space-y-3">
      {ordered.map((item) => {
        const isOpen = expanded.has(item.id)
        const isOutbound = item.kind === 'outbound'
        const statusBadge =
          item.kind === 'outbound' ? STATUS_BADGE[item.status] : null
        return (
          <li
            key={item.id}
            className={[
              'overflow-hidden rounded-xl border bg-white',
              isOutbound ? 'border-blue-200' : 'border-gray-200',
            ].join(' ')}
          >
            <button
              type="button"
              onClick={() => toggle(item.id)}
              className="flex w-full items-start justify-between gap-4 px-5 py-3 text-left hover:bg-gray-50"
              aria-expanded={isOpen}
            >
              <div className="min-w-0 flex-1 overflow-hidden">
                <div className="flex flex-wrap items-center gap-2">
                  <p className="truncate text-sm font-semibold text-gray-900">
                    {isOutbound ? 'Jij' : item.from_email}
                  </p>
                  {isOutbound && (
                    <span className="rounded-full bg-blue-50 px-2 py-0.5 text-[10px] font-medium uppercase tracking-wider text-blue-700">
                      Verzonden door jou
                    </span>
                  )}
                  {item.kind === 'outbound' && statusBadge && (
                    <span
                      className={`inline-flex items-center gap-1 rounded-full px-2 py-0.5 text-[10px] font-medium ${statusBadge.className}`}
                    >
                      {(item.status === 'queued' || item.status === 'sending') && (
                        <span className="h-1.5 w-1.5 animate-pulse rounded-full bg-blue-500" />
                      )}
                      {statusBadge.label}
                    </span>
                  )}
                </div>
                {!isOpen && (
                  <p className="mt-1 truncate text-xs text-gray-600">
                    {snippet(item.body)}
                  </p>
                )}
                {isOpen && (
                  <p className="mt-0.5 truncate text-xs text-gray-600">
                    {isOutbound
                      ? `naar ${item.to_email}`
                      : `via ${item.sending_account}`}
                  </p>
                )}
              </div>
              <div className="flex shrink-0 items-center gap-3 text-right text-xs text-gray-600">
                <div>
                  <p>{formatDateTime(item.occurred_at)}</p>
                  {isOpen &&
                    item.kind === 'inbound' &&
                    typeof item.ai_interest_value === 'number' && (
                      <p className="mt-0.5">
                        AI interest:{' '}
                        <span className="font-medium">{item.ai_interest_value}</span>
                      </p>
                    )}
                </div>
                <svg
                  className={`h-4 w-4 transition-transform ${isOpen ? 'rotate-180' : ''}`}
                  fill="none"
                  viewBox="0 0 24 24"
                  strokeWidth={1.8}
                  stroke="currentColor"
                  aria-hidden
                >
                  <path strokeLinecap="round" strokeLinejoin="round" d="m19.5 8.25-7.5 7.5-7.5-7.5" />
                </svg>
              </div>
            </button>
            {isOpen && (
              <div className="border-t border-gray-100 px-5 py-4">
                {item.subject && (
                  <p className="break-words text-sm font-medium text-gray-900">
                    {item.subject}
                  </p>
                )}
                <pre className="mt-2 whitespace-pre-wrap break-words font-sans text-sm leading-6 text-gray-800">
                  {item.body}
                </pre>
                {item.kind === 'outbound' && item.status === 'failed' && item.error_message && (
                  <p className="mt-3 rounded-md bg-rose-50 px-3 py-2 text-xs text-rose-800">
                    Fout: {item.error_message}
                  </p>
                )}
              </div>
            )}
          </li>
        )
      })}
    </ol>
  )
}
