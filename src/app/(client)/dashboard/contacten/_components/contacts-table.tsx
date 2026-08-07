'use client'

import { useCallback, useEffect, useMemo, useState, useTransition } from 'react'
import { useRouter } from 'next/navigation'
import { bulkImportDnc } from '@/lib/actions/dnc-actions'
import { useT } from '@/lib/i18n/client'
import { CompanyLogo, domainOf } from './company-logo'
import { ContactDetail } from './contact-detail'

export type ContactRow = { id: string; data: Record<string, string> }
export type ColumnDef = { id: string; name: string }

interface Props {
  contacts: ContactRow[]
  columns: ColumnDef[]
  total: number
  currentPage: number
  pageSize: number
  search: string
  /** Kolom-id's die naam en e-mail bevatten — die staan in de vaste kolom. */
  nameColumnId: string
  emailColumnId: string
  companyColumnId?: string
}

const PAGE_SIZES = [50, 100, 250]
const DEFAULT_VISIBLE = 5
const STORAGE_KEY = 'contacten:kolommen'

/** Ruwe vorm-controle; het echte oordeel velt het zod-schema op de server. */
const EMAIL_SHAPE = /^[^\s@]+@[^\s@]+\.[^\s@]+$/

function csvEscape(value: string): string {
  return /[",\n;]/.test(value) ? `"${value.replace(/"/g, '""')}"` : value
}

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
      onClick={(e) => {
        e.stopPropagation()
        onChange()
      }}
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

export function ContactsTable({
  contacts,
  columns,
  total,
  currentPage,
  pageSize,
  search,
  nameColumnId,
  emailColumnId,
  companyColumnId,
}: Props) {
  const t = useT()
  const router = useRouter()

  const [query, setQuery] = useState(search)
  const [selection, setSelection] = useState<Set<string>>(new Set())
  const [openId, setOpenId] = useState<string | null>(null)
  const [dense, setDense] = useState(false)
  const [columnMenu, setColumnMenu] = useState(false)
  const [notice, setNotice] = useState<{ tone: 'pos' | 'neg'; text: string } | null>(null)
  const [dncPending, startDnc] = useTransition()

  /* Kolommen die náást de vaste naam-kolom staan. */
  const dataColumns = useMemo(
    () => columns.filter((c) => c.id !== nameColumnId && c.id !== emailColumnId),
    [columns, nameColumnId, emailColumnId]
  )

  const [visible, setVisible] = useState<Set<string>>(
    () => new Set(dataColumns.slice(0, DEFAULT_VISIBLE).map((c) => c.id))
  )

  /* Kolomkeuze onthouden — anders kiest de klant elke sessie opnieuw. Kan pas
     na hydratatie: localStorage bestaat niet tijdens server-rendering. */
  useEffect(() => {
    const saved = localStorage.getItem(STORAGE_KEY)
    if (!saved) return
    try {
      const ids: string[] = JSON.parse(saved)
      const known = ids.filter((id) => dataColumns.some((c) => c.id === id))
      if (known.length) setVisible(new Set(known))
    } catch {
      /* onleesbaar opgeslagen keuze — dan maar de standaard */
    }
    // Bewust alleen bij het aankoppelen: daarna is de keuze van de gebruiker leidend.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  function updateVisible(next: Set<string>) {
    setVisible(next)
    localStorage.setItem(STORAGE_KEY, JSON.stringify([...next]))
  }

  const shownColumns = dataColumns.filter((c) => visible.has(c.id))

  /* Vulpercentage per kolom, berekend uit de rijen die al op het scherm staan —
     geen extra databasebevraging. Geldt dus voor deze pagina, niet voor het
     hele bestand; de tekst in de kolomkiezer zegt dat er expliciet bij. */
  const fillRates = useMemo(() => {
    if (contacts.length === 0) return {} as Record<string, number>
    const rates: Record<string, number> = {}
    for (const col of dataColumns) {
      const filled = contacts.filter((c) => (c.data[col.id] ?? '').trim() !== '').length
      rates[col.id] = Math.round((filled / contacts.length) * 100)
    }
    return rates
  }, [contacts, dataColumns])

  /* Navigatie via de URL, zodat een zoekopdracht deelbaar is. */
  const navigate = useCallback(
    (patch: { page?: number; q?: string; per?: number }) => {
      const next = new URLSearchParams()
      const page = patch.page ?? currentPage
      const q = patch.q ?? search
      const per = patch.per ?? pageSize
      if (page > 0) next.set('page', String(page))
      if (q) next.set('q', q)
      if (per !== PAGE_SIZES[0]) next.set('per', String(per))
      const qs = next.toString()
      router.push(`/dashboard/contacten${qs ? `?${qs}` : ''}`)
    },
    [currentPage, search, pageSize, router]
  )

  useEffect(() => {
    if (query === search) return
    const timer = setTimeout(() => navigate({ q: query, page: 0 }), 300)
    return () => clearTimeout(timer)
  }, [query, search, navigate])

  /* Sneltoets: / focust het zoekveld. */
  useEffect(() => {
    function onKey(e: KeyboardEvent) {
      if (e.key !== '/' || e.metaKey || e.ctrlKey || e.altKey) return
      const el = e.target as HTMLElement | null
      if (el && /^(INPUT|TEXTAREA|SELECT)$/.test(el.tagName)) return
      e.preventDefault()
      document.getElementById('contact-search')?.focus()
    }
    window.addEventListener('keydown', onKey)
    return () => window.removeEventListener('keydown', onKey)
  }, [])

  const totalPages = Math.max(1, Math.ceil(total / pageSize))
  const from = total === 0 ? 0 : currentPage * pageSize + 1
  const to = Math.min((currentPage + 1) * pageSize, total)
  const openContact = contacts.find((c) => c.id === openId) ?? null
  const openIndex = openContact ? contacts.indexOf(openContact) : -1
  const cellPad = dense ? 'py-[7px]' : 'py-[11px]'
  const allOnPageSelected =
    contacts.length > 0 && contacts.every((c) => selection.has(c.id))

  function toggle(id: string) {
    setSelection((cur) => {
      const next = new Set(cur)
      if (next.has(id)) next.delete(id)
      else next.add(id)
      return next
    })
  }

  function toggleAllOnPage() {
    setSelection(allOnPageSelected ? new Set() : new Set(contacts.map((c) => c.id)))
  }

  const selectedContacts = contacts.filter((c) => selection.has(c.id))

  function exportSelection() {
    const rows = selectedContacts.length > 0 ? selectedContacts : contacts
    const header = columns.map((c) => csvEscape(c.name)).join(';')
    const body = rows.map((row) =>
      columns.map((c) => csvEscape(row.data[c.id] ?? '')).join(';')
    )
    const csv = [header, ...body].join('\r\n')
    const blob = new Blob([`﻿${csv}`], { type: 'text/csv;charset=utf-8;' })
    const url = URL.createObjectURL(blob)
    const link = document.createElement('a')
    link.href = url
    link.download = `contacten-${new Date().toISOString().slice(0, 10)}.csv`
    link.click()
    URL.revokeObjectURL(url)
  }

  function addSelectionToDnc() {
    const emails = [
      ...new Set(
        selectedContacts
          .map((c) => (c.data[emailColumnId] ?? '').trim().toLowerCase())
          .filter((e) => EMAIL_SHAPE.test(e))
      ),
    ]
    if (emails.length === 0) {
      setNotice({ tone: 'neg', text: t('contacts.dncNoEmails') })
      return
    }
    const question =
      emails.length === 1
        ? t('contacts.dncConfirmSingular', { email: emails[0] })
        : t('contacts.dncConfirm', { count: emails.length })
    if (!confirm(question)) return

    setNotice(null)
    startDnc(async () => {
      const res = await bulkImportDnc(emails)
      if ('error' in res) {
        setNotice({ tone: 'neg', text: res.error || t('contacts.dncError') })
        return
      }
      setNotice({
        tone: 'pos',
        text: t('contacts.dncDone', { count: res.imported }),
      })
      setSelection(new Set())
    })
  }

  const pageWindow = Array.from({ length: Math.min(5, totalPages) }, (_, i) => {
    const start = Math.max(0, Math.min(currentPage - 2, totalPages - 5))
    return start + i
  })

  return (
    <div className="flex flex-col">
      {/* Toolbar */}
      <div className="flex flex-wrap items-center gap-2.5">
        <label className="flex h-[34px] min-w-[240px] flex-1 items-center gap-[9px] rounded-control border border-line bg-panel px-[11px] focus-within:ring-2 focus-within:ring-[var(--brand-color)]">
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
            id="contact-search"
            type="search"
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder={t('contacts.searchPlaceholder')}
            aria-label={t('contacts.searchPlaceholder')}
            className="w-full bg-transparent text-[12.5px] outline-none placeholder:text-faint [&::-webkit-search-cancel-button]:hidden"
          />
          {search ? (
            <>
              <span className="shrink-0 text-[11px] tabular-nums text-faint">
                {t('contacts.resultsCount', { count: total.toLocaleString('nl-NL') })}
              </span>
              <button
                type="button"
                onClick={() => setQuery('')}
                aria-label={t('contacts.clearSearchLabel')}
                className="shrink-0 text-faint transition-colors hover:text-fg"
              >
                <svg
                  viewBox="0 0 24 24"
                  fill="none"
                  stroke="currentColor"
                  strokeWidth={2.2}
                  strokeLinecap="round"
                  className="h-[13px] w-[13px]"
                  aria-hidden
                >
                  <path d="M6 18 18 6M6 6l12 12" />
                </svg>
              </button>
            </>
          ) : (
            <kbd className="hidden shrink-0 rounded border border-line px-[5px] py-px font-mono text-[10px] font-semibold text-faint sm:block">
              /
            </kbd>
          )}
        </label>

        {/* Kolomkiezer — de tabel toonde eerder hard de eerste vijf velden */}
        <div className="relative shrink-0">
          <button
            type="button"
            onClick={() => setColumnMenu((v) => !v)}
            aria-expanded={columnMenu}
            className="flex h-[34px] items-center gap-2 whitespace-nowrap rounded-control border border-line bg-panel px-3 text-[12.5px] font-medium transition-colors hover:bg-[var(--brand-08)]"
          >
            <svg
              viewBox="0 0 24 24"
              fill="none"
              stroke="currentColor"
              strokeWidth={1.7}
              strokeLinecap="round"
              strokeLinejoin="round"
              className="h-[15px] w-[15px] text-muted"
              aria-hidden
            >
              <path d="M3.75 6A2.25 2.25 0 0 1 6 3.75h2.25A2.25 2.25 0 0 1 10.5 6v12a2.25 2.25 0 0 1-2.25 2.25H6A2.25 2.25 0 0 1 3.75 18V6ZM13.5 6a2.25 2.25 0 0 1 2.25-2.25H18A2.25 2.25 0 0 1 20.25 6v12A2.25 2.25 0 0 1 18 20.25h-2.25A2.25 2.25 0 0 1 13.5 18V6Z" />
            </svg>
            {t('contacts.columns')}
            <span className="inline-flex h-4 min-w-4 items-center justify-center rounded-full bg-brand px-[5px] text-[10.5px] font-semibold tabular-nums text-white">
              {shownColumns.length + 1}
            </span>
          </button>

          {columnMenu && (
            <>
              <button
                type="button"
                aria-label={t('contacts.columns')}
                onClick={() => setColumnMenu(false)}
                className="fixed inset-0 z-20 cursor-default"
              />
              <div className="absolute right-0 top-10 z-30 w-[250px] rounded-[10px] border border-line bg-panel p-1.5 shadow-[0_14px_34px_-14px_rgba(0,0,0,0.34)]">
                <div className="px-2.5 pb-[7px] pt-2 text-[10px] font-semibold uppercase tracking-[0.14em] text-faint">
                  {t('contacts.columnsShow')}
                </div>
                <div className="max-h-[260px] overflow-y-auto">
                  {dataColumns.map((col) => {
                    const on = visible.has(col.id)
                    const rate = fillRates[col.id]
                    return (
                      <button
                        key={col.id}
                        type="button"
                        onClick={() => {
                          const next = new Set(visible)
                          if (on) next.delete(col.id)
                          else next.add(col.id)
                          updateVisible(next)
                        }}
                        className="flex w-full items-center gap-[9px] rounded-[7px] px-2.5 py-[7px] text-[12.5px] transition-colors hover:bg-[var(--brand-08)]"
                      >
                        <span
                          className={`flex h-3.5 w-3.5 shrink-0 items-center justify-center rounded border ${
                            on ? 'border-brand bg-brand' : 'border-line'
                          }`}
                        >
                          {on && (
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
                        </span>
                        <span className="flex-1 truncate text-left">{col.name}</span>
                        {rate != null && (
                          <span
                            className="shrink-0 text-[10px] tabular-nums text-faint"
                            title={t('contacts.columnsFilled', { percent: rate })}
                          >
                            {rate}%
                          </span>
                        )}
                      </button>
                    )
                  })}
                </div>
                <div className="mt-1 flex gap-3.5 border-t border-line px-2.5 pb-1 pt-[7px]">
                  <button
                    type="button"
                    onClick={() => updateVisible(new Set(dataColumns.map((c) => c.id)))}
                    className="text-[11.5px] font-medium text-brand"
                  >
                    {t('contacts.columnsAll')}
                  </button>
                  <button
                    type="button"
                    onClick={() =>
                      updateVisible(
                        new Set(dataColumns.slice(0, DEFAULT_VISIBLE).map((c) => c.id))
                      )
                    }
                    className="text-[11.5px] font-medium text-muted"
                  >
                    {t('contacts.columnsDefault')}
                  </button>
                </div>
              </div>
            </>
          )}
        </div>

        {/* Dichtheid */}
        <div className="flex shrink-0 gap-0.5 rounded-[9px] border border-line bg-panel p-[3px]">
          {[
            { d: false, title: t('contacts.rowsSpacious'), path: 'M3.75 5.25h16.5M3.75 12h16.5M3.75 18.75h16.5' },
            { d: true, title: t('contacts.rowsCompact'), path: 'M3.75 4.5h16.5M3.75 9h16.5M3.75 13.5h16.5M3.75 18h16.5' },
          ].map((opt) => (
            <button
              key={opt.title}
              type="button"
              title={opt.title}
              aria-label={opt.title}
              aria-pressed={dense === opt.d}
              onClick={() => setDense(opt.d)}
              className={`flex h-[26px] w-[30px] items-center justify-center rounded-[7px] transition-colors ${
                dense === opt.d ? 'bg-brand text-white' : 'text-faint hover:bg-[var(--brand-08)]'
              }`}
            >
              <svg
                viewBox="0 0 24 24"
                fill="none"
                stroke="currentColor"
                strokeWidth={1.9}
                strokeLinecap="round"
                className="h-[15px] w-[15px]"
                aria-hidden
              >
                <path d={opt.path} />
              </svg>
            </button>
          ))}
        </div>
      </div>

      {notice && (
        <p
          className={`mt-3 rounded-control border px-3 py-2 text-[12.5px] ${
            notice.tone === 'pos'
              ? 'border-[color-mix(in_oklab,var(--color-pos)_30%,transparent)] bg-[color-mix(in_oklab,var(--color-pos)_10%,transparent)] text-pos'
              : 'border-[color-mix(in_oklab,var(--color-neg)_28%,transparent)] bg-[color-mix(in_oklab,var(--color-neg)_8%,transparent)] text-neg'
          }`}
        >
          {notice.text}
        </p>
      )}

      {/* Tabel + detail. Vaste hoogte omdat beide panelen intern scrollen. */}
      <div className="mt-3.5 flex h-[calc(100vh-16rem)] min-h-[460px] gap-4">
        <section className="flex min-w-0 flex-1 flex-col overflow-hidden rounded-panel border border-line bg-panel">
          <div className="min-h-0 flex-1 overflow-auto">
            {/* w-max zodat de kopbalk en de rijlijnen doorlopen tot de laatste
                kolom wanneer je horizontaal scrollt. */}
            <div className="w-max min-w-full">
              <div className="sticky top-0 z-[3] flex items-center border-b border-line bg-track">
                <div className="sticky left-0 z-[2] flex w-[282px] shrink-0 items-center gap-2.5 border-r border-line bg-track px-3.5 py-[9px] text-[10.5px] font-semibold uppercase tracking-[0.09em] text-faint">
                  <Checkbox
                    checked={allOnPageSelected}
                    onChange={toggleAllOnPage}
                    label={t('contacts.selectAllOnPage')}
                  />
                  {t('contacts.columnName')}
                </div>
                {shownColumns.map((col) => (
                  <div
                    key={col.id}
                    className="w-[168px] shrink-0 truncate px-3.5 py-[9px] text-[10.5px] font-semibold uppercase tracking-[0.09em] text-faint"
                    title={col.name}
                  >
                    {col.name}
                  </div>
                ))}
              </div>

              {contacts.map((contact) => {
                const selected = selection.has(contact.id)
                const isOpen = openId === contact.id
                const name = contact.data[nameColumnId] || '—'
                const email = contact.data[emailColumnId] || ''
                const company = companyColumnId ? contact.data[companyColumnId] : ''
                const bg = isOpen
                  ? 'bg-[var(--brand-07)]'
                  : selected
                    ? 'bg-[var(--brand-04)]'
                    : 'bg-panel'

                return (
                  <div
                    key={contact.id}
                    onClick={() => setOpenId(contact.id)}
                    className="flex cursor-pointer items-stretch border-b border-line"
                  >
                    <div
                      className={`sticky left-0 z-[1] flex w-[282px] shrink-0 items-center gap-2.5 border-r border-line px-3.5 ${cellPad} ${bg} ${
                        isOpen ? 'shadow-[inset_2px_0_0_var(--color-brand)]' : ''
                      }`}
                    >
                      <Checkbox
                        checked={selected}
                        onChange={() => toggle(contact.id)}
                        label={t('contacts.selectRow', { name })}
                      />
                      <CompanyLogo domain={domainOf(email)} label={company || name} />
                      <div className="min-w-0 flex-1">
                        <div className="truncate text-[12.5px] font-semibold tracking-[-0.01em]">
                          {name}
                        </div>
                        {email && (
                          <div className="mt-0.5 truncate text-[11px] text-faint">{email}</div>
                        )}
                      </div>
                    </div>

                    {shownColumns.map((col) => {
                      const v = contact.data[col.id]
                      return (
                        <div
                          key={col.id}
                          title={v || undefined}
                          className={`flex w-[168px] shrink-0 items-center truncate px-3.5 text-xs ${cellPad} ${bg} ${
                            v ? 'text-muted' : 'text-faint'
                          }`}
                        >
                          {v || '—'}
                        </div>
                      )
                    })}
                  </div>
                )
              })}

              {contacts.length === 0 && (
                <div className="px-6 py-12 text-center">
                  <h3 className="text-[15px] font-semibold">
                    {search ? t('contacts.noResults') : t('contacts.empty')}
                  </h3>
                  <p className="mt-1 text-[12.5px] text-muted">
                    {search ? t('contacts.noResultsHint') : t('contacts.emptyDescription')}
                  </p>
                </div>
              )}
            </div>
          </div>

          {/* Paginering */}
          <div className="flex shrink-0 flex-wrap items-center gap-3.5 border-t border-line px-4 py-2.5">
            <span className="text-xs tabular-nums text-muted">
              {t('contacts.range', {
                from: from.toLocaleString('nl-NL'),
                to: to.toLocaleString('nl-NL'),
                total: total.toLocaleString('nl-NL'),
              })}
            </span>
            <div className="flex items-center gap-[7px]">
              <span className="text-xs text-faint">{t('contacts.perPage')}</span>
              <div className="flex gap-0.5 rounded-[7px] border border-line p-0.5">
                {PAGE_SIZES.map((size) => (
                  <button
                    key={size}
                    type="button"
                    onClick={() => navigate({ per: size, page: 0 })}
                    className={`rounded-[5px] px-[9px] py-[3px] text-[11.5px] tabular-nums transition-colors ${
                      pageSize === size
                        ? 'bg-brand font-semibold text-white'
                        : 'font-medium text-muted hover:bg-[var(--brand-08)]'
                    }`}
                  >
                    {size}
                  </button>
                ))}
              </div>
            </div>
            <span className="flex-1" />
            <div className="flex items-center gap-[3px]">
              <button
                type="button"
                onClick={() => navigate({ page: currentPage - 1 })}
                disabled={currentPage === 0}
                aria-label={t('contacts.paginationPrevious')}
                className="flex h-7 w-7 items-center justify-center rounded-[7px] border border-line bg-panel text-faint transition-colors hover:bg-[var(--brand-08)] disabled:opacity-40"
              >
                <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2} strokeLinecap="round" strokeLinejoin="round" className="h-3.5 w-3.5" aria-hidden>
                  <path d="M15.75 19.5 8.25 12l7.5-7.5" />
                </svg>
              </button>
              {pageWindow.map((p) => (
                <button
                  key={p}
                  type="button"
                  onClick={() => navigate({ page: p })}
                  aria-current={p === currentPage ? 'page' : undefined}
                  className={`h-7 min-w-7 rounded-[7px] border px-2 text-xs tabular-nums transition-colors ${
                    p === currentPage
                      ? 'border-brand bg-[var(--brand-10)] font-semibold text-brand'
                      : 'border-line bg-panel font-medium text-muted hover:bg-[var(--brand-08)]'
                  }`}
                >
                  {p + 1}
                </button>
              ))}
              <button
                type="button"
                onClick={() => navigate({ page: currentPage + 1 })}
                disabled={currentPage >= totalPages - 1}
                aria-label={t('contacts.paginationNext')}
                className="flex h-7 w-7 items-center justify-center rounded-[7px] border border-line bg-panel text-faint transition-colors hover:bg-[var(--brand-08)] disabled:opacity-40"
              >
                <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2} strokeLinecap="round" strokeLinejoin="round" className="h-3.5 w-3.5" aria-hidden>
                  <path d="m8.25 4.5 7.5 7.5-7.5 7.5" />
                </svg>
              </button>
            </div>
          </div>
        </section>

        {openContact && (
          <ContactDetail
            contact={openContact}
            columns={columns}
            nameColumnId={nameColumnId}
            emailColumnId={emailColumnId}
            companyColumnId={companyColumnId}
            dncPending={dncPending}
            onAddToDnc={(email) => {
              if (!EMAIL_SHAPE.test(email)) {
                setNotice({ tone: 'neg', text: t('contacts.dncNoEmails') })
                return
              }
              if (!confirm(t('contacts.dncConfirmSingular', { email }))) return
              setNotice(null)
              startDnc(async () => {
                const res = await bulkImportDnc([email])
                setNotice(
                  'error' in res
                    ? { tone: 'neg', text: res.error || t('contacts.dncError') }
                    : { tone: 'pos', text: t('contacts.dncDone', { count: res.imported }) }
                )
              })
            }}
            onPrev={() => setOpenId(contacts[Math.max(openIndex - 1, 0)]?.id ?? null)}
            onNext={() =>
              setOpenId(contacts[Math.min(openIndex + 1, contacts.length - 1)]?.id ?? null)
            }
            onClose={() => setOpenId(null)}
          />
        )}
      </div>

      {/* Bulkbalk. Selectie geldt per pagina — wat niet geladen is, kan niet
          worden geëxporteerd of op DNC gezet. */}
      {selection.size > 0 && (
        <div className="mt-3.5 flex flex-wrap items-center gap-2.5 rounded-[11px] bg-ink px-3.5 py-2.5 text-white">
          <span className="inline-flex h-[22px] shrink-0 items-center rounded-md bg-white/[0.14] px-[7px] text-[11px] font-bold tabular-nums">
            {selection.size}
          </span>
          <span className="shrink-0 text-[12.5px] font-medium">
            {t('contacts.selectedCount')}
          </span>
          <div className="h-[18px] w-px shrink-0 bg-white/[0.16]" />

          <button
            type="button"
            onClick={exportSelection}
            className="flex h-7 shrink-0 items-center gap-[7px] whitespace-nowrap rounded-[7px] border border-white/[0.18] bg-white/[0.08] px-[11px] text-xs font-medium transition-colors hover:bg-white/[0.16]"
          >
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={1.8} strokeLinecap="round" strokeLinejoin="round" className="h-[13px] w-[13px]" aria-hidden>
              <path d="M3 16.5v2.25A2.25 2.25 0 0 0 5.25 21h13.5A2.25 2.25 0 0 0 21 18.75V16.5M16.5 12 12 16.5m0 0L7.5 12m4.5 4.5V3" />
            </svg>
            {t('contacts.exportSelection')}
          </button>

          <button
            type="button"
            onClick={addSelectionToDnc}
            disabled={dncPending}
            className="flex h-7 shrink-0 items-center gap-[7px] whitespace-nowrap rounded-[7px] border border-[color-mix(in_oklab,var(--color-warn)_55%,transparent)] bg-[color-mix(in_oklab,var(--color-warn)_22%,transparent)] px-[11px] text-xs font-semibold transition-colors hover:bg-[color-mix(in_oklab,var(--color-warn)_34%,transparent)] disabled:opacity-60"
          >
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={1.9} strokeLinecap="round" strokeLinejoin="round" className="h-[13px] w-[13px]" aria-hidden>
              <path d="M9 12.75 11.25 15 15 9.75m-3-7.036A11.959 11.959 0 0 1 3.598 6 11.99 11.99 0 0 0 3 9.749c0 5.592 3.824 10.29 9 11.623 5.176-1.332 9-6.03 9-11.622 0-1.31-.21-2.571-.598-3.751h-.152c-3.196 0-6.1-1.248-8.25-3.285Z" />
            </svg>
            {t('contacts.addToDnc')}
          </button>

          <button
            type="button"
            onClick={() => setSelection(new Set())}
            className="ml-auto shrink-0 whitespace-nowrap text-xs font-medium text-white/60 transition-colors hover:text-white"
          >
            {t('contacts.clearSelection')}
          </button>
        </div>
      )}
    </div>
  )
}
