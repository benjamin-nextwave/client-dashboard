'use client'

import { useRef, useState, useTransition } from 'react'
import { useRouter } from 'next/navigation'
import type { ReportType, WeeklyReport } from '@/lib/data/weekly-reports'
import {
  uploadWeeklyReportAction,
  renameWeeklyReportAction,
  deleteWeeklyReportAction,
} from '../actions'

interface Props {
  clientId: string
  reports: WeeklyReport[]
}

export function WeeklyReportsManager({ clientId, reports }: Props) {
  const router = useRouter()
  const inputRef = useRef<HTMLInputElement>(null)
  const [pending, startTransition] = useTransition()
  const [error, setError] = useState<string | null>(null)
  const [dragOver, setDragOver] = useState(false)
  const [reportType, setReportType] = useState<ReportType>('week')

  const handleFiles = (files: FileList | null) => {
    if (!files || files.length === 0) return
    setError(null)
    const list = Array.from(files)
    startTransition(async () => {
      for (const file of list) {
        const formData = new FormData()
        formData.append('pdf', file)
        formData.append('reportType', reportType)
        const result = await uploadWeeklyReportAction(clientId, formData)
        if (result.error) {
          setError(result.error)
          break
        }
      }
      router.refresh()
    })
  }

  return (
    <section className="rounded-2xl border border-gray-200 bg-white p-6 shadow-sm">
      <div className="mb-5 flex items-start justify-between gap-4 border-b border-gray-100 pb-4">
        <div>
          <h2 className="text-sm font-semibold text-gray-900">Rapporten</h2>
          <p className="mt-0.5 text-xs text-gray-500">
            Upload PDF-rapporten. De klant ziet ze terug op de pagina &ldquo;Rapporten&rdquo;,
            gescheiden per soort.
          </p>
        </div>

        {/* Bepaalt onder welke kop het rapport bij de klant terechtkomt. */}
        <div className="flex flex-shrink-0 gap-0.5 rounded-lg border border-gray-200 bg-gray-50 p-0.5">
          {([
            ['week', 'Weekrapport'],
            ['month', 'Maandrapport'],
          ] as [ReportType, string][]).map(([value, label]) => (
            <button
              key={value}
              type="button"
              onClick={() => setReportType(value)}
              aria-pressed={reportType === value}
              className={`rounded-md px-3 py-1.5 text-xs transition-colors ${
                reportType === value
                  ? 'bg-white font-semibold text-gray-900 shadow-sm'
                  : 'font-medium text-gray-500 hover:text-gray-800'
              }`}
            >
              {label}
            </button>
          ))}
        </div>
      </div>

      {error && (
        <div className="mb-4 rounded-xl border border-red-200 bg-red-50 p-3 text-sm text-red-700">
          {error}
        </div>
      )}

      {/* Drag & drop upload */}
      <div
        onDragOver={(e) => {
          e.preventDefault()
          setDragOver(true)
        }}
        onDragLeave={() => setDragOver(false)}
        onDrop={(e) => {
          e.preventDefault()
          setDragOver(false)
          handleFiles(e.dataTransfer.files)
        }}
        onClick={() => inputRef.current?.click()}
        className={`group flex cursor-pointer flex-col items-center justify-center rounded-xl border-2 border-dashed p-8 text-center transition-all ${
          dragOver
            ? 'border-indigo-400 bg-indigo-50'
            : 'border-gray-200 bg-gray-50/50 hover:border-indigo-300 hover:bg-indigo-50/30'
        }`}
      >
        <div className="flex h-12 w-12 items-center justify-center rounded-2xl bg-white text-gray-400 ring-1 ring-gray-200 transition-all group-hover:text-indigo-500 group-hover:ring-indigo-200">
          <svg className="h-6 w-6" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" d="M3 16.5v2.25A2.25 2.25 0 0 0 5.25 21h13.5A2.25 2.25 0 0 0 21 18.75V16.5M16.5 12 12 16.5m0 0L7.5 12m4.5 4.5V3" />
          </svg>
        </div>
        <p className="mt-3 text-sm font-semibold text-gray-900">Sleep je PDF-bestanden hierheen</p>
        <p className="mt-1 text-xs text-gray-500">
          of klik om te bladeren · PDF · maximaal 20 MB per stuk · uploaden als{' '}
          <span className="font-semibold text-gray-700">
            {reportType === 'month' ? 'maandrapport' : 'weekrapport'}
          </span>
        </p>
        {pending && (
          <p className="mt-3 inline-flex items-center gap-1.5 text-xs font-medium text-indigo-600">
            <svg className="h-3.5 w-3.5 animate-spin" fill="none" viewBox="0 0 24 24">
              <circle cx="12" cy="12" r="10" stroke="currentColor" strokeOpacity="0.25" strokeWidth="3" />
              <path d="M12 2a10 10 0 0 1 10 10" stroke="currentColor" strokeWidth="3" strokeLinecap="round" />
            </svg>
            Bezig...
          </p>
        )}
        <input
          ref={inputRef}
          type="file"
          accept="application/pdf"
          multiple
          className="hidden"
          onChange={(e) => handleFiles(e.target.files)}
        />
      </div>

      {/* List */}
      <div className="mt-5">
        {reports.length === 0 ? (
          <p className="py-4 text-center text-xs text-gray-400">Nog geen weekrapporten geüpload.</p>
        ) : (
          <ul className="divide-y divide-gray-100 overflow-hidden rounded-xl border border-gray-200">
            {reports.map((report) => (
              <WeeklyReportRow key={report.id} clientId={clientId} report={report} disabled={pending} />
            ))}
          </ul>
        )}
      </div>
    </section>
  )
}

function WeeklyReportRow({
  clientId,
  report,
  disabled,
}: {
  clientId: string
  report: WeeklyReport
  disabled: boolean
}) {
  const router = useRouter()
  const [pending, startTransition] = useTransition()
  const [editing, setEditing] = useState(false)
  const [name, setName] = useState(report.name)
  const [error, setError] = useState<string | null>(null)

  const busy = disabled || pending

  const save = () => {
    startTransition(async () => {
      const result = await renameWeeklyReportAction(report.id, clientId, name)
      if (result.error) {
        setError(result.error)
      } else {
        setError(null)
        setEditing(false)
        router.refresh()
      }
    })
  }

  const remove = () => {
    if (!confirm(`"${report.name}" verwijderen?`)) return
    startTransition(async () => {
      const result = await deleteWeeklyReportAction(report.id, clientId)
      if (result.error) setError(result.error)
      else router.refresh()
    })
  }

  const dateLabel = new Date(report.createdAt).toLocaleDateString('nl-NL', {
    day: 'numeric',
    month: 'long',
    year: 'numeric',
  })

  return (
    <li className="flex items-center gap-3 px-4 py-3">
      <div className="flex h-9 w-9 flex-shrink-0 items-center justify-center rounded-lg bg-red-50 text-red-500 ring-1 ring-red-100">
        <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" strokeWidth={1.8} stroke="currentColor">
          <path strokeLinecap="round" strokeLinejoin="round" d="M19.5 14.25v-2.625a3.375 3.375 0 0 0-3.375-3.375h-1.5A1.125 1.125 0 0 1 13.5 7.125v-1.5a3.375 3.375 0 0 0-3.375-3.375H8.25m0 12.75h7.5m-7.5 3H12M10.5 2.25H5.625c-.621 0-1.125.504-1.125 1.125v17.25c0 .621.504 1.125 1.125 1.125h12.75c.621 0 1.125-.504 1.125-1.125V11.25a9 9 0 0 0-9-9Z" />
        </svg>
      </div>

      <div className="min-w-0 flex-1">
        {editing ? (
          <div className="flex items-center gap-2">
            <input
              autoFocus
              value={name}
              onChange={(e) => setName(e.target.value)}
              onKeyDown={(e) => {
                if (e.key === 'Enter') save()
                if (e.key === 'Escape') {
                  setName(report.name)
                  setEditing(false)
                }
              }}
              className="w-full rounded-lg border border-gray-300 px-2.5 py-1.5 text-sm focus:border-indigo-400 focus:outline-none focus:ring-1 focus:ring-indigo-400"
            />
            <button
              type="button"
              onClick={save}
              disabled={busy}
              className="rounded-lg bg-indigo-600 px-3 py-1.5 text-xs font-semibold text-white hover:bg-indigo-700 disabled:opacity-50"
            >
              Opslaan
            </button>
            <button
              type="button"
              onClick={() => {
                setName(report.name)
                setEditing(false)
                setError(null)
              }}
              disabled={busy}
              className="rounded-lg px-3 py-1.5 text-xs font-semibold text-gray-500 hover:bg-gray-100 disabled:opacity-50"
            >
              Annuleren
            </button>
          </div>
        ) : (
          <>
            <div className="flex items-center gap-2">
              <span className="truncate text-sm font-semibold text-gray-900">{report.name}</span>
              <span
                className={`flex-shrink-0 rounded px-1.5 py-0.5 text-[10px] font-semibold uppercase tracking-wide ${
                  report.reportType === 'month'
                    ? 'bg-violet-50 text-violet-700'
                    : 'bg-gray-100 text-gray-600'
                }`}
              >
                {report.reportType === 'month' ? 'Maand' : 'Week'}
              </span>
            </div>
            <div className="mt-0.5 text-xs text-gray-500">Geüpload op {dateLabel}</div>
          </>
        )}
        {error && <div className="mt-1 text-xs text-red-600">{error}</div>}
      </div>

      {!editing && (
        <div className="flex flex-shrink-0 items-center gap-1">
          <a
            href={report.fileUrl}
            target="_blank"
            rel="noopener noreferrer"
            className="rounded-lg px-2.5 py-1.5 text-xs font-semibold text-gray-500 hover:bg-gray-100 hover:text-indigo-600"
          >
            Bekijken
          </a>
          <button
            type="button"
            onClick={() => setEditing(true)}
            disabled={busy}
            className="rounded-lg px-2.5 py-1.5 text-xs font-semibold text-gray-500 hover:bg-gray-100 disabled:opacity-50"
          >
            Naam wijzigen
          </button>
          <button
            type="button"
            onClick={remove}
            disabled={busy}
            className="rounded-lg px-2.5 py-1.5 text-xs font-semibold text-red-600 hover:bg-red-50 disabled:opacity-50"
          >
            Verwijderen
          </button>
        </div>
      )}
    </li>
  )
}
