'use client'

import { useState, useMemo } from 'react'
import type { InboxLead } from '@/lib/data/inbox-data'
import { InboxItem } from './inbox-item'
import { ComposeModal } from './compose-modal'

interface InboxListProps {
  leads: InboxLead[]
  isRecruitment: boolean
}

type StatusFilter = 'all' | 'action_required' | 'in_conversation'

export function InboxList({ leads, isRecruitment }: InboxListProps) {
  const [showCompose, setShowCompose] = useState(false)
  const [search, setSearch] = useState('')
  const [statusFilter, setStatusFilter] = useState<StatusFilter>('all')

  const filteredLeads = useMemo(() => {
    let result = leads

    // Search filter
    if (search) {
      const term = search.toLowerCase()
      result = result.filter(
        (lead) =>
          lead.email.toLowerCase().includes(term) ||
          (lead.first_name?.toLowerCase().includes(term) ?? false) ||
          (lead.last_name?.toLowerCase().includes(term) ?? false) ||
          (lead.company_name?.toLowerCase().includes(term) ?? false)
      )
    }

    // Status filter
    if (statusFilter === 'action_required') {
      result = result.filter((lead) => !lead.client_has_replied)
    } else if (statusFilter === 'in_conversation') {
      result = result.filter((lead) => lead.client_has_replied)
    }

    return result
  }, [leads, search, statusFilter])

  return (
    <div>
      {/* Search and filter bar */}
      <div className="mt-6 flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <div className="flex flex-1 gap-3">
          <div className="relative flex-1 max-w-md">
            <svg
              className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-gray-400"
              fill="none"
              viewBox="0 0 24 24"
              stroke="currentColor"
              strokeWidth={2}
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                d="M21 21l-5.197-5.197m0 0A7.5 7.5 0 105.196 5.196a7.5 7.5 0 0010.607 10.607z"
              />
            </svg>
            <input
              type="text"
              placeholder="Zoek op naam, e-mail of bedrijf..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="w-full rounded-md border border-gray-300 py-2 pl-9 pr-3 text-sm placeholder:text-gray-400 focus:border-[var(--brand-color)] focus:outline-none focus:ring-1 focus:ring-[var(--brand-color)]"
            />
          </div>
          <select
            value={statusFilter}
            onChange={(e) => setStatusFilter(e.target.value as StatusFilter)}
            className="rounded-md border border-gray-300 px-3 py-2 text-sm text-gray-700 focus:border-[var(--brand-color)] focus:outline-none focus:ring-1 focus:ring-[var(--brand-color)]"
          >
            <option value="all">Alles</option>
            <option value="action_required">Actie vereist</option>
            <option value="in_conversation">In gesprek</option>
          </select>
        </div>
        <button
          type="button"
          onClick={() => setShowCompose(true)}
          className="rounded-md bg-[var(--brand-color)] px-4 py-2 text-sm font-medium text-white hover:opacity-90 transition-opacity"
        >
          Nieuwe e-mail
        </button>
      </div>

      {/* Results count */}
      <p className="mt-2 text-xs text-gray-500">
        {filteredLeads.length} van {leads.length} leads
      </p>

      <div className="mt-3 overflow-hidden rounded-lg border border-gray-200 bg-white">
        {filteredLeads.length === 0 ? (
          <div className="py-8 text-center text-sm text-gray-500">
            Geen leads gevonden voor deze zoekopdracht.
          </div>
        ) : (
          <div className="divide-y divide-gray-100">
            {filteredLeads.map((lead) => (
              <InboxItem
                key={lead.id}
                lead={lead}
                isRecruitment={isRecruitment}
              />
            ))}
          </div>
        )}
      </div>

      <ComposeModal
        isOpen={showCompose}
        onClose={() => setShowCompose(false)}
        leads={leads}
      />
    </div>
  )
}
