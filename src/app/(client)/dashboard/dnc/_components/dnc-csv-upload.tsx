'use client'

import { useRef, useState } from 'react'
import Papa from 'papaparse'
import { bulkImportDnc } from '@/lib/actions/dnc-actions'

export function DncCsvUpload() {
  const fileRef = useRef<HTMLInputElement>(null)
  const [emails, setEmails] = useState<string[]>([])
  const [parsedData, setParsedData] = useState<Record<string, string>[]>([])
  const [columns, setColumns] = useState<string[]>([])
  const [selectedColumn, setSelectedColumn] = useState<string | null>(null)
  const [status, setStatus] = useState<
    | { type: 'idle' }
    | { type: 'pick_column' }
    | { type: 'preview'; count: number }
    | { type: 'importing' }
    | { type: 'success'; message: string }
    | { type: 'error'; message: string }
  >({ type: 'idle' })

  function handleFileChange(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0]
    if (!file) return

    setStatus({ type: 'idle' })
    setEmails([])
    setParsedData([])
    setColumns([])
    setSelectedColumn(null)

    Papa.parse<Record<string, string>>(file, {
      header: true,
      skipEmptyLines: true,
      complete(results) {
        if (!results.meta.fields || results.meta.fields.length === 0) {
          setStatus({
            type: 'error',
            message: 'Geen kolommen gevonden in het CSV-bestand.',
          })
          return
        }

        setParsedData(results.data)
        setColumns(results.meta.fields)
        setSelectedColumn(results.meta.fields[0])
        setStatus({ type: 'pick_column' })
      },
      error() {
        setStatus({
          type: 'error',
          message: 'Fout bij het lezen van het CSV-bestand.',
        })
      },
    })
  }

  function extractEmails(data: Record<string, string>[], column: string): string[] {
    return data
      .map((row) => (row[column] ?? '').trim())
      .filter((v) => v.length > 0)
  }

  function handleColumnConfirm() {
    if (!selectedColumn) return

    const extracted = extractEmails(parsedData, selectedColumn)
    if (extracted.length === 0) {
      setStatus({
        type: 'error',
        message: 'Geen e-mailadressen gevonden in de geselecteerde kolom.',
      })
      return
    }

    setEmails(extracted)
    setParsedData([])
    setStatus({ type: 'preview', count: extracted.length })
  }

  async function handleImport() {
    if (emails.length === 0) return

    setStatus({ type: 'importing' })

    const result = await bulkImportDnc(emails)

    if ('error' in result) {
      setStatus({ type: 'error', message: result.error })
    } else {
      setStatus({
        type: 'success',
        message: `${result.imported} van ${emails.length} adressen geimporteerd.`,
      })
      setEmails([])
      if (fileRef.current) fileRef.current.value = ''
    }
  }

  function reset() {
    setStatus({ type: 'idle' })
    setEmails([])
    setParsedData([])
    setColumns([])
    setSelectedColumn(null)
    if (fileRef.current) fileRef.current.value = ''
  }

  return (
    <div className="rounded-lg border border-gray-200 bg-white p-6">
      <h3 className="text-sm font-medium text-gray-900">
        CSV bulk-import
      </h3>
      <p className="mt-1 text-xs text-gray-500">
        Upload een CSV-bestand met een e-mailkolom om adressen in bulk toe te
        voegen.
      </p>

      <div className="mt-3">
        <input
          ref={fileRef}
          type="file"
          accept=".csv"
          onChange={handleFileChange}
          className="block w-full text-sm text-gray-500 file:mr-4 file:rounded-md file:border-0 file:bg-gray-100 file:px-4 file:py-2 file:text-sm file:font-medium file:text-gray-700 hover:file:bg-gray-200"
        />
      </div>

      {status.type === 'pick_column' && (
        <div className="mt-3 space-y-2">
          <label className="block text-sm font-medium text-gray-700">
            Selecteer de kolom met e-mailadressen
          </label>
          <select
            value={selectedColumn ?? ''}
            onChange={(e) => setSelectedColumn(e.target.value)}
            className="block w-full rounded-md border border-gray-300 bg-white px-3 py-2 text-sm text-gray-900 focus:border-gray-500 focus:outline-none focus:ring-1 focus:ring-gray-500"
          >
            {columns.map((col) => (
              <option key={col} value={col}>
                {col}
              </option>
            ))}
          </select>
          <div className="flex items-center gap-3">
            <button
              onClick={handleColumnConfirm}
              className="rounded-md bg-gray-900 px-4 py-2 text-sm font-medium text-white hover:bg-gray-800"
            >
              Bevestigen
            </button>
            <button
              onClick={reset}
              className="rounded-md border border-gray-300 px-4 py-2 text-sm font-medium text-gray-700 hover:bg-gray-50"
            >
              Annuleren
            </button>
          </div>
        </div>
      )}

      {status.type === 'preview' && (
        <div className="mt-3 flex items-center gap-3">
          <span className="text-sm text-gray-700">
            {status.count} e-mailadressen gevonden
          </span>
          <button
            onClick={handleImport}
            className="rounded-md bg-gray-900 px-4 py-2 text-sm font-medium text-white hover:bg-gray-800"
          >
            Importeren
          </button>
          <button
            onClick={reset}
            className="rounded-md border border-gray-300 px-4 py-2 text-sm font-medium text-gray-700 hover:bg-gray-50"
          >
            Annuleren
          </button>
        </div>
      )}

      {status.type === 'importing' && (
        <p className="mt-3 text-sm text-gray-500">Importeren...</p>
      )}

      {status.type === 'success' && (
        <div className="mt-3 rounded-md bg-green-50 p-3 text-sm text-green-700">
          {status.message}
        </div>
      )}

      {status.type === 'error' && (
        <div className="mt-3 rounded-md bg-red-50 p-3 text-sm text-red-700">
          {status.message}
        </div>
      )}
    </div>
  )
}
