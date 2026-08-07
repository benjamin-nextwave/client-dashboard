'use client'

import { useState } from 'react'
import { CRM_STAGES, PRIORITY_META } from '../_lib/constants'
import type { CrmEntry, CrmLabel, CrmStageId } from '../_lib/types'
import {
  displayCompany,
  displayName,
  dueStateOf,
  formatDate,
  labelIdsOf,
  priorityOf,
  stageOf,
} from '../_lib/view'

/** Welk paneel het kaartmenu toont. */
type MenuView = 'root' | 'stage' | 'label'

const DUE_COLOR: Record<string, string> = {
  overdue: 'var(--color-neg)',
  today: 'var(--color-warn)',
  upcoming: 'var(--color-faint)',
}

const menuItemClass =
  'block w-full rounded-md px-2.5 py-[7px] text-left text-xs text-fg transition-colors hover:bg-[var(--brand-08)]'

function Card({
  entry,
  labels,
  labelsById,
  today,
  selected,
  menuView,
  onToggleSelect,
  onMenuOpen,
  onMenuClose,
  onOpen,
  onDelete,
  onStage,
  onAddLabel,
  onDragStart,
  dragging,
}: {
  entry: CrmEntry
  labels: CrmLabel[]
  labelsById: Map<string, CrmLabel>
  today: string
  selected: boolean
  menuView: MenuView | null
  onToggleSelect: () => void
  onMenuOpen: (view: MenuView) => void
  onMenuClose: () => void
  onOpen: () => void
  onDelete: () => void
  onStage: (to: CrmStageId) => void
  onAddLabel: (labelId: string) => void
  onDragStart: () => void
  dragging: boolean
}) {
  const company = displayCompany(entry)
  const stage = stageOf(entry)
  const priority = priorityOf(entry)
  const due = dueStateOf(entry, today)
  const dueColor = DUE_COLOR[due] ?? 'var(--color-faint)'
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
      className={`group relative cursor-grab rounded-[10px] border px-[11px] py-2.5 transition-colors ${
        selected
          ? 'border-[color-mix(in_oklab,var(--color-brand)_45%,var(--color-line))] bg-[var(--brand-06)]'
          : 'border-line bg-panel hover:border-[color-mix(in_oklab,var(--color-brand)_25%,var(--color-line))]'
      } ${dragging ? 'opacity-40' : ''}`}
    >
      <div className="flex items-start gap-2">
        {/* Verschijnt bij hover en blijft staan zodra de kaart geselecteerd is. */}
        <button
          type="button"
          onClick={(e) => {
            e.stopPropagation()
            onToggleSelect()
          }}
          aria-label={`Selecteer ${displayName(entry)}`}
          aria-pressed={selected}
          className={`mt-0.5 flex h-3.5 w-3.5 shrink-0 items-center justify-center rounded border transition-colors ${
            selected
              ? 'border-brand bg-brand'
              : 'border-line opacity-0 group-hover:opacity-100'
          }`}
        >
          {selected && (
            <svg
              viewBox="0 0 24 24"
              fill="none"
              stroke="#fff"
              strokeWidth={3.6}
              strokeLinecap="round"
              strokeLinejoin="round"
              className="h-[9px] w-[9px]"
            >
              <path d="m4.5 12.75 6 6 9-13.5" />
            </svg>
          )}
        </button>

        <div className="min-w-0 flex-1">
          <div className="flex items-center gap-1.5">
            <span className="truncate text-[12.5px] font-semibold tracking-[-0.01em] text-fg">
              {displayName(entry)}
            </span>
            {entry.hasReferral && (
              <span
                className="h-1.5 w-1.5 shrink-0 rounded-full bg-neg"
                title="Doorverwijzing bekend"
              />
            )}
          </div>
          <div className="mt-0.5 truncate text-[11px] text-faint">
            {company ?? entry.email}
          </div>
        </div>

        {priority === 'hoog' && (
          <span
            className="mt-1 h-1.5 w-1.5 shrink-0 rounded-full"
            style={{ background: PRIORITY_META.hoog.color }}
            title="Prioriteit hoog"
          />
        )}

        <button
          type="button"
          onClick={(e) => {
            e.stopPropagation()
            if (menuView) onMenuClose()
            else onMenuOpen('root')
          }}
          aria-label="Meer acties"
          aria-expanded={menuView !== null}
          className="-mt-px flex h-[18px] w-[18px] shrink-0 items-center justify-center text-faint opacity-0 transition-opacity group-hover:opacity-100 aria-expanded:opacity-100"
        >
          <svg viewBox="0 0 24 24" fill="currentColor" className="h-[13px] w-[13px]">
            <circle cx="12" cy="5" r="1.6" />
            <circle cx="12" cy="12" r="1.6" />
            <circle cx="12" cy="19" r="1.6" />
          </svg>
        </button>
      </div>

      {menuView && (
        <>
          {/* Vangt de klik ernaast op — anders blijft het menu open staan. */}
          <button
            type="button"
            aria-label="Menu sluiten"
            onClick={(e) => {
              e.stopPropagation()
              onMenuClose()
            }}
            className="fixed inset-0 z-10 cursor-default"
          />
          {/* Verankerd aan de kaart, niet op een vaste breedte: een breder menu
              zou door de scrollende kolom worden weggeknipt. */}
          <div
            onClick={(e) => e.stopPropagation()}
            className="absolute inset-x-1.5 top-8 z-[15] max-h-56 overflow-y-auto rounded-[9px] border border-line bg-panel p-1 shadow-[0_12px_28px_-12px_rgba(0,0,0,0.32)]"
          >
            {menuView === 'root' && (
              <>
                <button type="button" onClick={onOpen} className={menuItemClass}>
                  Openen
                </button>
                <button
                  type="button"
                  onClick={() => onMenuOpen('stage')}
                  className={menuItemClass}
                >
                  Fase wijzigen…
                </button>
                <button
                  type="button"
                  onClick={() => onMenuOpen('label')}
                  disabled={labels.length === 0}
                  className={`${menuItemClass} disabled:opacity-40`}
                >
                  Label toevoegen…
                </button>
                <button
                  type="button"
                  onClick={onDelete}
                  className="mt-1 block w-full border-t border-line px-2.5 pb-[7px] pt-2 text-left text-xs font-semibold text-neg transition-colors hover:bg-[color-mix(in_oklab,var(--color-neg)_8%,transparent)]"
                >
                  Verwijderen
                </button>
              </>
            )}

            {menuView === 'stage' &&
              CRM_STAGES.map((s) => (
                <button
                  key={s.id}
                  type="button"
                  onClick={() => onStage(s.id)}
                  className={`flex w-full items-center gap-2 rounded-md px-2.5 py-[7px] text-left text-xs transition-colors hover:bg-[var(--brand-08)] ${
                    s.id === stage ? 'font-semibold text-fg' : 'text-muted'
                  }`}
                >
                  <span
                    className="h-[6px] w-[6px] shrink-0 rounded-full"
                    style={{ background: s.color }}
                  />
                  <span className="truncate">{s.name}</span>
                </button>
              ))}

            {menuView === 'label' &&
              labels.map((l) => (
                <button
                  key={l.id}
                  type="button"
                  onClick={() => onAddLabel(l.id)}
                  className="flex w-full items-center gap-2 rounded-md px-2.5 py-[7px] text-left text-xs text-muted transition-colors hover:bg-[var(--brand-08)]"
                >
                  <span
                    className="h-[6px] w-[6px] shrink-0 rounded-full"
                    style={{ background: l.color }}
                  />
                  <span className="truncate">{l.name}</span>
                </button>
              ))}
          </div>
        </>
      )}

      {entryLabels.length > 0 && (
        <div className="mt-2 flex flex-wrap gap-1.5">
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
      )}

      {due !== 'none' && (
        <div
          className="mt-2 flex items-center gap-1.5 rounded-md px-[7px] py-1 text-[10.5px] font-medium"
          style={{
            color: dueColor,
            background: `color-mix(in oklab, ${dueColor} 10%, transparent)`,
          }}
        >
          <svg
            viewBox="0 0 24 24"
            fill="none"
            stroke="currentColor"
            strokeWidth={2.2}
            strokeLinecap="round"
            strokeLinejoin="round"
            className="h-[11px] w-[11px] shrink-0"
          >
            <path d="M12 6v6h4.5m4.5 0a9 9 0 1 1-18 0 9 9 0 0 1 18 0Z" />
          </svg>
          <span className="flex-1 truncate">
            {entry.record?.nextAction ?? 'Actie gepland'}
          </span>
          <span className="shrink-0 tabular-nums">
            {formatDate(entry.record?.nextActionAt ?? null)}
          </span>
        </div>
      )}
    </article>
  )
}

export function CrmBoard({
  entries,
  labels,
  today,
  selection,
  onToggleSelect,
  onOpen,
  onDelete,
  onAddLabel,
  onStageChange,
}: {
  entries: CrmEntry[]
  labels: CrmLabel[]
  today: string
  selection: Set<string>
  onToggleSelect: (key: string) => void
  onOpen: (key: string) => void
  onDelete: (keys: string[]) => void
  onAddLabel: (key: string, labelId: string) => void
  onStageChange: (key: string, from: CrmStageId, to: CrmStageId) => void
}) {
  const [draggingKey, setDraggingKey] = useState<string | null>(null)
  const [hoverStage, setHoverStage] = useState<CrmStageId | null>(null)
  const [menu, setMenu] = useState<{ key: string; view: MenuView } | null>(null)

  const labelsById = new Map(labels.map((l) => [l.id, l]))
  const byStage = new Map<CrmStageId, CrmEntry[]>(
    CRM_STAGES.map((s) => [s.id, [] as CrmEntry[]])
  )
  for (const entry of entries) byStage.get(stageOf(entry))?.push(entry)

  // Het verhoudingsstreepje in de kolomkop schaalt op de grootste kolom.
  const maxCount = Math.max(1, ...CRM_STAGES.map((s) => byStage.get(s.id)?.length ?? 0))

  function handleDrop(stage: CrmStageId) {
    setHoverStage(null)
    const key = draggingKey
    setDraggingKey(null)
    if (!key) return
    const entry = entries.find((e) => e.key === key)
    if (!entry) return
    const from = stageOf(entry)
    if (from !== stage) onStageChange(key, from, stage)
  }

  return (
    <div className="flex gap-3 overflow-x-auto pb-1">
      {CRM_STAGES.map((stage) => {
        const items = byStage.get(stage.id) ?? []
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
            className={`flex max-h-[calc(100vh-320px)] min-h-[220px] w-[222px] shrink-0 flex-col rounded-panel border bg-panel transition-colors ${
              isHover ? 'border-brand' : 'border-line'
            }`}
          >
            <header className="shrink-0 border-b border-line px-3.5 pb-[11px] pt-3">
              <div className="flex items-center gap-[9px]">
                <span
                  className="h-[7px] w-[7px] shrink-0 rounded-full"
                  style={{ background: stage.color }}
                  aria-hidden
                />
                <h3
                  className="min-w-0 flex-1 truncate text-[12.5px] font-semibold tracking-[-0.01em] text-fg"
                  title={stage.description}
                >
                  {stage.name}
                </h3>
                <span className="shrink-0 rounded-full bg-track px-[7px] py-0.5 text-[11px] font-semibold tabular-nums text-muted">
                  {items.length}
                </span>
              </div>
              <div className="mt-[9px] h-0.5 overflow-hidden rounded-sm bg-track">
                <div
                  className="h-full rounded-sm opacity-55"
                  style={{
                    width: `${(items.length / maxCount) * 100}%`,
                    background: stage.color,
                  }}
                />
              </div>
            </header>

            <div className="flex min-h-0 flex-1 flex-col gap-[9px] overflow-y-auto p-2.5">
              {items.length === 0 ? (
                <p className="rounded-[10px] border border-dashed border-line px-3 py-5 text-center text-[11px] text-faint">
                  Sleep hier een lead naartoe
                </p>
              ) : (
                items.map((entry) => (
                  <Card
                    key={entry.key}
                    entry={entry}
                    labels={labels}
                    labelsById={labelsById}
                    today={today}
                    selected={selection.has(entry.key)}
                    menuView={menu?.key === entry.key ? menu.view : null}
                    onToggleSelect={() => onToggleSelect(entry.key)}
                    onMenuOpen={(view) => setMenu({ key: entry.key, view })}
                    onMenuClose={() => setMenu(null)}
                    onOpen={() => onOpen(entry.key)}
                    onDelete={() => {
                      setMenu(null)
                      onDelete([entry.key])
                    }}
                    onStage={(to) => {
                      setMenu(null)
                      const from = stageOf(entry)
                      if (from !== to) onStageChange(entry.key, from, to)
                    }}
                    onAddLabel={(labelId) => {
                      setMenu(null)
                      onAddLabel(entry.key, labelId)
                    }}
                    dragging={draggingKey === entry.key}
                    onDragStart={() => setDraggingKey(entry.key)}
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
