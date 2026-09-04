'use client'

import { useRef, useState, useTransition } from 'react'
import { useRouter } from 'next/navigation'
import type { LoopgangOverviewClient } from '@/lib/data/loopgang-overview'
import {
  REPORT_LABELS,
  type MeetingReport,
  type ReportKind,
} from '@/lib/data/loopgang-meeting-reports'
import { deleteMeetingReportAction, uploadMeetingReportAction } from '../actions'

/**
 * De drie rapporten bij een evaluatiemeeting.
 *
 * Ze hangen aan het cyclusanker en niet aan de meetingdatum: een meeting die
 * verzet wordt houdt dezelfde rapporten, en een nieuwe periode begint leeg.
 *
 * Twee gezichten, want er kijken twee mensen naar. Benjamin uploadt; Kix ziet
 * met het Kix-filter aan alleen of ze er zijn en kan ze downloaden. Dat verschil
 * is bewust: een downloadknop die niets doet omdat er niets staat, laat je in
 * het ongewisse of je nog moet wachten of dat er iets fout is gegaan.
 */

const VOLGORDE: ReportKind[] = ['month', 'lead', 'internal']

export function MeetingReports({
  client,
  reports,
  kixMode,
}: {
  client: LoopgangOverviewClient
  /** Alle rapporten; hier wordt op klant en anker gefilterd. */
  reports: MeetingReport[]
  /** Met het Kix-filter aan kun je alleen downloaden. */
  kixMode: boolean
}) {
  const anchor = client.cycle.anchor
  if (!anchor) return null

  const vanDezePeriode = reports.filter(
    (r) => r.clientId === client.id && r.cycleAnchor === anchor
  )

  return (
    <section className="rounded-xl border border-gray-200 bg-white">
      <div className="border-b border-gray-100 px-4 py-2.5">
        <h3 className="text-[11px] font-semibold uppercase tracking-wide text-gray-500">
          Rapporten bij deze meeting
        </h3>
        <p className="mt-0.5 text-[10px] text-gray-400">
          {client.displayName} · periode vanaf {anchor}
        </p>
      </div>

      <ReportSlots
        clientId={client.id}
        anchor={anchor}
        reports={vanDezePeriode}
        kixMode={kixMode}
      />
    </section>
  )
}

/**
 * De drie regels voor één periode. Los bruikbaar, zodat het paneel naast de
 * kalender en het tabblad Rapporten dezelfde knoppen en dezelfde meldingen
 * geven — twee plekken die uit elkaar lopen is erger dan één plek te weinig.
 */
export function ReportSlots({
  clientId,
  anchor,
  reports,
  kixMode,
}: {
  clientId: string
  anchor: string
  /** De rapporten van precies deze klant en deze periode. */
  reports: MeetingReport[]
  kixMode: boolean
}) {
  const bijSoort = new Map(reports.map((r) => [r.kind, r]))

  return (
    <div className="divide-y divide-gray-50">
      {VOLGORDE.map((kind) => (
        <ReportRow
          key={kind}
          kind={kind}
          report={bijSoort.get(kind) ?? null}
          clientId={clientId}
          anchor={anchor}
          kixMode={kixMode}
        />
      ))}
    </div>
  )
}

function ReportRow({
  kind,
  report,
  clientId,
  anchor,
  kixMode,
}: {
  kind: ReportKind
  report: MeetingReport | null
  clientId: string
  anchor: string
  kixMode: boolean
}) {
  const router = useRouter()
  const [pending, startTransition] = useTransition()
  const [error, setError] = useState<string | null>(null)
  const inputRef = useRef<HTMLInputElement>(null)

  function upload(file: File) {
    setError(null)
    const formData = new FormData()
    formData.set('kind', kind)
    formData.set('cycleAnchor', anchor)
    formData.set('file', file)

    startTransition(async () => {
      const result = await uploadMeetingReportAction(clientId, formData)
      if (result.error) {
        setError(result.error)
        return
      }
      router.refresh()
    })
  }

  function verwijder() {
    if (!report) return
    setError(null)
    startTransition(async () => {
      const result = await deleteMeetingReportAction(clientId, report.id)
      if (result.error) {
        setError(result.error)
        return
      }
      router.refresh()
    })
  }

  return (
    <div className="px-4 py-2.5">
      <div className="flex items-center justify-between gap-3">
        <span className="text-[11px] font-semibold text-gray-900">{REPORT_LABELS[kind]}</span>

        {report ? (
          <div className="flex items-center gap-2">
            <a
              href={report.fileUrl}
              target="_blank"
              rel="noopener noreferrer"
              className="rounded-lg border border-gray-200 px-2.5 py-1 text-[10px] font-semibold text-gray-700 transition-colors hover:bg-gray-50"
            >
              Downloaden
            </a>
            {!kixMode && (
              <button
                type="button"
                onClick={verwijder}
                disabled={pending}
                className="text-[10px] font-semibold text-gray-300 transition-colors hover:text-rose-600 disabled:opacity-50"
              >
                vervangen
              </button>
            )}
          </div>
        ) : kixMode ? (
          <span className="text-[10px] font-medium text-amber-600">
            Benjamin heeft deze nog niet geüpload
          </span>
        ) : (
          <>
            <input
              ref={inputRef}
              type="file"
              accept="application/pdf"
              className="hidden"
              onChange={(e) => {
                const file = e.target.files?.[0]
                if (file) upload(file)
                e.target.value = ''
              }}
            />
            <button
              type="button"
              onClick={() => inputRef.current?.click()}
              disabled={pending}
              className="rounded-lg bg-gray-900 px-2.5 py-1 text-[10px] font-semibold text-white transition-colors hover:bg-gray-800 disabled:opacity-50"
            >
              {pending ? 'Uploaden…' : `Upload ${REPORT_LABELS[kind].toLowerCase()}`}
            </button>
          </>
        )}
      </div>

      {report && (
        <p className="mt-0.5 text-[10px] text-gray-400">
          geüpload op {report.uploadedAt.slice(0, 10)}
        </p>
      )}

      {error && <p className="mt-1 text-[10px] font-medium text-amber-700">{error}</p>}
    </div>
  )
}
