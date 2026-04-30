'use client'

import { useState, useTransition } from 'react'
import Link from 'next/link'
import { useRouter } from 'next/navigation'
import { confirmDncCompleted } from '../actions'

interface Props {
  dncConfirmedAt: string | null
}

export function DncBlock({ dncConfirmedAt }: Props) {
  const router = useRouter()
  const [pending, startTransition] = useTransition()
  const [error, setError] = useState<string | null>(null)

  // When confirmed the whole block disappears — the page shows an
  // "onboarding voltooid" banner instead.
  if (dncConfirmedAt) return null

  const handleConfirm = () => {
    setError(null)
    startTransition(async () => {
      const r = await confirmDncCompleted()
      if (r.error) setError(r.error)
      else router.refresh()
    })
  }

  return (
    <section className="overflow-hidden rounded-2xl border border-gray-200 bg-white p-6 shadow-sm">
      <div className="flex flex-wrap items-start gap-4">
        <div className="flex h-10 w-10 flex-shrink-0 items-center justify-center rounded-xl bg-indigo-50 text-sm font-bold text-indigo-600 ring-1 ring-indigo-100">
          6
        </div>

        <div className="min-w-0 flex-1">
          <h3 className="text-base font-semibold text-gray-900">
            DNC-lijst aanvullen <span className="font-normal text-gray-400">(optioneel)</span>
          </h3>
          <p className="mt-1 text-sm leading-relaxed text-gray-600">
            Voeg contacten toe die we absoluut niet mogen benaderen. Heb je geen DNC-lijst nodig?
            Markeer deze stap dan als klaar om je onboarding af te ronden.
          </p>

          {error && (
            <div className="mt-3 rounded-lg border border-red-200 bg-red-50 px-3 py-2 text-xs text-red-700">
              {error}
            </div>
          )}

          <div className="mt-4 flex flex-wrap gap-2">
            <Link
              href="/dashboard/dnc"
              className="inline-flex items-center gap-1.5 rounded-xl border border-gray-200 bg-white px-4 py-2.5 text-sm font-semibold text-gray-700 shadow-sm transition-colors hover:border-indigo-200 hover:text-indigo-600"
            >
              DNC-pagina openen
            </Link>
            <button
              type="button"
              onClick={handleConfirm}
              disabled={pending}
              className="inline-flex items-center gap-2 rounded-xl bg-emerald-600 px-5 py-2.5 text-sm font-bold text-white shadow-lg shadow-emerald-500/30 transition-all hover:-translate-y-0.5 hover:bg-emerald-700 hover:shadow-xl disabled:cursor-not-allowed disabled:opacity-50 disabled:hover:translate-y-0"
            >
              <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" strokeWidth={3} stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" d="m4.5 12.75 6 6 9-13.5" />
              </svg>
              Onboarding afronden
            </button>
          </div>
        </div>
      </div>
    </section>
  )
}
