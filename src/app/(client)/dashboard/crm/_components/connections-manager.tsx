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
  'block w-full rounded-lg border border-gray-300 bg-white px-3 py-2 text-sm text-gray-900 outline-none transition focus:border-gray-900 disabled:bg-gray-50'

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
        className="absolute inset-0 bg-gray-900/40 backdrop-blur-sm"
        onClick={onClose}
        aria-hidden
      />
      <div className="relative flex max-h-[88vh] w-full max-w-2xl flex-col overflow-hidden rounded-2xl bg-white shadow-2xl ring-1 ring-gray-900/5">
        <header className="flex items-center justify-between border-b border-gray-100 px-5 py-4">
          <div>
            <h2 className="text-base font-semibold text-gray-900">Koppelingen</h2>
            <p className="mt-0.5 text-xs text-gray-500">
              Stuur je leads rechtstreeks naar je eigen CRM.
            </p>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="rounded-lg p-1.5 text-gray-400 hover:bg-gray-100 hover:text-gray-700"
            aria-label="Sluiten"
          >
            <svg className="h-5 w-5" fill="none" viewBox="0 0 24 24" strokeWidth={1.8} stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" d="M6 18 18 6M6 6l12 12" />
            </svg>
          </button>
        </header>

        <div className="flex-1 space-y-4 overflow-y-auto px-5 py-4">
          {error && (
            <p className="rounded-lg bg-rose-50 px-3 py-2 text-xs text-rose-700">{error}</p>
          )}
          {notice && (
            <p className="rounded-lg bg-emerald-50 px-3 py-2 text-xs text-emerald-700">{notice}</p>
          )}

          {connections.length === 0 && !draft && (
            <p className="rounded-xl border border-dashed border-gray-200 px-4 py-8 text-center text-sm text-gray-500">
              Nog geen koppelingen. Kies hieronder een CRM om te beginnen.
            </p>
          )}

          {connections.length > 0 && (
            <ul className="space-y-2">
              {connections.map((connection) => {
                const providerMeta = PROVIDER_META[connection.provider]
                return (
                  <li key={connection.id} className="rounded-xl border border-gray-200 p-3">
                    <div className="flex flex-wrap items-center gap-2">
                      <span
                        className={`rounded-full border px-2 py-0.5 text-[10px] font-semibold ${providerMeta.badge}`}
                      >
                        {providerMeta.name}
                      </span>
                      <span className="min-w-0 flex-1 truncate text-sm font-medium text-gray-900">
                        {connection.name}
                      </span>
                      <span className="font-mono text-[11px] text-gray-400">
                        {connection.tokenHint ?? 'geen token'}
                      </span>
                      <button
                        type="button"
                        onClick={() => handleTest(connection)}
                        disabled={pending}
                        className="rounded-lg border border-gray-300 px-2.5 py-1 text-xs font-medium text-gray-700 hover:border-gray-400 disabled:opacity-50"
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
                        className="rounded-lg px-2.5 py-1 text-xs font-medium text-gray-600 hover:bg-gray-100"
                      >
                        Bewerken
                      </button>
                      <button
                        type="button"
                        onClick={() => handleDelete(connection)}
                        disabled={pending}
                        className="rounded-lg px-2 py-1 text-xs font-medium text-gray-400 hover:bg-rose-50 hover:text-rose-600 disabled:opacity-50"
                      >
                        Verwijderen
                      </button>
                    </div>
                    <p className="mt-1.5 text-[11px] text-gray-500">{providerMeta.mapping}</p>
                    {connection.lastExportAt && (
                      <p
                        className={`mt-1 text-[11px] ${
                          connection.lastExportStatus === 'error'
                            ? 'text-rose-600'
                            : connection.lastExportStatus === 'partial'
                              ? 'text-amber-600'
                              : 'text-gray-400'
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
            <form onSubmit={handleSave} className="space-y-3 rounded-xl border border-gray-900/10 bg-gray-50/70 p-4">
              <div className="flex items-center gap-2">
                <span className={`rounded-full border px-2 py-0.5 text-[10px] font-semibold ${meta.badge}`}>
                  {meta.name}
                </span>
                <span className="text-sm font-medium text-gray-900">
                  {draft.id ? 'Koppeling bewerken' : 'Nieuwe koppeling'}
                </span>
              </div>

              <p className="text-xs text-gray-600">{meta.summary}</p>

              <label className="block">
                <span className="text-[11px] font-semibold uppercase tracking-wider text-gray-500">
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
                <span className="text-[11px] font-semibold uppercase tracking-wider text-gray-500">
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
                  <span className="mt-1 block text-[11px] leading-relaxed text-gray-500">
                    {meta.tokenHelp}
                  </span>
                )}
              </label>

              {meta.hasDomain && (
                <label className="block">
                  <span className="text-[11px] font-semibold uppercase tracking-wider text-gray-500">
                    {meta.domainLabel}
                  </span>
                  <input
                    className={`${inputClass} mt-1`}
                    value={draft.domain}
                    onChange={(e) => setDraft({ ...draft, domain: e.target.value })}
                    disabled={pending}
                    placeholder="mijnbedrijf"
                  />
                  <span className="mt-1 block text-[11px] text-gray-500">{meta.domainHelp}</span>
                </label>
              )}

              <p className="rounded-lg bg-white px-3 py-2 text-[11px] leading-relaxed text-gray-600 ring-1 ring-gray-200">
                <strong className="font-semibold text-gray-800">Wat gaat er mee:</strong>{' '}
                {meta.mapping} Bestaande records worden bijgewerkt op e-mailadres, dus je krijgt
                geen dubbele contacten.
              </p>

              <div className="flex justify-end gap-2">
                <button
                  type="button"
                  onClick={() => setDraft(null)}
                  disabled={pending}
                  className="rounded-lg px-3 py-2 text-sm font-medium text-gray-600 hover:bg-gray-100"
                >
                  Annuleren
                </button>
                <button
                  type="submit"
                  disabled={pending || !draft.name.trim()}
                  className="rounded-lg bg-gray-900 px-4 py-2 text-sm font-medium text-white hover:bg-gray-800 disabled:opacity-50"
                >
                  {pending ? 'Opslaan…' : 'Opslaan'}
                </button>
              </div>
            </form>
          ) : (
            <div className="flex flex-wrap gap-2 border-t border-gray-100 pt-4">
              {PROVIDER_IDS.map((provider) => {
                const isHubspot = provider === 'hubspot'
                const hasHubspot = connections.some((c) => c.provider === 'hubspot')
                return (
                  <button
                    key={provider}
                    type="button"
                    onClick={() => (isHubspot ? onOpenHubspot() : startNew(provider))}
                    className={`inline-flex items-center gap-1.5 rounded-lg border px-3 py-2 text-sm font-medium ${
                      isHubspot
                        ? 'border-orange-300 bg-orange-50 text-orange-700 hover:border-orange-400'
                        : 'border-gray-300 bg-white text-gray-700 hover:border-gray-400'
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
