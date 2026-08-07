'use client'

import { useState, useTransition } from 'react'
import {
  deleteConnection,
  saveConnection,
  testConnection,
} from '../_lib/connection-actions'
import { PROVIDER_IDS, PROVIDER_META } from '../_lib/providers/meta'
import type { CrmConnectionSummary, CrmProvider } from '../_lib/providers/types'
import { formatDateTime } from '../_lib/view'

const inputClass =
  'block w-full rounded-control border border-line bg-panel px-3 py-2 text-[12.5px] text-fg outline-none transition focus:border-[var(--brand-40)] disabled:bg-track'

type Draft = {
  id?: string
  provider: CrmProvider
  name: string
  token: string
  domain: string
}

function emptyDraft(provider: CrmProvider): Draft {
  return { provider, name: PROVIDER_META[provider].name, token: '', domain: '' }
}

export function ConnectionsManager({
  connections,
  onClose,
  onSaved,
  onDeleted,
  onOpenHubspot,
}: {
  connections: CrmConnectionSummary[]
  onClose: () => void
  onSaved: (connection: CrmConnectionSummary) => void
  onDeleted: (connectionId: string) => void
  /** HubSpot heeft zijn eigen venster (token + scopes + video op één scherm). */
  onOpenHubspot: () => void
}) {
  const [draft, setDraft] = useState<Draft | null>(null)
  const [error, setError] = useState<string | null>(null)
  const [notice, setNotice] = useState<string | null>(null)
  const [pending, startTransition] = useTransition()

  const meta = draft ? PROVIDER_META[draft.provider] : null

  function startNew(provider: CrmProvider) {
    setError(null)
    setNotice(null)
    setDraft(emptyDraft(provider))
  }

  function startEdit(connection: CrmConnectionSummary) {
    setError(null)
    setNotice(null)
    setDraft({
      id: connection.id,
      provider: connection.provider,
      name: connection.name,
      token: '',
      domain: connection.domain ?? '',
    })
  }

  function handleSave(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault()
    if (!draft) return
    setError(null)
    setNotice(null)
    startTransition(async () => {
      const res = await saveConnection({
        id: draft.id,
        provider: draft.provider,
        name: draft.name,
        token: draft.token,
        domain: draft.domain,
      })
      if (!res.ok) {
        setError(res.error)
        return
      }
      onSaved(res.value)
      setDraft(null)
      setNotice('Koppeling opgeslagen. Test hem hieronder om te controleren of het token werkt.')
    })
  }

  function handleTest(connection: CrmConnectionSummary) {
    setError(null)
    setNotice(null)
    startTransition(async () => {
      const res = await testConnection(connection.id)
      if (!res.ok) {
        setError(`${connection.name}: ${res.error}`)
        return
      }
      setNotice(`Verbinding met ${connection.name} werkt (${res.value}).`)
    })
  }

  function handleDelete(connection: CrmConnectionSummary) {
    if (!confirm(`Koppeling "${connection.name}" verwijderen? Het opgeslagen token wordt gewist.`))
      return
    setError(null)
    setNotice(null)
    startTransition(async () => {
      const res = await deleteConnection(connection.id)
      if (!res.ok) {
        setError(res.error)
        return
      }
      onDeleted(connection.id)
    })
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
      <div
        className="absolute inset-0 bg-[color-mix(in_oklab,var(--color-ink)_45%,transparent)] backdrop-blur-sm"
        onClick={onClose}
        aria-hidden
      />
      <div className="relative flex max-h-[88vh] w-full max-w-2xl flex-col overflow-hidden rounded-panel bg-panel shadow-2xl ring-1 ring-line">
        <header className="flex items-center justify-between border-b border-line px-5 py-4">
          <div>
            <h2 className="text-[15px] font-semibold text-fg">Koppelingen</h2>
            <p className="mt-0.5 text-[11.5px] text-muted">
              Stuur je leads rechtstreeks naar je eigen CRM.
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

          {connections.length === 0 && !draft && (
            <p className="rounded-panel border border-dashed border-line px-4 py-8 text-center text-[12.5px] text-muted">
              Nog geen koppelingen. Kies hieronder een CRM om te beginnen.
            </p>
          )}

          {connections.length > 0 && (
            <ul className="space-y-2">
              {connections.map((connection) => {
                const providerMeta = PROVIDER_META[connection.provider]
                return (
                  <li key={connection.id} className="rounded-panel border border-line p-3">
                    <div className="flex flex-wrap items-center gap-2">
                      <span
                        className={`rounded-full border px-2 py-0.5 text-[10px] font-semibold ${providerMeta.badge}`}
                      >
                        {providerMeta.name}
                      </span>
                      <span className="min-w-0 flex-1 truncate text-[12.5px] font-medium text-fg">
                        {connection.name}
                      </span>
                      <span className="font-mono text-[11px] text-faint">
                        {connection.tokenHint ?? 'geen token'}
                      </span>
                      <button
                        type="button"
                        onClick={() => handleTest(connection)}
                        disabled={pending}
                        className="rounded-control border border-line px-2.5 py-1 text-[11.5px] font-medium text-muted hover:border-[var(--brand-32)] disabled:opacity-50"
                      >
                        Testen
                      </button>
                      <button
                        type="button"
                        onClick={() =>
                          connection.provider === 'hubspot'
                            ? onOpenHubspot()
                            : startEdit(connection)
                        }
                        className="rounded-control px-2.5 py-1 text-[11.5px] font-medium text-muted hover:bg-track"
                      >
                        Bewerken
                      </button>
                      <button
                        type="button"
                        onClick={() => handleDelete(connection)}
                        disabled={pending}
                        className="rounded-control px-2 py-1 text-[11.5px] font-medium text-faint hover:bg-[color-mix(in_oklab,var(--color-neg)_8%,transparent)] hover:text-neg disabled:opacity-50"
                      >
                        Verwijderen
                      </button>
                    </div>
                    <p className="mt-1.5 text-[11px] text-muted">{providerMeta.mapping}</p>
                    {connection.lastExportAt && (
                      <p
                        className={`mt-1 text-[11px] ${
                          connection.lastExportStatus === 'error'
                            ? 'text-neg'
                            : connection.lastExportStatus === 'partial'
                              ? 'text-warn'
                              : 'text-faint'
                        }`}
                      >
                        Laatste export {formatDateTime(connection.lastExportAt)}
                        {connection.lastExportMessage ? ` · ${connection.lastExportMessage}` : ''}
                      </p>
                    )}
                  </li>
                )
              })}
            </ul>
          )}

          {draft && meta ? (
            <form onSubmit={handleSave} className="space-y-3 rounded-panel border border-line bg-track p-4">
              <div className="flex items-center gap-2">
                <span className={`rounded-full border px-2 py-0.5 text-[10px] font-semibold ${meta.badge}`}>
                  {meta.name}
                </span>
                <span className="text-[12.5px] font-medium text-fg">
                  {draft.id ? 'Koppeling bewerken' : 'Nieuwe koppeling'}
                </span>
              </div>

              <p className="text-[11.5px] text-muted">{meta.summary}</p>

              <label className="block">
                <span className="text-[11.5px] font-medium text-muted">
                  Naam
                </span>
                <input
                  className={`${inputClass} mt-1`}
                  value={draft.name}
                  onChange={(e) => setDraft({ ...draft, name: e.target.value })}
                  disabled={pending}
                  maxLength={60}
                />
              </label>

              <label className="block">
                <span className="text-[11.5px] font-medium text-muted">
                  {meta.tokenLabel}
                </span>
                <input
                  className={`${inputClass} mt-1 font-mono`}
                  type="password"
                  autoComplete="off"
                  value={draft.token}
                  onChange={(e) => setDraft({ ...draft, token: e.target.value })}
                  disabled={pending}
                  placeholder={draft.id ? 'Laat leeg om het huidige token te behouden' : meta.tokenPlaceholder}
                />
                {meta.tokenHelp && (
                  <span className="mt-1 block text-[11px] leading-relaxed text-muted">
                    {meta.tokenHelp}
                  </span>
                )}
              </label>

              {meta.hasDomain && (
                <label className="block">
                  <span className="text-[11.5px] font-medium text-muted">
                    {meta.domainLabel}
                  </span>
                  <input
                    className={`${inputClass} mt-1`}
                    value={draft.domain}
                    onChange={(e) => setDraft({ ...draft, domain: e.target.value })}
                    disabled={pending}
                    placeholder="mijnbedrijf"
                  />
                  <span className="mt-1 block text-[11px] text-muted">{meta.domainHelp}</span>
                </label>
              )}

              <p className="rounded-control bg-panel px-3 py-2 text-[11px] leading-relaxed text-muted ring-1 ring-line">
                <strong className="font-semibold text-fg">Wat gaat er mee:</strong>{' '}
                {meta.mapping} Bestaande records worden bijgewerkt op e-mailadres, dus je krijgt
                geen dubbele contacten.
              </p>

              <div className="flex justify-end gap-2">
                <button
                  type="button"
                  onClick={() => setDraft(null)}
                  disabled={pending}
                  className="rounded-control px-3 py-2 text-[12.5px] font-medium text-muted hover:bg-track"
                >
                  Annuleren
                </button>
                <button
                  type="submit"
                  disabled={pending || !draft.name.trim()}
                  className="rounded-control bg-ink px-4 py-2 text-[12.5px] font-medium text-white hover:opacity-90 disabled:opacity-50"
                >
                  {pending ? 'Opslaan…' : 'Opslaan'}
                </button>
              </div>
            </form>
          ) : (
            <div className="flex flex-wrap gap-2 border-t border-line pt-4">
              {PROVIDER_IDS.map((provider) => {
                const isHubspot = provider === 'hubspot'
                const hasHubspot = connections.some((c) => c.provider === 'hubspot')
                return (
                  <button
                    key={provider}
                    type="button"
                    onClick={() => (isHubspot ? onOpenHubspot() : startNew(provider))}
                    className={`inline-flex items-center gap-1.5 rounded-control border px-3 py-2 text-[12.5px] font-medium ${
                      isHubspot
                        ? 'border-[color-mix(in_oklab,var(--c-hubspot)_35%,transparent)] bg-[color-mix(in_oklab,var(--c-hubspot)_8%,transparent)] text-[var(--c-hubspot)] hover:border-[color-mix(in_oklab,var(--c-hubspot)_55%,transparent)]'
                        : 'border-line bg-panel text-muted hover:border-[var(--brand-32)]'
                    }`}
                  >
                    <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" strokeWidth={2} stroke="currentColor">
                      <path strokeLinecap="round" strokeLinejoin="round" d="M12 4.5v15m7.5-7.5h-15" />
                    </svg>
                    {isHubspot && hasHubspot
                      ? 'HubSpot beheren'
                      : `${PROVIDER_META[provider].name} koppelen`}
                  </button>
                )
              })}
            </div>
          )}
        </div>
      </div>
    </div>
  )
}
