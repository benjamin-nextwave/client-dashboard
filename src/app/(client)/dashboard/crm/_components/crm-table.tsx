'use client'

import { CRM_STAGES, PRIORITY_META, STAGE_META } from '../_lib/constants'
import type { CrmEntry, CrmLabel, CrmStageId } from '../_lib/types'
import {
  displayCompany,
  displayName,
  dueStateOf,
  formatDate,
  initialsOf,
  labelIdsOf,
  priorityOf,
  stageOf,
} from '../_lib/view'

export type SortKey = 'recent' | 'name' | 'action' | 'stage'

const SORT_LABEL: Record<SortKey, string> = {
  recent: 'Laatste reactie',
  name: 'Naam',
  action: 'Volgende actie',
  stage: 'Fase',
}

export const SORT_KEYS: SortKey[] = ['recent', 'name', 'action', 'stage']
export const sortLabelOf = (key: SortKey): string => SORT_LABEL[key]

const DUE_COLOR: Record<string, string> = {
  overdue: 'var(--color-neg)',
  today: 'var(--color-warn)',
}

function Checkbox({
  checked,
  onChange,
  label,
}: {
  checked: boolean
  onChange: () => void
  label: string
}) {
  return (
    <button
      type="button"
      onClick={onChange}
      aria-label={label}
      aria-pressed={checked}
      className={`flex h-3.5 w-3.5 items-center justify-center rounded border transition-colors ${
        checked ? 'border-brand bg-brand' : 'border-line hover:border-[var(--brand-40)]'
      }`}
    >
      {checked && (
        <svg
          viewBox="0 0 24 24"
          fill="none"
          stroke="#fff"
          strokeWidth={3.6}
          strokeLinecap="round"
          strokeLinejoin="round"
          className="h-[9px] w-[9px]"
          aria-hidden
        >
          <path d="m4.5 12.75 6 6 9-13.5" />
        </svg>
      )}
    </button>
  )
}

export function CrmTable({
  entries,
  labels,
  today,
  selection,
  sort,
  onSortChange,
  onToggleSelect,
  onToggleAll,
  onOpen,
  onDelete,
  onStageChange,
}: {
  entries: CrmEntry[]
  labels: CrmLabel[]
  today: string
  selection: Set<string>
  sort: SortKey
  onSortChange: (key: SortKey) => void
  onToggleSelect: (key: string) => void
  onToggleAll: (checked: boolean) => void
  onOpen: (key: string) => void
  onDelete: (keys: string[]) => void
  onStageChange: (key: string, from: CrmStageId, to: CrmStageId) => void
}) {
  const labelsById = new Map(labels.map((l) => [l.id, l]))
  const allSelected = entries.length > 0 && entries.every((e) => selection.has(e.key))

  function SortableTh({
    label,
    sortKey,
    className,
  }: {
    label: string
    sortKey: SortKey
    className?: string
  }) {
    const active = sort === sortKey
    return (
      <th scope="col" className={`px-3 py-2.5 text-left font-semibold ${className ?? ''}`}>
        <button
          type="button"
          onClick={() => onSortChange(sortKey)}
          className={`inline-flex items-center gap-1 transition-colors ${
            active ? 'text-fg' : 'text-muted hover:text-fg'
          }`}
        >
          {label}
          {active && (
            <svg
              className="h-3 w-3"
              fill="none"
              viewBox="0 0 24 24"
              strokeWidth={2.4}
              stroke="currentColor"
              strokeLinecap="round"
              strokeLinejoin="round"
              aria-hidden
            >
              <path d="M19.5 13.5 12 21m0 0-7.5-7.5M12 21V3" />
            </svg>
          )}
        </button>
      </th>
    )
  }

  return (
    <div className="overflow-x-auto rounded-panel border border-line bg-panel">
      <table className="w-full min-w-[860px] border-collapse text-[12.5px]">
        <thead className="border-b border-line bg-track text-[11px] uppercase tracking-wider">
          <tr>
            <th scope="col" className="w-9 px-3 py-2.5">
              <Checkbox
                checked={allSelected}
                onChange={() => onToggleAll(!allSelected)}
                label="Alles selecteren"
              />
            </th>
            <SortableTh label="Lead" sortKey="name" />
            <SortableTh label="Fase" sortKey="stage" className="w-44" />
            <th scope="col" className="px-3 py-2.5 text-left font-semibold text-muted">
              Labels
            </th>
            <th scope="col" className="px-3 py-2.5 text-left font-semibold text-muted">
              Prio
            </th>
            <SortableTh label="Volgende actie" sortKey="action" className="w-56" />
            <SortableTh label="Reactie" sortKey="recent" className="w-28" />
            <th scope="col" className="w-10 px-3 py-2.5">
              <span className="sr-only">Acties</span>
            </th>
          </tr>
        </thead>
        <tbody>
          {entries.map((entry) => {
            const stage = stageOf(entry)
            const priority = priorityOf(entry)
            const due = dueStateOf(entry, today)
            const dueColor = DUE_COLOR[due]
            const company = displayCompany(entry)
            const selected = selection.has(entry.key)
            const entryLabels = labelIdsOf(entry)
              .map((id) => labelsById.get(id))
              .filter((l): l is CrmLabel => l !== undefined)

            return (
              <tr
                key={entry.key}
                className={`group border-b border-line transition-colors last:border-b-0 ${
                  selected ? 'bg-[var(--brand-06)]' : 'hover:bg-[var(--brand-04)]'
                }`}
              >
                <td className="px-3 py-2.5">
                  <Checkbox
                    checked={selected}
                    onChange={() => onToggleSelect(entry.key)}
                    label={`Selecteer ${displayName(entry)}`}
                  />
                </td>
                <td className="px-3 py-2.5">
                  <button
                    type="button"
                    onClick={() => onOpen(entry.key)}
                    className="flex w-full items-center gap-2.5 text-left"
                  >
                    <span className="flex h-7 w-7 shrink-0 items-center justify-center rounded-md bg-track text-[10px] font-semibold text-muted">
                      {initialsOf(entry)}
                    </span>
                    <span className="min-w-0">
                      <span className="flex items-center gap-1.5">
                        <span className="truncate font-medium text-fg">
                          {displayName(entry)}
                        </span>
                        {entry.hasReferral && (
                          <span
                            className="h-1.5 w-1.5 shrink-0 rounded-full bg-neg"
                            title="Doorverwijzing bekend"
                          />
                        )}
                      </span>
                      <span className="block truncate text-[11px] text-faint">
                        {company ? `${company} · ${entry.email}` : entry.email}
                      </span>
                    </span>
                  </button>
                </td>
                <td className="px-3 py-2.5">
                  <div className="flex items-center gap-2">
                    <span
                      className="h-[6px] w-[6px] shrink-0 rounded-full"
                      style={{ background: STAGE_META[stage].color }}
                      aria-hidden
                    />
                    <select
                      value={stage}
                      onChange={(e) =>
                        onStageChange(entry.key, stage, e.target.value as CrmStageId)
                      }
                      aria-label={`Fase van ${displayName(entry)}`}
                      className="min-w-0 flex-1 rounded-control border border-line bg-panel px-2 py-1 text-[11.5px] font-medium text-fg outline-none"
                    >
                      {CRM_STAGES.map((s) => (
                        <option key={s.id} value={s.id}>
                          {s.name}
                        </option>
                      ))}
                    </select>
                  </div>
                </td>
                <td className="px-3 py-2.5">
                  <div className="flex flex-wrap gap-1">
                    {entryLabels.length === 0 && <span className="text-faint">—</span>}
                    {entryLabels.slice(0, 2).map((label) => (
                      <span
                        key={label.id}
                        className="inline-flex items-center gap-1.5 whitespace-nowrap rounded-[5px] border border-line px-[7px] py-0.5 text-[10px] font-medium text-muted"
                      >
                        <span
                          className="h-[5px] w-[5px] rounded-full"
                          style={{ background: label.color }}
                        />
                        {label.name}
                      </span>
                    ))}
                    {entryLabels.length > 2 && (
                      <span className="rounded-[5px] bg-track px-[7px] py-0.5 text-[10px] font-medium text-muted">
                        +{entryLabels.length - 2}
                      </span>
                    )}
                  </div>
                </td>
                <td className="px-3 py-2.5">
                  <span className="inline-flex items-center gap-1.5 whitespace-nowrap text-[11px] font-medium text-muted">
                    <span
                      className="h-[5px] w-[5px] rounded-full"
                      style={{ background: PRIORITY_META[priority].color }}
                      aria-hidden
                    />
                    {PRIORITY_META[priority].name}
                  </span>
                </td>
                <td className="px-3 py-2.5">
                  {entry.record?.nextAction || entry.record?.nextActionAt ? (
                    <div className="min-w-0">
                      <p className="truncate text-[11.5px] text-fg">
                        {entry.record?.nextAction ?? 'Actie gepland'}
                      </p>
                      <p
                        className="text-[11px] tabular-nums"
                        style={
                          dueColor
                            ? { color: dueColor, fontWeight: 600 }
                            : { color: 'var(--color-faint)' }
                        }
                      >
                        {due === 'overdue' ? 'Te laat · ' : due === 'today' ? 'Vandaag · ' : ''}
                        {formatDate(entry.record?.nextActionAt ?? null)}
                      </p>
                    </div>
                  ) : (
                    <span className="text-faint">—</span>
                  )}
                </td>
                <td className="px-3 py-2.5 text-[11.5px] tabular-nums text-muted">
                  {formatDate(entry.receivedAt)}
                </td>
                <td className="px-3 py-2.5">
                  <button
                    type="button"
                    onClick={() => onDelete([entry.key])}
                    aria-label={`${displayName(entry)} verwijderen uit het CRM`}
                    title="Verwijderen uit CRM"
                    className="flex h-6 w-6 items-center justify-center rounded-md text-faint opacity-0 transition-colors hover:bg-[color-mix(in_oklab,var(--color-neg)_10%,transparent)] hover:text-neg focus-visible:opacity-100 group-hover:opacity-100"
                  >
                    <svg
                      viewBox="0 0 24 24"
                      fill="none"
                      stroke="currentColor"
                      strokeWidth={1.9}
                      strokeLinecap="round"
                      strokeLinejoin="round"
                      className="h-[13px] w-[13px]"
                      aria-hidden
                    >
                      <path d="m14.74 9-.346 9m-4.788 0L9.26 9m9.968-3.21c.342.052.682.107 1.022.166M19.228 5.79 18.16 19.673a2.25 2.25 0 0 1-2.244 2.077H8.084a2.25 2.25 0 0 1-2.244-2.077L4.772 5.79m14.456 0a48.108 48.108 0 0 0-3.478-.397m-12 .562c.34-.059.68-.114 1.022-.165m0 0a48.11 48.11 0 0 1 3.478-.397m7.5 0v-.916c0-1.18-.91-2.164-2.09-2.201a51.964 51.964 0 0 0-3.32 0c-1.18.037-2.09 1.022-2.09 2.201v.916m7.5 0a48.667 48.667 0 0 0-7.5 0" />
                    </svg>
                  </button>
                </td>
              </tr>
            )
          })}
        </tbody>
      </table>
      {entries.length === 0 && (
        <p className="px-4 py-10 text-center text-[12.5px] text-muted">
          Geen leads gevonden met deze filters.
        </p>
      )}
    </div>
  )
}
