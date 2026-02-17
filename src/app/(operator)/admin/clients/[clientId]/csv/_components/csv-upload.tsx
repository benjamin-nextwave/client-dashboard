'use client'

import { useState, useRef } from 'react'
import Papa from 'papaparse'
import { createCsvUpload, insertCsvBatch } from '@/lib/actions/csv-actions'

interface CsvUploadProps {
  clientId: string
}

const EMAIL_PATTERNS = ['email', 'e-mail', 'email_address', 'emailaddress', 'e_mail', 'mail']

function detectEmailColumn(headers: string[]): string | null {
  for (const header of headers) {
    if (EMAIL_PATTERNS.includes(header.toLowerCase().trim())) {
      return header
    }
  }
  return null
}

export function CsvUpload({ clientId }: CsvUploadProps) {
  const [parsedHeaders, setParsedHeaders] = useState<string[]>([])
  const [parsedRows, setParsedRows] = useState<Record<string, string>[]>([])
  const [emailColumn, setEmailColumn] = useState<string | null>(null)
  const [contactDate, setContactDate] = useState<string>('')
  const [columnMappings, setColumnMappings] = useState<Record<string, string>>({})
  const [manualEmailSelect, setManualEmailSelect] = useState(false)
  const [uploading, setUploading] = useState(false)
  const [progress, setProgress] = useState(0)
  const [error, setError] = useState<string | null>(null)
  const [success, setSuccess] = useState<string | null>(null)
  const [filename, setFilename] = useState<string>('')
  const fileInputRef = useRef<HTMLInputElement>(null)

  function handleFileChange(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0]
    if (!file) return

    setError(null)
    setSuccess(null)
    setProgress(0)
    setFilename(file.name)

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

        // Auto-detect email column
        const detected = detectEmailColumn(headers)
        if (detected) {
          setEmailColumn(detected)
          setManualEmailSelect(false)
        } else {
          setEmailColumn(null)
          setManualEmailSelect(true)
        }
      },
      error(err: Error) {
        setError(`Fout bij het lezen van CSV: ${err.message}`)
      },
    })
  }

  async function handleUpload() {
    if (parsedRows.length === 0 || parsedHeaders.length === 0) return

    setUploading(true)
    setError(null)
    setSuccess(null)
    setProgress(0)

    try {
      // Step 1: Create upload metadata
      const createResult = await createCsvUpload({
        clientId,
        filename,
        headers: parsedHeaders,
        totalRows: parsedRows.length,
        emailColumn: emailColumn ?? undefined,
        contactDate: contactDate || undefined,
        columnMappings: Object.keys(columnMappings).length > 0 ? columnMappings : undefined,
      })

      if ('error' in createResult) {
        setError(createResult.error)
        setUploading(false)
        return
      }

      const { uploadId } = createResult

      // Step 2: Upload rows in batches of 500
      const batchSize = 500
      const totalBatches = Math.ceil(parsedRows.length / batchSize)

      for (let i = 0; i < totalBatches; i++) {
        const startIndex = i * batchSize
        const batch = parsedRows.slice(startIndex, startIndex + batchSize)

        const batchResult = await insertCsvBatch({
          uploadId,
          startIndex,
          rows: batch,
        })

        if ('error' in batchResult) {
          setError(batchResult.error)
          setUploading(false)
          return
        }

        setProgress(Math.round(((i + 1) / totalBatches) * 100))
      }

      setSuccess(`${parsedRows.length} rijen succesvol ge\u00fcpload.`)
      setParsedHeaders([])
      setParsedRows([])
      setEmailColumn(null)
      setManualEmailSelect(false)
      setColumnMappings({})
      setFilename('')
      if (fileInputRef.current) {
        fileInputRef.current.value = ''
      }

      // Trigger page refresh to show new upload
      window.location.reload()
    } catch (err) {
      setError(`Onverwachte fout: ${err instanceof Error ? err.message : 'onbekend'}`)
    } finally {
      setUploading(false)
    }
  }

  return (
    <div className="rounded-lg bg-white p-6 shadow-sm">
      <h3 className="mb-4 text-lg font-semibold text-gray-900">CSV Uploaden</h3>

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
          {parsedRows.length} rijen gevonden, {parsedHeaders.length} kolommen
        </div>
      )}

      {/* Email column detection */}
      {parsedHeaders.length > 0 && (
        <div className="mb-4">
          <label className="mb-1 block text-sm font-medium text-gray-700">
            E-mailkolom
          </label>
          {!manualEmailSelect && emailColumn ? (
            <div className="flex items-center gap-2">
              <span className="rounded-md bg-green-50 px-3 py-1 text-sm text-green-700">
                Automatisch gedetecteerd: {emailColumn}
              </span>
              <button
                type="button"
                onClick={() => setManualEmailSelect(true)}
                className="text-sm text-blue-600 underline hover:text-blue-800"
              >
                Wijzigen
              </button>
            </div>
          ) : (
            <select
              value={emailColumn ?? ''}
              onChange={(e) => setEmailColumn(e.target.value || null)}
              className="block w-full rounded-md border border-gray-300 px-3 py-2 text-sm shadow-sm focus:border-blue-500 focus:outline-none focus:ring-1 focus:ring-blue-500"
            >
              <option value="">-- Selecteer e-mailkolom --</option>
              {parsedHeaders.map((h) => (
                <option key={h} value={h}>
                  {h}
                </option>
              ))}
            </select>
          )}
        </div>
      )}

      {/* Contact date picker */}
      {parsedHeaders.length > 0 && (
        <div className="mb-4">
          <label className="mb-1 block text-sm font-medium text-gray-700">
            Contactdatum
          </label>
          <p className="mb-1 text-xs text-gray-500">
            Wanneer worden deze contacten benaderd?
          </p>
          <input
            type="date"
            value={contactDate}
            onChange={(e) => setContactDate(e.target.value)}
            className="block w-full rounded-md border border-gray-300 px-3 py-2 text-sm shadow-sm focus:border-blue-500 focus:outline-none focus:ring-1 focus:ring-blue-500"
          />
        </div>
      )}

      {/* Column mapping for preview */}
      {parsedHeaders.length > 0 && (
        <div className="mb-4">
          <label className="mb-2 block text-sm font-medium text-gray-700">
            Kolom mapping voor voorvertoning
          </label>
          <p className="mb-2 text-xs text-gray-500">
            Koppel CSV-kolommen aan de voorvertoningsvelden. Niet-gekoppelde velden tonen &quot;-&quot;.
          </p>
          <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
            {[
              { key: 'full_name', label: 'Volledige naam' },
              { key: 'company_name', label: 'Bedrijfsnaam' },
              { key: 'industry', label: 'Sector/Industrie' },
              { key: 'job_title', label: 'Functietitel' },
            ].map(({ key, label }) => (
              <div key={key}>
                <label className="mb-1 block text-xs font-medium text-gray-600">
                  {label}
                </label>
                <select
                  value={columnMappings[key] ?? ''}
                  onChange={(e) => {
                    setColumnMappings((prev) => {
                      const next = { ...prev }
                      if (e.target.value) {
                        next[key] = e.target.value
                      } else {
                        delete next[key]
                      }
                      return next
                    })
                  }}
                  className="block w-full rounded-md border border-gray-300 px-3 py-2 text-sm shadow-sm focus:border-blue-500 focus:outline-none focus:ring-1 focus:ring-blue-500"
                >
                  <option value="">-- Niet mappen --</option>
                  {parsedHeaders.map((h) => (
                    <option key={h} value={h}>
                      {h}
                    </option>
                  ))}
                </select>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Progress bar */}
      {uploading && (
        <div className="mb-4">
          <div className="mb-1 flex justify-between text-sm text-gray-600">
            <span>Uploaden...</span>
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

      {/* Error message */}
      {error && (
        <div className="mb-4 rounded-md bg-red-50 p-3 text-sm text-red-700">
          {error}
        </div>
      )}

      {/* Success message */}
      {success && (
        <div className="mb-4 rounded-md bg-green-50 p-3 text-sm text-green-700">
          {success}
        </div>
      )}

      {/* Upload button */}
      {parsedRows.length > 0 && (
        <button
          type="button"
          onClick={handleUpload}
          disabled={uploading}
          className="rounded-md bg-blue-600 px-4 py-2 text-sm font-semibold text-white shadow-sm hover:bg-blue-500 disabled:opacity-50"
        >
          {uploading ? 'Bezig met uploaden...' : 'Uploaden'}
        </button>
      )}
    </div>
  )
}
