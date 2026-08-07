'use client'

import { useEffect, useMemo, useRef, useState } from 'react'
import {
  LABEL_META,
  LEAD_LABELS,
  type CampaignLead,
  type LeadLabel,
  type WeekGroup,
} from '@/lib/data/campaign-leads'
import { useT } from '@/lib/i18n/client'
import { LABEL_DOT, OBJECTION_COLOR, replySnippet, type SortKey } from './lead-meta'
import { LeadDetailPanel } from './lead-detail-panel'

interface Props {
  allLeads: CampaignLead[]
  weekGroups: WeekGroup[]
}

const DATE_FMT = new Intl.DateTimeFormat('nl-NL', { day: 'numeric', month: 'short' })
const RANGE_FMT = new Intl.DateTimeFormat('nl-NL', {
  day: 'numeric',
  month: 'short',
  year: 'numeric',
})

const PERIODS = [
  { key: '30d', days: 30 },
  { key: '90d', days: 90 },
  { key: 'all', days: Infinity },
] as const

export function LeadsOverview({ allLeads, weekGroups }: Props) {
  const t = useT()
  const [query, setQuery] = useState('')
  const [labels, setLabels] = useState<LeadLabel[]>([])
  const [sort, setSort] = useState<SortKey>('newest')
  const [period, setPeriod] = useState<string>('90d')
  const [labelMenuOpen, setLabelMenuOpen] = useState(false)
  const [selectedId, setSelectedId] = useState<string | null>(allLeads[0]?.id ?? null)
  const searchRef = useRef<HTMLInputElement>(null)

  // "/" springt naar het zoekveld, tenzij je al in een invoerveld staat.
  useEffect(() => {
    function onKey(e: KeyboardEvent) {
      if (e.key !== '/' || e.metaKey || e.ctrlKey || e.altKey) return
      const el = e.target as HTMLElement | null
      if (el && /^(INPUT|TEXTAREA|SELECT)$/.test(el.tagName)) return
      e.preventDefault()
      searchRef.current?.focus()
    }
    window.addEventListener('keydown', onKey)
    return () => window.removeEventListener('keydown', onKey)
  }, [])

  const PERIOD_LABEL: Record<string, string> = {
    '30d': t('overview.range30d'),
    '90d': t('overview.range90d'),
    all: t('overview.rangeAll'),
  }

  const SORT_LABEL: Record<SortKey, string> = {
    newest: t('leads.sortNewest'),
    oldest: t('leads.sortOldest'),
    company: t('leads.sortCompany'),
    category: t('leads.sortCategory'),
  }

  const OBJECTION_LABEL = {
    pending: t('leads.objectionPending'),
    approved: t('leads.objectionApproved'),
    rejected: t('leads.objectionRejected'),
  } as const

  /* ---- filteren ------------------------------------------------------ */

  const filtered = useMemo(() => {
    const q = query.trim().toLowerCase()
    const found = PERIODS.find((x) => x.key === period)
    const cutoff = !found || found.days === Infinity ? 0 : Date.now() - found.days * 86400000

    const out = allLeads.filter((l) => {
      if (new Date(l.receivedAt).getTime() < cutoff) return false
      if (labels.length && !labels.includes(l.label)) return false
      if (!q) return true
      return [l.leadName, l.leadCompany, l.leadEmail, l.replySubject, l.replyBody]
        .filter((v): v is string => Boolean(v))
        .some((v) => v.toLowerCase().includes(q))
    })

    const sorters: Record<SortKey, (a: CampaignLead, b: CampaignLead) => number> = {
      newest: (a, b) => +new Date(b.receivedAt) - +new Date(a.receivedAt),
      oldest: (a, b) => +new Date(a.receivedAt) - +new Date(b.receivedAt),
      company: (a, b) => (a.leadCompany ?? '').localeCompare(b.leadCompany ?? '', 'nl'),
      category: (a, b) =>
        LABEL_META[a.label].short.localeCompare(LABEL_META[b.label].short, 'nl'),
    }
    return [...out].sort(sorters[sort])
  }, [allLeads, query, labels, sort, period])

  /* ---- weekgroepen over de gefilterde set ---------------------------- */

  const groups = useMemo(() => {
    const ids = new Set(filtered.map((l) => l.id))
    return weekGroups
      .map((g) => ({ ...g, leads: g.leads.filter((l) => ids.has(l.id)) }))
      .filter((g) => g.leads.length > 0)
  }, [weekGroups, filtered])

  /* ---- kerncijfers --------------------------------------------------- */

  const stats = useMemo(() => {
    const weekAgo = Date.now() - 7 * 86400000
    const thisWeek = allLeads.filter((l) => +new Date(l.receivedAt) >= weekAgo).length
    const contactable = allLeads.filter(
      (l) => l.label === 'meeting_voorstel' || l.label === 'telefonisch_voorstel'
    ).length
    const objections = allLeads.filter((l) => l.objectionStatus)
    const pending = objections.filter((l) => l.objectionStatus === 'pending').length
    const approved = objections.filter((l) => l.objectionStatus === 'approved').length
    const pct = allLeads.length ? Math.round((contactable / allLeads.length) * 100) : 0

    return [
      { label: t('leads.statLeads'), value: allLeads.length, meta: `+${thisWeek}`, good: thisWeek > 0 },
      { label: t('leads.statMeetings'), value: contactable, meta: `${pct}%` },
      { label: t('leads.statObjectionsOpen'), value: pending, meta: '' },
      { label: t('leads.statObjectionsGranted'), value: approved, meta: `/ ${objections.length}` },
    ]
  }, [allLeads, t])

  const counts = useMemo(() => {
    const c = {} as Record<LeadLabel, number>
    for (const label of LEAD_LABELS) c[label] = 0
    for (const l of allLeads) c[l.label] += 1
    return c
  }, [allLeads])

  const selected = filtered.find((l) => l.id === selectedId) ?? filtered[0] ?? null
  const selectedIndex = selected ? filtered.findIndex((l) => l.id === selected.id) : -1

  function toggleLabel(label: LeadLabel) {
    setLabels((cur) => (cur.includes(label) ? cur.filter((l) => l !== label) : [...cur, label]))
  }

  return (
    <div className="flex flex-col">
      {/* Kerncijfers */}
      <div className="grid shrink-0 grid-cols-2 gap-3.5 lg:grid-cols-4">
        {stats.map((s) => (
          <div key={s.label} className="rounded-panel border border-line bg-panel px-4 py-3.5">
            <div className="text-[11.5px] font-medium text-muted">{s.label}</div>
            <div className="mt-2 flex items-baseline gap-[9px]">
              <span className="text-2xl font-semibold leading-none tracking-[-0.035em] tabular-nums">
                {s.value}
              </span>
              {s.meta && (
                <span
                  className={`text-[11.5px] tabular-nums ${
                    s.good ? 'font-semibold text-pos' : 'text-faint'
                  }`}
                >
                  {s.meta}
                </span>
              )}
            </div>
          </div>
        ))}
      </div>

      {/* Tabel + detail. Vaste hoogte omdat beide panelen intern scrollen; de
          pagina zelf zit in de max-w-6xl container van de client-layout. */}
      <div className="mt-4 flex h-[calc(100vh-13rem)] min-h-[520px] gap-[18px]">
        <section className="flex min-w-0 flex-1 flex-col overflow-hidden rounded-panel border border-line bg-panel">
          {/* Zoeken, filteren, sorteren */}
          <div className="flex shrink-0 items-center gap-2.5 border-b border-line px-4 py-3">
            <label className="flex h-[34px] min-w-0 flex-1 items-center gap-[9px] rounded-control bg-track px-[11px] focus-within:ring-2 focus-within:ring-[var(--brand-color)]">
              <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={1.7} strokeLinecap="round" strokeLinejoin="round" className="h-[15px] w-[15px] shrink-0 text-faint" aria-hidden>
                <path d="m21 21-5.197-5.197m0 0A7.5 7.5 0 1 0 5.196 5.196a7.5 7.5 0 0 0 10.607 10.607Z" />
              </svg>
              <input
                ref={searchRef}
                type="search"
                value={query}
                onChange={(e) => setQuery(e.target.value)}
                placeholder={t('leads.searchPlaceholder')}
                aria-label={t('leads.searchPlaceholder')}
                className="w-full bg-transparent text-[12.5px] outline-none placeholder:text-faint"
              />
              <kbd className="hidden shrink-0 rounded border border-line px-[5px] py-px font-mono text-[10px] font-semibold text-faint sm:block">
                /
              </kbd>
            </label>

            <div className="relative shrink-0">
              <button
                type="button"
                onClick={() => setLabelMenuOpen((v) => !v)}
                aria-expanded={labelMenuOpen}
                className="flex h-[34px] items-center gap-2 whitespace-nowrap rounded-control border border-line bg-panel px-3 text-[12.5px] font-medium transition-colors hover:bg-[var(--brand-08)]"
              >
                <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={1.7} strokeLinecap="round" strokeLinejoin="round" className="h-[15px] w-[15px] text-muted" aria-hidden>
                  <path d="M12 3c2.755 0 5.455.232 8.083.678.533.09.917.556.917 1.096v1.044a2.25 2.25 0 0 1-.659 1.591l-5.432 5.432a2.25 2.25 0 0 0-.659 1.591v2.927a2.25 2.25 0 0 1-1.244 2.013L9.75 21v-6.568a2.25 2.25 0 0 0-.659-1.591L3.659 7.409A2.25 2.25 0 0 1 3 5.818V4.774c0-.54.384-1.006.917-1.096A48.32 48.32 0 0 1 12 3Z" />
                </svg>
                {t('leads.filterCategories')}
                {labels.length > 0 && (
                  <span className="inline-flex h-4 min-w-4 items-center justify-center rounded-full bg-brand px-[5px] text-[10.5px] font-semibold text-white">
                    {labels.length}
                  </span>
                )}
              </button>

              {labelMenuOpen && (
                <>
                  <div className="fixed inset-0 z-10" onClick={() => setLabelMenuOpen(false)} />
                  <div className="absolute right-0 top-10 z-20 w-[252px] rounded-[10px] border border-line bg-panel p-1.5">
                    {LEAD_LABELS.map((label) => (
                      <button
                        key={label}
                        type="button"
                        onClick={() => toggleLabel(label)}
                        className="flex w-full items-center gap-[9px] rounded-[7px] px-2.5 py-[7px] text-[12.5px] text-muted transition-colors hover:bg-[var(--brand-08)]"
                      >
                        <span
                          className={`flex h-3.5 w-3.5 shrink-0 items-center justify-center rounded border ${
                            labels.includes(label) ? 'border-brand bg-brand' : 'border-line'
                          }`}
                        >
                          {labels.includes(label) && (
                            <svg viewBox="0 0 24 24" fill="none" stroke="#fff" strokeWidth={3.5} strokeLinecap="round" strokeLinejoin="round" className="h-2.5 w-2.5" aria-hidden>
                              <path d="m4.5 12.75 6 6 9-13.5" />
                            </svg>
                          )}
                        </span>
                        <span className="h-1.5 w-1.5 shrink-0 rounded-full" style={{ background: LABEL_DOT[label] }} aria-hidden />
                        <span className="flex-1 text-left">{LABEL_META[label].short}</span>
                        <span className="tabular-nums text-faint">{counts[label]}</span>
                      </button>
                    ))}
                  </div>
                </>
              )}
            </div>

            <select
              value={sort}
              onChange={(e) => setSort(e.target.value as SortKey)}
              aria-label={t('leads.sortLabel')}
              className="h-[34px] shrink-0 rounded-control border border-line bg-panel px-3 text-[12.5px] font-medium outline-none"
            >
              {(Object.keys(SORT_LABEL) as SortKey[]).map((k) => (
                <option key={k} value={k}>
                  {SORT_LABEL[k]}
                </option>
              ))}
            </select>

            <div className="hidden shrink-0 overflow-hidden rounded-control border border-line bg-panel md:flex">
              {PERIODS.map((p, i) => (
                <button
                  key={p.key}
                  type="button"
                  onClick={() => setPeriod(p.key)}
                  className={`px-3 py-2 text-xs transition-colors ${
                    i < PERIODS.length - 1 ? 'border-r border-line' : ''
                  } ${
                    period === p.key
                      ? 'bg-[var(--brand-10)] font-semibold text-brand'
                      : 'font-medium text-muted hover:bg-[var(--brand-08)]'
                  }`}
                >
                  {PERIOD_LABEL[p.key]}
                </button>
              ))}
            </div>
          </div>

          {/* Actieve filters */}
          {(labels.length > 0 || query) && (
            <div className="flex shrink-0 flex-wrap items-center gap-2 border-b border-line px-4 py-2.5">
              {labels.map((label) => (
                <span
                  key={label}
                  className="inline-flex items-center gap-[7px] rounded-md border border-line bg-track py-[3px] pl-[9px] pr-[5px] text-[11.5px] font-medium"
                >
                  <span className="h-1.5 w-1.5 rounded-full" style={{ background: LABEL_DOT[label] }} aria-hidden />
                  {LABEL_META[label].short}
                  <button
                    type="button"
                    onClick={() => toggleLabel(label)}
                    aria-label={`${LABEL_META[label].short} — ${t('leads.filterClear')}`}
                  >
                    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2.2} strokeLinecap="round" className="h-3 w-3 text-faint" aria-hidden>
                      <path d="M6 18 18 6M6 6l12 12" />
                    </svg>
                  </button>
                </span>
              ))}
              <button
                type="button"
                onClick={() => {
                  setLabels([])
                  setQuery('')
                }}
                className="px-1 text-[11.5px] font-medium text-brand"
              >
                {t('leads.filterClear')}
              </button>
              <span className="flex-1" />
              <span className="text-[11.5px] tabular-nums text-faint">
                {t('leads.shownOfTotal', { shown: filtered.length, total: allLeads.length })}
              </span>
            </div>
          )}

          {/* Kolomkoppen */}
          <div className="flex shrink-0 items-center gap-3.5 border-b border-line bg-track px-4 py-[9px] text-[10.5px] font-semibold uppercase tracking-[0.09em] text-faint">
            <span className="w-0.5 shrink-0" />
            <span className="min-w-0 flex-1">{t('leads.colLead')}</span>
            <span className="hidden w-[150px] shrink-0 lg:block">{t('leads.colCategory')}</span>
            <span className="w-24 shrink-0">{t('leads.colReceived')}</span>
            <span className="hidden w-[104px] shrink-0 xl:block">{t('leads.colStatus')}</span>
          </div>

          {/* Rijen */}
          <div className="min-h-0 flex-1 overflow-y-auto">
            {groups.length === 0 ? (
              <div className="px-6 py-12 text-center">
                <h3 className="text-[13.5px] font-semibold tracking-[-0.01em]">
                  {t('leads.noResults')}
                </h3>
              </div>
            ) : (
              groups.map((group) => (
                <div key={group.key}>
                  <div className="sticky top-0 z-[2] flex items-center gap-3 border-b border-line bg-canvas px-4 py-[9px]">
                    <span className="text-[11px] font-semibold uppercase tracking-[0.1em] text-muted">
                      {t('leads.weekHeader', { week: group.weekNumber, year: group.year })}
                    </span>
                    <span className="hidden text-[11px] text-faint sm:inline">
                      {DATE_FMT.format(new Date(group.startDate))} —{' '}
                      {RANGE_FMT.format(new Date(group.endDate))}
                    </span>
                    <span className="flex-1" />
                    <span className="text-[11px] tabular-nums text-faint">
                      {group.leads.length === 1
                        ? t('leads.leadCountSingular')
                        : t('leads.leadCount', { count: group.leads.length })}
                    </span>
                  </div>

                  {group.leads.map((lead) => {
                    const isSelected = selected?.id === lead.id
                    const objectionColor = lead.objectionStatus
                      ? OBJECTION_COLOR[lead.objectionStatus]
                      : null

                    return (
                      <button
                        key={lead.id}
                        type="button"
                        onClick={() => setSelectedId(lead.id)}
                        aria-current={isSelected ? 'true' : undefined}
                        className={`flex w-full items-center gap-3.5 border-b border-line px-4 py-3 text-left transition-colors ${
                          isSelected ? 'bg-[var(--brand-07)]' : 'hover:bg-[var(--brand-05)]'
                        }`}
                      >
                        <span
                          className={`h-[26px] w-0.5 shrink-0 rounded-sm ${
                            isSelected ? 'bg-brand' : 'bg-transparent'
                          }`}
                          aria-hidden
                        />
                        <div className="min-w-0 flex-1">
                          <div className="flex items-center gap-2">
                            <span className="truncate text-[13px] font-semibold tracking-[-0.01em]">
                              {lead.leadName || lead.leadEmail}
                            </span>
                            {lead.leadCompany && (
                              <span className="truncate text-xs text-faint">{lead.leadCompany}</span>
                            )}
                          </div>
                          <div className="mt-[3px] truncate text-[11.5px] text-muted">
                            {replySnippet(lead.replyBody)}
                          </div>
                        </div>

                        <span className="hidden w-[150px] shrink-0 lg:block">
                          <span className="inline-flex items-center gap-1.5 whitespace-nowrap rounded-[5px] bg-track px-[9px] py-[3px] text-[11px] font-medium text-muted">
                            <span
                              className="h-[5px] w-[5px] rounded-full"
                              style={{ background: LABEL_DOT[lead.label] }}
                              aria-hidden
                            />
                            {LABEL_META[lead.label].short}
                          </span>
                        </span>

                        <span className="w-24 shrink-0 text-xs tabular-nums text-muted">
                          {DATE_FMT.format(new Date(lead.receivedAt))}
                        </span>

                        <span className="hidden w-[104px] shrink-0 xl:block">
                          {objectionColor && lead.objectionStatus && (
                            <span
                              className="inline-flex whitespace-nowrap rounded-[5px] px-2 py-[3px] text-[10.5px] font-semibold"
                              style={{
                                color: objectionColor,
                                background: `color-mix(in oklab, ${objectionColor} 12%, transparent)`,
                              }}
                            >
                              {OBJECTION_LABEL[lead.objectionStatus]}
                            </span>
                          )}
                        </span>
                      </button>
                    )
                  })}
                </div>
              ))
            )}
          </div>
        </section>

        {selected ? (
          <LeadDetailPanel
            lead={selected}
            position={selectedIndex + 1}
            total={filtered.length}
            onPrev={() => setSelectedId(filtered[Math.max(selectedIndex - 1, 0)]?.id ?? null)}
            onNext={() =>
              setSelectedId(filtered[Math.min(selectedIndex + 1, filtered.length - 1)]?.id ?? null)
            }
          />
        ) : (
          <aside className="hidden w-[392px] shrink-0 items-center justify-center rounded-panel border border-line bg-panel px-6 text-center xl:flex">
            <p className="text-[12.5px] text-muted">{t('leads.selectLead')}</p>
          </aside>
        )}
      </div>
    </div>
  )
}
