'use client'

import Link from 'next/link'
import { useSearchParams, useSelectedLayoutSegment } from 'next/navigation'
import type { ReactNode } from 'react'
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

  const backHref = (() => {
    if (params.get('view') === 'trash') return '/dashboard/lead-inbox?view=trash'
    const cls = params.get('classification')
    return cls ? `/dashboard/lead-inbox?classification=${cls}` : '/dashboard/lead-inbox'
  })()

  return (
    // Doorbreek de max-w-6xl container van (client)/layout.tsx en vul de hele
    // ruimte naast de outer SidebarNav (w-60 = 15rem). Position: fixed neemt
    // de viewport als containing-block, dus we hoeven niet om de mx-auto heen
    // te rekenen.
    <div className="fixed inset-y-0 left-60 right-0 z-10 flex overflow-hidden bg-canvas pt-6 lg:pt-8">
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
        <LeadListPane leads={leads} />
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
