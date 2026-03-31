'use client'

import { useState, useRef } from 'react'
import Papa from 'papaparse'
import { getContactColumns, createContactColumns, importContactsBatch } from '@/lib/actions/contact-actions'
import type { ContactColumn } from '@/lib/actions/contact-actions'

interface ContactsImportProps {
  clientId: string
  existingColumns: ContactColumn[]
}

type ColumnAction =
  | { action: 'skip' }
  | { action: 'existing'; columnId: string }
  | { action: 'new'; name: string }

export function ContactsImport({ clientId, existingColumns: initialColumns }: ContactsImportProps) {
  const [parsedHeaders, setParsedHeaders] = useState<string[]>([])
  const [parsedRows, setParsedRows] = useState<Record<string, string>[]>([])
  const [columnActions, setColumnActions] = useState<Record<string, ColumnAction>>({})
  const [uploading, setUploading] = useState(false)
  const [progress, setProgress] = useState(0)
  const [error, setError] = useState<string | null>(null)
  const [success, setSuccess] = useState<string | null>(null)
  const [existingColumns, setExistingColumns] = useState<ContactColumn[]>(initialColumns)
  const fileInputRef = useRef<HTMLInputElement>(null)

  function handleFileChange(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0]
    if (!file) return

    setError(null)
    setSuccess(null)
    setProgress(0)

    Papa.parse<Record<string, string>>(file, {
      header: true,
      skipEmptyLines: true,
      transformHeader: (h: string) => h.trim(),
      complete(results) {
        if (results.errors.length > 0) {
          setError(`Fout bij het lezen van CSV: ${results.errors[0].message}`)
          return
        }

        const headers = results.meta.fields ?? []
        const rows = results.data

        if (headers.length === 0) {
          setError('Geen kolommen gevonden in het CSV-bestand.')
          return
        }
        if (rows.length === 0) {
          setError('Geen rijen gevonden in het CSV-bestand.')
          return
        }

        setParsedHeaders(headers)
        setParsedRows(rows)

        // Auto-map: try to match CSV headers to existing columns by name
        const actions: Record<string, ColumnAction> = {}
        for (const header of headers) {
          const match = existingColumns.find(
            (col) => col.name.toLowerCase() === header.toLowerCase()
          )
          if (match) {
            actions[header] = { action: 'existing', columnId: match.id }
          } else {
            actions[header] = { action: 'new', name: header }
          }
        }
        setColumnActions(actions)
      },
      error(err: Error) {
        setError(`Fout bij het lezen van CSV: ${err.message}`)
      },
    })
  }

  function updateColumnAction(csvHeader: string, action: ColumnAction) {
    setColumnActions((prev) => ({ ...prev, [csvHeader]: action }))
  }

  async function handleImport() {
    if (parsedRows.length === 0) return

    // Validate: at least one column must be imported
    const importedColumns = Object.entries(columnActions).filter(
      ([, a]) => a.action !== 'skip'
    )
    if (importedColumns.length === 0) {
      setError('Selecteer minimaal één kolom om te importeren.')
      return
    }

    // Validate new column names
    for (const [csvHeader, action] of importedColumns) {
      if (action.action === 'new' && (!action.name || action.name.trim() === '')) {
        setError(`Vul een naam in voor de nieuwe kolom "${csvHeader}".`)
        return
      }
    }

    setUploading(true)
    setError(null)
    setSuccess(null)
    setProgress(0)

    try {
      // Step 1: Create new columns
      const newColumns = importedColumns
        .filter(([, a]) => a.action === 'new')
        .map(([, a]) => ({ name: (a as { action: 'new'; name: string }).name.trim() }))

      let allColumns = [...existingColumns]

      if (newColumns.length > 0) {
        const result = await createContactColumns(clientId, newColumns)
        if ('error' in result) {
          setError(result.error)
          setUploading(false)
          return
        }
        allColumns = [...allColumns, ...result.columns]
        setExistingColumns(allColumns)
      }

      // Step 2: Build column ID mapping: csvHeader → columnId
      const headerToColumnId: Record<string, string> = {}
      for (const [csvHeader, action] of importedColumns) {
        if (action.action === 'existing') {
          headerToColumnId[csvHeader] = action.columnId
        } else if (action.action === 'new') {
          const col = allColumns.find(
            (c) => c.name.toLowerCase() === action.name.trim().toLowerCase()
          )
          if (col) {
            headerToColumnId[csvHeader] = col.id
          }
        }
      }

      // Step 3: Transform rows and batch insert
      const batchSize = 500
      const totalBatches = Math.ceil(parsedRows.length / batchSize)
      let totalInserted = 0

      for (let i = 0; i < totalBatches; i++) {
        const batch = parsedRows.slice(i * batchSize, (i + 1) * batchSize)

        const transformedRows = batch.map((row) => {
          const data: Record<string, string> = {}
          for (const [csvHeader, columnId] of Object.entries(headerToColumnId)) {
            const value = row[csvHeader]
            if (value !== undefined && value !== '') {
              data[columnId] = value
            }
          }
          return data
        })

        const result = await importContactsBatch({
          clientId,
          rows: transformedRows,
        })

        if ('error' in result) {
          setError(result.error)
          setUploading(false)
          return
        }

        totalInserted += result.inserted
        setProgress(Math.round(((i + 1) / totalBatches) * 100))
      }

      setSuccess(`${totalInserted} contacten succesvol geïmporteerd.`)
      setParsedHeaders([])
      setParsedRows([])
      setColumnActions({})
      if (fileInputRef.current) fileInputRef.current.value = ''

      // Refresh to show updated data
      window.location.reload()
    } catch (err) {
      setError(`Onverwachte fout: ${err instanceof Error ? err.message : 'onbekend'}`)
    } finally {
      setUploading(false)
    }
  }

  const previewRows = parsedRows.slice(0, 3)

  return (
    <div className="rounded-lg bg-white p-6 shadow-sm">
      <h3 className="mb-4 text-lg font-semibold text-gray-900">CSV Importeren naar Contactenlijst</h3>

      {/* File input */}
      <div className="mb-4">
        <label className="mb-1 block text-sm font-medium text-gray-700">
          Selecteer CSV-bestand
        </label>
        <input
          ref={fileInputRef}
          type="file"
          accept=".csv"
          onChange={handleFileChange}
          disabled={uploading}
          className="block w-full text-sm text-gray-500 file:mr-4 file:rounded-md file:border-0 file:bg-blue-50 file:px-4 file:py-2 file:text-sm file:font-semibold file:text-blue-700 hover:file:bg-blue-100 disabled:opacity-50"
        />
      </div>

      {/* Parse summary */}
      {parsedRows.length > 0 && (
        <div className="mb-4 rounded-md bg-blue-50 p-3 text-sm text-blue-700">
          {parsedRows.length.toLocaleString('nl-NL')} rijen gevonden, {parsedHeaders.length} kolommen
        </div>
      )}

      {/* Column mapping */}
      {parsedHeaders.length > 0 && (
        <div className="mb-6">
          <h4 className="mb-3 text-sm font-semibold text-gray-900">Kolom mapping</h4>
          <p className="mb-4 text-xs text-gray-500">
            Kies per CSV-kolom of je deze wilt overslaan, importeren in een bestaande kolom, of een nieuwe kolom wilt aanmaken.
          </p>

          <div className="space-y-3">
            {parsedHeaders.map((header) => {
              const action = columnActions[header] ?? { action: 'skip' }
              const previewValues = previewRows
                .map((row) => row[header])
                .filter(Boolean)
                .slice(0, 2)

              return (
                <div key={header} className="rounded-lg border border-gray-200 p-4">
                  <div className="mb-2 flex items-start justify-between gap-4">
                    <div>
                      <span className="text-sm font-medium text-gray-900">{header}</span>
                      {previewValues.length > 0 && (
                        <p className="mt-0.5 text-xs text-gray-400">
                          Voorbeeld: {previewValues.join(', ')}
                        </p>
                      )}
                    </div>
                  </div>

                  <div className="flex flex-wrap items-center gap-2">
                    {/* Action selector */}
                    <select
                      value={
                        action.action === 'skip'
                          ? 'skip'
                          : action.action === 'existing'
                            ? `existing:${action.columnId}`
                            : 'new'
                      }
                      onChange={(e) => {
                        const val = e.target.value
                        if (val === 'skip') {
                          updateColumnAction(header, { action: 'skip' })
                        } else if (val === 'new') {
                          updateColumnAction(header, { action: 'new', name: header })
                        } else if (val.startsWith('existing:')) {
                          updateColumnAction(header, {
                            action: 'existing',
                            columnId: val.replace('existing:', ''),
                          })
                        }
                      }}
                      disabled={uploading}
                      className="rounded-md border border-gray-300 px-3 py-1.5 text-sm shadow-sm focus:border-blue-500 focus:outline-none focus:ring-1 focus:ring-blue-500"
                    >
                      <option value="skip">Overslaan</option>
                      <option value="new">+ Nieuwe kolom aanmaken</option>
                      {existingColumns.length > 0 && (
                        <optgroup label="Bestaande kolommen">
                          {existingColumns.map((col) => (
                            <option key={col.id} value={`existing:${col.id}`}>
                              {col.name}
                            </option>
                          ))}
                        </optgroup>
                      )}
                    </select>

                    {/* New column name input */}
                    {action.action === 'new' && (
                      <input
                        type="text"
                        value={action.name}
                        onChange={(e) =>
                          updateColumnAction(header, { action: 'new', name: e.target.value })
                        }
                        placeholder="Kolomnaam"
                        disabled={uploading}
                        className="rounded-md border border-gray-300 px-3 py-1.5 text-sm shadow-sm focus:border-blue-500 focus:outline-none focus:ring-1 focus:ring-blue-500"
                      />
                    )}

                    {/* Status indicator */}
                    {action.action === 'skip' && (
                      <span className="text-xs text-gray-400">Wordt niet geïmporteerd</span>
                    )}
                    {action.action === 'existing' && (
                      <span className="text-xs text-green-600">
                        → {existingColumns.find((c) => c.id === action.columnId)?.name}
                      </span>
                    )}
                    {action.action === 'new' && action.name && (
                      <span className="text-xs text-blue-600">Nieuwe kolom</span>
                    )}
                  </div>
                </div>
              )
            })}
          </div>
        </div>
      )}

      {/* Progress bar */}
      {uploading && (
        <div className="mb-4">
          <div className="mb-1 flex justify-between text-sm text-gray-600">
            <span>Importeren...</span>
            <span>{progress}%</span>
          </div>
          <div className="h-3 w-full overflow-hidden rounded-full bg-gray-200">
            <div
              className="h-full rounded-full bg-blue-600 transition-all duration-300"
              style={{ width: `${progress}%` }}
            />
          </div>
        </div>
      )}

      {/* Error */}
      {error && (
        <div className="mb-4 rounded-md bg-red-50 p-3 text-sm text-red-700">{error}</div>
      )}

      {/* Success */}
      {success && (
        <div className="mb-4 rounded-md bg-green-50 p-3 text-sm text-green-700">{success}</div>
      )}

      {/* Import button */}
      {parsedRows.length > 0 && (
        <button
          type="button"
          onClick={handleImport}
          disabled={uploading}
          className="rounded-md bg-blue-600 px-4 py-2 text-sm font-semibold text-white shadow-sm hover:bg-blue-500 disabled:opacity-50"
        >
          {uploading ? 'Bezig met importeren...' : `${parsedRows.length.toLocaleString('nl-NL')} contacten importeren`}
        </button>
      )}
    </div>
  )
}
