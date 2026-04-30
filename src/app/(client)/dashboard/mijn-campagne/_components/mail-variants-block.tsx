'use client'

import { useState, useTransition } from 'react'
import { useRouter } from 'next/navigation'
import type { MailVariant } from '@/lib/data/campaign'
import { MailVariantsModal } from './mail-variants-modal'
import { acknowledgeMailVariants } from '../actions'

interface Props {
  variants: MailVariant[]
  lastAcknowledgedAt: string | null
}

function formatDate(iso: string): string {
  return new Date(iso).toLocaleDateString('nl-NL', {
    day: 'numeric',
    month: 'long',
    year: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
  })
}

export function MailVariantsBlock({ variants, lastAcknowledgedAt }: Props) {
  const router = useRouter()
  const [open, setOpen] = useState(false)
  const [pending, startTransition] = useTransition()
  const [error, setError] = useState<string | null>(null)

  if (variants.length === 0) return null

  const perMail: Record<number, number> = {}
  for (const v of variants) perMail[v.mailNumber] = (perMail[v.mailNumber] ?? 0) + 1

  // Needs approval when there are variant updates after the last acknowledgement
  const latestUpdate = variants
    .map((v) => new Date(v.updatedAt).getTime())
    .reduce((a, b) => Math.max(a, b), 0)
  const ackTime = lastAcknowledgedAt ? new Date(lastAcknowledgedAt).getTime() : 0
  const needsApproval = latestUpdate > ackTime

  const handleApprove = () => {
    setError(null)
    startTransition(async () => {
      const r = await acknowledgeMailVariants()
      if (r.error) setError(r.error)
      else router.refresh()
    })
  }

  return (
    <>
      <section className="overflow-hidden rounded-2xl border border-indigo-200 bg-gradient-to-br from-indigo-50 via-white to-violet-50 p-6 shadow-sm">
        <div className="flex flex-wrap items-center gap-4">
          <div className="flex h-14 w-14 flex-shrink-0 items-center justify-center rounded-2xl bg-white text-indigo-600 shadow-sm ring-1 ring-indigo-100">
            <svg className="h-7 w-7" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" d="M21.75 6.75v10.5a2.25 2.25 0 0 1-2.25 2.25h-15a2.25 2.25 0 0 1-2.25-2.25V6.75m19.5 0A2.25 2.25 0 0 0 19.5 4.5h-15a2.25 2.25 0 0 0-2.25 2.25m19.5 0v.243a2.25 2.25 0 0 1-1.07 1.916l-7.5 4.615a2.25 2.25 0 0 1-2.36 0L3.32 8.91a2.25 2.25 0 0 1-1.07-1.916V6.75" />
            </svg>
          </div>
          <div className="min-w-0 flex-1">
            <div className="text-[11px] font-semibold uppercase tracking-wide text-indigo-600">
              Mailvarianten
            </div>
            <h3 className="mt-0.5 text-lg font-semibold text-gray-900">Bekijk je mailvarianten</h3>
            <p className="mt-1 text-sm text-gray-600">
              {variants.length} {variants.length === 1 ? 'variant' : 'varianten'} beschikbaar
              {Object.keys(perMail).length > 0 && (
                <> · Mail {Object.keys(perMail).sort().join(', Mail ')}</>
              )}
            </p>
          </div>
          <button
            type="button"
            onClick={() => setOpen(true)}
            className="inline-flex items-center gap-2 rounded-xl border border-indigo-200 bg-white px-5 py-3 text-sm font-semibold text-indigo-700 shadow-sm transition-all hover:-translate-y-0.5 hover:bg-indigo-50 hover:shadow"
          >
            Varianten bekijken
            <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" strokeWidth={2.5} stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" d="M13.5 4.5 21 12m0 0-7.5 7.5M21 12H3" />
            </svg>
          </button>
        </div>

        {error && (
          <div className="mt-4 rounded-xl border border-red-200 bg-red-50 px-4 py-3 text-xs text-red-700">
            {error}
          </div>
        )}

        {/* Approval block */}
        <div className="mt-5 border-t border-indigo-100 pt-5">
          {needsApproval ? (
            <div className="flex flex-wrap items-center justify-between gap-3 rounded-xl bg-white/60 p-4 ring-1 ring-indigo-100">
              <div>
                <div className="text-sm font-semibold text-gray-900">
                  Mailvarianten goedkeuren
                </div>
                <p className="mt-0.5 text-xs text-gray-600">
                  Bekijk eerst de varianten hierboven en bevestig daarna je goedkeuring.
                </p>
              </div>
              <button
                type="button"
                onClick={handleApprove}
                disabled={pending}
                className="inline-flex items-center gap-2 rounded-xl bg-emerald-600 px-6 py-3 text-sm font-bold text-white shadow-lg shadow-emerald-500/40 transition-all hover:-translate-y-0.5 hover:bg-emerald-700 hover:shadow-xl disabled:cursor-not-allowed disabled:opacity-50 disabled:hover:translate-y-0"
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
          ) : (
            <div className="flex items-center gap-3 rounded-xl bg-emerald-50 p-4 ring-1 ring-emerald-200">
              <div className="flex h-9 w-9 flex-shrink-0 items-center justify-center rounded-full bg-emerald-500 text-white shadow-sm shadow-emerald-500/30">
                <svg className="h-5 w-5" fill="none" viewBox="0 0 24 24" strokeWidth={3} stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" d="m4.5 12.75 6 6 9-13.5" />
                </svg>
              </div>
              <div className="min-w-0 flex-1">
                <div className="text-sm font-semibold text-emerald-900">Goedgekeurd</div>
                {lastAcknowledgedAt && (
                  <div className="mt-0.5 text-xs text-emerald-700">
                    {formatDate(lastAcknowledgedAt)}
                  </div>
                )}
              </div>
            </div>
          )}
        </div>
      </section>

      {open && <MailVariantsModal variants={variants} onClose={() => setOpen(false)} />}
    </>
  )
}
