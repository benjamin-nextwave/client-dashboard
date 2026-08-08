'use client'

import type { DncEntry } from '@/lib/actions/dnc-actions'
import { useT } from '@/lib/i18n/client'

function Tile({
  label,
  value,
  meta,
  accent,
}: {
  label: string
  value: number
  meta?: string
  accent?: string
}) {
  return (
    <div className="rounded-panel border border-line bg-panel px-4 py-3.5">
      <div className="text-[11.5px] font-medium text-muted">{label}</div>
      <div className="mt-2 flex items-baseline gap-[9px]">
        <span
          className="text-2xl font-semibold leading-none tracking-[-0.035em] tabular-nums"
          style={accent ? { color: accent } : undefined}
        >
          {value}
        </span>
        {meta && <span className="text-[11.5px] text-faint">{meta}</span>}
      </div>
    </div>
  )
}

/**
 * Alleen cijfers die uit de lijst zelf komen. "Gefilterd deze campagne" stond in
 * het ontwerp, maar dat getal wordt nergens vastgelegd — daarom laten we het weg
 * in plaats van er iets bij te verzinnen.
 */
export function DncStats({ entries }: { entries: DncEntry[] }) {
  const t = useT()

  const emails = entries.filter((e) => e.entry_type === 'email').length
  const domains = entries.filter((e) => e.entry_type === 'domain').length
  const active = entries.filter((e) => e.approved).length
  const pending = entries.length - active

  return (
    <div className="mt-5 grid grid-cols-2 gap-3.5 lg:grid-cols-4">
      <Tile label={t('dnc.statTotal')} value={entries.length} />
      <Tile label={t('dnc.statEmails')} value={emails} />
      <Tile label={t('dnc.statDomains')} value={domains} />
      <Tile
        label={t('dnc.statActive')}
        value={active}
        meta={pending > 0 ? `${pending} ${t('dnc.statProcessing')}` : t('dnc.statActiveMeta')}
        accent={pending > 0 ? 'var(--color-neg)' : 'var(--color-pos)'}
      />
    </div>
  )
}
