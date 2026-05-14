'use client'

import { useState, useTransition } from 'react'
import { useRouter } from 'next/navigation'
import { updateGoLiveInfo } from '../../actions'

interface Props {
  clientId: string
  initialDate: string | null
  initialNote: string | null
}

function formatDate(iso: string): string {
  return new Date(iso + 'T00:00:00').toLocaleDateString('nl-NL', {
    day: 'numeric',
    month: 'long',
    year: 'numeric',
  })
}

export function GoLiveSection({ clientId, initialDate, initialNote }: Props) {
  const router = useRouter()
  const [pending, startTransition] = useTransition()
  const [date, setDate] = useState(initialDate ?? '')
  const [note, setNote] = useState(initialNote ?? '')
  const [error, setError] = useState<string | null>(null)
  const [savedAt, setSavedAt] = useState<number | null>(null)

  const dirty = date !== (initialDate ?? '') || note !== (initialNote ?? '')

  const handleSave = () => {
    setError(null)
    startTransition(async () => {
      const result = await updateGoLiveInfo(clientId, {
        goLiveDate: date || null,
        goLiveNote: note || null,
      })
      if (result.error) {
        setError(result.error)
      } else {
        setSavedAt(Date.now())
        setTimeout(() => setSavedAt(null), 1500)
        router.refresh()
      }
    })
  }

  const handleClearDate = () => {
    setDate('')
  }

  return (
    <section className="mt-8 rounded-2xl border border-gray-200 bg-white p-6 shadow-sm">
      <div className="mb-4 flex items-start gap-3">
        <div className="flex h-9 w-9 flex-shrink-0 items-center justify-center rounded-xl bg-indigo-50 text-indigo-600">
          <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" strokeWidth={2} stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" d="M6.75 3v2.25M17.25 3v2.25M3 18.75V7.5a2.25 2.25 0 0 1 2.25-2.25h13.5A2.25 2.25 0 0 1 21 7.5v11.25m-18 0A2.25 2.25 0 0 0 5.25 21h13.5A2.25 2.25 0 0 0 21 18.75m-18 0v-7.5A2.25 2.25 0 0 1 5.25 9h13.5A2.25 2.25 0 0 1 21 11.25v7.5" />
          </svg>
        </div>
        <div className="min-w-0 flex-1">
          <h2 className="text-sm font-semibold text-gray-900">Livegang-datum</h2>
          <p className="mt-0.5 text-xs text-gray-500">
            Vul de datum in waarop deze campagne live gaat. De klant ziet de
            datum bovenaan het dashboard, en op die dag om 06:00 vuren we een
            webhook af richting Make.
          </p>
        </div>
      </div>

      <div className="grid gap-4 sm:grid-cols-[14rem_1fr]">
        <div>
          <label className="mb-1 block text-[11px] font-semibold uppercase tracking-wide text-gray-500">
            Datum
          </label>
          <div className="flex items-center gap-2">
            <input
              type="date"
              value={date}
              onChange={(e) => setDate(e.target.value)}
              disabled={pending}
              className="flex-1 rounded-lg border border-gray-200 bg-white px-3 py-2 text-sm shadow-sm focus:border-indigo-400 focus:outline-none focus:ring-4 focus:ring-indigo-100"
            />
            {date && (
              <button
                type="button"
                onClick={handleClearDate}
                disabled={pending}
                className="rounded-lg p-2 text-gray-400 hover:bg-gray-100 hover:text-gray-700 disabled:opacity-50"
                aria-label="Datum wissen"
                title="Datum wissen"
              >
                <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" strokeWidth={2} stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" d="M6 18 18 6M6 6l12 12" />
                </svg>
              </button>
            )}
          </div>
          {date && (
            <p className="mt-1.5 text-[11px] text-gray-500">
              Klant ziet: <span className="font-semibold text-gray-700">{formatDate(date)}</span>
            </p>
          )}
        </div>

        <div>
          <label className="mb-1 block text-[11px] font-semibold uppercase tracking-wide text-gray-500">
            Toelichting (optioneel)
          </label>
          <textarea
            value={note}
            onChange={(e) => setNote(e.target.value)}
            rows={3}
            placeholder="Waarom deze datum? (bv. 'na onboarding-gesprek vastgesteld')"
            disabled={pending}
            className="w-full rounded-lg border border-gray-200 bg-white px-3 py-2 text-sm shadow-sm focus:border-indigo-400 focus:outline-none focus:ring-4 focus:ring-indigo-100"
          />
        </div>
      </div>

      {error && (
        <div className="mt-3 rounded-lg border border-red-200 bg-red-50 px-3 py-2 text-xs text-red-700">
          {error}
        </div>
      )}

      <div className="mt-4 flex items-center justify-end gap-3">
        {savedAt && (
          <span className="inline-flex items-center gap-1 text-[11px] font-semibold text-emerald-700">
            <svg className="h-3.5 w-3.5" fill="none" viewBox="0 0 24 24" strokeWidth={3} stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" d="m4.5 12.75 6 6 9-13.5" />
            </svg>
            Opgeslagen
          </span>
        )}
        <button
          type="button"
          onClick={handleSave}
          disabled={pending || !dirty}
          className={`inline-flex items-center gap-1.5 rounded-lg px-4 py-2 text-xs font-bold uppercase tracking-wide shadow-sm transition-all ${
            dirty && !pending
              ? 'bg-indigo-600 text-white hover:bg-indigo-700 hover:shadow-md'
              : 'bg-gray-200 text-gray-400'
          } disabled:cursor-not-allowed`}
        >
          {pending ? 'Opslaan...' : 'Opslaan'}
        </button>
      </div>
    </section>
  )
}
