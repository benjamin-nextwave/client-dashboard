'use client'

import { useMemo, useState, useTransition } from 'react'
import { useRouter } from 'next/navigation'
import type { ClientListItem } from '@/lib/data/admin-stats'
import type { ClientMonthlyData } from '@/lib/data/controle'
import { upsertClientMonthlyData } from '../../actions'

interface Row {
  client: ClientListItem
  data: ClientMonthlyData | null
}

interface RowDraft {
  contactsToApproach: string
  startDate: string
  endDate: string
  contractBasis: string
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
      const contacts = draft.contactsToApproach.trim()
      const contactsNum = contacts.length === 0 ? null : Number(contacts)
      if (contacts.length > 0 && (!Number.isFinite(contactsNum) || contactsNum! < 0)) {
        setDrafts((prev) => ({
          ...prev,
          [clientId]: { ...prev[clientId], saving: false, error: 'Geef een geldig aantal contacten.' },
        }))
        return
      }

      const result = await upsertClientMonthlyData({
        clientId,
        year,
        month,
        contactsToApproach: contactsNum,
        startDate: draft.startDate || null,
        endDate: draft.endDate || null,
        contractBasis: draft.contractBasis.trim() || null,
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

      <div className="overflow-hidden rounded-2xl border border-gray-200 bg-white shadow-sm">
        <table className="min-w-full divide-y divide-gray-100">
          <thead className="bg-gray-50">
            <tr>
              <th className="px-4 py-3 text-left text-[11px] font-semibold uppercase tracking-wide text-gray-500">Klant</th>
              <th className="px-4 py-3 text-left text-[11px] font-semibold uppercase tracking-wide text-gray-500">
                Contacten te benaderen
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
                <td colSpan={6} className="px-4 py-12 text-center text-sm text-gray-400">
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
          value={draft.contactsToApproach}
          onChange={(e) => onChange({ contactsToApproach: e.target.value })}
          placeholder="bv. 480"
          className="w-32 rounded-md border border-gray-200 bg-white px-2 py-1.5 text-sm text-gray-900 transition-all focus:border-indigo-400 focus:outline-none focus:ring-2 focus:ring-indigo-100"
        />
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
        <input
          type="date"
          value={draft.endDate}
          onChange={(e) => onChange({ endDate: e.target.value })}
          className="rounded-md border border-gray-200 bg-white px-2 py-1.5 text-sm text-gray-900 transition-all focus:border-indigo-400 focus:outline-none focus:ring-2 focus:ring-indigo-100"
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
  return {
    contactsToApproach: data?.contactsToApproach !== null && data?.contactsToApproach !== undefined
      ? String(data.contactsToApproach)
      : '',
    startDate: data?.startDate ?? '',
    endDate: data?.endDate ?? '',
    contractBasis: data?.contractBasis ?? '',
    dirty: false,
    saving: false,
    savedAt: null,
    error: null,
  }
}
