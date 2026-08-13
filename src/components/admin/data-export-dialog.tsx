'use client'

import { useEffect, useMemo, useState } from 'react'
import { EXPORT_SECTIONS, type ExportSection } from '@/lib/export/sections'

// De export-knop met zijn dialoog. Bewust één component voor beide plekken
// (KIX-pagina en commissie-overzicht): de dialoog is de hele feature, de knop
// eromheen is alleen een andere jas.

export interface ExportClientOption {
  id: string
  companyName: string
  isHidden: boolean
}

interface Props {
  clients: ExportClientOption[]
  /** Eerste lead ooit; bepaalt waar de knop "Alles" begint. */
  earliestDate: string | null
  variant?: 'hero' | 'card'
}

function ymd(d: Date): string {
  const y = d.getFullYear()
  const m = String(d.getMonth() + 1).padStart(2, '0')
  const day = String(d.getDate()).padStart(2, '0')
  return `${y}-${m}-${day}`
}

function formatNl(date: string): string {
  const [y, m, d] = date.split('-')
  return y && m && d ? `${d}-${m}-${y}` : date
}

const ALL_SECTIONS = EXPORT_SECTIONS.map((s) => s.id)

export function DataExportDialog({ clients, earliestDate, variant = 'hero' }: Props) {
  const [open, setOpen] = useState(false)

  return (
    <>
      {variant === 'hero' ? (
        <button
          type="button"
          onClick={() => setOpen(true)}
          className="group relative isolate w-full overflow-hidden rounded-3xl bg-gradient-to-br from-emerald-500 via-teal-500 to-cyan-600 p-7 text-left text-white shadow-xl shadow-teal-500/25 transition-all duration-300 hover:-translate-y-1 hover:shadow-2xl hover:shadow-teal-500/40"
        >
          <div className="pointer-events-none absolute -right-16 -top-16 h-48 w-48 rounded-full bg-white/20 blur-3xl transition-opacity group-hover:opacity-60" />
          <div className="relative flex items-center gap-5">
            <div className="flex h-16 w-16 flex-shrink-0 items-center justify-center rounded-2xl bg-white/15 backdrop-blur transition-transform group-hover:scale-110">
              <svg className="h-8 w-8" fill="none" viewBox="0 0 24 24" strokeWidth={1.8} stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" d="M3 16.5v2.25A2.25 2.25 0 0 0 5.25 21h13.5A2.25 2.25 0 0 0 21 18.75V16.5M16.5 12 12 16.5m0 0L7.5 12m4.5 4.5V3" />
              </svg>
            </div>
            <div className="min-w-0 flex-1">
              <h2 className="text-2xl font-bold tracking-tight">Data exporteren</h2>
              <p className="mt-1 text-sm opacity-90">
                Omzet, kosten, winst en leads over elke periode — als Excel met tabbladen.
              </p>
            </div>
            <svg className="h-6 w-6 flex-shrink-0 opacity-80 transition-transform group-hover:translate-x-1" fill="none" viewBox="0 0 24 24" strokeWidth={2.5} stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" d="M13.5 4.5 21 12m0 0-7.5 7.5M21 12H3" />
            </svg>
          </div>
        </button>
      ) : (
        <button
          type="button"
          onClick={() => setOpen(true)}
          className="group relative isolate flex min-h-[240px] w-full flex-col justify-between overflow-hidden rounded-3xl bg-gradient-to-br from-emerald-500 via-teal-500 to-cyan-600 p-8 text-left text-white shadow-2xl shadow-teal-500/30 transition-all duration-300 hover:-translate-y-2 hover:shadow-2xl hover:shadow-teal-500/40"
        >
          <div className="pointer-events-none absolute -right-20 -top-20 h-56 w-56 rounded-full bg-white/20 blur-3xl transition-opacity group-hover:opacity-50" />
          <div className="pointer-events-none absolute -left-10 bottom-0 h-48 w-48 rounded-full bg-white/10 blur-3xl" />
          <div className="relative w-fit rounded-2xl bg-white/15 p-3 backdrop-blur transition-transform group-hover:scale-110">
            <svg className="h-12 w-12" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" d="M3 16.5v2.25A2.25 2.25 0 0 0 5.25 21h13.5A2.25 2.25 0 0 0 21 18.75V16.5M16.5 12 12 16.5m0 0L7.5 12m4.5 4.5V3" />
            </svg>
          </div>
          <div className="relative">
            <h2 className="text-2xl font-bold tracking-tight md:text-3xl">Data export</h2>
            <p className="mt-2 max-w-sm text-sm opacity-90">
              Alles uit de commissiecontrole naar Excel: per dag, per klant, per categorie, plus de losse leads.
            </p>
            <div className="mt-4 inline-flex items-center gap-2 text-sm font-semibold opacity-90 transition-all group-hover:translate-x-1 group-hover:opacity-100">
              Openen
              <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" strokeWidth={2.5} stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" d="M13.5 4.5 21 12m0 0-7.5 7.5M21 12H3" />
              </svg>
            </div>
          </div>
        </button>
      )}

      {open && (
        <ExportModal clients={clients} earliestDate={earliestDate} onClose={() => setOpen(false)} />
      )}
    </>
  )
}

function ExportModal({
  clients,
  earliestDate,
  onClose,
}: {
  clients: ExportClientOption[]
  earliestDate: string | null
  onClose: () => void
}) {
  const today = ymd(new Date())
  const monthStart = today.slice(0, 8) + '01'

  const [from, setFrom] = useState(monthStart)
  const [to, setTo] = useState(today)
  const [allClients, setAllClients] = useState(true)
  const [selected, setSelected] = useState<Set<string>>(new Set())
  const [clientSearch, setClientSearch] = useState('')
  const [sections, setSections] = useState<ExportSection[]>(ALL_SECTIONS)
  const [includeRejected, setIncludeRejected] = useState(true)
  const [isBusy, setIsBusy] = useState(false)
  const [error, setError] = useState<string | null>(null)

  // Escape sluit de dialoog, en de pagina eronder scrollt niet mee.
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') onClose()
    }
    document.addEventListener('keydown', onKey)
    const previousOverflow = document.body.style.overflow
    document.body.style.overflow = 'hidden'
    return () => {
      document.removeEventListener('keydown', onKey)
      document.body.style.overflow = previousOverflow
    }
  }, [onClose])

  const presets: Array<{ label: string; compute: () => [string, string] }> = useMemo(() => {
    const base: Array<{ label: string; compute: () => [string, string] }> = [
      {
        label: 'Deze week',
        compute: () => {
          const now = new Date()
          const start = new Date(now)
          // Maandag als eerste dag; zondag (0) telt als het einde van de vorige week.
          const offset = (now.getDay() + 6) % 7
          start.setDate(now.getDate() - offset)
          return [ymd(start), ymd(now)]
        },
      },
      {
        label: 'Deze maand',
        compute: () => {
          const now = new Date()
          return [ymd(new Date(now.getFullYear(), now.getMonth(), 1)), ymd(now)]
        },
      },
      {
        label: 'Vorige maand',
        compute: () => {
          const now = new Date()
          return [
            ymd(new Date(now.getFullYear(), now.getMonth() - 1, 1)),
            ymd(new Date(now.getFullYear(), now.getMonth(), 0)),
          ]
        },
      },
      {
        label: 'Laatste 3 maanden',
        compute: () => {
          const now = new Date()
          return [ymd(new Date(now.getFullYear(), now.getMonth() - 2, 1)), ymd(now)]
        },
      },
      {
        label: 'Dit jaar',
        compute: () => {
          const now = new Date()
          return [ymd(new Date(now.getFullYear(), 0, 1)), ymd(now)]
        },
      },
    ]
    if (earliestDate) {
      base.push({ label: 'Alles', compute: () => [earliestDate, ymd(new Date())] })
    }
    return base
  }, [earliestDate])

  const sortedClients = useMemo(
    () => [...clients].sort((a, b) => a.companyName.localeCompare(b.companyName)),
    [clients]
  )

  const visibleClients = useMemo(() => {
    const needle = clientSearch.trim().toLowerCase()
    if (!needle) return sortedClients
    return sortedClients.filter((c) => c.companyName.toLowerCase().includes(needle))
  }, [sortedClients, clientSearch])

  const toggleClient = (id: string) => {
    setSelected((prev) => {
      const next = new Set(prev)
      if (next.has(id)) next.delete(id)
      else next.add(id)
      return next
    })
  }

  const toggleSection = (id: ExportSection) => {
    setSections((prev) => (prev.includes(id) ? prev.filter((s) => s !== id) : [...prev, id]))
  }

  const clientCount = allClients ? clients.length : selected.size
  const rangeValid = from !== '' && to !== '' && from <= to
  const canDownload = rangeValid && sections.length > 0 && clientCount > 0 && !isBusy

  const handleDownload = async () => {
    setError(null)
    setIsBusy(true)
    try {
      const response = await fetch('/api/admin/export', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          from,
          to,
          clientIds: allClients ? [] : Array.from(selected),
          sections,
          includeRejected,
        }),
      })

      if (!response.ok) {
        let message = 'De export is niet gelukt.'
        try {
          const payload: unknown = await response.json()
          if (payload && typeof payload === 'object' && 'error' in payload) {
            const value = (payload as { error: unknown }).error
            if (typeof value === 'string') message = value
          }
        } catch {
          // Geen JSON terug — de standaardmelding volstaat.
        }
        setError(message)
        return
      }

      const disposition = response.headers.get('Content-Disposition') ?? ''
      const match = /filename\*=UTF-8''([^;]+)/.exec(disposition)
      const filename = match?.[1] ? decodeURIComponent(match[1]) : 'Nextwave export.xlsx'

      const blob = await response.blob()
      const url = URL.createObjectURL(blob)
      const link = document.createElement('a')
      link.href = url
      link.download = filename
      document.body.appendChild(link)
      link.click()
      document.body.removeChild(link)
      URL.revokeObjectURL(url)
      onClose()
    } catch {
      setError('De export is niet gelukt. Controleer je internetverbinding en probeer het opnieuw.')
    } finally {
      setIsBusy(false)
    }
  }

  const isPresetActive = (f: string, t: string) => f === from && t === to

  return (
    <div className="fixed inset-0 z-50 flex items-start justify-center overflow-y-auto bg-gray-900/50 p-4 backdrop-blur-sm sm:p-8">
      <div
        className="absolute inset-0"
        onClick={onClose}
        aria-hidden="true"
      />
      <div
        role="dialog"
        aria-modal="true"
        aria-label="Data exporteren"
        className="relative my-auto w-full max-w-3xl overflow-hidden rounded-3xl bg-white shadow-2xl"
      >
        {/* Kop */}
        <div className="flex items-start justify-between gap-4 border-b border-gray-200 bg-gradient-to-br from-emerald-500 via-teal-500 to-cyan-600 px-6 py-5 text-white">
          <div>
            <h2 className="text-xl font-bold tracking-tight">Data exporteren</h2>
            <p className="mt-0.5 text-sm opacity-90">
              Kies een periode, de klanten en wat er in het bestand moet.
            </p>
          </div>
          <button
            type="button"
            onClick={onClose}
            aria-label="Sluiten"
            className="rounded-lg p-1.5 transition-colors hover:bg-white/20"
          >
            <svg className="h-5 w-5" fill="none" viewBox="0 0 24 24" strokeWidth={2.5} stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" d="M6 18 18 6M6 6l12 12" />
            </svg>
          </button>
        </div>

        <div className="max-h-[calc(100vh-16rem)] space-y-6 overflow-y-auto px-6 py-5">
          {/* Periode */}
          <section>
            <SectionTitle step={1} title="Periode" />
            <div className="flex flex-wrap gap-2">
              {presets.map((p) => {
                const [f, t] = p.compute()
                const active = isPresetActive(f, t)
                return (
                  <button
                    key={p.label}
                    type="button"
                    onClick={() => {
                      setFrom(f)
                      setTo(t)
                    }}
                    className={`rounded-full px-3 py-1.5 text-xs font-semibold transition-all ${
                      active
                        ? 'bg-teal-600 text-white shadow-sm'
                        : 'border border-gray-200 bg-white text-gray-600 hover:border-teal-300 hover:text-teal-700'
                    }`}
                  >
                    {p.label}
                  </button>
                )
              })}
            </div>
            <div className="mt-3 flex flex-wrap items-end gap-3">
              <div>
                <label className="block text-[11px] font-semibold uppercase tracking-wide text-gray-500">Van</label>
                <input
                  type="date"
                  value={from}
                  max={to || undefined}
                  onChange={(e) => setFrom(e.target.value)}
                  className="mt-1 rounded-lg border border-gray-200 bg-gray-50/40 px-3 py-1.5 text-sm text-gray-900 focus:border-teal-400 focus:bg-white focus:outline-none focus:ring-4 focus:ring-teal-100"
                />
              </div>
              <div>
                <label className="block text-[11px] font-semibold uppercase tracking-wide text-gray-500">
                  Tot en met
                </label>
                <input
                  type="date"
                  value={to}
                  min={from || undefined}
                  onChange={(e) => setTo(e.target.value)}
                  className="mt-1 rounded-lg border border-gray-200 bg-gray-50/40 px-3 py-1.5 text-sm text-gray-900 focus:border-teal-400 focus:bg-white focus:outline-none focus:ring-4 focus:ring-teal-100"
                />
              </div>
            </div>
            {!rangeValid && (
              <p className="mt-2 text-xs font-semibold text-rose-600">
                De begindatum moet vóór of gelijk aan de einddatum liggen.
              </p>
            )}
          </section>

          {/* Klanten */}
          <section className="border-t border-gray-100 pt-5">
            <SectionTitle step={2} title="Klanten" />
            <div className="flex flex-wrap gap-2">
              <button
                type="button"
                onClick={() => setAllClients(true)}
                className={`rounded-full px-3 py-1.5 text-xs font-semibold transition-all ${
                  allClients
                    ? 'bg-teal-600 text-white shadow-sm'
                    : 'border border-gray-200 bg-white text-gray-600 hover:border-teal-300 hover:text-teal-700'
                }`}
              >
                Alle klanten ({clients.length})
              </button>
              <button
                type="button"
                onClick={() => setAllClients(false)}
                className={`rounded-full px-3 py-1.5 text-xs font-semibold transition-all ${
                  !allClients
                    ? 'bg-teal-600 text-white shadow-sm'
                    : 'border border-gray-200 bg-white text-gray-600 hover:border-teal-300 hover:text-teal-700'
                }`}
              >
                Zelf kiezen
              </button>
            </div>

            {!allClients && (
              <div className="mt-3 rounded-2xl border border-gray-200 bg-gray-50/40 p-3">
                <div className="flex flex-wrap items-center gap-2">
                  <input
                    type="search"
                    value={clientSearch}
                    onChange={(e) => setClientSearch(e.target.value)}
                    placeholder="Zoek een klant…"
                    className="min-w-[180px] flex-1 rounded-lg border border-gray-200 bg-white px-3 py-1.5 text-sm text-gray-900 focus:border-teal-400 focus:outline-none focus:ring-4 focus:ring-teal-100"
                  />
                  <button
                    type="button"
                    onClick={() => setSelected(new Set(visibleClients.map((c) => c.id)))}
                    className="rounded-lg border border-gray-200 bg-white px-3 py-1.5 text-xs font-semibold text-gray-600 transition-colors hover:border-teal-300 hover:text-teal-700"
                  >
                    Alles aanvinken
                  </button>
                  <button
                    type="button"
                    onClick={() => setSelected(new Set())}
                    className="rounded-lg border border-gray-200 bg-white px-3 py-1.5 text-xs font-semibold text-gray-600 transition-colors hover:border-gray-300 hover:text-gray-900"
                  >
                    Wissen
                  </button>
                </div>

                <div className="mt-2 max-h-52 overflow-y-auto rounded-xl border border-gray-200 bg-white">
                  {visibleClients.length === 0 ? (
                    <p className="px-3 py-4 text-center text-xs text-gray-400">Geen klant gevonden.</p>
                  ) : (
                    visibleClients.map((c) => (
                      <label
                        key={c.id}
                        className="flex cursor-pointer items-center gap-2.5 border-b border-gray-100 px-3 py-2 text-sm transition-colors last:border-b-0 hover:bg-teal-50/50"
                      >
                        <input
                          type="checkbox"
                          checked={selected.has(c.id)}
                          onChange={() => toggleClient(c.id)}
                          className="h-4 w-4 rounded border-gray-300 text-teal-600 focus:ring-teal-500"
                        />
                        <span className="flex-1 text-gray-900">{c.companyName}</span>
                        {c.isHidden && (
                          <span className="rounded-full bg-gray-100 px-2 py-0.5 text-[10px] font-semibold uppercase tracking-wide text-gray-500">
                            gepauzeerd
                          </span>
                        )}
                      </label>
                    ))
                  )}
                </div>

                <p className="mt-2 text-xs font-semibold text-gray-500">
                  {selected.size === 0
                    ? 'Nog geen klant gekozen.'
                    : `${selected.size} klant${selected.size === 1 ? '' : 'en'} gekozen.`}
                </p>
              </div>
            )}
          </section>

          {/* Onderwerpen */}
          <section className="border-t border-gray-100 pt-5">
            <SectionTitle step={3} title="Wat moet er in het bestand?" />
            <div className="flex flex-wrap gap-2 pb-3">
              <button
                type="button"
                onClick={() => setSections(ALL_SECTIONS)}
                className="rounded-lg border border-gray-200 bg-white px-3 py-1.5 text-xs font-semibold text-gray-600 transition-colors hover:border-teal-300 hover:text-teal-700"
              >
                Alles
              </button>
              <button
                type="button"
                onClick={() => setSections([])}
                className="rounded-lg border border-gray-200 bg-white px-3 py-1.5 text-xs font-semibold text-gray-600 transition-colors hover:border-gray-300 hover:text-gray-900"
              >
                Niets
              </button>
            </div>
            <div className="grid gap-2 sm:grid-cols-2">
              {EXPORT_SECTIONS.map((s) => {
                const checked = sections.includes(s.id)
                return (
                  <label
                    key={s.id}
                    className={`flex cursor-pointer items-start gap-2.5 rounded-xl border p-3 transition-colors ${
                      checked ? 'border-teal-300 bg-teal-50/50' : 'border-gray-200 bg-white hover:border-gray-300'
                    }`}
                  >
                    <input
                      type="checkbox"
                      checked={checked}
                      onChange={() => toggleSection(s.id)}
                      className="mt-0.5 h-4 w-4 rounded border-gray-300 text-teal-600 focus:ring-teal-500"
                    />
                    <span className="min-w-0">
                      <span className="block text-sm font-semibold text-gray-900">{s.label}</span>
                      <span className="mt-0.5 block text-xs leading-snug text-gray-500">{s.description}</span>
                    </span>
                  </label>
                )
              })}
            </div>
            {sections.length === 0 && (
              <p className="mt-2 text-xs font-semibold text-rose-600">Kies minstens één onderwerp.</p>
            )}
          </section>

          {/* Fijnafstelling */}
          <section className="border-t border-gray-100 pt-5">
            <SectionTitle step={4} title="Instellingen" />
            <label className="flex cursor-pointer items-start gap-2.5 rounded-xl border border-gray-200 bg-white p-3 transition-colors hover:border-gray-300">
              <input
                type="checkbox"
                checked={includeRejected}
                onChange={(e) => setIncludeRejected(e.target.checked)}
                className="mt-0.5 h-4 w-4 rounded border-gray-300 text-teal-600 focus:ring-teal-500"
              />
              <span className="min-w-0">
                <span className="block text-sm font-semibold text-gray-900">
                  Afgekeurde leads meetellen in de omzet
                </span>
                <span className="mt-0.5 block text-xs leading-snug text-gray-500">
                  Zo rekent het financiële overzicht ook. Zet je dit uit, dan staan afgekeurde leads nog wel in het
                  tabblad Leads, maar tellen ze nergens mee in de bedragen.
                </span>
              </span>
            </label>
          </section>
        </div>

        {/* Voet */}
        <div className="border-t border-gray-200 bg-gray-50/60 px-6 py-4">
          {error && (
            <div className="mb-3 rounded-xl border border-rose-200 bg-rose-50 px-3 py-2 text-xs font-semibold text-rose-700">
              {error}
            </div>
          )}
          <div className="flex flex-wrap items-center justify-between gap-3">
            <p className="text-xs text-gray-500">
              {rangeValid ? (
                <>
                  <span className="font-semibold text-gray-700">
                    {formatNl(from)} t/m {formatNl(to)}
                  </span>{' '}
                  · {clientCount} klant{clientCount === 1 ? '' : 'en'} · {sections.length} tabblad
                  {sections.length === 1 ? '' : 'en'}
                </>
              ) : (
                'Kies eerst een geldige periode.'
              )}
            </p>
            <div className="flex items-center gap-2">
              <button
                type="button"
                onClick={onClose}
                className="rounded-lg border border-gray-200 bg-white px-4 py-2 text-sm font-semibold text-gray-600 transition-colors hover:border-gray-300 hover:text-gray-900"
              >
                Annuleren
              </button>
              <button
                type="button"
                onClick={handleDownload}
                disabled={!canDownload}
                className="inline-flex items-center gap-2 rounded-lg bg-teal-600 px-5 py-2 text-sm font-semibold text-white shadow-sm transition-all hover:bg-teal-700 disabled:cursor-not-allowed disabled:opacity-40"
              >
                {isBusy ? (
                  <>
                    <svg className="h-4 w-4 animate-spin" fill="none" viewBox="0 0 24 24">
                      <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                      <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 0 1 8-8V0C5.373 0 0 5.373 0 12h4z" />
                    </svg>
                    Bezig met samenstellen…
                  </>
                ) : (
                  <>
                    <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" strokeWidth={2} stroke="currentColor">
                      <path strokeLinecap="round" strokeLinejoin="round" d="M3 16.5v2.25A2.25 2.25 0 0 0 5.25 21h13.5A2.25 2.25 0 0 0 21 18.75V16.5M16.5 12 12 16.5m0 0L7.5 12m4.5 4.5V3" />
                    </svg>
                    Excel downloaden
                  </>
                )}
              </button>
            </div>
          </div>
          {isBusy && (
            <p className="mt-2 text-xs text-gray-500">
              Bij een lange periode duurt dit even: de boekhouding wordt er in zijn geheel bij opgehaald.
            </p>
          )}
        </div>
      </div>
    </div>
  )
}

function SectionTitle({ step, title }: { step: number; title: string }) {
  return (
    <div className="mb-3 flex items-center gap-2">
      <span className="flex h-5 w-5 items-center justify-center rounded-full bg-gray-900 text-[10px] font-bold text-white">
        {step}
      </span>
      <h3 className="text-sm font-semibold text-gray-900">{title}</h3>
    </div>
  )
}
