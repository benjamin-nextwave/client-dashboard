'use client'

import { useRef, useState } from 'react'
import Papa from 'papaparse'
import { addDncEntries } from '@/lib/actions/dnc-actions'
import { useWebhookLocale, useT } from '@/lib/i18n/client'

const DNC_WEBHOOK = 'https://hook.eu2.make.com/dhkkgga3ktiwgalbkeujdw21odiqqqa5'

export function DncCsvUpload({ companyName }: { companyName: string }) {
  const localeInfo = useWebhookLocale()
  const t = useT()
  const fileRef = useRef<HTMLInputElement>(null)
  const [emails, setEmails] = useState<string[]>([])
  const [parsedData, setParsedData] = useState<Record<string, string>[]>([])
  const [columns, setColumns] = useState<string[]>([])
  const [selectedColumn, setSelectedColumn] = useState<string | null>(null)
  const [dragging, setDragging] = useState(false)
  const [status, setStatus] = useState<
    | { type: 'idle' }
    | { type: 'pick_column' }
    | { type: 'preview'; count: number }
    | { type: 'importing' }
    | { type: 'success'; message: string }
    | { type: 'error'; message: string }
  >({ type: 'idle' })

  function parseFile(file: File) {
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
        setStatus({ type: 'error', message: t('dnc.csvError') })
      },
    })
  }

  function handleFileChange(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0]
    if (file) parseFile(file)
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

    const result = await addDncEntries({ emails })

    if ('error' in result) {
      setStatus({ type: 'error', message: result.error })
    } else {
      // Direct call vanuit browser naar Make.com — 1 call met alle emails
      fetch(DNC_WEBHOOK, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          type: 'bulk',
          company_name: companyName,
          emails: result.emails,
          ...localeInfo,
        }),
      }).catch(() => {})

      setStatus({
        type: 'success',
        message: t('dnc.csvSuccess', { imported: result.inserted, total: emails.length }),
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

  const selectClass =
    'block w-full rounded-control border border-line bg-panel px-3 py-2 text-[12.5px] text-fg outline-none'
  const primaryClass =
    'h-[34px] rounded-control bg-brand px-3.5 text-[12.5px] font-semibold text-white transition-opacity hover:opacity-90'
  const ghostClass =
    'h-[34px] rounded-control border border-line bg-panel px-3.5 text-[12.5px] font-medium text-muted transition-colors hover:bg-[var(--brand-08)]'

  return (
    <div className="shrink-0 overflow-hidden rounded-panel border border-line bg-panel">
      <div className="px-4 pt-3.5">
        <h3 className="text-[13.5px] font-semibold tracking-[-0.01em]">
          {t('dnc.csvUploadTitle')}
        </h3>
        <p className="mt-[5px] text-[11.5px] leading-[1.5] text-muted">
          {t('dnc.csvUploadDescription')}
        </p>
      </div>

      <div className="px-4 pb-3.5 pt-3">
        <input
          ref={fileRef}
          id="dnc-csv-file"
          type="file"
          accept=".csv"
          onChange={handleFileChange}
          className="sr-only"
        />
        <label
          htmlFor="dnc-csv-file"
          onDragOver={(e) => {
            e.preventDefault()
            setDragging(true)
          }}
          onDragLeave={() => setDragging(false)}
          onDrop={(e) => {
            e.preventDefault()
            setDragging(false)
            const file = e.dataTransfer.files?.[0]
            if (file) parseFile(file)
          }}
          className={`flex cursor-pointer flex-col items-center justify-center gap-2 rounded-[9px] border border-dashed px-4 py-6 text-center transition-colors ${
            dragging
              ? 'border-brand bg-[var(--brand-08)]'
              : 'border-line bg-track hover:border-[var(--brand-32)]'
          }`}
        >
          <svg
            viewBox="0 0 24 24"
            fill="none"
            stroke="currentColor"
            strokeWidth={1.7}
            strokeLinecap="round"
            strokeLinejoin="round"
            className="h-5 w-5 text-faint"
            aria-hidden
          >
            <path d="M3 16.5v2.25A2.25 2.25 0 0 0 5.25 21h13.5A2.25 2.25 0 0 0 21 18.75V16.5M7.5 7.5 12 3m0 0 4.5 4.5M12 3v13.5" />
          </svg>
          <span className="text-[11.5px] leading-[1.5] text-muted">{t('dnc.csvDropHint')}</span>
        </label>

        {status.type === 'pick_column' && (
          <div className="mt-3 space-y-2">
            <label className="block text-[11.5px] font-medium text-muted">
              {t('dnc.csvPickColumn')}
            </label>
            <select
              value={selectedColumn ?? ''}
              onChange={(e) => setSelectedColumn(e.target.value)}
              className={selectClass}
            >
              {columns.map((col) => (
                <option key={col} value={col}>
                  {col}
                </option>
              ))}
            </select>
            <div className="flex items-center gap-2">
              <button type="button" onClick={handleColumnConfirm} className={primaryClass}>
                {t('dnc.csvConfirm')}
              </button>
              <button type="button" onClick={reset} className={ghostClass}>
                {t('common.cancel')}
              </button>
            </div>
          </div>
        )}

        {status.type === 'preview' && (
          <div className="mt-3 space-y-2">
            <p className="text-[12.5px] text-fg">
              {t('dnc.csvFoundEmails', { count: status.count })}
            </p>
            <div className="flex items-center gap-2">
              <button type="button" onClick={handleImport} className={primaryClass}>
                {t('dnc.csvImport')}
              </button>
              <button type="button" onClick={reset} className={ghostClass}>
                {t('common.cancel')}
              </button>
            </div>
          </div>
        )}

        {status.type === 'importing' && (
          <p className="mt-3 text-[12.5px] text-muted">{t('dnc.csvImporting')}</p>
        )}

        {status.type === 'success' && (
          <p className="mt-3 rounded-control border border-[color-mix(in_oklab,var(--color-pos)_30%,transparent)] bg-[color-mix(in_oklab,var(--color-pos)_10%,transparent)] px-3 py-2 text-[12.5px] text-pos">
            {status.message}
          </p>
        )}

        {status.type === 'error' && (
          <p className="mt-3 rounded-control border border-[color-mix(in_oklab,var(--color-neg)_28%,transparent)] bg-[color-mix(in_oklab,var(--color-neg)_8%,transparent)] px-3 py-2 text-[12.5px] text-neg">
            {status.message}
          </p>
        )}
      </div>
    </div>
  )
}
