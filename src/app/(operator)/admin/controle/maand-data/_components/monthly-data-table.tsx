'use client'

import { useEffect, useMemo, useRef, useState, useTransition } from 'react'
import { useRouter } from 'next/navigation'
import type { ClientListItem } from '@/lib/data/admin-stats'
import type { ClientMonthlyData, MonthlyPause } from '@/lib/data/controle'
import { upsertClientMonthlyData } from '../../actions'

interface Row {
  client: ClientListItem
  data: ClientMonthlyData | null
}

interface DraftPause {
  id: string
  days: number
  note: string
  addedAt: string
}

interface RowDraft {
  /** Aantal mailboxen — input. Contacts-to-approach wordt afgeleid. */
  inboxes: string
  startDate: string
  endDate: string
  contractBasis: string
  pauses: DraftPause[]
  dirty: boolean
  saving: boolean
  savedAt: number | null
  error: string | null
}

interface MonthlyDataTableProps {
  rows: Row[]
  year: number
  month: number
}

const MONTHS_NL = [
  'januari', 'februari', 'maart', 'april', 'mei', 'juni',
  'juli', 'augustus', 'september', 'oktober', 'november', 'december',
]

/** Live-derived contacten te benaderen voor het inbox-input-veld.
 *  Formule: mailboxen × 8 × 5. */
function derivedContacts(inboxesStr: string): number | null {
  const trimmed = inboxesStr.trim()
  if (trimmed.length === 0) return null
  const n = Number(trimmed)
  if (!Number.isFinite(n) || n < 0) return null
  return Math.floor(n) * 8 * 5
}

function totalPauseDays(pauses: DraftPause[]): number {
  let sum = 0
  for (const p of pauses) {
    if (Number.isFinite(p.days) && p.days > 0) sum += Math.floor(p.days)
  }
  return sum
}

function addDays(isoDate: string, days: number): string {
  const d = new Date(isoDate + 'T00:00:00Z')
  if (Number.isNaN(d.getTime())) return isoDate
  d.setUTCDate(d.getUTCDate() + days)
  return d.toISOString().slice(0, 10)
}

function formatDateNL(isoDate: string): string {
  const d = new Date(isoDate + 'T00:00:00Z')
  if (Number.isNaN(d.getTime())) return isoDate
  return d.toLocaleDateString('nl-NL', {
    day: 'numeric',
    month: 'long',
    year: 'numeric',
    timeZone: 'UTC',
  })
}

function newPauseId(): string {
  if (typeof crypto !== 'undefined' && typeof crypto.randomUUID === 'function') {
    return crypto.randomUUID()
  }
  return `${Date.now().toString(36)}-${Math.random().toString(36).slice(2)}`
}

export function MonthlyDataTable({ rows, year, month }: MonthlyDataTableProps) {
  const router = useRouter()
  const [search, setSearch] = useState('')
  const [drafts, setDrafts] = useState<Record<string, RowDraft>>(() => {
    const initial: Record<string, RowDraft> = {}
    for (const r of rows) {
      initial[r.client.id] = toDraft(r.data)
    }
    return initial
  })
  const [, startTransition] = useTransition()

  const filtered = useMemo(() => {
    if (!search.trim()) return rows
    const q = search.toLowerCase()
    return rows.filter((r) => r.client.companyName.toLowerCase().includes(q))
  }, [rows, search])

  const updateField = (clientId: string, patch: Partial<RowDraft>) => {
    setDrafts((prev) => ({
      ...prev,
      [clientId]: { ...prev[clientId], ...patch, dirty: true, error: null, savedAt: null },
    }))
  }

  const saveRow = (clientId: string) => {
    const draft = drafts[clientId]
    if (!draft) return
    setDrafts((prev) => ({
      ...prev,
      [clientId]: { ...prev[clientId], saving: true, error: null },
    }))

    startTransition(async () => {
      const inboxesTrim = draft.inboxes.trim()
      const inboxesNum = inboxesTrim.length === 0 ? null : Number(inboxesTrim)
      if (inboxesTrim.length > 0 && (!Number.isFinite(inboxesNum) || inboxesNum! < 0 || !Number.isInteger(inboxesNum!))) {
        setDrafts((prev) => ({
          ...prev,
          [clientId]: { ...prev[clientId], saving: false, error: 'Geef een geheel aantal mailboxen op.' },
        }))
        return
      }

      const pausesPayload = draft.pauses
        .filter((p) => Number.isFinite(p.days) && p.days > 0)
        .map((p) => ({
          id: p.id,
          days: Math.floor(p.days),
          note: p.note.trim().length > 0 ? p.note.trim() : null,
          addedAt: p.addedAt,
        }))

      const result = await upsertClientMonthlyData({
        clientId,
        year,
        month,
        inboxes: inboxesNum,
        startDate: draft.startDate || null,
        endDate: draft.endDate || null,
        contractBasis: draft.contractBasis.trim() || null,
        pauses: pausesPayload,
      })

      if (result.error) {
        setDrafts((prev) => ({
          ...prev,
          [clientId]: { ...prev[clientId], saving: false, error: result.error ?? null },
        }))
        return
      }

      setDrafts((prev) => ({
        ...prev,
        [clientId]: { ...prev[clientId], saving: false, dirty: false, savedAt: Date.now() },
      }))
      router.refresh()
    })
  }

  const goToMonth = (deltaMonths: number) => {
    let nextMonth = month + deltaMonths
    let nextYear = year
    while (nextMonth < 1) {
      nextMonth += 12
      nextYear -= 1
    }
    while (nextMonth > 12) {
      nextMonth -= 12
      nextYear += 1
    }
    router.push(`/admin/controle/maand-data?year=${nextYear}&month=${nextMonth}`)
  }

  return (
    <div className="space-y-4">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div className="flex items-center gap-2">
          <button
            type="button"
            onClick={() => goToMonth(-1)}
            className="inline-flex h-9 w-9 items-center justify-center rounded-lg border border-gray-200 bg-white text-gray-600 transition-colors hover:bg-gray-50"
            aria-label="Vorige maand"
          >
            <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" strokeWidth={2.5} stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" d="M15.75 19.5 8.25 12l7.5-7.5" />
            </svg>
          </button>
          <div className="rounded-lg border border-gray-200 bg-white px-3 py-1.5 text-sm font-semibold text-gray-900">
            {MONTHS_NL[month - 1]} {year}
          </div>
          <button
            type="button"
            onClick={() => goToMonth(1)}
            className="inline-flex h-9 w-9 items-center justify-center rounded-lg border border-gray-200 bg-white text-gray-600 transition-colors hover:bg-gray-50"
            aria-label="Volgende maand"
          >
            <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" strokeWidth={2.5} stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" d="m8.25 4.5 7.5 7.5-7.5 7.5" />
            </svg>
          </button>
        </div>

        <div className="relative max-w-md flex-1">
          <svg
            className="pointer-events-none absolute left-4 top-1/2 h-4 w-4 -translate-y-1/2 text-gray-400"
            fill="none"
            viewBox="0 0 24 24"
            strokeWidth={2}
            stroke="currentColor"
          >
            <path strokeLinecap="round" strokeLinejoin="round" d="m21 21-5.197-5.197m0 0A7.5 7.5 0 1 0 5.196 5.196a7.5 7.5 0 0 0 10.607 10.607Z" />
          </svg>
          <input
            type="text"
            placeholder="Zoek een klant..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="w-full rounded-xl border border-gray-200 bg-white py-2.5 pl-11 pr-4 text-sm text-gray-900 placeholder:text-gray-400 shadow-sm transition-all focus:border-indigo-400 focus:outline-none focus:ring-4 focus:ring-indigo-100"
          />
        </div>
      </div>

      <div className="rounded-2xl border border-gray-200 bg-white shadow-sm">
        <table className="min-w-full divide-y divide-gray-100">
          <thead className="bg-gray-50">
            <tr>
              <th className="px-4 py-3 text-left text-[11px] font-semibold uppercase tracking-wide text-gray-500">Klant</th>
              <th className="px-4 py-3 text-left text-[11px] font-semibold uppercase tracking-wide text-gray-500">
                Hoeveel mailboxen hebben ze
              </th>
              <th className="px-4 py-3 text-left text-[11px] font-semibold uppercase tracking-wide text-gray-500">
                Contacten te benaderen
                <span className="ml-1 text-[10px] font-normal normal-case tracking-normal text-gray-400">
                  (× 8 × 5)
                </span>
              </th>
              <th className="px-4 py-3 text-left text-[11px] font-semibold uppercase tracking-wide text-gray-500">Startdatum</th>
              <th className="px-4 py-3 text-left text-[11px] font-semibold uppercase tracking-wide text-gray-500">Einddatum</th>
              <th className="px-4 py-3 text-left text-[11px] font-semibold uppercase tracking-wide text-gray-500">Klantcontract</th>
              <th className="px-4 py-3 text-right text-[11px] font-semibold uppercase tracking-wide text-gray-500">Status</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-gray-100">
            {filtered.length === 0 ? (
              <tr>
                <td colSpan={7} className="px-4 py-12 text-center text-sm text-gray-400">
                  Geen klanten gevonden.
                </td>
              </tr>
            ) : (
              filtered.map((row) => (
                <MonthlyDataRow
                  key={row.client.id}
                  row={row}
                  draft={drafts[row.client.id]}
                  onChange={(patch) => updateField(row.client.id, patch)}
                  onSave={() => saveRow(row.client.id)}
                />
              ))
            )}
          </tbody>
        </table>
      </div>
    </div>
  )
}

function MonthlyDataRow({
  row,
  draft,
  onChange,
  onSave,
}: {
  row: Row
  draft: RowDraft | undefined
  onChange: (patch: Partial<RowDraft>) => void
  onSave: () => void
}) {
  if (!draft) return null
  const accent = row.client.primaryColor ?? '#6366f1'
  const derived = derivedContacts(draft.inboxes)

  return (
    <tr className="hover:bg-gray-50/40">
      <td className="px-4 py-3">
        <div className="flex items-center gap-2.5">
          <span
            className="inline-block h-2 w-2 rounded-full"
            style={{ background: accent }}
            aria-hidden
          />
          <span className="text-sm font-semibold text-gray-900">{row.client.companyName}</span>
        </div>
      </td>
      <td className="px-4 py-3">
        <input
          type="number"
          inputMode="numeric"
          step={1}
          min={0}
          value={draft.inboxes}
          onChange={(e) => onChange({ inboxes: e.target.value })}
          placeholder="bv. 6"
          className="w-24 rounded-md border border-gray-200 bg-white px-2 py-1.5 text-sm text-gray-900 transition-all focus:border-indigo-400 focus:outline-none focus:ring-2 focus:ring-indigo-100"
        />
      </td>
      <td className="px-4 py-3">
        <span
          className={`inline-flex items-center rounded-md px-2 py-1 text-sm font-semibold ${
            derived === null
              ? 'bg-gray-50 text-gray-400'
              : 'bg-violet-50 text-violet-700 ring-1 ring-violet-100'
          }`}
        >
          {derived === null ? '—' : derived}
        </span>
      </td>
      <td className="px-4 py-3">
        <input
          type="date"
          value={draft.startDate}
          onChange={(e) => onChange({ startDate: e.target.value })}
          className="rounded-md border border-gray-200 bg-white px-2 py-1.5 text-sm text-gray-900 transition-all focus:border-indigo-400 focus:outline-none focus:ring-2 focus:ring-indigo-100"
        />
      </td>
      <td className="px-4 py-3">
        <EndDateCell
          endDate={draft.endDate}
          pauses={draft.pauses}
          onChangeEndDate={(value) => onChange({ endDate: value })}
          onChangePauses={(pauses) => onChange({ pauses })}
        />
      </td>
      <td className="px-4 py-3">
        <input
          type="text"
          value={draft.contractBasis}
          onChange={(e) => onChange({ contractBasis: e.target.value })}
          placeholder="bv. lead basis"
          className="w-44 rounded-md border border-gray-200 bg-white px-2 py-1.5 text-sm text-gray-900 placeholder:text-gray-400 transition-all focus:border-indigo-400 focus:outline-none focus:ring-2 focus:ring-indigo-100"
        />
      </td>
      <td className="px-4 py-3 text-right">
        <div className="flex flex-wrap items-center justify-end gap-2">
          {draft.error && (
            <span className="text-[11px] text-rose-600">{draft.error}</span>
          )}
          {!draft.dirty && draft.savedAt && (
            <span className="inline-flex items-center gap-1 text-[11px] font-semibold text-emerald-600">
              <svg className="h-3 w-3" fill="none" viewBox="0 0 24 24" strokeWidth={3} stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" d="m4.5 12.75 6 6 9-13.5" />
              </svg>
              Opgeslagen
            </span>
          )}
          <button
            type="button"
            onClick={onSave}
            disabled={!draft.dirty || draft.saving}
            className="inline-flex items-center gap-1.5 rounded-md bg-indigo-600 px-3 py-1.5 text-[11px] font-semibold text-white shadow-sm transition-all hover:bg-indigo-700 disabled:cursor-not-allowed disabled:opacity-40"
          >
            {draft.saving ? 'Opslaan...' : 'Opslaan'}
          </button>
        </div>
      </td>
    </tr>
  )
}

function toDraft(data: ClientMonthlyData | null): RowDraft {
  // Voor bestaande rijen: prefereer 'inboxes'. Valt die om wat voor reden
  // weg, dan herleiden we uit contacts_to_approach (gelijk aan de migratie
  // backfill — voor data van vóór deze release).
  const inboxes =
    data?.inboxes !== null && data?.inboxes !== undefined
      ? data.inboxes
      : data?.contactsToApproach !== null && data?.contactsToApproach !== undefined
        ? Math.floor(data.contactsToApproach / 8)
        : null

  return {
    inboxes: inboxes !== null ? String(inboxes) : '',
    startDate: data?.startDate ?? '',
    endDate: data?.endDate ?? '',
    contractBasis: data?.contractBasis ?? '',
    pauses: (data?.pauses ?? []).map(toDraftPause),
    dirty: false,
    saving: false,
    savedAt: null,
    error: null,
  }
}

function toDraftPause(p: MonthlyPause): DraftPause {
  return {
    id: p.id,
    days: p.days,
    note: p.note ?? '',
    addedAt: p.addedAt,
  }
}

interface EndDateCellProps {
  endDate: string
  pauses: DraftPause[]
  onChangeEndDate: (value: string) => void
  onChangePauses: (pauses: DraftPause[]) => void
}

function EndDateCell({ endDate, pauses, onChangeEndDate, onChangePauses }: EndDateCellProps) {
  const [open, setOpen] = useState(false)
  const wrapperRef = useRef<HTMLDivElement>(null)

  useEffect(() => {
    if (!open) return
    function handleClickOutside(e: MouseEvent) {
      if (!wrapperRef.current) return
      if (wrapperRef.current.contains(e.target as Node)) return
      setOpen(false)
    }
    function handleEscape(e: KeyboardEvent) {
      if (e.key === 'Escape') setOpen(false)
    }
    window.addEventListener('mousedown', handleClickOutside)
    window.addEventListener('keydown', handleEscape)
    return () => {
      window.removeEventListener('mousedown', handleClickOutside)
      window.removeEventListener('keydown', handleEscape)
    }
  }, [open])

  const totalDays = totalPauseDays(pauses)
  const effectiveEnd = endDate && totalDays > 0 ? addDays(endDate, totalDays) : null

  const addPause = () => {
    onChangePauses([
      ...pauses,
      { id: newPauseId(), days: 1, note: '', addedAt: new Date().toISOString() },
    ])
  }

  const updatePause = (id: string, patch: Partial<Pick<DraftPause, 'days' | 'note'>>) => {
    onChangePauses(pauses.map((p) => (p.id === id ? { ...p, ...patch } : p)))
  }

  const removePause = (id: string) => {
    onChangePauses(pauses.filter((p) => p.id !== id))
  }

  return (
    <div ref={wrapperRef} className="relative">
      <input
        type="date"
        value={endDate}
        onChange={(e) => onChangeEndDate(e.target.value)}
        className="rounded-md border border-gray-200 bg-white px-2 py-1.5 text-sm text-gray-900 transition-all focus:border-indigo-400 focus:outline-none focus:ring-2 focus:ring-indigo-100"
      />
      <button
        type="button"
        onClick={() => setOpen((v) => !v)}
        className={`mt-1 inline-flex items-center gap-1 rounded-md border px-1.5 py-0.5 text-[10px] font-semibold transition-colors ${
          pauses.length > 0
            ? 'border-violet-200 bg-violet-50 text-violet-700 hover:bg-violet-100'
            : 'border-gray-200 bg-white text-gray-500 hover:bg-gray-50'
        }`}
      >
        <svg className="h-3 w-3" fill="none" viewBox="0 0 24 24" strokeWidth={2.5} stroke="currentColor">
          <path strokeLinecap="round" strokeLinejoin="round" d="M15.75 5.25v13.5m-7.5-13.5v13.5" />
        </svg>
        {pauses.length === 0
          ? 'Pauze toevoegen'
          : `Pauzes (${pauses.length}) · +${totalDays}d`}
      </button>
      {effectiveEnd && (
        <div className="mt-1 text-[10px] font-medium text-violet-700">
          Effectief: {formatDateNL(effectiveEnd)}
        </div>
      )}
      {open && (
        <div className="absolute left-0 top-full z-20 mt-1 w-72 rounded-lg border border-gray-200 bg-white p-3 shadow-lg">
          <div className="flex items-center justify-between gap-2">
            <span className="text-[11px] font-semibold uppercase tracking-wide text-gray-500">
              Pauzes
            </span>
            <button
              type="button"
              onClick={addPause}
              className="inline-flex items-center gap-1 rounded-md bg-indigo-600 px-2 py-1 text-[11px] font-semibold text-white hover:bg-indigo-700"
            >
              + Pauze
            </button>
          </div>
          {pauses.length === 0 ? (
            <p className="mt-2 text-[11px] text-gray-400">
              Geen pauzes ingevoerd. Voeg er een toe om de einddatum op te schuiven.
            </p>
          ) : (
            <ul className="mt-2 space-y-2">
              {pauses.map((p) => (
                <li key={p.id} className="rounded-md border border-gray-100 bg-gray-50/60 p-2">
                  <div className="flex items-center gap-2">
                    <input
                      type="number"
                      inputMode="numeric"
                      min={1}
                      step={1}
                      value={Number.isFinite(p.days) ? p.days : ''}
                      onChange={(e) => {
                        const v = e.target.value
                        const n = v === '' ? NaN : Number(v)
                        updatePause(p.id, { days: Number.isFinite(n) ? n : NaN })
                      }}
                      className="w-16 rounded-md border border-gray-200 bg-white px-2 py-1 text-sm text-gray-900 focus:border-indigo-400 focus:outline-none focus:ring-2 focus:ring-indigo-100"
                    />
                    <span className="text-[11px] text-gray-500">dagen</span>
                    <button
                      type="button"
                      onClick={() => removePause(p.id)}
                      aria-label="Pauze verwijderen"
                      className="ml-auto inline-flex h-6 w-6 items-center justify-center rounded-md text-gray-400 transition-colors hover:bg-rose-50 hover:text-rose-600"
                    >
                      <svg className="h-3.5 w-3.5" fill="none" viewBox="0 0 24 24" strokeWidth={2.5} stroke="currentColor">
                        <path strokeLinecap="round" strokeLinejoin="round" d="M6 18 18 6M6 6l12 12" />
                      </svg>
                    </button>
                  </div>
                  <input
                    type="text"
                    value={p.note}
                    onChange={(e) => updatePause(p.id, { note: e.target.value })}
                    placeholder="Notitie (optioneel)"
                    className="mt-1.5 w-full rounded-md border border-gray-200 bg-white px-2 py-1 text-[12px] text-gray-900 placeholder:text-gray-400 focus:border-indigo-400 focus:outline-none focus:ring-2 focus:ring-indigo-100"
                  />
                </li>
              ))}
            </ul>
          )}
          {endDate && totalDays > 0 && (
            <div className="mt-3 rounded-md bg-violet-50 px-2 py-1.5 text-[11px] text-violet-700 ring-1 ring-violet-100">
              <span className="font-semibold">Effectieve einddatum:</span>{' '}
              {formatDateNL(addDays(endDate, totalDays))}{' '}
              <span className="text-violet-500">(+{totalDays}d)</span>
            </div>
          )}
          <p className="mt-2 text-[10px] text-gray-400">
            Wijzigingen worden pas opgeslagen na klikken op &quot;Opslaan&quot;.
          </p>
        </div>
      )}
    </div>
  )
}
