'use client'

import { useMemo, useState, useTransition } from 'react'
import { format } from 'date-fns'
import { nl } from 'date-fns/locale'
import { downloadCsv } from '@/lib/csv-client'
import type { CommissionLeadHistoryRow } from '@/lib/data/commissions'
import {
  setCommissionLeadChecked,
  setCommissionLeadsChecked,
  setCommissionLeadRejected,
} from '@/app/(operator)/admin/commissies/actions'

interface LeadHistoryProps {
  leads: CommissionLeadHistoryRow[]
}

const FILTER_CLASS =
  'rounded-lg border border-gray-200 bg-gray-50/40 px-3 py-2 text-sm text-gray-900 focus:border-indigo-400 focus:bg-white focus:outline-none focus:ring-4 focus:ring-indigo-100'

export function LeadHistory({ leads: initialLeads }: LeadHistoryProps) {
  const [leads, setLeads] = useState<CommissionLeadHistoryRow[]>(initialLeads)
  const [, startTransition] = useTransition()

  const [search, setSearch] = useState('')
  const [clientFilter, setClientFilter] = useState('')
  const [categoryFilter, setCategoryFilter] = useState('')
  const [campaignFilter, setCampaignFilter] = useState('')
  const [fromDate, setFromDate] = useState('')
  const [toDate, setToDate] = useState('')

  const clientOptions = useMemo(
    () => Array.from(new Set(leads.map((l) => l.companyName))).sort((a, b) => a.localeCompare(b)),
    [leads]
  )
  const categoryOptions = useMemo(
    () => Array.from(new Set(leads.map((l) => l.categoryName))).sort((a, b) => a.localeCompare(b)),
    [leads]
  )
  const campaignOptions = useMemo(
    () =>
      Array.from(new Set(leads.map((l) => l.campaignName).filter(Boolean))).sort((a, b) =>
        a.localeCompare(b)
      ),
    [leads]
  )

  const filtered = useMemo(() => {
    const q = search.trim().toLowerCase()
    return leads.filter((l) => {
      if (q && !l.leadEmail.toLowerCase().includes(q)) return false
      if (clientFilter && l.companyName !== clientFilter) return false
      if (categoryFilter && l.categoryName !== categoryFilter) return false
      if (campaignFilter && l.campaignName !== campaignFilter) return false
      if (fromDate && l.entryDate < fromDate) return false
      if (toDate && l.entryDate > toDate) return false
      return true
    })
  }, [leads, search, clientFilter, categoryFilter, campaignFilter, fromDate, toDate])

  const toggleChecked = (id: string) => {
    const current = leads.find((l) => l.id === id)
    if (!current) return
    const next = !current.isChecked
    setLeads((prev) => prev.map((l) => (l.id === id ? { ...l, isChecked: next } : l)))
    startTransition(async () => {
      await setCommissionLeadChecked(id, next)
    })
  }

  const toggleRejected = (id: string) => {
    const current = leads.find((l) => l.id === id)
    if (!current) return
    const next = !current.isRejected
    setLeads((prev) => prev.map((l) => (l.id === id ? { ...l, isRejected: next } : l)))
    startTransition(async () => {
      await setCommissionLeadRejected(id, next)
    })
  }

  const handleExport = () => {
    // Alle leads zonder groene vink, ongeacht de filters of het rode kruis.
    const emails = leads.filter((l) => !l.isChecked).map((l) => [l.leadEmail])
    downloadCsv('commissie-leads-mailadressen.csv', ['Mailadres'], emails)
  }

  const markAllDone = () => {
    // Markeert de momenteel zichtbare (gefilterde) leads die nog niet afgerond zijn.
    const ids = filtered.filter((l) => !l.isChecked).map((l) => l.id)
    if (ids.length === 0) return
    if (!confirm(`${ids.length} lead${ids.length === 1 ? '' : 's'} als afgerond markeren?`)) return
    const idSet = new Set(ids)
    setLeads((prev) => prev.map((l) => (idSet.has(l.id) ? { ...l, isChecked: true } : l)))
    startTransition(async () => {
      await setCommissionLeadsChecked(ids, true)
    })
  }

  const notCheckedCount = leads.filter((l) => !l.isChecked).length
  const visibleNotDoneCount = filtered.filter((l) => !l.isChecked).length

  const resetFilters = () => {
    setSearch('')
    setClientFilter('')
    setCategoryFilter('')
    setCampaignFilter('')
    setFromDate('')
    setToDate('')
  }

  return (
    <div className="space-y-4">
      {/* Zoek + export */}
      <div className="flex flex-wrap items-center justify-between gap-3">
        <input
          type="text"
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          placeholder="Zoek op mailadres…"
          className={`${FILTER_CLASS} w-full max-w-xs`}
        />
        <div className="flex flex-wrap items-center gap-2">
          <button
            type="button"
            onClick={markAllDone}
            disabled={visibleNotDoneCount === 0}
            className="inline-flex items-center gap-1.5 rounded-lg border border-emerald-200 bg-emerald-50 px-4 py-2 text-sm font-semibold text-emerald-700 shadow-sm transition-all hover:border-emerald-300 hover:bg-emerald-100 disabled:cursor-not-allowed disabled:opacity-40"
          >
            <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" strokeWidth={2.5} stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" d="m4.5 12.75 6 6 9-13.5" />
            </svg>
            Markeer alles als afgerond ({visibleNotDoneCount})
          </button>
          <button
            type="button"
            onClick={handleExport}
            disabled={notCheckedCount === 0}
            className="inline-flex items-center gap-1.5 rounded-lg bg-indigo-600 px-4 py-2 text-sm font-semibold text-white shadow-sm transition-all hover:bg-indigo-700 disabled:cursor-not-allowed disabled:opacity-40"
          >
            <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" strokeWidth={2} stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" d="M3 16.5v2.25A2.25 2.25 0 0 0 5.25 21h13.5A2.25 2.25 0 0 0 21 18.75V16.5M16.5 12 12 16.5m0 0L7.5 12m4.5 4.5V3" />
            </svg>
            Exporteren ({notCheckedCount})
          </button>
        </div>
      </div>

      {/* Filters */}
      <div className="flex flex-wrap items-end gap-3 rounded-2xl border border-gray-200 bg-white p-4 shadow-sm">
        <FilterSelect label="Klant" value={clientFilter} onChange={setClientFilter} options={clientOptions} />
        <FilterSelect label="Categorie" value={categoryFilter} onChange={setCategoryFilter} options={categoryOptions} />
        <FilterSelect label="Campagne" value={campaignFilter} onChange={setCampaignFilter} options={campaignOptions} />
        <div>
          <label className="mb-1 block text-[11px] font-semibold uppercase tracking-wide text-gray-500">Van</label>
          <input type="date" value={fromDate} max={toDate || undefined} onChange={(e) => setFromDate(e.target.value)} className={FILTER_CLASS} />
        </div>
        <div>
          <label className="mb-1 block text-[11px] font-semibold uppercase tracking-wide text-gray-500">Tot en met</label>
          <input type="date" value={toDate} min={fromDate || undefined} onChange={(e) => setToDate(e.target.value)} className={FILTER_CLASS} />
        </div>
        <button
          type="button"
          onClick={resetFilters}
          className="rounded-lg border border-gray-200 bg-white px-3 py-2 text-xs font-semibold text-gray-600 transition-colors hover:border-gray-300 hover:text-gray-900"
        >
          Wissen
        </button>
      </div>

      <div className="text-xs text-gray-500">
        {filtered.length} van {leads.length} leads
      </div>

      {/* Lijst */}
      {filtered.length === 0 ? (
        <div className="rounded-2xl border border-dashed border-gray-200 px-4 py-12 text-center text-sm text-gray-400">
          Geen leads gevonden.
        </div>
      ) : (
        <div className="space-y-2">
          {filtered.map((lead) => (
            <div
              key={lead.id}
              className={`flex flex-wrap items-center gap-x-4 gap-y-2 rounded-xl border bg-white px-4 py-3 shadow-sm transition-colors ${
                lead.isChecked ? 'border-emerald-200 bg-emerald-50/40' : 'border-gray-200'
              }`}
            >
              <div className="min-w-0 flex-1">
                <div className="truncate text-sm font-semibold text-gray-900">{lead.leadEmail}</div>
                <div className="mt-0.5 flex flex-wrap items-center gap-x-2 gap-y-1 text-xs text-gray-500">
                  <span className="font-medium text-gray-700">{lead.companyName}</span>
                  {lead.campaignName && (
                    <>
                      <span className="text-gray-300">·</span>
                      <span>{lead.campaignName}</span>
                    </>
                  )}
                  <span className="text-gray-300">·</span>
                  <span className="rounded-full bg-gray-100 px-2 py-0.5 font-medium text-gray-600">{lead.categoryName}</span>
                  <span className="text-gray-300">·</span>
                  <span>{format(new Date(lead.entryDate + 'T00:00:00'), 'd MMM yyyy', { locale: nl })}</span>
                </div>
              </div>

              <div className="flex items-center gap-2">
                <ToggleButton
                  active={lead.isChecked}
                  onClick={() => toggleChecked(lead.id)}
                  title="Afgevinkt (groen)"
                  activeClass="bg-emerald-500 text-white ring-emerald-500"
                  icon={
                    <path strokeLinecap="round" strokeLinejoin="round" d="m4.5 12.75 6 6 9-13.5" />
                  }
                />
                <ToggleButton
                  active={lead.isRejected}
                  onClick={() => toggleRejected(lead.id)}
                  title="Afgekeurd (rood kruis)"
                  activeClass="bg-rose-500 text-white ring-rose-500"
                  icon={<path strokeLinecap="round" strokeLinejoin="round" d="M6 18 18 6M6 6l12 12" />}
                />
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  )
}

function FilterSelect({
  label,
  value,
  onChange,
  options,
}: {
  label: string
  value: string
  onChange: (v: string) => void
  options: string[]
}) {
  return (
    <div>
      <label className="mb-1 block text-[11px] font-semibold uppercase tracking-wide text-gray-500">{label}</label>
      <select value={value} onChange={(e) => onChange(e.target.value)} className={FILTER_CLASS}>
        <option value="">Alle</option>
        {options.map((o) => (
          <option key={o} value={o}>
            {o}
          </option>
        ))}
      </select>
    </div>
  )
}

function ToggleButton({
  active,
  onClick,
  title,
  activeClass,
  icon,
}: {
  active: boolean
  onClick: () => void
  title: string
  activeClass: string
  icon: React.ReactNode
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      title={title}
      aria-pressed={active}
      className={`flex h-9 w-9 items-center justify-center rounded-lg ring-1 transition-all ${
        active ? activeClass : 'bg-white text-gray-300 ring-gray-200 hover:text-gray-400 hover:ring-gray-300'
      }`}
    >
      <svg className="h-5 w-5" fill="none" viewBox="0 0 24 24" strokeWidth={2.5} stroke="currentColor">
        {icon}
      </svg>
    </button>
  )
}
