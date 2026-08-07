'use client'

import { STAGE_META } from '../_lib/constants'
import type { CrmEntry } from '../_lib/types'
import { dueStateOf, stageOf } from '../_lib/view'

function Tile({
  label,
  value,
  meta,
  accent,
}: {
  label: string
  value: number
  meta: string
  accent?: string
}) {
  return (
    <div className="rounded-panel border border-line bg-panel px-4 py-3.5">
      <div className="text-[11.5px] font-medium text-muted">{label}</div>
      <div className="mt-2 flex items-baseline gap-[9px]">
        <span
          className="text-2xl font-semibold leading-none tracking-[-0.035em] tabular-nums text-fg"
          style={accent ? { color: accent } : undefined}
        >
          {value}
        </span>
        <span className="text-[11.5px] text-faint">{meta}</span>
      </div>
    </div>
  )
}

/**
 * Alleen tellingen. Dit CRM koppelt geen bedragen aan leads, dus "Open
 * pipeline", "Gewonnen (bedrag)" en "Winkans" zijn vervallen.
 */
export function CrmStats({ entries, today }: { entries: CrmEntry[]; today: string }) {
  const untouched = entries.filter((e) => stageOf(e) === 'nieuw').length
  const active = entries.filter((e) => STAGE_META[stageOf(e)].active).length
  const won = entries.filter((e) => stageOf(e) === 'gewonnen').length
  const overdue = entries.filter((e) => dueStateOf(e, today) === 'overdue').length
  const dueToday = entries.filter((e) => dueStateOf(e, today) === 'today').length

  return (
    <div className="grid grid-cols-2 gap-3.5 lg:grid-cols-5">
      <Tile label="Leads in CRM" value={entries.length} meta="totaal" />
      <Tile label="Nog niet opgepakt" value={untouched} meta="in Nieuw" />
      <Tile label="Actief in gesprek" value={active} meta="gesprek t/m voorstel" />
      <Tile
        label="Acties open"
        value={overdue + dueToday}
        meta={overdue > 0 ? `${overdue} te laat` : 'niets te laat'}
        accent={overdue > 0 ? 'var(--color-warn)' : undefined}
      />
      <Tile label="Gewonnen" value={won} meta="klant geworden" accent="var(--color-pos)" />
    </div>
  )
}
