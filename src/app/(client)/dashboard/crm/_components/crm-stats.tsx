'use client'

import { STAGE_META } from '../_lib/constants'
import type { CrmEntry } from '../_lib/types'
import { dueStateOf, formatCurrency, stageOf, valueOf } from '../_lib/view'

function Tile({
  label,
  value,
  hint,
  accent,
}: {
  label: string
  value: string
  hint?: string
  accent?: string
}) {
  return (
    <div className="rounded-xl border border-gray-200 bg-white px-4 py-3">
      <p className="text-[11px] font-semibold uppercase tracking-wider text-gray-500">
        {label}
      </p>
      <p className={`mt-1 text-xl font-semibold tabular-nums ${accent ?? 'text-gray-900'}`}>
        {value}
      </p>
      {hint && <p className="mt-0.5 text-[11px] text-gray-400">{hint}</p>}
    </div>
  )
}

export function CrmStats({ entries, today }: { entries: CrmEntry[]; today: string }) {
  const openValue = entries
    .filter((e) => STAGE_META[stageOf(e)].open)
    .reduce((sum, e) => sum + valueOf(e), 0)

  const wonEntries = entries.filter((e) => stageOf(e) === 'gewonnen')
  const wonValue = wonEntries.reduce((sum, e) => sum + valueOf(e), 0)

  const decided = entries.filter(
    (e) => stageOf(e) === 'gewonnen' || stageOf(e) === 'verloren'
  ).length
  const winRate = decided > 0 ? Math.round((wonEntries.length / decided) * 100) : null

  const overdue = entries.filter((e) => dueStateOf(e, today) === 'overdue').length
  const dueToday = entries.filter((e) => dueStateOf(e, today) === 'today').length

  const untouched = entries.filter((e) => stageOf(e) === 'nieuw').length

  return (
    <div className="grid grid-cols-2 gap-3 lg:grid-cols-5">
      <Tile label="Leads" value={String(entries.length)} hint={`${untouched} nog niet opgepakt`} />
      <Tile label="Open pipeline" value={formatCurrency(openValue)} hint="Nieuw t/m voorstel" />
      <Tile
        label="Gewonnen"
        value={formatCurrency(wonValue)}
        hint={`${wonEntries.length} deal(s)`}
        accent="text-emerald-600"
      />
      <Tile
        label="Winkans"
        value={winRate === null ? '—' : `${winRate}%`}
        hint={decided > 0 ? `${decided} afgerond` : 'Nog niets afgerond'}
      />
      <Tile
        label="Acties"
        value={String(overdue + dueToday)}
        hint={overdue > 0 ? `${overdue} te laat` : 'Niets te laat'}
        accent={overdue > 0 ? 'text-rose-600' : 'text-gray-900'}
      />
    </div>
  )
}
