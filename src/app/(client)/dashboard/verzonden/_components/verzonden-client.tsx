'use client'

import { useState, useTransition } from 'react'
import { fetchSentEmails } from '@/lib/actions/sent-actions'
import type { SentEmail } from '@/lib/data/sent-data'
import { SentEmailList } from './sent-email-list'

export function VerzondenClient() {
  const [emails, setEmails] = useState<SentEmail[] | null>(null)
  const [error, setError] = useState<string | null>(null)
  const [isLoading, startTransition] = useTransition()

  function handleFetch() {
    setError(null)
    startTransition(async () => {
      const result = await fetchSentEmails()
      if ('error' in result) {
        setError(result.error)
      } else {
        setEmails(result.emails)
      }
    })
  }

  // Initial state: show fetch button
  if (emails === null && !isLoading) {
    return (
      <div className="mt-8 flex flex-col items-center justify-center rounded-lg border border-gray-200 bg-white px-6 py-16 text-center">
        <svg className="h-12 w-12 text-gray-400" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
          <path strokeLinecap="round" strokeLinejoin="round" d="M6 12L3.269 3.126A59.768 59.768 0 0121.485 12 59.77 59.77 0 013.27 20.876L5.999 12zm0 0h7.5" />
        </svg>
        <h2 className="mt-4 text-lg font-semibold text-gray-800">Verzonden e-mails ophalen</h2>
        <p className="mt-2 max-w-md text-sm text-gray-500">
          Klik op de knop om de verzonden e-mails van de afgelopen 24 uur op te halen vanuit uw campagnes.
        </p>
        {error && (
          <p className="mt-3 text-sm text-red-600">{error}</p>
        )}
        <button
          type="button"
          onClick={handleFetch}
          className="mt-6 rounded-md bg-[var(--brand-color)] px-6 py-2.5 text-sm font-medium text-white hover:opacity-90 transition-opacity"
        >
          Data ophalen
        </button>
      </div>
    )
  }

  // Loading state
  if (isLoading) {
    return (
      <div className="mt-8 flex flex-col items-center justify-center rounded-lg border border-gray-200 bg-white px-6 py-16 text-center">
        <svg className="h-10 w-10 animate-spin text-[var(--brand-color)]" viewBox="0 0 24 24" fill="none">
          <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
          <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z" />
        </svg>
        <p className="mt-4 text-sm font-medium text-gray-700">Data ophalen...</p>
        <p className="mt-1 text-xs text-gray-500">Dit kan enkele seconden duren.</p>
      </div>
    )
  }

  // Results state
  return (
    <div>
      <div className="mt-4 flex items-center justify-between">
        <p className="text-sm text-gray-500">
          {emails!.length} {emails!.length === 1 ? 'e-mail' : 'e-mails'} gevonden in de afgelopen 24 uur
        </p>
        <button
          type="button"
          onClick={handleFetch}
          disabled={isLoading}
          className="inline-flex items-center gap-1.5 rounded-md border border-gray-300 px-3 py-2 text-sm text-gray-600 hover:bg-gray-50 transition-colors"
        >
          <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
            <path strokeLinecap="round" strokeLinejoin="round" d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" />
          </svg>
          Opnieuw ophalen
        </button>
      </div>

      {emails!.length === 0 ? (
        <div className="mt-6 flex flex-col items-center justify-center rounded-lg border border-gray-200 bg-white px-6 py-12 text-center">
          <svg className="h-10 w-10 text-gray-400" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
            <path strokeLinecap="round" strokeLinejoin="round" d="M21.75 6.75v10.5a2.25 2.25 0 01-2.25 2.25h-15a2.25 2.25 0 01-2.25-2.25V6.75m19.5 0A2.25 2.25 0 0019.5 4.5h-15a2.25 2.25 0 00-2.25 2.25m19.5 0v.243a2.25 2.25 0 01-1.07 1.916l-7.5 4.615a2.25 2.25 0 01-2.36 0L3.32 8.91a2.25 2.25 0 01-1.07-1.916V6.75" />
          </svg>
          <p className="mt-3 text-sm text-gray-500">Geen verzonden e-mails gevonden in de afgelopen 24 uur.</p>
        </div>
      ) : (
        <SentEmailList emails={emails!} />
      )}
    </div>
  )
}
