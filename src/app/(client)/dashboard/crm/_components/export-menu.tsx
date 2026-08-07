'use client'

import { useEffect, useRef, useState, useTransition } from 'react'
import { exportToConnection, type ExportResult } from '../_lib/connection-actions'
import { maxContactsFor } from '../_lib/providers/limits'
import { PROVIDER_META } from '../_lib/providers/meta'
import type { CrmConnectionSummary } from '../_lib/providers/types'

export function ExportMenu({
  connections,
  leadKeys,
  onExportCsv,
  onManageConnections,
  onConnectionUpdated,
  onShowHubspotVideo,
}: {
  connections: CrmConnectionSummary[]
  leadKeys: string[]
  onExportCsv: () => void
  onManageConnections: () => void
  onConnectionUpdated: (connection: CrmConnectionSummary) => void
  onShowHubspotVideo: () => void
}) {
  const [open, setOpen] = useState(false)
  const [confirming, setConfirming] = useState<CrmConnectionSummary | null>(null)
  const [result, setResult] = useState<{ connection: CrmConnectionSummary; data: ExportResult } | null>(null)
  const [error, setError] = useState<string | null>(null)
  const [pending, startTransition] = useTransition()
  const wrapperRef = useRef<HTMLDivElement>(null)

  useEffect(() => {
    if (!open) return
    function onPointerDown(event: MouseEvent) {
      if (!wrapperRef.current?.contains(event.target as Node)) setOpen(false)
    }
    document.addEventListener('mousedown', onPointerDown)
    return () => document.removeEventListener('mousedown', onPointerDown)
  }, [open])

  function handleConfirmedExport() {
    const connection = confirming
    if (!connection) return
    setError(null)
    startTransition(async () => {
      const res = await exportToConnection(connection.id, leadKeys)
      if (!res.ok) {
        setError(res.error)
        return
      }
      onConnectionUpdated(res.value.connection)
      setConfirming(null)
      setResult({ connection, data: res.value })
    })
  }

  const cap = confirming ? maxContactsFor(confirming.provider) : 0
  const willTruncate = confirming !== null && leadKeys.length > cap

  return (
    <div className="relative" ref={wrapperRef}>
      <button
        type="button"
        onClick={() => setOpen((v) => !v)}
        className="inline-flex items-center gap-1.5 rounded-control border border-line bg-panel px-3 py-2 text-[12.5px] font-medium text-muted hover:border-[var(--brand-32)]"
      >
        <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" strokeWidth={1.8} stroke="currentColor">
          <path strokeLinecap="round" strokeLinejoin="round" d="M3 16.5v2.25A2.25 2.25 0 0 0 5.25 21h13.5A2.25 2.25 0 0 0 21 18.75V16.5M16.5 12 12 16.5m0 0L7.5 12m4.5 4.5V3" />
        </svg>
        Export
        <svg className="h-3.5 w-3.5 text-faint" fill="none" viewBox="0 0 24 24" strokeWidth={2.2} stroke="currentColor">
          <path strokeLinecap="round" strokeLinejoin="round" d="m19.5 8.25-7.5 7.5-7.5-7.5" />
        </svg>
      </button>

      {open && (
        <div className="absolute right-0 z-30 mt-1.5 w-72 overflow-hidden rounded-panel border border-line bg-panel shadow-lg">
          <button
            type="button"
            onClick={() => {
              setOpen(false)
              onExportCsv()
            }}
            className="flex w-full items-start gap-2.5 px-3 py-2.5 text-left hover:bg-track"
          >
            <svg className="mt-0.5 h-4 w-4 shrink-0 text-faint" fill="none" viewBox="0 0 24 24" strokeWidth={1.8} stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" d="M19.5 14.25v-2.625a3.375 3.375 0 0 0-3.375-3.375h-1.5A1.125 1.125 0 0 1 13.5 7.125v-1.5a3.375 3.375 0 0 0-3.375-3.375H8.25M9 16.5v.75m3-3v3M15 12v5.25m-4.5-15H5.625c-.621 0-1.125.504-1.125 1.125v17.25c0 .621.504 1.125 1.125 1.125h12.75c.621 0 1.125-.504 1.125-1.125V11.25a9 9 0 0 0-9-9Z" />
            </svg>
            <span>
              <span className="block text-[12.5px] font-medium text-fg">Download CSV</span>
              <span className="block text-[11px] text-muted">
                {leadKeys.length} zichtbare leads, met puntkomma&apos;s voor Excel
              </span>
            </span>
          </button>

          <div className="border-t border-line" />

          {connections.length === 0 ? (
            <p className="px-3 py-2.5 text-[11px] text-muted">
              Nog geen CRM gekoppeld.
            </p>
          ) : (
            connections.map((connection) => {
              const meta = PROVIDER_META[connection.provider]
              return (
                <button
                  key={connection.id}
                  type="button"
                  onClick={() => {
                    setOpen(false)
                    setResult(null)
                    setError(null)
                    setConfirming(connection)
                  }}
                  className="flex w-full items-start gap-2.5 px-3 py-2.5 text-left hover:bg-track"
                >
                  <span
                    className={`mt-0.5 shrink-0 rounded-full border px-1.5 py-0.5 text-[9px] font-semibold ${meta.badge}`}
                  >
                    {meta.name}
                  </span>
                  <span className="min-w-0">
                    <span className="block truncate text-[12.5px] font-medium text-fg">
                      Versturen naar {connection.name}
                    </span>
                    <span className="block text-[11px] text-muted">{meta.summary}</span>
                  </span>
                </button>
              )
            })
          )}

          <div className="border-t border-line" />
          <button
            type="button"
            onClick={() => {
              setOpen(false)
              onShowHubspotVideo()
            }}
            className="flex w-full items-start gap-2.5 px-3 py-2.5 text-left hover:bg-[color-mix(in_oklab,var(--c-hubspot)_8%,transparent)]"
          >
            <svg className="mt-0.5 h-4 w-4 shrink-0 text-[var(--c-hubspot)]" fill="none" viewBox="0 0 24 24" strokeWidth={1.8} stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" d="M21 7.5 16.5 12 21 16.5V7.5ZM3.75 6h10.5A1.5 1.5 0 0 1 15.75 7.5v9a1.5 1.5 0 0 1-1.5 1.5H3.75a1.5 1.5 0 0 1-1.5-1.5v-9A1.5 1.5 0 0 1 3.75 6Z" />
            </svg>
            <span>
              <span className="block text-[12.5px] font-medium text-[var(--c-hubspot)]">
                HubSpot verbinden
              </span>
              <span className="block text-[11px] text-muted">
                Token, scopes en uitlegvideo op één scherm
              </span>
            </span>
          </button>
          <button
            type="button"
            onClick={() => {
              setOpen(false)
              onManageConnections()
            }}
            className="w-full px-3 py-2.5 text-left text-[12.5px] font-medium text-muted hover:bg-track"
          >
            Koppelingen beheren…
          </button>
        </div>
      )}

      {/* Bevestiging vóór verzending naar een externe dienst */}
      {confirming && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
          <div
            className="absolute inset-0 bg-[color-mix(in_oklab,var(--color-ink)_45%,transparent)] backdrop-blur-sm"
            onClick={() => !pending && setConfirming(null)}
            aria-hidden
          />
          <div className="relative w-full max-w-md rounded-panel bg-panel p-5 shadow-2xl ring-1 ring-line">
            <h2 className="text-[15px] font-semibold text-fg">
              Leads versturen naar {PROVIDER_META[confirming.provider].name}?
            </h2>
            <p className="mt-2 text-[12.5px] text-muted">
              Je staat op het punt <strong>{Math.min(leadKeys.length, cap)}</strong> lead(s) te
              versturen naar koppeling <strong>{confirming.name}</strong>. Dit gebeurt buiten dit
              dashboard en kan niet ongedaan worden gemaakt.
            </p>
            <p className="mt-2 rounded-control bg-track px-3 py-2 text-[11px] leading-relaxed text-muted">
              <strong className="font-semibold text-fg">Wat gaat er mee:</strong>{' '}
              {PROVIDER_META[confirming.provider].mapping}
            </p>
            {willTruncate && (
              <p className="mt-2 rounded-control bg-[color-mix(in_oklab,var(--color-warn)_10%,transparent)] px-3 py-2 text-[11px] text-warn">
                Er zijn {leadKeys.length} leads zichtbaar, maar per keer worden er maximaal {cap}{' '}
                verstuurd. De overige {leadKeys.length - cap} blijven staan — verfijn je filters en
                exporteer nogmaals.
              </p>
            )}
            {error && (
              <p className="mt-2 rounded-control bg-[color-mix(in_oklab,var(--color-neg)_8%,transparent)] px-3 py-2 text-[11.5px] text-neg">{error}</p>
            )}
            <div className="mt-4 flex justify-end gap-2">
              <button
                type="button"
                onClick={() => setConfirming(null)}
                disabled={pending}
                className="rounded-control px-3 py-2 text-[12.5px] font-medium text-muted hover:bg-track"
              >
                Annuleren
              </button>
              <button
                type="button"
                onClick={handleConfirmedExport}
                disabled={pending}
                className="rounded-control bg-ink px-4 py-2 text-[12.5px] font-medium text-white hover:opacity-90 disabled:opacity-50"
              >
                {pending ? 'Versturen…' : 'Ja, versturen'}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Resultaat */}
      {result && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
          <div
            className="absolute inset-0 bg-[color-mix(in_oklab,var(--color-ink)_45%,transparent)] backdrop-blur-sm"
            onClick={() => setResult(null)}
            aria-hidden
          />
          <div className="relative w-full max-w-md rounded-panel bg-panel p-5 shadow-2xl ring-1 ring-line">
            <h2 className="text-[15px] font-semibold text-fg">
              Export naar {result.connection.name}
            </h2>
            <dl className="mt-3 grid grid-cols-3 gap-2 text-center">
              <div className="rounded-panel bg-[color-mix(in_oklab,var(--color-pos)_10%,transparent)] px-2 py-2.5">
                <dt className="text-[10px] font-semibold uppercase tracking-wider text-pos">
                  Verwerkt
                </dt>
                <dd className="text-lg font-semibold tabular-nums text-pos">
                  {result.data.outcome.processed}
                </dd>
              </div>
              <div className="rounded-panel bg-[color-mix(in_oklab,var(--color-neg)_8%,transparent)] px-2 py-2.5">
                <dt className="text-[10px] font-semibold uppercase tracking-wider text-neg">
                  Mislukt
                </dt>
                <dd className="text-lg font-semibold tabular-nums text-neg">
                  {result.data.outcome.failed}
                </dd>
              </div>
              <div className="rounded-panel bg-track px-2 py-2.5">
                <dt className="text-[10px] font-semibold uppercase tracking-wider text-muted">
                  Overgeslagen
                </dt>
                <dd className="text-lg font-semibold tabular-nums text-fg">
                  {result.data.outcome.skipped}
                </dd>
              </div>
            </dl>
            {result.data.outcome.detail && (
              <p className="mt-3 text-[12.5px] text-muted">{result.data.outcome.detail}.</p>
            )}
            {result.data.outcome.errors.length > 0 && (
              <ul className="mt-3 space-y-1 rounded-control bg-[color-mix(in_oklab,var(--color-neg)_8%,transparent)] px-3 py-2">
                {result.data.outcome.errors.slice(0, 5).map((message, i) => (
                  <li key={i} className="text-[11px] leading-relaxed text-neg">
                    {message}
                  </li>
                ))}
              </ul>
            )}
            <div className="mt-4 flex justify-end">
              <button
                type="button"
                onClick={() => setResult(null)}
                className="rounded-control bg-ink px-4 py-2 text-[12.5px] font-medium text-white hover:opacity-90"
              >
                Sluiten
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
