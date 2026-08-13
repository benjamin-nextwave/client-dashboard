'use client'

import { useMemo, useState, useTransition } from 'react'
import { format } from 'date-fns'
import { nl } from 'date-fns/locale'
import { downloadCsv } from '@/lib/csv-client'
import { formatEuroCents, type CommissionCategory } from '@/lib/commissions-shared'
import type { CommissionLeadHistoryRow } from '@/lib/data/commissions'
import {
  setCommissionLeadChecked,
  setCommissionLeadsChecked,
  setCommissionLeadRejected,
  setCommissionLeadNote,
  updateCommissionLead,
  deleteCommissionLead,
} from '@/app/(operator)/admin/commissies/actions'

interface LeadClient {
  id: string
  companyName: string
}

interface LeadHistoryProps {
  leads: CommissionLeadHistoryRow[]
  clients: LeadClient[]
  categoriesByClient: Record<string, CommissionCategory[]>
  campaignNames: string[]
}

interface EditDraft {
  leadEmail: string
  clientId: string
  categoryId: string
  campaignName: string
  date: string
}

const FILTER_CLASS =
  'rounded-lg border border-gray-200 bg-gray-50/40 px-3 py-2 text-sm text-gray-900 focus:border-indigo-400 focus:bg-white focus:outline-none focus:ring-4 focus:ring-indigo-100'

/**
 * Copytalent apart kunnen zetten is een terugkerende vraag, daarom een eigen
 * schakelaar naast de klant-dropdown. De herkenning negeert hoofdletters en
 * spaties, zodat "Copytalent", "CopyTalent" en "Copy Talent" allemaal matchen.
 */
const COPYTALENT_KEY = 'copytalent'

type CopytalentMode = 'all' | 'only' | 'except'

const COPYTALENT_MODES: Array<{ id: CopytalentMode; label: string }> = [
  { id: 'all', label: 'Iedereen' },
  { id: 'only', label: 'Enkel Copytalent' },
  { id: 'except', label: 'Behalve Copytalent' },
]

function isCopytalent(companyName: string): boolean {
  return companyName.toLowerCase().replace(/[^a-z]/g, '').includes(COPYTALENT_KEY)
}

export function LeadHistory({
  leads: initialLeads,
  clients,
  categoriesByClient,
  campaignNames,
}: LeadHistoryProps) {
  const [leads, setLeads] = useState<CommissionLeadHistoryRow[]>(initialLeads)
  const [, startTransition] = useTransition()
  const [openNoteId, setOpenNoteId] = useState<string | null>(null)

  const [editingId, setEditingId] = useState<string | null>(null)
  const [draft, setDraft] = useState<EditDraft | null>(null)
  const [editError, setEditError] = useState<string | null>(null)
  const [isSaving, setIsSaving] = useState(false)

  const [search, setSearch] = useState('')
  const [clientFilter, setClientFilter] = useState('')
  const [categoryFilter, setCategoryFilter] = useState('')
  const [campaignFilter, setCampaignFilter] = useState('')
  const [fromDate, setFromDate] = useState('')
  const [toDate, setToDate] = useState('')
  const [rejectedOnly, setRejectedOnly] = useState(false)
  const [copytalentMode, setCopytalentMode] = useState<CopytalentMode>('all')

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
      if (rejectedOnly && !l.isRejected) return false
      if (copytalentMode === 'only' && !isCopytalent(l.companyName)) return false
      if (copytalentMode === 'except' && isCopytalent(l.companyName)) return false
      return true
    })
  }, [
    leads,
    search,
    clientFilter,
    categoryFilter,
    campaignFilter,
    fromDate,
    toDate,
    rejectedOnly,
    copytalentMode,
  ])

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

  // Werkt de notitie lokaal bij terwijl er getypt wordt (nog niet opgeslagen).
  const updateNoteLocal = (id: string, note: string) => {
    setLeads((prev) => prev.map((l) => (l.id === id ? { ...l, note } : l)))
  }

  // Slaat de notitie op in de database (bij sluiten/blur).
  const persistNote = (id: string, note: string) => {
    startTransition(async () => {
      await setCommissionLeadNote(id, note)
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

  // --- Bewerken ---------------------------------------------------------
  const clientNameById = useMemo(
    () => new Map(clients.map((c) => [c.id, c.companyName])),
    [clients]
  )

  const startEdit = (lead: CommissionLeadHistoryRow) => {
    setEditError(null)
    setEditingId(lead.id)
    setDraft({
      leadEmail: lead.leadEmail,
      clientId: lead.clientId,
      categoryId: lead.categoryId,
      campaignName: lead.campaignName,
      date: lead.entryDate,
    })
  }

  const cancelEdit = () => {
    setEditingId(null)
    setDraft(null)
    setEditError(null)
  }

  const updateDraft = (patch: Partial<EditDraft>) => {
    setDraft((prev) => {
      if (!prev) return prev
      const next = { ...prev, ...patch }
      // Bij een andere klant is de gekozen categorie niet meer geldig.
      if (patch.clientId !== undefined && patch.clientId !== prev.clientId) {
        next.categoryId = ''
      }
      return next
    })
  }

  const saveEdit = () => {
    if (!editingId || !draft) return
    setEditError(null)
    const id = editingId
    const patch = draft
    const categoryName =
      (categoriesByClient[patch.clientId] ?? []).find((c) => c.id === patch.categoryId)?.name ??
      leads.find((l) => l.id === id)?.categoryName ??
      ''
    const companyName = clientNameById.get(patch.clientId) ?? 'Onbekende klant'
    setIsSaving(true)
    startTransition(async () => {
      const result = await updateCommissionLead(id, patch)
      setIsSaving(false)
      if (result.error) {
        setEditError(result.error)
        return
      }
      setLeads((prev) =>
        prev.map((l) =>
          l.id === id
            ? {
                ...l,
                leadEmail: patch.leadEmail.trim(),
                clientId: patch.clientId,
                companyName,
                categoryId: patch.categoryId,
                categoryName,
                campaignName: patch.campaignName.trim(),
                entryDate: patch.date,
              }
            : l
        )
      )
      cancelEdit()
    })
  }

  const deleteLead = (id: string) => {
    const lead = leads.find((l) => l.id === id)
    if (!lead) return
    if (!confirm(`Lead "${lead.leadEmail}" definitief verwijderen? Dit kan niet ongedaan worden gemaakt.`)) {
      return
    }
    setLeads((prev) => prev.filter((l) => l.id !== id))
    if (editingId === id) cancelEdit()
    startTransition(async () => {
      await deleteCommissionLead(id)
    })
  }

  const notCheckedCount = leads.filter((l) => !l.isChecked).length
  const visibleNotDoneCount = filtered.filter((l) => !l.isChecked).length
  const rejectedCount = leads.filter((l) => l.isRejected).length
  const copytalentCount = leads.filter((l) => isCopytalent(l.companyName)).length

  const resetFilters = () => {
    setSearch('')
    setClientFilter('')
    setCategoryFilter('')
    setCampaignFilter('')
    setFromDate('')
    setToDate('')
    setRejectedOnly(false)
    setCopytalentMode('all')
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
        <div>
          <label className="mb-1 block text-[11px] font-semibold uppercase tracking-wide text-gray-500">
            Copytalent
          </label>
          <div className="inline-flex rounded-lg border border-gray-200 bg-gray-50/40 p-0.5">
            {COPYTALENT_MODES.map((mode) => (
              <button
                key={mode.id}
                type="button"
                onClick={() => setCopytalentMode(mode.id)}
                aria-pressed={copytalentMode === mode.id}
                className={`rounded-md px-2.5 py-1.5 text-xs font-semibold transition-colors ${
                  copytalentMode === mode.id
                    ? 'bg-gray-900 text-white'
                    : 'text-gray-600 hover:bg-white hover:text-gray-900'
                }`}
              >
                {mode.label}
                {mode.id === 'only' && (
                  <span className={copytalentMode === 'only' ? 'text-gray-300' : 'text-gray-400'}>
                    {' '}
                    ({copytalentCount})
                  </span>
                )}
              </button>
            ))}
          </div>
        </div>

        <button
          type="button"
          onClick={() => setRejectedOnly((v) => !v)}
          aria-pressed={rejectedOnly}
          title="Toon alleen leads met een rood kruis"
          className={`inline-flex items-center gap-1.5 rounded-lg border px-3 py-2 text-xs font-semibold transition-colors ${
            rejectedOnly
              ? 'border-rose-500 bg-rose-500 text-white'
              : 'border-gray-200 bg-white text-gray-600 hover:border-rose-300 hover:text-rose-600'
          }`}
        >
          <svg className="h-3.5 w-3.5" fill="none" viewBox="0 0 24 24" strokeWidth={2.5} stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" d="M6 18 18 6M6 6l12 12" />
          </svg>
          Alleen afgekeurd ({rejectedCount})
        </button>
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
        {copytalentMode !== 'all' && (
          <span className="ml-1 font-semibold text-gray-700">
            · {copytalentMode === 'only' ? 'enkel Copytalent' : 'behalve Copytalent'}
          </span>
        )}
        {rejectedOnly && <span className="ml-1 font-semibold text-rose-600">· alleen afgekeurd</span>}
      </div>

      {/* Lijst */}
      {filtered.length === 0 ? (
        <div className="rounded-2xl border border-dashed border-gray-200 px-4 py-12 text-center text-sm text-gray-400">
          {rejectedOnly && rejectedCount === 0
            ? 'Er staat geen enkele lead met een rood kruis.'
            : 'Geen leads gevonden.'}
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
                  active={openNoteId === lead.id}
                  onClick={() =>
                    setOpenNoteId((cur) => {
                      if (cur === lead.id) {
                        // Bij sluiten de notitie opslaan.
                        persistNote(lead.id, lead.note)
                        return null
                      }
                      return lead.id
                    })
                  }
                  title={lead.note.trim() ? 'Notitie bekijken/bewerken' : 'Notitie toevoegen'}
                  activeClass="bg-indigo-500 text-white ring-indigo-500"
                  highlight={lead.note.trim().length > 0}
                  icon={
                    <path
                      strokeLinecap="round"
                      strokeLinejoin="round"
                      d="M16.862 4.487l1.687-1.688a1.875 1.875 0 1 1 2.652 2.652L6.832 19.82a4.5 4.5 0 0 1-1.897 1.13l-2.685.8.8-2.685a4.5 4.5 0 0 1 1.13-1.897L16.863 4.487Zm0 0L19.5 7.125"
                    />
                  }
                />
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
                <ToggleButton
                  active={editingId === lead.id}
                  onClick={() => (editingId === lead.id ? cancelEdit() : startEdit(lead))}
                  title="Lead bewerken"
                  activeClass="bg-indigo-500 text-white ring-indigo-500"
                  icon={
                    <path
                      strokeLinecap="round"
                      strokeLinejoin="round"
                      d="M16.862 4.487l1.687-1.688a1.875 1.875 0 1 1 2.652 2.652L10.582 16.07a4.5 4.5 0 0 1-1.897 1.13L6 18l.8-2.685a4.5 4.5 0 0 1 1.13-1.897l8.932-8.931Zm0 0L19.5 7.125M18 14v4.75A2.25 2.25 0 0 1 15.75 21H5.25A2.25 2.25 0 0 1 3 18.75V8.25A2.25 2.25 0 0 1 5.25 6H10"
                    />
                  }
                />
                <ToggleButton
                  active={false}
                  onClick={() => deleteLead(lead.id)}
                  title="Lead verwijderen"
                  activeClass="bg-rose-500 text-white ring-rose-500"
                  danger
                  icon={
                    <path
                      strokeLinecap="round"
                      strokeLinejoin="round"
                      d="m14.74 9-.346 9m-4.788 0L9.26 9m9.968-3.21c.342.052.682.107 1.022.166m-1.022-.165L18.16 19.673a2.25 2.25 0 0 1-2.244 2.077H8.084a2.25 2.25 0 0 1-2.244-2.077L4.772 5.79m14.456 0a48.108 48.108 0 0 0-3.478-.397m-12 .562c.34-.059.68-.114 1.022-.165m0 0a48.11 48.11 0 0 1 3.478-.397m7.5 0v-.916c0-1.18-.91-2.164-2.09-2.201a51.964 51.964 0 0 0-3.32 0c-1.18.037-2.09 1.022-2.09 2.201v.916m7.5 0a48.667 48.667 0 0 0-7.5 0"
                    />
                  }
                />
              </div>

              {openNoteId === lead.id && (
                <div className="w-full">
                  <textarea
                    value={lead.note}
                    onChange={(e) => updateNoteLocal(lead.id, e.target.value)}
                    onBlur={() => persistNote(lead.id, lead.note)}
                    placeholder="Notitie bij deze lead…"
                    rows={4}
                    className="w-full resize-y rounded-lg border border-gray-200 bg-gray-50/40 px-3 py-2 text-sm text-gray-900 focus:border-indigo-400 focus:bg-white focus:outline-none focus:ring-4 focus:ring-indigo-100"
                  />
                  <p className="mt-1 text-[11px] text-gray-400">Wordt automatisch opgeslagen.</p>
                </div>
              )}

              {editingId === lead.id && draft && (
                <div className="w-full border-t border-gray-100 pt-3">
                  <div className="grid grid-cols-1 gap-3 md:grid-cols-2 lg:grid-cols-5">
                    <div className="lg:col-span-2">
                      <label className={EDIT_LABEL_CLASS}>Mailadres lead</label>
                      <input
                        type="email"
                        value={draft.leadEmail}
                        onChange={(e) => updateDraft({ leadEmail: e.target.value })}
                        placeholder="naam@bedrijf.nl"
                        className={EDIT_FIELD_CLASS}
                      />
                    </div>
                    <div>
                      <label className={EDIT_LABEL_CLASS}>Klant</label>
                      <select
                        value={draft.clientId}
                        onChange={(e) => updateDraft({ clientId: e.target.value })}
                        className={EDIT_FIELD_CLASS}
                      >
                        <option value="">Kies klant…</option>
                        {clients.map((c) => (
                          <option key={c.id} value={c.id}>
                            {c.companyName}
                          </option>
                        ))}
                      </select>
                    </div>
                    <div>
                      <label className={EDIT_LABEL_CLASS}>Categorisatie</label>
                      <CategorySelect
                        clientId={draft.clientId}
                        value={draft.categoryId}
                        currentName={lead.categoryName}
                        categoriesByClient={categoriesByClient}
                        onChange={(v) => updateDraft({ categoryId: v })}
                      />
                    </div>
                    <div>
                      <label className={EDIT_LABEL_CLASS}>Campagne</label>
                      <input
                        type="text"
                        value={draft.campaignName}
                        onChange={(e) => updateDraft({ campaignName: e.target.value })}
                        placeholder="Campagnenaam"
                        list="lead-history-campaign-names"
                        className={EDIT_FIELD_CLASS}
                      />
                    </div>
                    <div>
                      <label className={EDIT_LABEL_CLASS}>Datum</label>
                      <input
                        type="date"
                        value={draft.date}
                        onChange={(e) => updateDraft({ date: e.target.value })}
                        className={EDIT_FIELD_CLASS}
                      />
                    </div>
                  </div>

                  {editError && (
                    <p className="mt-2 text-xs font-semibold text-rose-600">{editError}</p>
                  )}

                  <div className="mt-3 flex items-center gap-2">
                    <button
                      type="button"
                      onClick={saveEdit}
                      disabled={isSaving}
                      className="inline-flex items-center gap-1.5 rounded-lg bg-indigo-600 px-4 py-2 text-sm font-semibold text-white shadow-sm transition-all hover:bg-indigo-700 disabled:cursor-not-allowed disabled:opacity-40"
                    >
                      {isSaving ? 'Opslaan…' : 'Opslaan'}
                    </button>
                    <button
                      type="button"
                      onClick={cancelEdit}
                      disabled={isSaving}
                      className="rounded-lg border border-gray-200 bg-white px-4 py-2 text-sm font-semibold text-gray-600 transition-colors hover:border-gray-300 hover:text-gray-900 disabled:opacity-40"
                    >
                      Annuleren
                    </button>
                  </div>
                </div>
              )}
            </div>
          ))}
        </div>
      )}

      <datalist id="lead-history-campaign-names">
        {campaignNames.map((name) => (
          <option key={name} value={name} />
        ))}
      </datalist>
    </div>
  )
}

const EDIT_FIELD_CLASS =
  'w-full rounded-lg border border-gray-200 bg-gray-50/40 px-3 py-2 text-sm text-gray-900 focus:border-indigo-400 focus:bg-white focus:outline-none focus:ring-4 focus:ring-indigo-100'
const EDIT_LABEL_CLASS = 'mb-1 block text-[11px] font-semibold uppercase tracking-wide text-gray-500'

/**
 * Categorie-keuze bij het bewerken. Toont de categorieën van de gekozen klant
 * en valt terug op de opgeslagen categorienaam als die (nog) niet in de lijst
 * staat, zodat de huidige waarde nooit ongemerkt verdwijnt.
 */
function CategorySelect({
  clientId,
  value,
  currentName,
  categoriesByClient,
  onChange,
}: {
  clientId: string
  value: string
  currentName: string
  categoriesByClient: Record<string, CommissionCategory[]>
  onChange: (v: string) => void
}) {
  const categories = categoriesByClient[clientId] ?? []
  const knownIds = new Set(categories.map((c) => c.id))
  const showFallback = value.length > 0 && !knownIds.has(value)

  return (
    <select
      value={value}
      onChange={(e) => onChange(e.target.value)}
      disabled={!clientId}
      className={`${EDIT_FIELD_CLASS} disabled:cursor-not-allowed disabled:opacity-50`}
    >
      <option value="">
        {clientId
          ? categories.length > 0
            ? 'Kies categorie…'
            : 'Geen categorieën ingesteld'
          : 'Kies eerst een klant'}
      </option>
      {showFallback && (
        <option value={value}>{currentName || 'Huidige categorie'} (huidig)</option>
      )}
      {categories.map((cat) => (
        <option key={cat.id} value={cat.id}>
          {cat.name} · {formatEuroCents(cat.priceCents)}
        </option>
      ))}
    </select>
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
  highlight = false,
  danger = false,
}: {
  active: boolean
  onClick: () => void
  title: string
  activeClass: string
  icon: React.ReactNode
  highlight?: boolean
  danger?: boolean
}) {
  const inactiveClass = danger
    ? 'bg-white text-gray-300 ring-gray-200 hover:bg-rose-50 hover:text-rose-500 hover:ring-rose-300'
    : highlight
      ? 'bg-indigo-50 text-indigo-500 ring-indigo-200 hover:bg-indigo-100 hover:ring-indigo-300'
      : 'bg-white text-gray-300 ring-gray-200 hover:text-gray-400 hover:ring-gray-300'
  return (
    <button
      type="button"
      onClick={onClick}
      title={title}
      aria-pressed={active}
      className={`flex h-9 w-9 items-center justify-center rounded-lg ring-1 transition-all ${
        active ? activeClass : inactiveClass
      }`}
    >
      <svg className="h-5 w-5" fill="none" viewBox="0 0 24 24" strokeWidth={2.5} stroke="currentColor">
        {icon}
      </svg>
    </button>
  )
}
