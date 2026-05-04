'use client'

import { useState } from 'react'
import type { LeadReply } from '../_lib/types'

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

export function RepliesThread({ replies }: { replies: LeadReply[] }) {
  // Outlook-stijl: nieuwste open, oudere ingeklapt.
  // Replies array komt van Make in chronologische volgorde (oudste eerst, nieuwste laatst).
  // We tonen ze nieuwste-eerst en zetten alleen index 0 (na reverse) open.
  const ordered = [...replies].reverse()
  const newestId = ordered[0]?.instantly_email_id
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
      {ordered.map((reply) => {
        const id = reply.instantly_email_id
        const isOpen = expanded.has(id)
        return (
          <li
            key={id}
            className="overflow-hidden rounded-xl border border-gray-200 bg-white"
          >
            <button
              type="button"
              onClick={() => toggle(id)}
              className="flex w-full items-start justify-between gap-4 px-5 py-3 text-left hover:bg-gray-50"
              aria-expanded={isOpen}
            >
              <div className="min-w-0 flex-1 overflow-hidden">
                <p className="truncate text-sm font-semibold text-gray-900">
                  {reply.from_email}
                </p>
                {!isOpen && (
                  <p className="mt-1 truncate text-xs text-gray-600">
                    {snippet(reply.body)}
                  </p>
                )}
                {isOpen && (
                  <p className="mt-0.5 truncate text-xs text-gray-600">
                    via {reply.sending_account}
                  </p>
                )}
              </div>
              <div className="flex shrink-0 items-center gap-3 text-right text-xs text-gray-600">
                <div>
                  <p>{formatDateTime(reply.received_at)}</p>
                  {isOpen && typeof reply.ai_interest_value === 'number' && (
                    <p className="mt-0.5">
                      AI interest:{' '}
                      <span className="font-medium">{reply.ai_interest_value}</span>
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
                {reply.subject && (
                  <p className="break-words text-sm font-medium text-gray-900">
                    {reply.subject}
                  </p>
                )}
                <pre className="mt-2 whitespace-pre-wrap break-words font-sans text-sm leading-6 text-gray-800">
                  {reply.body}
                </pre>
              </div>
            )}
          </li>
        )
      })}
    </ol>
  )
}
