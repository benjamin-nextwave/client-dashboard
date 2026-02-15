'use client'

import { useState } from 'react'
import { applyDncFilter } from '@/lib/actions/csv-actions'

interface CsvFilterExportProps {
  uploadId: string
  uploadStatus: string
  totalRows: number
  emailColumn: string | null
}

export function CsvFilterExport({
  uploadId,
  uploadStatus,
  // eslint-disable-next-line @typescript-eslint/no-unused-vars
  totalRows,
  emailColumn,
}: CsvFilterExportProps) {
  const [loading, setLoading] = useState(false)
  const [result, setResult] = useState<{
    filtered: number
    total: number
    emailMatches: number
    domainMatches: number
  } | null>(null)
  const [error, setError] = useState<string | null>(null)

  // Only show when status is 'ready' or 'filtered'
  if (uploadStatus !== 'ready' && uploadStatus !== 'filtered') {
    return null
  }

  async function handleFilter() {
    setLoading(true)
    setError(null)
    setResult(null)

    const res = await applyDncFilter(uploadId)

    if ('error' in res) {
      setError(res.error)
    } else {
      setResult({
        filtered: res.filtered,
        total: res.total,
        emailMatches: res.emailMatches,
        domainMatches: res.domainMatches,
      })
    }

    setLoading(false)
  }

  function handleExport() {
    const link = document.createElement('a')
    link.href = `/api/csv/export?uploadId=${uploadId}`
    link.download = ''
    document.body.appendChild(link)
    link.click()
    document.body.removeChild(link)
  }

  const hasNoEmailColumn = !emailColumn

  return (
    <div className="mt-3 space-y-3 rounded-lg border border-gray-200 bg-gray-50 p-4">
      <div className="flex flex-wrap items-center gap-3">
        <button
          type="button"
          onClick={handleFilter}
          disabled={loading || hasNoEmailColumn}
          className="rounded-md bg-blue-600 px-4 py-2 text-sm font-medium text-white hover:bg-blue-700 disabled:cursor-not-allowed disabled:opacity-50"
        >
          {loading ? 'Filteren...' : 'DNC Filter Toepassen'}
        </button>

        {hasNoEmailColumn && (
          <span className="text-sm text-amber-600">
            Selecteer eerst een e-mailkolom
          </span>
        )}

        {(result || uploadStatus === 'filtered') && (
          <button
            type="button"
            onClick={handleExport}
            className="rounded-md bg-green-600 px-4 py-2 text-sm font-medium text-white hover:bg-green-700"
          >
            CSV Exporteren
          </button>
        )}
      </div>

      {error && (
        <div className="rounded-md bg-red-50 p-3 text-sm text-red-700">
          {error}
        </div>
      )}

      {result && (
        <div className="rounded-md bg-green-50 p-3 text-sm text-green-700">
          <p className="font-medium">
            {result.filtered} van {result.total} rijen gefilterd
          </p>
          {result.filtered > 0 && (
            <p className="mt-1 text-green-600">
              Gefilterd: {result.filtered} rijen verwijderd
              ({result.emailMatches} e-mail matches, {result.domainMatches} domein matches)
            </p>
          )}
          {result.filtered === 0 && (
            <p className="mt-1 text-green-600">
              Geen overeenkomsten gevonden met de DNC-lijst.
            </p>
          )}
        </div>
      )}

      {uploadStatus === 'filtered' && !result && (
        <div className="text-sm text-gray-500">
          DNC-filter is eerder toegepast.{' '}
          <button
            type="button"
            onClick={handleFilter}
            disabled={loading || hasNoEmailColumn}
            className="text-blue-600 underline hover:text-blue-800 disabled:opacity-50"
          >
            Filter resetten en opnieuw toepassen
          </button>
        </div>
      )}
    </div>
  )
}
