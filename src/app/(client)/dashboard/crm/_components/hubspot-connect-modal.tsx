'use client'

import { useState, useTransition } from 'react'
import {
  deleteConnection,
  saveConnection,
  testConnection,
} from '../_lib/connection-actions'
import type { CrmConnectionSummary } from '../_lib/providers/types'
import { formatDateTime } from '../_lib/view'
import { HubspotScopes } from './hubspot-scopes'

// Op null zetten haalt de video weg en toont de placeholder in plaats daarvan.
// Let op: alles in public/ is zonder inloggen op te vragen — zet hier dus
// alleen een opname neer die naar buiten mag.
export const HUBSPOT_VIDEO_SRC: string | null = '/hubspot-uitleg.mp4'

/** Er is maximaal één HubSpot-koppeling, dus de naam is vast. */
const HUBSPOT_CONNECTION_NAME = 'HubSpot'

export function HubspotConnectModal({
  connection,
  onClose,
  onSaved,
  onDeleted,
}: {
  /** De bestaande koppeling, of null als er nog geen is. */
  connection: CrmConnectionSummary | null
  onClose: () => void
  onSaved: (connection: CrmConnectionSummary) => void
  onDeleted: (connectionId: string) => void
}) {
  const [token, setToken] = useState('')
  const [error, setError] = useState<string | null>(null)
  const [notice, setNotice] = useState<string | null>(null)
  const [pending, startTransition] = useTransition()

  function handleSave(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault()
    setError(null)
    setNotice(null)
    startTransition(async () => {
      const res = await saveConnection({
        id: connection?.id,
        provider: 'hubspot',
        name: connection?.name ?? HUBSPOT_CONNECTION_NAME,
        token,
      })
      if (!res.ok) {
        setError(res.error)
        return
      }
      onSaved(res.value)
      setToken('')
      setNotice('Token opgeslagen. Klik op Verbinding testen om te controleren of het werkt.')
    })
  }

  function handleTest() {
    if (!connection) return
    setError(null)
    setNotice(null)
    startTransition(async () => {
      const res = await testConnection(connection.id)
      if (!res.ok) {
        setError(res.error)
        return
      }
      setNotice(`De verbinding met ${res.value} werkt.`)
    })
  }

  function handleDelete() {
    if (!connection) return
    if (!confirm('HubSpot-koppeling verwijderen? Het opgeslagen token wordt gewist.')) return
    setError(null)
    setNotice(null)
    startTransition(async () => {
      const res = await deleteConnection(connection.id)
      if (!res.ok) {
        setError(res.error)
        return
      }
      onDeleted(connection.id)
      setNotice('Koppeling verwijderd.')
    })
  }

  return (
    <div className="fixed inset-0 z-[60] flex items-center justify-center p-4">
      <div
        className="absolute inset-0 bg-[color-mix(in_oklab,var(--color-ink)_45%,transparent)] backdrop-blur-sm"
        onClick={onClose}
        aria-hidden
      />
      <div className="relative flex max-h-[92vh] w-full max-w-3xl flex-col overflow-hidden rounded-panel bg-panel shadow-2xl ring-1 ring-line">
        <header className="flex items-start justify-between gap-3 border-b border-line px-5 py-4">
          <div>
            <h2 className="text-[15px] font-semibold text-fg">HubSpot verbinden</h2>
            <p className="mt-0.5 text-[11.5px] text-muted">
              {connection
                ? 'Er is één HubSpot-koppeling actief. Je kunt het token vervangen of de koppeling verwijderen.'
                : 'Maak in HubSpot een Private App met onderstaande scopes en plak het token hierboven.'}
            </p>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="rounded-control p-1.5 text-faint hover:bg-track hover:text-muted"
            aria-label="Sluiten"
          >
            <svg className="h-5 w-5" fill="none" viewBox="0 0 24 24" strokeWidth={1.8} stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" d="M6 18 18 6M6 6l12 12" />
            </svg>
          </button>
        </header>

        <div className="flex-1 space-y-4 overflow-y-auto px-5 py-4">
          {error && (
            <p className="rounded-control bg-[color-mix(in_oklab,var(--color-neg)_8%,transparent)] px-3 py-2 text-[11.5px] text-neg">{error}</p>
          )}
          {notice && (
            <p className="rounded-control bg-[color-mix(in_oklab,var(--color-pos)_10%,transparent)] px-3 py-2 text-[11.5px] text-pos">{notice}</p>
          )}

          {/* 1. Token */}
          <form onSubmit={handleSave} className="rounded-panel border border-line p-4">
            <div className="flex flex-wrap items-center justify-between gap-2">
              <label
                htmlFor="hubspot-token"
                className="text-[11.5px] font-medium text-muted"
              >
                Private App-token
              </label>
              {connection?.tokenHint && (
                <span className="flex items-center gap-1.5 text-[11px] text-muted">
                  <span className="h-1.5 w-1.5 rounded-full bg-pos" />
                  Opgeslagen: <span className="font-mono">{connection.tokenHint}</span>
                </span>
              )}
            </div>
            <div className="mt-2 flex flex-wrap gap-2">
              <input
                id="hubspot-token"
                type="password"
                autoComplete="off"
                value={token}
                onChange={(e) => setToken(e.target.value)}
                disabled={pending}
                placeholder={
                  connection
                    ? 'Laat leeg om het huidige token te behouden'
                    : 'pat-eu1-…'
                }
                className="min-w-[240px] flex-1 rounded-control border border-line bg-panel px-3 py-2 font-mono text-[12.5px] outline-none transition focus:border-[var(--c-hubspot)] disabled:bg-track"
              />
              <button
                type="submit"
                disabled={pending || (!connection && !token.trim())}
                className="rounded-control bg-[var(--c-hubspot)] px-4 py-2 text-[12.5px] font-medium text-white transition hover:bg-[var(--c-hubspot)] disabled:opacity-50"
              >
                {pending ? 'Bezig…' : connection ? 'Token vervangen' : 'Verbinden'}
              </button>
            </div>

            {connection && (
              <div className="mt-3 flex flex-wrap items-center gap-2 border-t border-line pt-3">
                <button
                  type="button"
                  onClick={handleTest}
                  disabled={pending}
                  className="rounded-control border border-line px-3 py-1.5 text-[11.5px] font-medium text-muted hover:border-[var(--brand-32)] disabled:opacity-50"
                >
                  Verbinding testen
                </button>
                <button
                  type="button"
                  onClick={handleDelete}
                  disabled={pending}
                  className="rounded-control px-3 py-1.5 text-[11.5px] font-medium text-faint hover:bg-[color-mix(in_oklab,var(--color-neg)_8%,transparent)] hover:text-neg disabled:opacity-50"
                >
                  Koppeling verwijderen
                </button>
                {connection.lastExportAt && (
                  <span
                    className={`ml-auto text-[11px] ${
                      connection.lastExportStatus === 'error'
                        ? 'text-neg'
                        : connection.lastExportStatus === 'partial'
                          ? 'text-warn'
                          : 'text-faint'
                    }`}
                  >
                    Laatste export {formatDateTime(connection.lastExportAt)}
                  </span>
                )}
              </div>
            )}
          </form>

          {/* 2. Scopes */}
          <HubspotScopes />

          {/* 3. Video */}
          <div>
            <p className="mb-2 text-[11.5px] font-medium text-muted">
              Uitleg: zo maak je de Private App aan
            </p>
            {HUBSPOT_VIDEO_SRC ? (
              <video
                src={HUBSPOT_VIDEO_SRC}
                controls
                preload="metadata"
                playsInline
                className="w-full rounded-panel bg-black"
              >
                Je browser kan deze video niet afspelen.{' '}
                <a href={HUBSPOT_VIDEO_SRC} download>
                  Download de video
                </a>
                .
              </video>
            ) : (
              <div className="flex aspect-video w-full flex-col items-center justify-center rounded-panel border border-dashed border-line bg-track px-6 text-center">
                <svg className="h-10 w-10 text-faint" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" d="M21 7.5 16.5 12 21 16.5V7.5ZM3.75 6h10.5A1.5 1.5 0 0 1 15.75 7.5v9a1.5 1.5 0 0 1-1.5 1.5H3.75a1.5 1.5 0 0 1-1.5-1.5v-9A1.5 1.5 0 0 1 3.75 6Z" />
                </svg>
                <p className="mt-3 text-[12.5px] font-medium text-muted">
                  De uitlegvideo komt binnenkort
                </p>
                <p className="mt-1 max-w-sm text-[11.5px] text-muted">
                  Je kunt intussen gewoon koppelen: maak in HubSpot een Private App met de
                  twee scopes hierboven en plak het token bovenaan dit scherm.
                </p>
              </div>
            )}
          </div>
        </div>

        <footer className="flex justify-end border-t border-line bg-track px-5 py-3">
          <button
            type="button"
            onClick={onClose}
            className="rounded-control px-3 py-2 text-[12.5px] font-medium text-muted hover:bg-track"
          >
            Sluiten
          </button>
        </footer>
      </div>
    </div>
  )
}
