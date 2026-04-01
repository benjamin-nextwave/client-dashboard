'use client'

import { useState } from 'react'

export function RefreshButton() {
  const [loading, setLoading] = useState(false)
  const [done, setDone] = useState(false)
  const [error, setError] = useState('')

  async function handleRefresh() {
    setLoading(true)
    setError('')
    setDone(false)

    try {
      const res = await fetch('/api/sync-client?force=true', {
        method: 'POST',
      })

      if (!res.ok) {
        setError('Verversen mislukt. Probeer het opnieuw.')
        return
      }

      setDone(true)
      setTimeout(() => window.location.reload(), 500)
    } catch {
      setError('Verbinding mislukt. Probeer het opnieuw.')
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="flex flex-col items-end gap-2">
      <button
        type="button"
        onClick={handleRefresh}
        disabled={loading}
        className="inline-flex items-center gap-2.5 rounded-xl bg-[var(--brand-color)] px-6 py-3 text-base font-semibold text-white shadow-md transition-all hover:opacity-90 hover:shadow-lg disabled:opacity-50"
      >
        {loading ? (
          <>
            <svg className="h-5 w-5 animate-spin" fill="none" viewBox="0 0 24 24">
              <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
              <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z" />
            </svg>
            Data wordt ververst...
          </>
        ) : done ? (
          <>
            <svg className="h-5 w-5" fill="none" viewBox="0 0 24 24" strokeWidth={2} stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" d="m4.5 12.75 6 6 9-13.5" />
            </svg>
            Data ververst!
          </>
        ) : (
          <>
            <svg className="h-5 w-5" fill="none" viewBox="0 0 24 24" strokeWidth={2} stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" d="M16.023 9.348h4.992v-.001M2.985 19.644v-4.992m0 0h4.992m-4.993 0 3.181 3.183a8.25 8.25 0 0 0 13.803-3.7M4.031 9.865a8.25 8.25 0 0 1 13.803-3.7l3.181 3.182" />
            </svg>
            Ververs de data
          </>
        )}
      </button>
      <p className="text-xs text-gray-400">
        Zonder te verversen wordt mogelijk gedateerde data getoond
      </p>
      {error && (
        <p className="text-sm text-red-600">{error}</p>
      )}
    </div>
  )
}
