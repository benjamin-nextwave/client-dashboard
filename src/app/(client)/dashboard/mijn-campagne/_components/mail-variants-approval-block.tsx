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

/**
 * Prominent block shown at the top of the client campaign page when the
 * operator has published new / updated mail variants that need the client's
 * approval. Hidden once the client has acknowledged them.
 */
export function MailVariantsApprovalBlock({ variants, lastAcknowledgedAt }: Props) {
  const router = useRouter()
  const [open, setOpen] = useState(false)
  const [pending, startTransition] = useTransition()
  const [error, setError] = useState<string | null>(null)

  if (variants.length === 0) return null

  const latestUpdate = variants
    .map((v) => new Date(v.updatedAt).getTime())
    .reduce((a, b) => Math.max(a, b), 0)
  const ackTime = lastAcknowledgedAt ? new Date(lastAcknowledgedAt).getTime() : 0
  const needsApproval = latestUpdate > ackTime

  if (!needsApproval) return null

  const perMail: Record<number, number> = {}
  for (const v of variants) perMail[v.mailNumber] = (perMail[v.mailNumber] ?? 0) + 1

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
      <section className="relative overflow-hidden rounded-2xl border-2 border-amber-300 bg-gradient-to-br from-amber-50 via-white to-orange-50 p-6 shadow-lg shadow-amber-200/40">
        <div className="pointer-events-none absolute -right-16 -top-16 h-40 w-40 rounded-full bg-gradient-to-br from-amber-300/30 to-transparent blur-3xl" />

        <div className="relative flex items-start gap-4">
          <div className="flex h-10 w-10 flex-shrink-0 items-center justify-center rounded-xl bg-amber-500 text-sm font-bold text-white shadow-lg shadow-amber-500/30 ring-1 ring-amber-400">
            4
          </div>
          <div className="min-w-0 flex-1">
            <h3 className="text-lg font-bold text-gray-900">Mailvarianten goedkeuren</h3>
            <p className="mt-1 text-sm leading-relaxed text-gray-600">
              NextWave heeft {variants.length} {variants.length === 1 ? 'mailvariant' : 'mailvarianten'} voor je klaargezet
              {Object.keys(perMail).length > 0 && (
                <> over Mail {Object.keys(perMail).sort().join(', Mail ')}</>
              )}
              . Bekijk de inhoud en keur ze goed om de campagne op schema te houden.
            </p>
            <div className="mt-3 inline-flex items-center gap-1.5 rounded-full bg-red-50 px-3 py-1 text-[11px] font-bold text-red-700 ring-1 ring-red-200">
              <svg className="h-3 w-3" fill="none" viewBox="0 0 24 24" strokeWidth={2.5} stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" d="M12 9v3.75m-9.303 3.376c-.866 1.5.217 3.374 1.948 3.374h14.71c1.73 0 2.813-1.874 1.948-3.374L13.949 3.378c-.866-1.5-3.032-1.5-3.898 0L2.697 16.126ZM12 15.75h.007v.008H12v-.008Z" />
              </svg>
              Binnen 5 werkdagen om op schema te blijven lopen
            </div>

            {error && (
              <div className="mt-4 rounded-xl border border-red-200 bg-red-50 px-4 py-3 text-xs text-red-700">
                {error}
              </div>
            )}

            <div className="mt-5 flex flex-wrap gap-3">
              <button
                type="button"
                onClick={() => setOpen(true)}
                className="inline-flex items-center gap-2 rounded-xl border border-gray-200 bg-white px-5 py-2.5 text-sm font-semibold text-gray-700 shadow-sm transition-colors hover:border-indigo-200 hover:text-indigo-600"
              >
                Mailvarianten bekijken ({variants.length})
              </button>
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
        </div>
      </section>

      {open && <MailVariantsModal variants={variants} onClose={() => setOpen(false)} />}
    </>
  )
}
