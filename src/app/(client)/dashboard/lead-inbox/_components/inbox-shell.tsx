'use client'

import Link from 'next/link'
import { useSearchParams, useSelectedLayoutSegment } from 'next/navigation'
import { useState, type ReactNode } from 'react'
import type { LeadWithStatus } from '../_lib/types'
import { FilterChips } from './filter-chips'
import { FilterSidebar } from './filter-sidebar'
import { LeadListPane } from './lead-list-pane'

export function InboxShell({
  leads,
  children,
}: {
  leads: LeadWithStatus[]
  children: ReactNode
}) {
  const params = useSearchParams()
  const selectedSegment = useSelectedLayoutSegment()
  const hasSelection = selectedSegment !== null
  const [search, setSearch] = useState('')

  const backHref = (() => {
    if (params.get('view') === 'trash') return '/dashboard/lead-inbox?view=trash'
    const cls = params.get('classification')
    return cls ? `/dashboard/lead-inbox?classification=${cls}` : '/dashboard/lead-inbox'
  })()

  return (
    // Doorbreek de max-w-6xl container van (client)/layout.tsx en vul de hele
    // ruimte naast de outer SidebarNav. Die breedte staat in --sidebar-w, zodat
    // dit paneel meeschuift wanneer de zijbalk in- of uitklapt. Position: fixed neemt
    // de viewport als containing-block, dus we hoeven niet om de mx-auto heen
    // te rekenen.
    <div className="fixed inset-y-0 right-0 left-[var(--sidebar-w)] z-10 flex overflow-hidden bg-canvas pt-6 transition-[left] duration-200 lg:pt-8">
      {/* Filter sidebar — lg+ alleen */}
      <aside className="hidden w-[196px] shrink-0 overflow-y-auto border-r border-line bg-panel lg:block">
        <FilterSidebar leads={leads} />
      </aside>

      {/* List pane */}
      <section
        className={[
          'min-h-0 flex-col border-r border-line bg-panel md:w-[312px] md:shrink-0',
          hasSelection ? 'hidden md:flex' : 'flex w-full',
        ].join(' ')}
      >
        {/* Filter chips — alleen <lg */}
        <div className="border-b border-line lg:hidden">
          <FilterChips leads={leads} />
        </div>
        <header className="hidden shrink-0 items-baseline justify-between border-b border-line px-4 py-[13px] lg:flex">
          <h1 className="text-[13.5px] font-semibold tracking-[-0.01em]">Lead Inbox</h1>
          <span className="text-[11.5px] tabular-nums text-faint">
            {leads.filter((l) => l.awaitingOurReply).length} wacht op antwoord
          </span>
        </header>

        {/* Zoeken filtert de leads die al ingeladen zijn — geen extra query. */}
        <div className="shrink-0 border-b border-line px-3 py-2.5">
          <div className="relative">
            <svg
              className="pointer-events-none absolute left-2.5 top-1/2 h-3.5 w-3.5 -translate-y-1/2 text-faint"
              fill="none"
              viewBox="0 0 24 24"
              strokeWidth={1.8}
              stroke="currentColor"
              aria-hidden
            >
              <path strokeLinecap="round" strokeLinejoin="round" d="m21 21-5.197-5.197m0 0A7.5 7.5 0 1 0 5.196 5.196a7.5 7.5 0 0 0 10.607 10.607Z" />
            </svg>
            <input
              type="search"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder="Zoek op naam, e-mail of bericht"
              aria-label="Zoeken in leads"
              className="w-full rounded-control border border-line bg-canvas py-1.5 pl-8 pr-7 text-[12.5px] outline-none transition-colors placeholder:text-faint focus:border-[var(--brand-color)]"
            />
            {search && (
              <button
                type="button"
                onClick={() => setSearch('')}
                aria-label="Zoekopdracht wissen"
                className="absolute right-2 top-1/2 -translate-y-1/2 rounded p-0.5 text-faint transition-colors hover:text-fg"
              >
                <svg className="h-3.5 w-3.5" fill="none" viewBox="0 0 24 24" strokeWidth={2} stroke="currentColor" aria-hidden>
                  <path strokeLinecap="round" strokeLinejoin="round" d="M6 18 18 6M6 6l12 12" />
                </svg>
              </button>
            )}
          </div>
        </div>

        <LeadListPane leads={leads} search={search} />
      </section>

      {/* Detail pane */}
      <section
        className={[
          'min-h-0 min-w-0 flex-1 flex-col bg-canvas',
          hasSelection ? 'flex' : 'hidden md:flex',
        ].join(' ')}
      >
        {hasSelection && (
          <div className="flex shrink-0 items-center border-b border-line bg-panel px-4 py-2 md:hidden">
            <Link
              href={backHref}
              className="inline-flex items-center gap-1 text-[12.5px] text-muted transition-colors hover:text-fg"
            >
              <svg
                className="h-4 w-4"
                fill="none"
                viewBox="0 0 24 24"
                strokeWidth={1.8}
                stroke="currentColor"
              >
                <path strokeLinecap="round" strokeLinejoin="round" d="M15.75 19.5L8.25 12l7.5-7.5" />
              </svg>
              Terug
            </Link>
          </div>
        )}
        <div className="min-w-0 flex-1 overflow-y-auto">{children}</div>
      </section>
    </div>
  )
}
