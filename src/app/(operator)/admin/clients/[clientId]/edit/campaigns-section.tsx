'use client'

import { useState, useTransition } from 'react'
import { addCampaign, deleteCampaign, setCampaignActive } from './campaigns-actions'

export interface CampaignRow {
  id: string
  name: string
  instantly_campaign_id: string
  is_active: boolean
}

interface CampaignsSectionProps {
  clientId: string
  customerId: string
  campaigns: CampaignRow[]
}

export function CampaignsSection({ clientId, customerId, campaigns }: CampaignsSectionProps) {
  const [isAdding, setIsAdding] = useState(false)
  const [name, setName] = useState('')
  const [instantlyId, setInstantlyId] = useState('')
  const [active, setActive] = useState(true)
  const [error, setError] = useState('')
  const [pending, startTransition] = useTransition()

  function resetForm() {
    setName('')
    setInstantlyId('')
    setActive(true)
    setError('')
  }

  function onAdd() {
    setError('')
    startTransition(async () => {
      const result = await addCampaign(clientId, customerId, name, instantlyId, active)
      if (result.error) {
        setError(result.error)
        return
      }
      resetForm()
      setIsAdding(false)
    })
  }

  function onToggleActive(campaignId: string, next: boolean) {
    setError('')
    startTransition(async () => {
      const result = await setCampaignActive(clientId, campaignId, next)
      if (result.error) setError(result.error)
    })
  }

  function onDelete(campaignId: string, campaignName: string) {
    if (!confirm(`Campagne "${campaignName}" verwijderen?`)) return
    setError('')
    startTransition(async () => {
      const result = await deleteCampaign(clientId, campaignId)
      if (result.error) setError(result.error)
    })
  }

  return (
    <section className="rounded-2xl border border-gray-200 bg-white p-6 shadow-sm">
      <div className="mb-5 flex items-start gap-3 border-b border-gray-100 pb-4">
        <div className="flex h-9 w-9 flex-shrink-0 items-center justify-center rounded-xl bg-gradient-to-br from-indigo-50 to-violet-50 text-indigo-600 ring-1 ring-indigo-100">
          <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" strokeWidth={2} stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" d="M10.34 15.84c-.688-.06-1.386-.09-2.09-.09H7.5a4.5 4.5 0 1 1 0-9h.75c.704 0 1.402-.03 2.09-.09m0 9.18c.253.962.584 1.892.985 2.783.247.55.06 1.21-.463 1.511l-.657.38c-.551.318-1.26.117-1.527-.461a20.845 20.845 0 0 1-1.44-4.282m3.102.069a18.03 18.03 0 0 1-.59-4.59c0-1.586.205-3.124.59-4.59m0 9.18a23.848 23.848 0 0 1 8.835 2.535M10.34 6.66a23.847 23.847 0 0 0 8.835-2.535m0 0A23.74 23.74 0 0 0 18.795 3m.38 1.125a23.91 23.91 0 0 1 1.014 5.395m-1.014 8.855c-.118.38-.245.754-.38 1.125m.38-1.125a23.91 23.91 0 0 0 1.014-5.395m0-3.46c.495.413.811 1.035.811 1.73 0 .695-.316 1.317-.811 1.73m0-3.46a24.347 24.347 0 0 1 0 3.46" />
          </svg>
        </div>
        <div className="flex-1">
          <h3 className="text-sm font-semibold text-gray-900">Lead-inbox campagnes</h3>
          <p className="mt-0.5 text-xs text-gray-500">
            Koppel een of meer Instantly-campagnes aan deze klant. Make routeert binnenkomende replies naar de
            lead-inbox via deze koppeling.
          </p>
        </div>
      </div>

      {error && (
        <div className="mb-4 flex items-start gap-3 rounded-xl border border-red-200 bg-red-50 p-3 text-sm text-red-800">
          <svg className="mt-0.5 h-4 w-4 flex-shrink-0" fill="none" viewBox="0 0 24 24" strokeWidth={2} stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" d="M12 9v3.75m9-.75a9 9 0 1 1-18 0 9 9 0 0 1 18 0Zm-9 3.75h.008v.008H12v-.008Z" />
          </svg>
          <span>{error}</span>
        </div>
      )}

      {campaigns.length === 0 ? (
        <p className="mb-4 rounded-xl border border-dashed border-gray-200 bg-gray-50/50 p-4 text-center text-xs text-gray-500">
          Nog geen campagnes gekoppeld.
        </p>
      ) : (
        <ul className="mb-4 space-y-2">
          {campaigns.map((c) => (
            <li
              key={c.id}
              className="flex items-center gap-3 rounded-xl border border-gray-200 bg-gray-50/30 p-3"
            >
              <div className="min-w-0 flex-1">
                <div className="text-sm font-medium text-gray-900">{c.name}</div>
                <div className="mt-0.5 truncate font-mono text-[11px] text-gray-500">
                  {c.instantly_campaign_id}
                </div>
              </div>
              <button
                type="button"
                onClick={() => onToggleActive(c.id, !c.is_active)}
                disabled={pending}
                className={`inline-flex items-center gap-1.5 rounded-lg border px-2.5 py-1 text-[11px] font-semibold uppercase tracking-wide transition-colors disabled:opacity-50 ${
                  c.is_active
                    ? 'border-emerald-200 bg-emerald-50 text-emerald-700 hover:bg-emerald-100'
                    : 'border-gray-200 bg-white text-gray-500 hover:bg-gray-50'
                }`}
                aria-label={c.is_active ? 'Zet inactief' : 'Zet actief'}
              >
                <span
                  className={`h-1.5 w-1.5 rounded-full ${c.is_active ? 'bg-emerald-500' : 'bg-gray-400'}`}
                />
                {c.is_active ? 'Actief' : 'Inactief'}
              </button>
              <button
                type="button"
                onClick={() => onDelete(c.id, c.name)}
                disabled={pending}
                className="inline-flex h-8 w-8 items-center justify-center rounded-lg border border-gray-200 bg-white text-gray-400 transition-colors hover:border-red-200 hover:bg-red-50 hover:text-red-600 disabled:opacity-50"
                aria-label="Verwijder"
              >
                <svg className="h-3.5 w-3.5" fill="none" viewBox="0 0 24 24" strokeWidth={2} stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" d="m14.74 9-.346 9m-4.788 0L9.26 9m9.968-3.21c.342.052.682.107 1.022.166m-1.022-.165L18.16 19.673a2.25 2.25 0 0 1-2.244 2.077H8.084a2.25 2.25 0 0 1-2.244-2.077L4.772 5.79m14.456 0a48.108 48.108 0 0 0-3.478-.397m-12 .562c.34-.059.68-.114 1.022-.165m0 0a48.11 48.11 0 0 1 3.478-.397m7.5 0v-.916c0-1.18-.91-2.164-2.09-2.201a51.964 51.964 0 0 0-3.32 0c-1.18.037-2.09 1.022-2.09 2.201v.916m7.5 0a48.667 48.667 0 0 0-7.5 0" />
                </svg>
              </button>
            </li>
          ))}
        </ul>
      )}

      {isAdding ? (
        <div className="space-y-3 rounded-xl border border-indigo-200 bg-indigo-50/30 p-4">
          <div className="grid gap-3 sm:grid-cols-2">
            <div>
              <label htmlFor="campaign-name" className="mb-1.5 block text-xs font-semibold uppercase tracking-wide text-gray-600">
                Naam
              </label>
              <input
                id="campaign-name"
                type="text"
                value={name}
                onChange={(e) => setName(e.target.value)}
                placeholder="Q2 Outbound"
                className="block w-full rounded-xl border border-gray-200 bg-white px-3 py-2 text-sm text-gray-900 placeholder:text-gray-400 shadow-sm focus:border-indigo-400 focus:outline-none focus:ring-4 focus:ring-indigo-100"
                disabled={pending}
              />
            </div>
            <div>
              <label htmlFor="campaign-instantly-id" className="mb-1.5 block text-xs font-semibold uppercase tracking-wide text-gray-600">
                Instantly campaign ID
              </label>
              <input
                id="campaign-instantly-id"
                type="text"
                value={instantlyId}
                onChange={(e) => setInstantlyId(e.target.value)}
                placeholder="UUID uit Instantly"
                className="block w-full rounded-xl border border-gray-200 bg-white px-3 py-2 font-mono text-xs text-gray-900 placeholder:text-gray-400 shadow-sm focus:border-indigo-400 focus:outline-none focus:ring-4 focus:ring-indigo-100"
                disabled={pending}
              />
            </div>
          </div>
          <label className="flex cursor-pointer items-center gap-2 text-xs text-gray-700">
            <input
              type="checkbox"
              checked={active}
              onChange={(e) => setActive(e.target.checked)}
              disabled={pending}
              className="h-4 w-4 rounded border-gray-300 text-indigo-600 focus:ring-indigo-500"
            />
            Actief direct na toevoegen
          </label>
          <div className="flex justify-end gap-2 pt-1">
            <button
              type="button"
              onClick={() => {
                resetForm()
                setIsAdding(false)
              }}
              disabled={pending}
              className="rounded-lg border border-gray-200 bg-white px-3 py-1.5 text-xs font-semibold text-gray-700 hover:bg-gray-50 disabled:opacity-50"
            >
              Annuleren
            </button>
            <button
              type="button"
              onClick={onAdd}
              disabled={pending || !name.trim() || !instantlyId.trim()}
              className="rounded-lg bg-gradient-to-br from-indigo-600 to-violet-600 px-3 py-1.5 text-xs font-semibold text-white shadow-sm hover:shadow disabled:opacity-50"
            >
              {pending ? 'Toevoegen…' : 'Toevoegen'}
            </button>
          </div>
        </div>
      ) : (
        <button
          type="button"
          onClick={() => setIsAdding(true)}
          className="inline-flex items-center gap-2 rounded-xl border border-dashed border-gray-300 bg-white px-4 py-2.5 text-sm font-semibold text-gray-700 transition-colors hover:border-indigo-300 hover:text-indigo-700"
        >
          <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" strokeWidth={2.5} stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" d="M12 4.5v15m7.5-7.5h-15" />
          </svg>
          Campagne toevoegen
        </button>
      )}
    </section>
  )
}
