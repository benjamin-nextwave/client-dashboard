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

  const backHref = params.get('classification')
    ? `/dashboard/lead-inbox?classification=${params.get('classification')}`
    : '/dashboard/lead-inbox'

  return (
    // Doorbreek de max-w-6xl container van (client)/layout.tsx en vul de hele
    // ruimte naast de outer SidebarNav (w-60 = 15rem). Position: fixed neemt
    // de viewport als containing-block, dus we hoeven niet om de mx-auto heen
    // te rekenen.
    <div className="fixed inset-y-0 left-60 right-0 z-10 flex overflow-hidden bg-white">
      {/* Filter sidebar — lg+ alleen */}
      <aside className="hidden w-56 shrink-0 border-r border-gray-200 bg-gray-50 lg:block">
        <FilterSidebar leads={leads} />
      </aside>

      {/* List pane */}
      <section
        className={[
          'flex-col border-r border-gray-200 bg-white md:w-[360px] md:shrink-0',
          hasSelection ? 'hidden md:flex' : 'flex w-full',
        ].join(' ')}
      >
        {/* Filter chips — alleen <lg */}
        <div className="border-b border-gray-200 lg:hidden">
          <FilterChips leads={leads} />
        </div>
        <header className="hidden items-baseline justify-between border-b border-gray-200 px-4 py-3 lg:flex">
          <h1 className="text-base font-semibold text-gray-900">Lead Inbox</h1>
          <span className="text-xs text-gray-500">
            {leads.filter((l) => l.awaitingOurReply).length} wacht op antwoord
          </span>
        </header>
        <LeadListPane leads={leads} />
      </section>

      {/* Detail pane */}
      <section
        className={[
          'min-w-0 flex-1 flex-col bg-[#fafafa]',
          hasSelection ? 'flex' : 'hidden md:flex',
        ].join(' ')}
      >
        {hasSelection && (
          <div className="flex items-center border-b border-gray-200 bg-white px-4 py-2 md:hidden">
            <Link
              href={backHref}
              className="inline-flex items-center gap-1 text-sm text-gray-700 hover:text-gray-900"
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
