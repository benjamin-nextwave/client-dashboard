'use client'

import { useMemo, useState, useTransition } from 'react'
import { removeDncEntries } from '@/lib/actions/dnc-actions'
import type { DncEntry } from '@/lib/actions/dnc-actions'
import { useT } from '@/lib/i18n/client'

const PAGE_SIZE = 50

const ICON = {
  at: 'M16.5 12a4.5 4.5 0 1 1-9 0 4.5 4.5 0 0 1 9 0Zm0 0c0 1.657 1.007 3 2.25 3S21 13.657 21 12a9 9 0 1 0-2.636 6.364',
  domain:
    'M12 21a9.004 9.004 0 0 0 8.716-6.747M12 21a9.004 9.004 0 0 1-8.716-6.747M12 21c2.485 0 4.5-4.03 4.5-9S14.485 3 12 3m0 18c-2.485 0-4.5-4.03-4.5-9S9.515 3 12 3m0 0a8.997 8.997 0 0 1 7.843 4.582M12 3a8.997 8.997 0 0 0-7.843 4.582m15.686 0A11.953 11.953 0 0 1 12 10.5c-2.998 0-5.74-1.1-7.843-2.918m15.686 0A8.959 8.959 0 0 1 21 12c0 .778-.099 1.533-.284 2.253m0 0A17.919 17.919 0 0 1 12 16.5c-3.162 0-6.133-.815-8.716-2.247m0 0A9.015 9.015 0 0 1 3 12c0-1.605.42-3.113 1.157-4.418',
  trash:
    'm14.74 9-.346 9m-4.788 0L9.26 9m9.968-3.21c.342.052.682.107 1.022.166M19.228 5.79 18.16 19.673a2.25 2.25 0 0 1-2.244 2.077H8.084a2.25 2.25 0 0 1-2.244-2.077L4.772 5.79m14.456 0a48.108 48.108 0 0 0-3.478-.397m-12 .562c.34-.059.68-.114 1.022-.165m0 0a48.11 48.11 0 0 1 3.478-.397m7.5 0v-.916c0-1.18-.91-2.164-2.09-2.201a51.964 51.964 0 0 0-3.32 0c-1.18.037-2.09 1.022-2.09 2.201v.916m7.5 0a48.667 48.667 0 0 0-7.5 0',
}

type TypeFilter = 'all' | 'email' | 'domain'
type StatusFilter = 'all' | 'approved' | 'pending'

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
      className={`flex h-3.5 w-3.5 shrink-0 items-center justify-center rounded border transition-colors ${
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

export function DncList({ entries }: { entries: DncEntry[] }) {
  const t = useT()
  const [query, setQuery] = useState('')
  const [type, setType] = useState<TypeFilter>('all')
  const [status, setStatus] = useState<StatusFilter>('all')
  const [selection, setSelection] = useState<Set<string>>(new Set())
  const [page, setPage] = useState(0)
  const [error, setError] = useState<string | null>(null)
  const [pending, startTransition] = useTransition()

  const counts = useMemo(
    () => ({
      all: entries.length,
      email: entries.filter((e) => e.entry_type === 'email').length,
      domain: entries.filter((e) => e.entry_type === 'domain').length,
    }),
    [entries]
  )

  const filtered = useMemo(() => {
    const q = query.trim().toLowerCase()
    return entries.filter((e) => {
      if (type !== 'all' && e.entry_type !== type) return false
      if (status === 'approved' && !e.approved) return false
      if (status === 'pending' && e.approved) return false
      if (q && !e.value.includes(q)) return false
      return true
    })
  }, [entries, query, type, status])

  const totalPages = Math.max(1, Math.ceil(filtered.length / PAGE_SIZE))
  const safePage = Math.min(page, totalPages - 1)
  const pageItems = filtered.slice(safePage * PAGE_SIZE, (safePage + 1) * PAGE_SIZE)
  const allOnPageSelected = pageItems.length > 0 && pageItems.every((e) => selection.has(e.id))

  const typeFilters: [TypeFilter, string][] = [
    ['all', t('dnc.filterAll')],
    ['email', t('dnc.filterEmails')],
    ['domain', t('dnc.filterDomains')],
  ]

  function toggle(id: string) {
    setSelection((cur) => {
      const next = new Set(cur)
      if (next.has(id)) next.delete(id)
      else next.add(id)
      return next
    })
  }

  function remove(ids: string[], question: string) {
    if (ids.length === 0) return
    if (!confirm(question)) return
    setError(null)
    startTransition(async () => {
      const res = await removeDncEntries(ids)
      if ('error' in res) {
        setError(res.error)
        return
      }
      setSelection(new Set())
    })
  }

  return (
    <section className="flex min-w-0 flex-1 flex-col overflow-hidden rounded-panel border border-line bg-panel">
      {/* Zoeken en filteren — de oude lijst had geen van beide */}
      <div className="flex shrink-0 flex-wrap items-center gap-2.5 border-b border-line px-4 py-3">
        <label className="flex h-[34px] min-w-[180px] flex-1 items-center gap-[9px] rounded-control bg-track px-[11px] focus-within:ring-2 focus-within:ring-[var(--brand-color)]">
          <svg
            viewBox="0 0 24 24"
            fill="none"
            stroke="currentColor"
            strokeWidth={1.7}
            strokeLinecap="round"
            strokeLinejoin="round"
            className="h-[15px] w-[15px] shrink-0 text-faint"
            aria-hidden
          >
            <path d="m21 21-5.197-5.197m0 0A7.5 7.5 0 1 0 5.196 5.196a7.5 7.5 0 0 0 10.607 10.607Z" />
          </svg>
          <input
            type="search"
            value={query}
            onChange={(e) => {
              setQuery(e.target.value)
              setPage(0)
            }}
            placeholder={t('dnc.searchPlaceholder')}
            aria-label={t('dnc.searchPlaceholder')}
            className="w-full bg-transparent text-[12.5px] outline-none placeholder:text-faint"
          />
        </label>

        <div className="flex shrink-0 gap-0.5 rounded-[9px] bg-track p-[3px]">
          {typeFilters.map(([key, label]) => (
            <button
              key={key}
              type="button"
              onClick={() => {
                setType(key)
                setPage(0)
              }}
              aria-pressed={type === key}
              className={`flex items-center gap-[7px] whitespace-nowrap rounded-[7px] px-[11px] py-[5px] text-xs transition-colors ${
                type === key ? 'bg-panel font-semibold' : 'font-medium text-muted'
              }`}
            >
              {label}
              <span className="text-[10.5px] tabular-nums text-faint">
                {counts[key].toLocaleString('nl-NL')}
              </span>
            </button>
          ))}
        </div>

        <select
          value={status}
          onChange={(e) => {
            setStatus(e.target.value as StatusFilter)
            setPage(0)
          }}
          aria-label={t('dnc.statusColumn')}
          className="h-[34px] shrink-0 rounded-control border border-line bg-panel px-3 text-[12.5px] font-medium text-muted outline-none"
        >
          <option value="all">{t('dnc.statusAll')}</option>
          <option value="approved">{t('dnc.statusApproved')}</option>
          <option value="pending">{t('dnc.statusPending')}</option>
        </select>
      </div>

      {error && (
        <p className="shrink-0 border-b border-line bg-[color-mix(in_oklab,var(--color-neg)_8%,transparent)] px-4 py-2 text-[12.5px] text-neg">
          {error}
        </p>
      )}

      {/* Kolomkoppen */}
      <div className="flex shrink-0 items-center gap-3 border-b border-line bg-track px-4 py-[9px] text-[10.5px] font-semibold uppercase tracking-[0.09em] text-faint">
        <Checkbox
          checked={allOnPageSelected}
          onChange={() =>
            setSelection(allOnPageSelected ? new Set() : new Set(pageItems.map((e) => e.id)))
          }
          label={t('dnc.selectAllOnPage')}
        />
        <span className="min-w-0 flex-1">{t('dnc.columnValue')}</span>
        <span className="hidden w-[126px] shrink-0 sm:block">{t('dnc.statusColumn')}</span>
        <span className="hidden w-[88px] shrink-0 sm:block">{t('dnc.columnDate')}</span>
        <span className="w-7 shrink-0" />
      </div>

      <div className="min-h-0 flex-1 overflow-y-auto">
        {pageItems.length === 0 ? (
          <div className="px-6 py-12 text-center">
            <h3 className="text-[13.5px] font-semibold">
              {entries.length === 0 ? t('dnc.listNothing') : t('dnc.listNoResults')}
            </h3>
            <p className="mt-1 text-[12.5px] text-muted">
              {entries.length === 0 ? t('dnc.listNothingHint') : t('dnc.listNoResultsHint')}
            </p>
          </div>
        ) : (
          pageItems.map((entry) => {
            const selected = selection.has(entry.id)
            const isDomain = entry.entry_type === 'domain'
            const tone = entry.approved ? 'var(--color-pos)' : 'var(--color-warn)'

            return (
              <div
                key={entry.id}
                className={`flex items-center gap-3 border-b border-line px-4 py-[11px] transition-colors ${
                  selected ? 'bg-[var(--brand-06)]' : ''
                }`}
              >
                <Checkbox
                  checked={selected}
                  onChange={() => toggle(entry.id)}
                  label={t('dnc.selectRow', { value: entry.value })}
                />

                <div className="flex min-w-0 flex-1 items-center gap-2.5">
                  {/* Domeinen zien er anders uit dan losse adressen: ze raken
                      in één klap een heel bedrijf. */}
                  <span
                    className={`flex h-[26px] w-[26px] shrink-0 items-center justify-center rounded-[7px] ${
                      isDomain ? 'bg-[var(--brand-12)] text-brand-ink' : 'bg-track text-faint'
                    }`}
                  >
                    <svg
                      viewBox="0 0 24 24"
                      fill="none"
                      stroke="currentColor"
                      strokeWidth={1.7}
                      strokeLinecap="round"
                      strokeLinejoin="round"
                      className="h-3.5 w-3.5"
                      aria-hidden
                    >
                      <path d={isDomain ? ICON.domain : ICON.at} />
                    </svg>
                  </span>
                  <div className="min-w-0">
                    <div className="truncate text-[12.5px] font-semibold tracking-[-0.01em]">
                      {entry.value}
                    </div>
                    {isDomain && (
                      <div className="mt-0.5 truncate text-[11px] text-faint">
                        {t('dnc.wholeDomain')}
                      </div>
                    )}
                  </div>
                </div>

                <span className="hidden w-[126px] shrink-0 sm:block">
                  <span
                    className="inline-flex items-center gap-1.5 whitespace-nowrap rounded-[5px] px-2 py-[3px] text-[10.5px] font-semibold"
                    style={{
                      color: tone,
                      background: `color-mix(in oklab, ${tone} 12%, transparent)`,
                    }}
                  >
                    <span
                      className="h-[5px] w-[5px] shrink-0 rounded-full"
                      style={{ background: tone }}
                    />
                    {entry.approved ? t('dnc.statusApproved') : t('dnc.statusPending')}
                  </span>
                </span>

                <span className="hidden w-[88px] shrink-0 text-[11.5px] tabular-nums text-faint sm:block">
                  {new Date(entry.created_at).toLocaleDateString('nl-NL', {
                    day: 'numeric',
                    month: 'short',
                  })}
                </span>

                <button
                  type="button"
                  onClick={() =>
                    remove([entry.id], t('dnc.removeConfirmSingular', { value: entry.value }))
                  }
                  disabled={pending}
                  title={t('dnc.removeTooltip')}
                  aria-label={t('dnc.removeTooltip')}
                  className="flex h-7 w-7 shrink-0 items-center justify-center rounded-[7px] text-faint transition-colors hover:bg-[color-mix(in_oklab,var(--color-neg)_10%,transparent)] hover:text-neg disabled:opacity-40"
                >
                  <svg
                    viewBox="0 0 24 24"
                    fill="none"
                    stroke="currentColor"
                    strokeWidth={1.7}
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    className="h-3.5 w-3.5"
                    aria-hidden
                  >
                    <path d={ICON.trash} />
                  </svg>
                </button>
              </div>
            )
          })
        )}
      </div>

      {/* Bulkbalk — binnen het paneel zodat de lijst zijn hoogte houdt */}
      {selection.size > 0 && (
        <div className="flex shrink-0 flex-wrap items-center gap-2.5 border-t border-line bg-ink px-3.5 py-2.5 text-white">
          <span className="inline-flex h-[22px] shrink-0 items-center rounded-md bg-white/[0.14] px-[7px] text-[11px] font-bold tabular-nums">
            {selection.size}
          </span>
          <span className="shrink-0 text-[12.5px] font-medium">{t('dnc.selectedCount')}</span>
          <div className="h-[18px] w-px shrink-0 bg-white/[0.16]" />
          <button
            type="button"
            onClick={() =>
              remove([...selection], t('dnc.removeConfirm', { count: selection.size }))
            }
            disabled={pending}
            className="flex h-7 shrink-0 items-center gap-[7px] whitespace-nowrap rounded-[7px] border border-[color-mix(in_oklab,var(--color-neg)_55%,transparent)] bg-[color-mix(in_oklab,var(--color-neg)_22%,transparent)] px-[11px] text-xs font-semibold transition-colors hover:bg-[color-mix(in_oklab,var(--color-neg)_34%,transparent)] disabled:opacity-60"
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
              <path d={ICON.trash} />
            </svg>
            {t('dnc.removeSelected')}
          </button>
          <span className="hidden shrink-0 text-[11.5px] text-white/55 md:block">
            {t('dnc.removeSelectedHint')}
          </span>
          <button
            type="button"
            onClick={() => setSelection(new Set())}
            className="ml-auto shrink-0 whitespace-nowrap text-xs font-medium text-white/60 transition-colors hover:text-white"
          >
            {t('dnc.clearSelection')}
          </button>
        </div>
      )}

      {/* Paginering — bij 1.000+ regels na een CSV-import onmisbaar */}
      {filtered.length > PAGE_SIZE && (
        <div className="flex shrink-0 items-center gap-3.5 border-t border-line px-4 py-2.5">
          <span className="text-xs tabular-nums text-muted">
            {t('dnc.range', {
              from: (safePage * PAGE_SIZE + 1).toLocaleString('nl-NL'),
              to: Math.min((safePage + 1) * PAGE_SIZE, filtered.length).toLocaleString('nl-NL'),
              total: filtered.length.toLocaleString('nl-NL'),
            })}
          </span>
          <span className="flex-1" />
          <div className="flex items-center gap-[3px]">
            <button
              type="button"
              onClick={() => setPage(Math.max(0, safePage - 1))}
              disabled={safePage === 0}
              aria-label={t('contacts.paginationPrevious')}
              className="flex h-7 w-7 items-center justify-center rounded-[7px] border border-line bg-panel text-faint transition-colors hover:bg-[var(--brand-08)] disabled:opacity-40"
            >
              <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2} strokeLinecap="round" strokeLinejoin="round" className="h-3.5 w-3.5" aria-hidden>
                <path d="M15.75 19.5 8.25 12l7.5-7.5" />
              </svg>
            </button>
            <span className="px-2 text-xs tabular-nums text-muted">
              {t('dnc.pageOf', { current: safePage + 1, total: totalPages })}
            </span>
            <button
              type="button"
              onClick={() => setPage(Math.min(totalPages - 1, safePage + 1))}
              disabled={safePage >= totalPages - 1}
              aria-label={t('contacts.paginationNext')}
              className="flex h-7 w-7 items-center justify-center rounded-[7px] border border-line bg-panel text-faint transition-colors hover:bg-[var(--brand-08)] disabled:opacity-40"
            >
              <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2} strokeLinecap="round" strokeLinejoin="round" className="h-3.5 w-3.5" aria-hidden>
                <path d="m8.25 4.5 7.5 7.5-7.5 7.5" />
              </svg>
            </button>
          </div>
        </div>
      )}
    </section>
  )
}
