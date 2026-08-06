'use client'

import { useState } from 'react'
import { CRM_STAGES, PRIORITY_META } from '../_lib/constants'
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

const DUE_CHIP: Record<string, string> = {
  overdue: 'bg-rose-50 text-rose-700 ring-rose-200',
  today: 'bg-amber-50 text-amber-700 ring-amber-200',
  upcoming: 'bg-gray-50 text-gray-600 ring-gray-200',
}

function Card({
  entry,
  labelsById,
  today,
  onOpen,
  onDragStart,
  dragging,
}: {
  entry: CrmEntry
  labelsById: Map<string, CrmLabel>
  today: string
  onOpen: () => void
  onDragStart: () => void
  dragging: boolean
}) {
  const company = displayCompany(entry)
  const value = valueOf(entry)
  const priority = priorityOf(entry)
  const due = dueStateOf(entry, today)
  const entryLabels = labelIdsOf(entry)
    .map((id) => labelsById.get(id))
    .filter((l): l is CrmLabel => l !== undefined)

  return (
    <article
      draggable
      onDragStart={(e) => {
        e.dataTransfer.effectAllowed = 'move'
        e.dataTransfer.setData('text/plain', entry.key)
        onDragStart()
      }}
      onClick={onOpen}
      className={`group cursor-pointer rounded-xl border border-gray-200 bg-white p-3 shadow-sm transition hover:border-gray-300 hover:shadow-md ${
        dragging ? 'opacity-40' : ''
      }`}
    >
      <div className="flex items-start gap-2.5">
        <span className="mt-0.5 flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-gray-900 text-[11px] font-semibold text-white">
          {initialsOf(entry)}
        </span>
        <div className="min-w-0 flex-1">
          <p className="truncate text-sm font-semibold text-gray-900">
            {displayName(entry)}
          </p>
          <p className="truncate text-xs text-gray-500">{company ?? entry.email}</p>
        </div>
        {priority !== 'normaal' && (
          <span
            className={`mt-1.5 h-2 w-2 shrink-0 rounded-full ${PRIORITY_META[priority].dot}`}
            title={`Prioriteit: ${PRIORITY_META[priority].name}`}
          />
        )}
      </div>

      {entryLabels.length > 0 && (
        <div className="mt-2.5 flex flex-wrap gap-1">
          {entryLabels.slice(0, 3).map((label) => (
            <span
              key={label.id}
              className="inline-flex items-center gap-1 rounded-full px-2 py-0.5 text-[10px] font-medium"
              style={{ backgroundColor: `${label.color}1a`, color: label.color }}
            >
              <span className="h-1.5 w-1.5 rounded-full" style={{ backgroundColor: label.color }} />
              {label.name}
            </span>
          ))}
          {entryLabels.length > 3 && (
            <span className="rounded-full bg-gray-100 px-2 py-0.5 text-[10px] font-medium text-gray-600">
              +{entryLabels.length - 3}
            </span>
          )}
        </div>
      )}

      <div className="mt-2.5 flex items-center justify-between gap-2">
        <span className="text-xs font-semibold tabular-nums text-gray-900">
          {value > 0 ? formatCurrency(value) : <span className="text-gray-300">—</span>}
        </span>
        {due !== 'none' && (
          <span
            className={`inline-flex items-center gap-1 rounded-full px-1.5 py-0.5 text-[10px] font-medium ring-1 ${DUE_CHIP[due]}`}
            title={entry.record?.nextAction ?? 'Volgende actie'}
          >
            <svg className="h-2.5 w-2.5" fill="none" viewBox="0 0 24 24" strokeWidth={2.4} stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" d="M12 6v6h4.5m4.5 0a9 9 0 1 1-18 0 9 9 0 0 1 18 0Z" />
            </svg>
            {formatDate(entry.record?.nextActionAt ?? null)}
          </span>
        )}
      </div>
    </article>
  )
}

export function CrmBoard({
  entries,
  labels,
  today,
  onOpen,
  onStageChange,
}: {
  entries: CrmEntry[]
  labels: CrmLabel[]
  today: string
  onOpen: (key: string) => void
  onStageChange: (key: string, from: CrmStageId, to: CrmStageId) => void
}) {
  const [draggingKey, setDraggingKey] = useState<string | null>(null)
  const [hoverStage, setHoverStage] = useState<CrmStageId | null>(null)

  const labelsById = new Map(labels.map((l) => [l.id, l]))
  const byStage = new Map<CrmStageId, CrmEntry[]>(
    CRM_STAGES.map((s) => [s.id, [] as CrmEntry[]])
  )
  for (const entry of entries) {
    byStage.get(stageOf(entry))?.push(entry)
  }

  function handleDrop(stage: CrmStageId) {
    setHoverStage(null)
    const key = draggingKey
    setDraggingKey(null)
    if (!key) return
    const entry = entries.find((e) => e.key === key)
    if (!entry) return
    const from = stageOf(entry)
    if (from === stage) return
    onStageChange(key, from, stage)
  }

  return (
    <div className="-mx-1 flex gap-3 overflow-x-auto px-1 pb-4">
      {CRM_STAGES.map((stage) => {
        const items = byStage.get(stage.id) ?? []
        const total = items.reduce((sum, e) => sum + valueOf(e), 0)
        const isHover = hoverStage === stage.id
        return (
          <section
            key={stage.id}
            onDragOver={(e) => {
              e.preventDefault()
              e.dataTransfer.dropEffect = 'move'
              if (hoverStage !== stage.id) setHoverStage(stage.id)
            }}
            onDragLeave={() => setHoverStage((s) => (s === stage.id ? null : s))}
            onDrop={(e) => {
              e.preventDefault()
              handleDrop(stage.id)
            }}
            className={`flex w-[264px] shrink-0 flex-col rounded-2xl border transition ${
              isHover
                ? 'border-gray-900/30 bg-gray-100'
                : 'border-gray-200 bg-gray-50/70'
            }`}
          >
            <header className="flex items-center gap-2 border-b border-gray-200/70 px-3 py-2.5">
              <span className={`h-2 w-2 rounded-full ${stage.dot}`} aria-hidden />
              <h3 className="flex-1 truncate text-sm font-semibold text-gray-900">
                {stage.name}
              </h3>
              <span className="rounded-full bg-white px-1.5 py-0.5 text-[11px] font-semibold tabular-nums text-gray-600 ring-1 ring-gray-200">
                {items.length}
              </span>
            </header>
            {total > 0 && (
              <p className="px-3 pt-2 text-[11px] font-medium tabular-nums text-gray-500">
                {formatCurrency(total)}
              </p>
            )}
            <div className="flex-1 space-y-2 overflow-y-auto p-2.5">
              {items.length === 0 ? (
                <p className="rounded-xl border border-dashed border-gray-200 px-3 py-6 text-center text-[11px] text-gray-400">
                  Sleep hier een lead naartoe
                </p>
              ) : (
                items.map((entry) => (
                  <Card
                    key={entry.key}
                    entry={entry}
                    labelsById={labelsById}
                    today={today}
                    dragging={draggingKey === entry.key}
                    onDragStart={() => setDraggingKey(entry.key)}
                    onOpen={() => onOpen(entry.key)}
                  />
                ))
              )}
            </div>
          </section>
        )
      })}
    </div>
  )
}
