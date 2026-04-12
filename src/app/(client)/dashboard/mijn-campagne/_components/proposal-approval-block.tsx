'use client'

import { useState, useTransition } from 'react'
import { useRouter } from 'next/navigation'
import { acknowledgeProposal } from '../actions'

interface Props {
  title: string
  body: string
  publishedAt: string
  acknowledgedAt: string | null
}

export function ProposalApprovalBlock({ title, body, publishedAt, acknowledgedAt }: Props) {
  const router = useRouter()
  const [pending, startTransition] = useTransition()
  const [error, setError] = useState<string | null>(null)
  const [expanded, setExpanded] = useState(false)

  const needsApproval = !acknowledgedAt || new Date(publishedAt) > new Date(acknowledgedAt)
  if (!needsApproval) return null

  const handleApprove = () => {
    setError(null)
    startTransition(async () => {
      const r = await acknowledgeProposal()
      if (r.error) setError(r.error)
      else router.refresh()
    })
  }

  return (
    <section className="overflow-hidden rounded-2xl border border-violet-200 bg-gradient-to-br from-violet-50 via-white to-fuchsia-50 p-6 shadow-sm">
      <div className="pointer-events-none absolute -right-16 -top-16 h-40 w-40 rounded-full bg-gradient-to-br from-violet-300/20 to-transparent blur-3xl" />
      <div className="relative">
        <div className="inline-flex items-center gap-1.5 rounded-full border border-violet-200/60 bg-white/80 px-3 py-1 text-[11px] font-semibold text-violet-700 backdrop-blur">
          <span className="h-1.5 w-1.5 rounded-full bg-violet-500 shadow-[0_0_8px_rgba(139,92,246,0.8)]" />
          Nieuw voorstel
        </div>
        <h3 className="mt-3 text-lg font-bold text-gray-900">{title}</h3>

        {/* Collapsible body */}
        <div className="mt-2">
          <pre
            className={`whitespace-pre-wrap font-sans text-sm leading-relaxed text-gray-600 ${
              !expanded ? 'line-clamp-4' : ''
            }`}
          >
            {body}
          </pre>
          {body.length > 200 && (
            <button
              type="button"
              onClick={() => setExpanded(!expanded)}
              className="mt-1 text-xs font-semibold text-violet-600 hover:text-violet-700"
            >
              {expanded ? 'Minder tonen' : 'Alles lezen'}
            </button>
          )}
        </div>

        {error && (
          <div className="mt-4 rounded-xl border border-red-200 bg-red-50 px-4 py-3 text-xs text-red-700">
            {error}
          </div>
        )}

        <div className="mt-5 flex flex-wrap gap-3">
          <button
            type="button"
            onClick={handleApprove}
            disabled={pending}
            className="inline-flex items-center gap-2 rounded-xl bg-emerald-600 px-6 py-3 text-base font-bold text-white shadow-lg shadow-emerald-500/40 transition-all hover:-translate-y-0.5 hover:bg-emerald-700 hover:shadow-xl disabled:cursor-not-allowed disabled:opacity-50 disabled:hover:translate-y-0"
          >
            {pending ? (
              <>
                <svg className="h-4 w-4 animate-spin" fill="none" viewBox="0 0 24 24">
                  <circle cx="12" cy="12" r="10" stroke="currentColor" strokeOpacity="0.25" strokeWidth="4" />
                  <path d="M12 2a10 10 0 0 1 10 10" stroke="currentColor" strokeWidth="4" strokeLinecap="round" />
                </svg>
                Versturen...
              </>
            ) : (
              <>
                Goedkeuren
                <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" strokeWidth={3} stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" d="m4.5 12.75 6 6 9-13.5" />
                </svg>
              </>
            )}
          </button>
        </div>
      </div>
    </section>
  )
}
