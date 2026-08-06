'use client'

import { CRM_STAGES, PRIORITY_META, STAGE_META } from '../_lib/constants'
import type { CrmEntry, CrmLabel, CrmStageId } from '../_lib/types'
import {
  displayCompany,
  displayName,
  dueStateOf,
  formatCurrency,
  formatDate,
  initialsOf,
  labelIdsOf,
  priorityOf,
  stageOf,
  valueOf,
} from '../_lib/view'

export type SortKey = 'recent' | 'name' | 'value' | 'action' | 'stage'

const SORT_LABEL: Record<SortKey, string> = {
  recent: 'Laatste reactie',
  name: 'Naam',
  value: 'Dealwaarde',
  action: 'Volgende actie',
  stage: 'Fase',
}

export const SORT_KEYS: SortKey[] = ['recent', 'name', 'value', 'action', 'stage']
export const sortLabelOf = (key: SortKey): string => SORT_LABEL[key]

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
          className={`inline-flex items-center gap-1 ${active ? 'text-gray-900' : 'text-gray-500 hover:text-gray-800'}`}
        >
          {label}
          {active && (
            <svg className="h-3 w-3" fill="none" viewBox="0 0 24 24" strokeWidth={2.4} stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" d="M19.5 13.5 12 21m0 0-7.5-7.5M12 21V3" />
            </svg>
          )}
        </button>
      </th>
    )
  }

  return (
    <div className="overflow-x-auto rounded-2xl border border-gray-200 bg-white">
      <table className="w-full min-w-[900px] border-collapse text-sm">
        <thead className="border-b border-gray-200 bg-gray-50/80 text-[11px] uppercase tracking-wider">
          <tr>
            <th scope="col" className="w-10 px-3 py-2.5">
              <input
                type="checkbox"
                checked={allSelected}
                onChange={(e) => onToggleAll(e.target.checked)}
                aria-label="Alles selecteren"
                className="h-4 w-4 rounded border-gray-300 accent-gray-900"
              />
            </th>
            <SortableTh label="Lead" sortKey="name" />
            <SortableTh label="Fase" sortKey="stage" className="w-44" />
            <th scope="col" className="px-3 py-2.5 text-left font-semibold text-gray-500">
              Labels
            </th>
            <th scope="col" className="px-3 py-2.5 text-left font-semibold text-gray-500">
              Prio
            </th>
            <SortableTh label="Waarde" sortKey="value" className="w-28" />
            <SortableTh label="Volgende actie" sortKey="action" className="w-56" />
            <SortableTh label="Reactie" sortKey="recent" className="w-32" />
          </tr>
        </thead>
        <tbody className="divide-y divide-gray-100">
          {entries.map((entry) => {
            const stage = stageOf(entry)
            const priority = priorityOf(entry)
            const due = dueStateOf(entry, today)
            const value = valueOf(entry)
            const company = displayCompany(entry)
            const entryLabels = labelIdsOf(entry)
              .map((id) => labelsById.get(id))
              .filter((l): l is CrmLabel => l !== undefined)

            return (
              <tr
                key={entry.key}
                className={`transition hover:bg-gray-50 ${
                  selection.has(entry.key) ? 'bg-gray-50' : ''
                }`}
              >
                <td className="px-3 py-2.5">
                  <input
                    type="checkbox"
                    checked={selection.has(entry.key)}
                    onChange={() => onToggleSelect(entry.key)}
                    aria-label={`Selecteer ${displayName(entry)}`}
                    className="h-4 w-4 rounded border-gray-300 accent-gray-900"
                  />
                </td>
                <td className="px-3 py-2.5">
                  <button
                    type="button"
                    onClick={() => onOpen(entry.key)}
                    className="flex w-full items-center gap-2.5 text-left"
                  >
                    <span className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-gray-900 text-[11px] font-semibold text-white">
                      {initialsOf(entry)}
                    </span>
                    <span className="min-w-0">
                      <span className="flex items-center gap-1.5">
                        <span className="truncate font-medium text-gray-900">
                          {displayName(entry)}
                        </span>
                        {entry.hasReferral && (
                          <span
                            className="h-1.5 w-1.5 shrink-0 rounded-full bg-rose-500"
                            title="Doorverwijzing bekend"
                          />
                        )}
                      </span>
                      <span className="block truncate text-xs text-gray-500">
                        {company ? `${company} · ${entry.email}` : entry.email}
                      </span>
                    </span>
                  </button>
                </td>
                <td className="px-3 py-2.5">
                  <select
                    value={stage}
                    onChange={(e) =>
                      onStageChange(entry.key, stage, e.target.value as CrmStageId)
                    }
                    aria-label={`Fase van ${displayName(entry)}`}
                    className={`w-full rounded-lg border px-2 py-1 text-xs font-medium outline-none ${STAGE_META[stage].chip}`}
                  >
                    {CRM_STAGES.map((s) => (
                      <option key={s.id} value={s.id}>
                        {s.name}
                      </option>
                    ))}
                  </select>
                </td>
                <td className="px-3 py-2.5">
                  <div className="flex flex-wrap gap-1">
                    {entryLabels.length === 0 && (
                      <span className="text-xs text-gray-300">—</span>
                    )}
                    {entryLabels.slice(0, 2).map((label) => (
                      <span
                        key={label.id}
                        className="inline-flex items-center gap-1 rounded-full px-2 py-0.5 text-[10px] font-medium"
                        style={{ backgroundColor: `${label.color}1a`, color: label.color }}
                      >
                        <span
                          className="h-1.5 w-1.5 rounded-full"
                          style={{ backgroundColor: label.color }}
                        />
                        {label.name}
                      </span>
                    ))}
                    {entryLabels.length > 2 && (
                      <span className="rounded-full bg-gray-100 px-2 py-0.5 text-[10px] font-medium text-gray-600">
                        +{entryLabels.length - 2}
                      </span>
                    )}
                  </div>
                </td>
                <td className="px-3 py-2.5">
                  <span
                    className={`inline-flex items-center gap-1 rounded-full border px-2 py-0.5 text-[10px] font-medium ${PRIORITY_META[priority].chip}`}
                  >
                    <span className={`h-1.5 w-1.5 rounded-full ${PRIORITY_META[priority].dot}`} />
                    {PRIORITY_META[priority].name}
                  </span>
                </td>
                <td className="px-3 py-2.5 text-right tabular-nums">
                  {value > 0 ? (
                    <span className="font-semibold text-gray-900">{formatCurrency(value)}</span>
                  ) : (
                    <span className="text-gray-300">—</span>
                  )}
                </td>
                <td className="px-3 py-2.5">
                  {entry.record?.nextAction || entry.record?.nextActionAt ? (
                    <div className="min-w-0">
                      <p className="truncate text-xs text-gray-800">
                        {entry.record?.nextAction ?? 'Actie gepland'}
                      </p>
                      <p
                        className={`text-[11px] ${
                          due === 'overdue'
                            ? 'font-semibold text-rose-600'
                            : due === 'today'
                              ? 'font-semibold text-amber-600'
                              : 'text-gray-400'
                        }`}
                      >
                        {due === 'overdue' ? 'Te laat · ' : due === 'today' ? 'Vandaag · ' : ''}
                        {formatDate(entry.record?.nextActionAt ?? null)}
                      </p>
                    </div>
                  ) : (
                    <span className="text-xs text-gray-300">—</span>
                  )}
                </td>
                <td className="px-3 py-2.5 text-xs text-gray-500">
                  {formatDate(entry.receivedAt)}
                </td>
              </tr>
            )
          })}
        </tbody>
      </table>
      {entries.length === 0 && (
        <p className="px-4 py-10 text-center text-sm text-gray-500">
          Geen leads gevonden met deze filters.
        </p>
      )}
    </div>
  )
}
