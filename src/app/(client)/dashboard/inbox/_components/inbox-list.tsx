'use client'

import { useState, useMemo, useTransition } from 'react'
import { useRouter } from 'next/navigation'
import type { InboxLead } from '@/lib/data/inbox-data'
import { refreshInbox } from '@/lib/actions/inbox-actions'
import { InboxItem } from './inbox-item'
import { ComposeModal } from './compose-modal'
import { RefreshOverlay } from './refresh-overlay'

interface InboxListProps {
  leads: InboxLead[]
  isRecruitment: boolean
}

type Folder = 'inbox' | 'archived'
type StatusFilter = 'all' | 'action_required' | 'in_conversation'

export function InboxList({ leads, isRecruitment }: InboxListProps) {
  const [showCompose, setShowCompose] = useState(false)
  const [search, setSearch] = useState('')
  const [statusFilter, setStatusFilter] = useState<StatusFilter>('all')
  const [folder, setFolder] = useState<Folder>('inbox')
  const [isRefreshing, startRefresh] = useTransition()
  const router = useRouter()

  const inboxLeads = useMemo(() => leads.filter((l) => !l.archived_at), [leads])
  const archivedLeads = useMemo(() => leads.filter((l) => !!l.archived_at), [leads])

  const activeLeads = folder === 'inbox' ? inboxLeads : archivedLeads

  const filteredLeads = useMemo(() => {
    let result = activeLeads

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

    // Status filter (only for inbox folder)
    if (folder === 'inbox') {
      if (statusFilter === 'action_required') {
        result = result.filter((lead) => !lead.client_has_replied)
      } else if (statusFilter === 'in_conversation') {
        result = result.filter((lead) => lead.client_has_replied)
      }
    }

    return result
  }, [activeLeads, search, statusFilter, folder])

  return (
    <div>
      {/* Folder tabs */}
      <div className="mt-6 flex border-b border-gray-200">
        <button
          type="button"
          onClick={() => setFolder('inbox')}
          className={`relative px-4 py-2.5 text-sm font-medium transition-colors ${
            folder === 'inbox'
              ? 'text-[var(--brand-color)]'
              : 'text-gray-500 hover:text-gray-700'
          }`}
        >
          Inbox
          {inboxLeads.length > 0 && (
            <span className={`ml-1.5 inline-flex items-center rounded-full px-2 py-0.5 text-xs font-medium ${
              folder === 'inbox' ? 'bg-[var(--brand-color)]/10 text-[var(--brand-color)]' : 'bg-gray-100 text-gray-600'
            }`}>
              {inboxLeads.length}
            </span>
          )}
          {folder === 'inbox' && (
            <span className="absolute bottom-0 left-0 right-0 h-0.5 bg-[var(--brand-color)]" />
          )}
        </button>
        <button
          type="button"
          onClick={() => setFolder('archived')}
          className={`relative px-4 py-2.5 text-sm font-medium transition-colors ${
            folder === 'archived'
              ? 'text-[var(--brand-color)]'
              : 'text-gray-500 hover:text-gray-700'
          }`}
        >
          Afgehandeld
          {archivedLeads.length > 0 && (
            <span className={`ml-1.5 inline-flex items-center rounded-full px-2 py-0.5 text-xs font-medium ${
              folder === 'archived' ? 'bg-[var(--brand-color)]/10 text-[var(--brand-color)]' : 'bg-gray-100 text-gray-600'
            }`}>
              {archivedLeads.length}
            </span>
          )}
          {folder === 'archived' && (
            <span className="absolute bottom-0 left-0 right-0 h-0.5 bg-[var(--brand-color)]" />
          )}
        </button>
      </div>

      {/* Search and filter bar */}
      <div className="mt-4 flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
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
          {folder === 'inbox' && (
            <select
              value={statusFilter}
              onChange={(e) => setStatusFilter(e.target.value as StatusFilter)}
              className="rounded-md border border-gray-300 px-3 py-2 text-sm text-gray-700 focus:border-[var(--brand-color)] focus:outline-none focus:ring-1 focus:ring-[var(--brand-color)]"
            >
              <option value="all">Alles</option>
              <option value="action_required">Actie vereist</option>
              <option value="in_conversation">In gesprek</option>
            </select>
          )}
        </div>
        <div className="flex gap-2">
          <button
            type="button"
            onClick={() => {
              startRefresh(async () => {
                await refreshInbox()
                router.refresh()
              })
            }}
            disabled={isRefreshing}
            title="Mist u recente e-mails? Klik hier om te verversen."
            className="inline-flex items-center gap-1.5 rounded-md border border-gray-300 px-3 py-2 text-sm text-gray-600 hover:bg-gray-50 transition-colors disabled:opacity-50"
          >
            {isRefreshing ? (
              <svg className="h-4 w-4 animate-spin" viewBox="0 0 24 24" fill="none">
                <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z" />
              </svg>
            ) : (
              <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                <path strokeLinecap="round" strokeLinejoin="round" d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" />
              </svg>
            )}
            <span>{isRefreshing ? 'Verversen...' : 'Verversen'}</span>
          </button>
          {folder === 'inbox' && (
            <button
              type="button"
              onClick={() => setShowCompose(true)}
              className="rounded-md bg-[var(--brand-color)] px-4 py-2 text-sm font-medium text-white hover:opacity-90 transition-opacity"
            >
              Nieuwe e-mail
            </button>
          )}
        </div>
      </div>

      {/* Results count */}
      <p className="mt-2 text-xs text-gray-500">
        {filteredLeads.length} van {activeLeads.length} leads
      </p>

      {isRefreshing && (
        <div className="mt-3">
          <RefreshOverlay isRefreshing={isRefreshing} />
        </div>
      )}

      <div className={`mt-3 overflow-hidden rounded-lg border border-gray-200 bg-white ${isRefreshing ? 'pointer-events-none opacity-40 blur-[1px] transition-all duration-300' : ''}`}>
        {filteredLeads.length === 0 ? (
          <div className="py-8 text-center text-sm text-gray-500">
            {folder === 'archived'
              ? 'Geen afgehandelde leads.'
              : 'Geen leads gevonden voor deze zoekopdracht.'}
          </div>
        ) : (
          <div className="divide-y divide-gray-100">
            {filteredLeads.map((lead) => (
              <InboxItem
                key={lead.id}
                lead={lead}
                isRecruitment={isRecruitment}
                isArchived={folder === 'archived'}
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
