'use client'

import { useMemo, useState, useTransition } from 'react'
import { bulkAddLabel, bulkSetStage, setStage as setStageAction } from '../_lib/actions'
import {
  CRM_PRIORITIES,
  CRM_STAGES,
  DEFAULT_PRIORITY,
  STAGE_META,
} from '../_lib/constants'
import type {
  CrmEntry,
  CrmLabel,
  CrmPriority,
  CrmRecord,
  CrmStageId,
} from '../_lib/types'
import {
  csvEscape,
  displayCompany,
  displayName,
  dueStateOf,
  labelIdsOf,
  matchesSearch,
  priorityOf,
  stageOf,
  todayInput,
  valueOf,
} from '../_lib/view'
import type { CrmConnectionSummary } from '../_lib/providers/types'
import { ConnectionsManager } from './connections-manager'
import { HubspotConnectModal } from './hubspot-connect-modal'
import { CrmBoard } from './crm-board'
import { CrmDetail } from './crm-detail'
import { CrmStats } from './crm-stats'
import { CrmTable, SORT_KEYS, sortLabelOf, type SortKey } from './crm-table'
import { ExportMenu } from './export-menu'
import { FeedbackButton } from './feedback-button'
import { LabelManager } from './label-manager'

type ViewMode = 'board' | 'table'

/** Tijdelijk record voor optimistische updates; wordt vervangen door de server. */
function placeholderRecord(leadKey: string, stage: CrmStageId): CrmRecord {
  const now = new Date().toISOString()
  return {
    id: `pending-${leadKey}`,
    leadKey,
    stage,
    priority: DEFAULT_PRIORITY,
    ownerName: null,
    contactName: null,
    companyName: null,
    jobTitle: null,
    phone: null,
    website: null,
    linkedinUrl: null,
    dealValue: null,
    expectedCloseDate: null,
    nextAction: null,
    nextActionAt: null,
    notes: null,
    labelIds: [],
    activities: [],
    createdAt: now,
    updatedAt: now,
  }
}

const selectClass =
  'rounded-lg border border-gray-300 bg-white px-2.5 py-1.5 text-xs font-medium text-gray-700 outline-none focus:border-gray-900'

export function CrmShell({
  initialEntries,
  initialLabels,
  initialConnections,
  showFeedback,
}: {
  initialEntries: CrmEntry[]
  initialLabels: CrmLabel[]
  initialConnections: CrmConnectionSummary[]
  /** Tijdelijke feedback/klacht-knop; server bepaalt of hij nog zichtbaar is. */
  showFeedback: boolean
}) {
  const [entries, setEntries] = useState<CrmEntry[]>(initialEntries)
  const [labels, setLabels] = useState<CrmLabel[]>(initialLabels)
  const [connections, setConnections] = useState<CrmConnectionSummary[]>(initialConnections)
  const [connectionsOpen, setConnectionsOpen] = useState(false)
  const [hubspotOpen, setHubspotOpen] = useState(false)
  const [view, setView] = useState<ViewMode>('board')
  const [search, setSearch] = useState('')
  const [stageFilter, setStageFilter] = useState<CrmStageId | 'alle'>('alle')
  const [priorityFilter, setPriorityFilter] = useState<CrmPriority | 'alle'>('alle')
  const [labelFilter, setLabelFilter] = useState<Set<string>>(new Set())
  const [onlyOpenActions, setOnlyOpenActions] = useState(false)
  const [sort, setSort] = useState<SortKey>('recent')
  const [selection, setSelection] = useState<Set<string>>(new Set())
  const [detailKey, setDetailKey] = useState<string | null>(null)
  const [labelManagerOpen, setLabelManagerOpen] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [, startTransition] = useTransition()

  const today = todayInput()

  const filtered = useMemo(() => {
    const list = entries.filter((entry) => {
      if (!matchesSearch(entry, search)) return false
      if (stageFilter !== 'alle' && stageOf(entry) !== stageFilter) return false
      if (priorityFilter !== 'alle' && priorityOf(entry) !== priorityFilter) return false
      if (labelFilter.size > 0) {
        const ids = labelIdsOf(entry)
        if (!ids.some((id) => labelFilter.has(id))) return false
      }
      if (onlyOpenActions) {
        const due = dueStateOf(entry, today)
        if (due !== 'overdue' && due !== 'today') return false
      }
      return true
    })

    const stageOrder = new Map(CRM_STAGES.map((s, i) => [s.id, i]))
    const sorted = [...list]
    sorted.sort((a, b) => {
      switch (sort) {
        case 'name':
          return displayName(a).localeCompare(displayName(b), 'nl')
        case 'value':
          return valueOf(b) - valueOf(a)
        case 'stage':
          return (stageOrder.get(stageOf(a)) ?? 0) - (stageOrder.get(stageOf(b)) ?? 0)
        case 'action': {
          const av = a.record?.nextActionAt ?? '9999-12-31'
          const bv = b.record?.nextActionAt ?? '9999-12-31'
          return av.localeCompare(bv)
        }
        case 'recent':
        default:
          return new Date(b.receivedAt).getTime() - new Date(a.receivedAt).getTime()
      }
    })
    return sorted
  }, [entries, search, stageFilter, priorityFilter, labelFilter, onlyOpenActions, sort, today])

  const labelUsage = useMemo(() => {
    const map = new Map<string, number>()
    for (const entry of entries) {
      for (const id of labelIdsOf(entry)) {
        map.set(id, (map.get(id) ?? 0) + 1)
      }
    }
    return map
  }, [entries])

  const detailEntry = detailKey
    ? (entries.find((e) => e.key === detailKey) ?? null)
    : null

  function applyRecord(leadKey: string, record: CrmRecord) {
    setEntries((prev) =>
      prev.map((e) => (e.key === leadKey ? { ...e, record } : e))
    )
  }

  function applyRecords(records: CrmRecord[]) {
    const byKey = new Map(records.map((r) => [r.leadKey, r]))
    setEntries((prev) =>
      prev.map((e) => {
        const record = byKey.get(e.key)
        return record ? { ...e, record } : e
      })
    )
  }

  function handleStageChange(key: string, from: CrmStageId, to: CrmStageId) {
    if (from === to) return
    setError(null)
    setEntries((prev) =>
      prev.map((e) =>
        e.key === key
          ? {
              ...e,
              record: e.record
                ? { ...e.record, stage: to }
                : placeholderRecord(key, to),
            }
          : e
      )
    )
    startTransition(async () => {
      const res = await setStageAction(key, to, from)
      if (!res.ok) {
        setError(res.error)
        setEntries((prev) =>
          prev.map((e) =>
            e.key === key
              ? {
                  ...e,
                  record: e.record?.id.startsWith('pending-')
                    ? null
                    : e.record
                      ? { ...e.record, stage: from }
                      : null,
                }
              : e
          )
        )
        return
      }
      applyRecord(key, res.value)
    })
  }

  function handleBulkStage(stage: CrmStageId) {
    const keys = [...selection]
    if (keys.length === 0) return
    setError(null)
    startTransition(async () => {
      const res = await bulkSetStage(keys, stage)
      if (!res.ok) {
        setError(res.error)
        return
      }
      applyRecords(res.value)
      setSelection(new Set())
    })
  }

  function handleBulkLabel(labelId: string) {
    const keys = [...selection]
    if (keys.length === 0) return
    setError(null)
    startTransition(async () => {
      const res = await bulkAddLabel(keys, labelId)
      if (!res.ok) {
        setError(res.error)
        return
      }
      applyRecords(res.value)
      setSelection(new Set())
    })
  }

  function toggleLabelFilter(labelId: string) {
    setLabelFilter((prev) => {
      const next = new Set(prev)
      if (next.has(labelId)) next.delete(labelId)
      else next.add(labelId)
      return next
    })
  }

  function exportCsv() {
    const labelsById = new Map(labels.map((l) => [l.id, l.name]))
    const header = [
      'Naam',
      'E-mail',
      'Bedrijf',
      'Functie',
      'Telefoon',
      'Fase',
      'Prioriteit',
      'Dealwaarde',
      'Verwachte sluitdatum',
      'Volgende actie',
      'Actiedatum',
      'Eigenaar',
      'Labels',
      'Laatste reactie',
      'Notities',
    ]
    const rows = filtered.map((entry) =>
      [
        displayName(entry),
        entry.email,
        displayCompany(entry) ?? '',
        entry.record?.jobTitle ?? '',
        entry.record?.phone ?? '',
        STAGE_META[stageOf(entry)].name,
        priorityOf(entry),
        entry.record?.dealValue !== null && entry.record?.dealValue !== undefined
          ? String(entry.record.dealValue)
          : '',
        entry.record?.expectedCloseDate ?? '',
        entry.record?.nextAction ?? '',
        entry.record?.nextActionAt ?? '',
        entry.record?.ownerName ?? '',
        labelIdsOf(entry)
          .map((id) => labelsById.get(id) ?? '')
          .filter(Boolean)
          .join(' | '),
        entry.receivedAt.slice(0, 10),
        (entry.record?.notes ?? '').replace(/\r?\n/g, ' '),
      ]
        .map((v) => csvEscape(String(v)))
        .join(';')
    )
    const csv = [header.join(';'), ...rows].join('\r\n')
    const blob = new Blob([`﻿${csv}`], { type: 'text/csv;charset=utf-8;' })
    const url = URL.createObjectURL(blob)
    const link = document.createElement('a')
    link.href = url
    link.download = `crm-export-${today}.csv`
    link.click()
    URL.revokeObjectURL(url)
  }

  const activeFilters =
    search.trim() !== '' ||
    stageFilter !== 'alle' ||
    priorityFilter !== 'alle' ||
    labelFilter.size > 0 ||
    onlyOpenActions

  return (
    <div className="space-y-5">
      <header className="flex flex-wrap items-start justify-between gap-3">
        <div>
          <h1 className="text-2xl font-semibold tracking-tight text-gray-900">CRM</h1>
          <p className="mt-1 text-sm text-gray-500">
            Al je leads uit de inbox, met eigen fases, labels en opvolging.
          </p>
        </div>
        <div className="flex items-center gap-2">
          {showFeedback && <FeedbackButton />}
          <button
            type="button"
            onClick={() => setHubspotOpen(true)}
            className="inline-flex items-center gap-1.5 rounded-lg bg-orange-600 px-3 py-2 text-sm font-medium text-white transition hover:bg-orange-700"
          >
            <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" strokeWidth={1.8} stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" d="M13.19 8.688a4.5 4.5 0 0 1 1.242 7.244l-4.5 4.5a4.5 4.5 0 0 1-6.364-6.364l1.757-1.757m13.35-.622 1.757-1.757a4.5 4.5 0 0 0-6.364-6.364l-4.5 4.5a4.5 4.5 0 0 0 1.242 7.244" />
            </svg>
            HubSpot verbinden
          </button>
          <button
            type="button"
            onClick={() => setLabelManagerOpen(true)}
            className="inline-flex items-center gap-1.5 rounded-lg border border-gray-300 bg-white px-3 py-2 text-sm font-medium text-gray-700 hover:border-gray-400"
          >
            <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" strokeWidth={1.8} stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" d="M9.568 3H5.25A2.25 2.25 0 0 0 3 5.25v4.318c0 .597.237 1.17.659 1.591l9.581 9.581c.699.699 1.78.872 2.607.33a18.095 18.095 0 0 0 5.223-5.223c.542-.827.369-1.908-.33-2.607L11.16 3.66A2.25 2.25 0 0 0 9.568 3Z" />
              <path strokeLinecap="round" strokeLinejoin="round" d="M6 6h.008v.008H6V6Z" />
            </svg>
            Labels
          </button>
          <ExportMenu
            connections={connections}
            leadKeys={filtered.map((e) => e.key)}
            onExportCsv={exportCsv}
            onManageConnections={() => setConnectionsOpen(true)}
            onShowHubspotVideo={() => setHubspotOpen(true)}
            onConnectionUpdated={(connection) =>
              setConnections((prev) =>
                prev.map((c) => (c.id === connection.id ? connection : c))
              )
            }
          />
        </div>
      </header>

      <CrmStats entries={entries} today={today} />

      {/* Toolbar */}
      <div className="space-y-3 rounded-2xl border border-gray-200 bg-white p-3">
        <div className="flex flex-wrap items-center gap-2">
          <div className="relative min-w-[220px] flex-1">
            <svg
              className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-gray-400"
              fill="none"
              viewBox="0 0 24 24"
              strokeWidth={1.8}
              stroke="currentColor"
            >
              <path strokeLinecap="round" strokeLinejoin="round" d="m21 21-5.197-5.197m0 0A7.5 7.5 0 1 0 5.196 5.196a7.5 7.5 0 0 0 10.607 10.607Z" />
            </svg>
            <input
              type="search"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder="Zoek op naam, bedrijf, e-mail, notitie…"
              className="w-full rounded-lg border border-gray-300 bg-white py-2 pl-9 pr-3 text-sm outline-none focus:border-gray-900"
            />
          </div>

          <div className="flex rounded-lg border border-gray-300 bg-white p-0.5">
            {(
              [
                ['board', 'Pipeline'],
                ['table', 'Tabel'],
              ] as const
            ).map(([id, label]) => (
              <button
                key={id}
                type="button"
                onClick={() => setView(id)}
                className={`rounded-md px-3 py-1.5 text-xs font-medium transition ${
                  view === id ? 'bg-gray-900 text-white' : 'text-gray-600 hover:text-gray-900'
                }`}
              >
                {label}
              </button>
            ))}
          </div>
        </div>

        <div className="flex flex-wrap items-center gap-2">
          <select
            value={stageFilter}
            onChange={(e) => setStageFilter(e.target.value as CrmStageId | 'alle')}
            className={selectClass}
            aria-label="Filter op fase"
          >
            <option value="alle">Alle fases</option>
            {CRM_STAGES.map((s) => (
              <option key={s.id} value={s.id}>
                {s.name}
              </option>
            ))}
          </select>

          <select
            value={priorityFilter}
            onChange={(e) => setPriorityFilter(e.target.value as CrmPriority | 'alle')}
            className={selectClass}
            aria-label="Filter op prioriteit"
          >
            <option value="alle">Alle prioriteiten</option>
            {CRM_PRIORITIES.map((p) => (
              <option key={p.id} value={p.id}>
                {p.name}
              </option>
            ))}
          </select>

          <select
            value={sort}
            onChange={(e) => setSort(e.target.value as SortKey)}
            className={selectClass}
            aria-label="Sorteren"
          >
            {SORT_KEYS.map((key) => (
              <option key={key} value={key}>
                Sorteer: {sortLabelOf(key)}
              </option>
            ))}
          </select>

          <button
            type="button"
            onClick={() => setOnlyOpenActions((v) => !v)}
            className={`rounded-lg border px-2.5 py-1.5 text-xs font-medium transition ${
              onlyOpenActions
                ? 'border-amber-300 bg-amber-50 text-amber-800'
                : 'border-gray-300 bg-white text-gray-600 hover:border-gray-400'
            }`}
          >
            Acties open
          </button>

          {labels.map((label) => {
            const active = labelFilter.has(label.id)
            return (
              <button
                key={label.id}
                type="button"
                onClick={() => toggleLabelFilter(label.id)}
                className={`inline-flex items-center gap-1.5 rounded-full border px-2.5 py-1 text-xs font-medium transition ${
                  active ? 'border-transparent' : 'border-gray-200 bg-white text-gray-600 hover:border-gray-300'
                }`}
                style={active ? { backgroundColor: `${label.color}1a`, color: label.color } : undefined}
              >
                <span className="h-2 w-2 rounded-full" style={{ backgroundColor: label.color }} />
                {label.name}
                <span className="text-[10px] opacity-60">{labelUsage.get(label.id) ?? 0}</span>
              </button>
            )
          })}

          {activeFilters && (
            <button
              type="button"
              onClick={() => {
                setSearch('')
                setStageFilter('alle')
                setPriorityFilter('alle')
                setLabelFilter(new Set())
                setOnlyOpenActions(false)
              }}
              className="text-xs font-medium text-gray-500 underline hover:text-gray-900"
            >
              Filters wissen
            </button>
          )}

          <span className="ml-auto text-xs text-gray-500">
            {filtered.length} van {entries.length} leads
          </span>
        </div>
      </div>

      {error && (
        <p className="rounded-lg bg-rose-50 px-3 py-2 text-sm text-rose-700">{error}</p>
      )}

      {/* Bulk-balk */}
      {view === 'table' && selection.size > 0 && (
        <div className="flex flex-wrap items-center gap-2 rounded-xl border border-gray-900/10 bg-gray-900 px-3 py-2 text-white">
          <span className="text-sm font-medium">{selection.size} geselecteerd</span>
          <select
            defaultValue=""
            onChange={(e) => {
              if (e.target.value) handleBulkStage(e.target.value as CrmStageId)
              e.target.value = ''
            }}
            className="rounded-lg border border-white/20 bg-white/10 px-2.5 py-1.5 text-xs font-medium text-white outline-none"
            aria-label="Fase toepassen op selectie"
          >
            <option value="" className="text-gray-900">
              Fase wijzigen…
            </option>
            {CRM_STAGES.map((s) => (
              <option key={s.id} value={s.id} className="text-gray-900">
                {s.name}
              </option>
            ))}
          </select>
          <select
            defaultValue=""
            onChange={(e) => {
              if (e.target.value) handleBulkLabel(e.target.value)
              e.target.value = ''
            }}
            disabled={labels.length === 0}
            className="rounded-lg border border-white/20 bg-white/10 px-2.5 py-1.5 text-xs font-medium text-white outline-none disabled:opacity-50"
            aria-label="Label toevoegen aan selectie"
          >
            <option value="" className="text-gray-900">
              Label toevoegen…
            </option>
            {labels.map((l) => (
              <option key={l.id} value={l.id} className="text-gray-900">
                {l.name}
              </option>
            ))}
          </select>
          <button
            type="button"
            onClick={() => setSelection(new Set())}
            className="ml-auto text-xs font-medium text-white/70 hover:text-white"
          >
            Selectie wissen
          </button>
        </div>
      )}

      {entries.length === 0 ? (
        <div className="rounded-2xl border border-dashed border-gray-200 bg-white px-6 py-16 text-center">
          <h2 className="text-base font-semibold text-gray-900">Nog geen leads</h2>
          <p className="mx-auto mt-1 max-w-md text-sm text-gray-500">
            Zodra er reacties binnenkomen op je campagne verschijnen ze hier automatisch,
            precies zoals op het leads- en inbox-tabblad.
          </p>
        </div>
      ) : view === 'board' ? (
        <CrmBoard
          entries={filtered}
          labels={labels}
          today={today}
          onOpen={setDetailKey}
          onStageChange={handleStageChange}
        />
      ) : (
        <CrmTable
          entries={filtered}
          labels={labels}
          today={today}
          selection={selection}
          sort={sort}
          onSortChange={setSort}
          onToggleSelect={(key) =>
            setSelection((prev) => {
              const next = new Set(prev)
              if (next.has(key)) next.delete(key)
              else next.add(key)
              return next
            })
          }
          onToggleAll={(checked) =>
            setSelection(checked ? new Set(filtered.map((e) => e.key)) : new Set())
          }
          onOpen={setDetailKey}
          onStageChange={handleStageChange}
        />
      )}

      {detailEntry && (
        <CrmDetail
          key={detailEntry.key}
          entry={detailEntry}
          labels={labels}
          onClose={() => setDetailKey(null)}
          onRecordChange={applyRecord}
          onRecordReset={(leadKey) =>
            setEntries((prev) =>
              prev.map((e) => (e.key === leadKey ? { ...e, record: null } : e))
            )
          }
          onStageChange={handleStageChange}
          onManageLabels={() => setLabelManagerOpen(true)}
        />
      )}

      {labelManagerOpen && (
        <LabelManager
          labels={labels}
          usageCount={labelUsage}
          onClose={() => setLabelManagerOpen(false)}
          onCreated={(label) => setLabels((prev) => [...prev, label].sort((a, b) => a.name.localeCompare(b.name, 'nl')))}
          onUpdated={(label) =>
            setLabels((prev) =>
              prev
                .map((l) => (l.id === label.id ? label : l))
                .sort((a, b) => a.name.localeCompare(b.name, 'nl'))
            )
          }
          onDeleted={(labelId) => {
            setLabels((prev) => prev.filter((l) => l.id !== labelId))
            setLabelFilter((prev) => {
              const next = new Set(prev)
              next.delete(labelId)
              return next
            })
            setEntries((prev) =>
              prev.map((e) =>
                e.record
                  ? {
                      ...e,
                      record: {
                        ...e.record,
                        labelIds: e.record.labelIds.filter((id) => id !== labelId),
                      },
                    }
                  : e
              )
            )
          }}
        />
      )}

      {hubspotOpen && (
        <HubspotConnectModal
          connection={connections.find((c) => c.provider === 'hubspot') ?? null}
          onClose={() => setHubspotOpen(false)}
          onSaved={(connection) =>
            setConnections((prev) => {
              const exists = prev.some((c) => c.id === connection.id)
              return exists
                ? prev.map((c) => (c.id === connection.id ? connection : c))
                : [...prev, connection]
            })
          }
          onDeleted={(connectionId) =>
            setConnections((prev) => prev.filter((c) => c.id !== connectionId))
          }
        />
      )}

      {connectionsOpen && (
        <ConnectionsManager
          connections={connections}
          onOpenHubspot={() => setHubspotOpen(true)}
          onClose={() => setConnectionsOpen(false)}
          onSaved={(connection) =>
            setConnections((prev) => {
              const exists = prev.some((c) => c.id === connection.id)
              return exists
                ? prev.map((c) => (c.id === connection.id ? connection : c))
                : [...prev, connection]
            })
          }
          onDeleted={(connectionId) =>
            setConnections((prev) => prev.filter((c) => c.id !== connectionId))
          }
        />
      )}
    </div>
  )
}
