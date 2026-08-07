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
      className={`shrink-0 rounded-control border px-3 py-1.5 text-[11.5px] font-semibold transition ${
        state === 'copied'
          ? 'border-[color-mix(in_oklab,var(--color-pos)_35%,transparent)] bg-[color-mix(in_oklab,var(--color-pos)_10%,transparent)] text-pos'
          : state === 'failed'
            ? 'border-[color-mix(in_oklab,var(--color-neg)_35%,transparent)] bg-[color-mix(in_oklab,var(--color-neg)_8%,transparent)] text-neg'
            : 'border-line bg-panel text-muted hover:border-[var(--brand-32)]'
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
    <div className="rounded-panel border border-[color-mix(in_oklab,var(--c-hubspot)_30%,transparent)] bg-[color-mix(in_oklab,var(--c-hubspot)_7%,transparent)] p-4">
      <p className="text-[11.5px] font-semibold uppercase tracking-wider text-[var(--c-hubspot)]">
        Deze twee scopes heb je nodig
      </p>
      <ul className="mt-3 space-y-2">
        {HUBSPOT_SCOPES.map((scope, i) => (
          <li
            key={scope}
            className="flex items-center gap-3 rounded-control border border-[color-mix(in_oklab,var(--c-hubspot)_30%,transparent)] bg-panel px-3 py-2.5"
          >
            <span className="flex h-6 w-6 shrink-0 items-center justify-center rounded-full bg-[color-mix(in_oklab,var(--c-hubspot)_15%,transparent)] text-[11.5px] font-bold text-[var(--c-hubspot)]">
              {i + 1}
            </span>
            <code className="min-w-0 flex-1 break-all font-mono text-[15px] font-semibold text-fg">
              {scope}
            </code>
            <CopyButton value={scope} />
          </li>
        ))}
      </ul>
    </div>
  )
}
