'use client'

import { useState } from 'react'

export const HUBSPOT_SCOPES = [
  'crm.objects.contacts.read',
  'crm.objects.contacts.write',
] as const

function CopyButton({ value }: { value: string }) {
  const [state, setState] = useState<'idle' | 'copied' | 'failed'>('idle')

  async function copy() {
    try {
      await navigator.clipboard.writeText(value)
      setState('copied')
    } catch {
      setState('failed')
    }
    setTimeout(() => setState('idle'), 2000)
  }

  return (
    <button
      type="button"
      onClick={copy}
      className={`shrink-0 rounded-lg border px-3 py-1.5 text-xs font-semibold transition ${
        state === 'copied'
          ? 'border-emerald-300 bg-emerald-50 text-emerald-700'
          : state === 'failed'
            ? 'border-rose-300 bg-rose-50 text-rose-700'
            : 'border-gray-300 bg-white text-gray-700 hover:border-gray-400'
      }`}
      aria-label={`Kopieer ${value}`}
    >
      {state === 'copied' ? 'Gekopieerd' : state === 'failed' ? 'Mislukt' : 'Kopiëren'}
    </button>
  )
}

/**
 * De twee scopes die de Private App in HubSpot nodig heeft. Bewust groot en
 * met een kopieerknop per regel — ze moeten letterlijk overgenomen worden.
 */
export function HubspotScopes() {
  return (
    <div className="rounded-xl border border-orange-200 bg-orange-50/60 p-4">
      <p className="text-xs font-semibold uppercase tracking-wider text-orange-800">
        Deze twee scopes heb je nodig
      </p>
      <ul className="mt-3 space-y-2">
        {HUBSPOT_SCOPES.map((scope, i) => (
          <li
            key={scope}
            className="flex items-center gap-3 rounded-lg border border-orange-200 bg-white px-3 py-2.5"
          >
            <span className="flex h-6 w-6 shrink-0 items-center justify-center rounded-full bg-orange-100 text-xs font-bold text-orange-700">
              {i + 1}
            </span>
            <code className="min-w-0 flex-1 break-all font-mono text-base font-semibold text-gray-900">
              {scope}
            </code>
            <CopyButton value={scope} />
          </li>
        ))}
      </ul>
    </div>
  )
}
