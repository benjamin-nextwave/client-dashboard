'use client'

import { useState } from 'react'
import { fetchSentEmails24h } from '@/lib/actions/sent-actions'
import { SentEmailList } from './sent-email-list'
import type { SentEmail } from '@/lib/data/sent-data'

export function SentEmailLoader() {
  const [state, setState] = useState<'idle' | 'loading' | 'done' | 'error'>('idle')
  const [emails, setEmails] = useState<SentEmail[]>([])
  const [error, setError] = useState<string | null>(null)

  async function handleFetch() {
    setState('loading')
    setError(null)

    try {
      const result = await fetchSentEmails24h()

      if (!result.success) {
        setState('error')
        setError(result.error ?? 'Onbekende fout')
        return
      }

      setEmails(result.emails)
      setState('done')
    } catch {
      setState('error')
      setError('Er ging iets mis bij het ophalen van de data.')
    }
  }

  if (state === 'idle') {
    return (
      <div className="mt-8 flex flex-col items-center justify-center rounded-lg border border-gray-200 bg-white px-6 py-16 text-center">
        <svg
          className="h-12 w-12 text-gray-400"
          fill="none"
          viewBox="0 0 24 24"
          stroke="currentColor"
          strokeWidth={1.5}
        >
          <path
            strokeLinecap="round"
            strokeLinejoin="round"
            d="M21.75 6.75v10.5a2.25 2.25 0 01-2.25 2.25h-15a2.25 2.25 0 01-2.25-2.25V6.75m19.5 0A2.25 2.25 0 0019.5 4.5h-15a2.25 2.25 0 00-2.25 2.25m19.5 0v.243a2.25 2.25 0 01-1.07 1.916l-7.5 4.615a2.25 2.25 0 01-2.36 0L3.32 8.91a2.25 2.25 0 01-1.07-1.916V6.75"
          />
        </svg>
        <h2 className="mt-4 text-lg font-semibold text-gray-800">
          Verzonden e-mails ophalen
        </h2>
        <p className="mt-2 max-w-md text-sm text-gray-500">
          Klik op de knop hieronder om de verzonden e-mails van de afgelopen 24 uur op te halen.
        </p>
        <button
          onClick={handleFetch}
          className="mt-6 rounded-lg bg-black px-6 py-2.5 text-sm font-medium text-white transition hover:bg-gray-800"
        >
          Data ophalen
        </button>
      </div>
    )
  }

  if (state === 'loading') {
    return (
      <div className="mt-8 flex flex-col items-center justify-center rounded-lg border border-gray-200 bg-white px-6 py-16 text-center">
        <div className="h-8 w-8 animate-spin rounded-full border-2 border-gray-300 border-t-gray-900" />
        <p className="mt-4 text-sm text-gray-500">
          Verzonden e-mails ophalen van de afgelopen 24 uur...
        </p>
      </div>
    )
  }

  if (state === 'error') {
    return (
      <div className="mt-8 flex flex-col items-center justify-center rounded-lg border border-red-200 bg-red-50 px-6 py-16 text-center">
        <p className="text-sm text-red-700">{error}</p>
        <button
          onClick={handleFetch}
          className="mt-4 rounded-lg bg-black px-6 py-2.5 text-sm font-medium text-white transition hover:bg-gray-800"
        >
          Opnieuw proberen
        </button>
      </div>
    )
  }

  // state === 'done'
  if (emails.length === 0) {
    return (
      <div className="mt-8 flex flex-col items-center justify-center rounded-lg border border-gray-200 bg-white px-6 py-16 text-center">
        <p className="text-sm text-gray-500">
          Geen verzonden e-mails gevonden in de afgelopen 24 uur.
        </p>
        <button
          onClick={handleFetch}
          className="mt-4 text-sm text-gray-500 underline hover:text-gray-700"
        >
          Opnieuw ophalen
        </button>
      </div>
    )
  }

  return (
    <div>
      <div className="mt-4 flex items-center justify-between">
        <p className="text-sm text-gray-500">
          {emails.length} e-mail{emails.length !== 1 ? 's' : ''} gevonden in de afgelopen 24 uur
        </p>
        <button
          onClick={handleFetch}
          className="text-sm text-gray-500 underline hover:text-gray-700"
        >
          Verversen
        </button>
      </div>
      <SentEmailList emails={emails} />
    </div>
  )
}
