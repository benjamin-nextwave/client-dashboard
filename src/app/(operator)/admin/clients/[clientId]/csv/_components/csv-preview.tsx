'use client'

import { useState, useEffect, useCallback } from 'react'
import { getCsvUploadWithRows } from '@/lib/actions/csv-actions'

interface CsvPreviewProps {
  uploadId: string
}

type Upload = {
  id: string
  filename: string
  headers: string[]
  total_rows: number
  email_column: string | null
  status: string
  created_at: string
  expires_at: string
}

type Row = {
  id: string
  row_index: number
  data: Record<string, string>
  is_filtered: boolean
  filter_reason: string | null
}

const STATUS_LABELS: Record<string, { label: string; color: string }> = {
  uploading: { label: 'Uploaden', color: 'bg-yellow-100 text-yellow-800' },
  ready: { label: 'Gereed', color: 'bg-green-100 text-green-800' },
  filtered: { label: 'Gefilterd', color: 'bg-blue-100 text-blue-800' },
  exported: { label: 'Geexporteerd', color: 'bg-gray-100 text-gray-800' },
}

export function CsvPreview({ uploadId }: CsvPreviewProps) {
  const [upload, setUpload] = useState<Upload | null>(null)
  const [rows, setRows] = useState<Row[]>([])
  const [totalRows, setTotalRows] = useState(0)
  const [page, setPage] = useState(0)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  const pageSize = 50

  const fetchData = useCallback(async (p: number) => {
    setLoading(true)
    setError(null)

    const result = await getCsvUploadWithRows(uploadId, p)

    if ('error' in result) {
      setError(result.error)
      setLoading(false)
      return
    }

    setUpload(result.upload as Upload)
    setRows(result.rows as Row[])
    setTotalRows(result.totalRows)
    setLoading(false)
  }, [uploadId])

  useEffect(() => {
    fetchData(page)
  }, [fetchData, page])

  if (loading && !upload) {
    return (
      <div className="rounded-lg bg-white p-6 shadow-sm">
        <p className="text-sm text-gray-500">Laden...</p>
      </div>
    )
  }

  if (error) {
    return (
      <div className="rounded-md bg-red-50 p-4 text-sm text-red-700">
        {error}
      </div>
    )
  }

  if (!upload) return null

  const headers: string[] = Array.isArray(upload.headers)
    ? upload.headers
    : []
  const status = STATUS_LABELS[upload.status] ?? { label: upload.status, color: 'bg-gray-100 text-gray-800' }
  const startRow = page * pageSize + 1
  const endRow = Math.min(startRow + rows.length - 1, totalRows)
  const totalPages = Math.ceil(totalRows / pageSize)

  return (
    <div className="rounded-lg bg-white p-6 shadow-sm">
      {/* Upload info */}
      <div className="mb-4 flex flex-wrap items-center gap-3">
        <h4 className="text-base font-semibold text-gray-900">{upload.filename}</h4>
        <span className={`inline-flex items-center rounded-full px-2.5 py-0.5 text-xs font-medium ${status.color}`}>
          {status.label}
        </span>
      </div>

      <div className="mb-4 flex flex-wrap gap-4 text-sm text-gray-600">
        <span>Totaal: {upload.total_rows} rijen</span>
        {upload.email_column && <span>E-mailkolom: <strong>{upload.email_column}</strong></span>}
        <span>Verloopt: {new Date(upload.expires_at).toLocaleDateString('nl-NL')}</span>
      </div>

      {/* Horizontal scrolling table */}
      {rows.length > 0 && (
        <>
          <div className="mb-2 text-sm text-gray-500">
            Toont {startRow}-{endRow} van {totalRows}
          </div>

          <div className="overflow-x-auto rounded-md border border-gray-200">
            <table className="min-w-full divide-y divide-gray-200 text-sm">
              <thead className="bg-gray-50">
                <tr>
                  <th className="whitespace-nowrap px-3 py-2 text-left font-medium text-gray-500">
                    #
                  </th>
                  {headers.map((h) => (
                    <th
                      key={h}
                      className={`whitespace-nowrap px-3 py-2 text-left font-medium ${
                        h === upload.email_column
                          ? 'bg-blue-50 text-blue-700'
                          : 'text-gray-500'
                      }`}
                    >
                      {h}
                    </th>
                  ))}
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-200 bg-white">
                {rows.map((row) => (
                  <tr key={row.id} className={row.is_filtered ? 'bg-red-50 opacity-60' : ''}>
                    <td className="whitespace-nowrap px-3 py-2 text-gray-400">
                      {row.row_index + 1}
                    </td>
                    {headers.map((h) => (
                      <td
                        key={h}
                        className={`max-w-xs truncate whitespace-nowrap px-3 py-2 ${
                          h === upload.email_column
                            ? 'bg-blue-50 font-medium text-blue-900'
                            : 'text-gray-700'
                        }`}
                        title={row.data[h] ?? ''}
                      >
                        {row.data[h] ?? ''}
                      </td>
                    ))}
                  </tr>
                ))}
              </tbody>
            </table>
          </div>

          {/* Pagination */}
          {totalPages > 1 && (
            <div className="mt-3 flex items-center justify-between">
              <button
                type="button"
                onClick={() => setPage((p) => Math.max(0, p - 1))}
                disabled={page === 0 || loading}
                className="rounded-md border border-gray-300 px-3 py-1 text-sm text-gray-700 hover:bg-gray-50 disabled:opacity-50"
              >
                Vorige
              </button>
              <span className="text-sm text-gray-500">
                Pagina {page + 1} van {totalPages}
              </span>
              <button
                type="button"
                onClick={() => setPage((p) => Math.min(totalPages - 1, p + 1))}
                disabled={page >= totalPages - 1 || loading}
                className="rounded-md border border-gray-300 px-3 py-1 text-sm text-gray-700 hover:bg-gray-50 disabled:opacity-50"
              >
                Volgende
              </button>
            </div>
          )}
        </>
      )}

      {rows.length === 0 && !loading && (
        <p className="text-sm text-gray-500">Geen rijen gevonden.</p>
      )}
    </div>
  )
}
