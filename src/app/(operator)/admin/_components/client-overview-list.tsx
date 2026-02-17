'use client'

import { useState, useMemo } from 'react'
import Link from 'next/link'
import type { ClientOverview } from '@/lib/data/admin-stats'

type FilterType = 'all' | 'issues' | 'low_emails' | 'low_contacts'

interface ClientOverviewListProps {
  clients: ClientOverview[]
}

function formatTimeAgo(dateStr: string): string {
  const diff = Date.now() - new Date(dateStr).getTime()
  const minutes = Math.floor(diff / 60000)
  if (minutes < 60) return `${minutes}m geleden`
  const hours = Math.floor(minutes / 60)
  if (hours < 24) return `${hours}u geleden`
  const days = Math.floor(hours / 24)
  return `${days}d geleden`
}

function HealthDot({ client }: { client: ClientOverview }) {
  if (client.campaigns.length === 0) {
    return <span className="inline-block h-2.5 w-2.5 rounded-full bg-gray-300" title="Geen campagnes" />
  }
  if (client.hasLowEmails && client.hasLowContacts) {
    return <span className="inline-block h-2.5 w-2.5 rounded-full bg-red-500" title="Emails te laag + contacten opraken" />
  }
  if (client.hasLowEmails || client.hasLowContacts) {
    return <span className="inline-block h-2.5 w-2.5 rounded-full bg-yellow-400" title={client.hasLowEmails ? 'Te weinig emails' : 'Contacten opraken'} />
  }
  return <span className="inline-block h-2.5 w-2.5 rounded-full bg-green-500" title="Alles in orde" />
}

export function ClientOverviewList({ clients }: ClientOverviewListProps) {
  const [search, setSearch] = useState('')
  const [filter, setFilter] = useState<FilterType>('all')

  const filtered = useMemo(() => {
    let result = clients

    // Search filter
    if (search.trim()) {
      const q = search.toLowerCase()
      result = result.filter((c) =>
        c.companyName.toLowerCase().includes(q)
      )
    }

    // Status filter
    switch (filter) {
      case 'issues':
        result = result.filter((c) => c.hasIssues)
        break
      case 'low_emails':
        result = result.filter((c) => c.hasLowEmails)
        break
      case 'low_contacts':
        result = result.filter((c) => c.hasLowContacts)
        break
    }

    return result
  }, [clients, search, filter])

  const issueCount = clients.filter((c) => c.hasIssues).length
  const lowEmailCount = clients.filter((c) => c.hasLowEmails).length
  const lowContactCount = clients.filter((c) => c.hasLowContacts).length

  return (
    <div className="mt-6 space-y-4">
      {/* Search + Filters */}
      <div className="flex flex-wrap items-center gap-3">
        <input
          type="text"
          placeholder="Zoek klant..."
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          className="w-64 rounded-md border border-gray-300 px-3 py-2 text-sm shadow-sm focus:border-blue-500 focus:outline-none focus:ring-1 focus:ring-blue-500"
        />
        <div className="flex gap-2">
          <FilterButton
            active={filter === 'all'}
            onClick={() => setFilter('all')}
            label="Alles"
            count={clients.length}
          />
          <FilterButton
            active={filter === 'issues'}
            onClick={() => setFilter('issues')}
            label="Problemen"
            count={issueCount}
            variant="red"
          />
          <FilterButton
            active={filter === 'low_emails'}
            onClick={() => setFilter('low_emails')}
            label="Te weinig emails"
            count={lowEmailCount}
            variant="yellow"
          />
          <FilterButton
            active={filter === 'low_contacts'}
            onClick={() => setFilter('low_contacts')}
            label="Contacten opraken"
            count={lowContactCount}
            variant="yellow"
          />
        </div>
      </div>

      {/* Client cards */}
      {filtered.length === 0 ? (
        <div className="rounded-lg bg-gray-50 p-8 text-center text-sm text-gray-500">
          Geen klanten gevonden{search ? ` voor "${search}"` : ''}.
        </div>
      ) : (
        <div className="space-y-3">
          {filtered.map((client) => (
            <ClientCard key={client.id} client={client} />
          ))}
        </div>
      )}
    </div>
  )
}

function FilterButton({
  active,
  onClick,
  label,
  count,
  variant,
}: {
  active: boolean
  onClick: () => void
  label: string
  count: number
  variant?: 'red' | 'yellow'
}) {
  const baseClass = 'inline-flex items-center gap-1.5 rounded-full px-3 py-1.5 text-xs font-medium transition-colors'

  if (active) {
    return (
      <button type="button" onClick={onClick} className={`${baseClass} bg-blue-600 text-white`}>
        {label}
        <span className="rounded-full bg-blue-500 px-1.5 py-0.5 text-xs">{count}</span>
      </button>
    )
  }

  const countColor = variant === 'red'
    ? 'bg-red-100 text-red-700'
    : variant === 'yellow'
      ? 'bg-yellow-100 text-yellow-700'
      : 'bg-gray-100 text-gray-600'

  return (
    <button
      type="button"
      onClick={onClick}
      className={`${baseClass} bg-white text-gray-700 border border-gray-200 hover:bg-gray-50`}
    >
      {label}
      {count > 0 && (
        <span className={`rounded-full px-1.5 py-0.5 text-xs ${countColor}`}>{count}</span>
      )}
    </button>
  )
}

function ClientCard({ client }: { client: ClientOverview }) {
  return (
    <div className={`rounded-lg border bg-white p-4 shadow-sm ${client.hasIssues ? 'border-yellow-300' : 'border-gray-200'}`}>
      {/* Header row */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-3">
          <HealthDot client={client} />
          <div
            className="h-5 w-5 rounded-full border border-gray-200"
            style={{ backgroundColor: client.primaryColor ?? '#ccc' }}
          />
          <h3 className="text-sm font-semibold text-gray-900">{client.companyName}</h3>
          {client.isRecruitment && (
            <span className="inline-flex items-center rounded-full bg-purple-100 px-2 py-0.5 text-xs font-medium text-purple-800">
              Recruitment
            </span>
          )}
        </div>
        <div className="flex items-center gap-3">
          {client.lastSyncedAt && (
            <span className="text-xs text-gray-400" title={new Date(client.lastSyncedAt).toLocaleString('nl-NL')}>
              Sync: {formatTimeAgo(client.lastSyncedAt)}
            </span>
          )}
          <Link
            href={`/admin/clients/${client.id}/edit`}
            className="rounded-md bg-gray-100 px-3 py-1 text-xs font-medium text-gray-700 hover:bg-gray-200"
          >
            Bewerken
          </Link>
          <Link
            href={`/admin/clients/${client.id}/csv`}
            className="rounded-md bg-gray-100 px-3 py-1 text-xs font-medium text-gray-700 hover:bg-gray-200"
          >
            CSV
          </Link>
        </div>
      </div>

      {/* Stats row */}
      <div className="mt-3 flex flex-wrap items-center gap-4 text-xs text-gray-500">
        <span>{client.totalLeads} contacten</span>
        <span>{client.campaigns.length} campagne{client.campaigns.length !== 1 ? 's' : ''}</span>
        <span className={client.hasLowEmails ? 'font-medium text-red-600' : ''}>
          {client.totalEmailsYesterday} emails gisteren
        </span>
      </div>

      {/* Campaign breakdown */}
      {client.campaigns.length > 0 && (
        <div className="mt-3 space-y-1.5">
          {client.campaigns.map((campaign) => {
            const lowContacts = campaign.contactsRemaining < 180
            return (
              <div
                key={campaign.campaignId}
                className="flex items-center justify-between rounded-md bg-gray-50 px-3 py-2 text-xs"
              >
                <span className="truncate font-medium text-gray-700" title={campaign.campaignName}>
                  {campaign.campaignName}
                </span>
                <div className="flex items-center gap-4 flex-shrink-0">
                  <span className="text-gray-500">
                    {campaign.emailsSentYesterday} emails gisteren
                  </span>
                  <span className={lowContacts ? 'font-medium text-red-600' : 'text-gray-500'}>
                    {campaign.contactsRemaining} contacten over
                    {lowContacts && (
                      <span className="ml-1 inline-flex items-center rounded-full bg-red-100 px-1.5 py-0.5 text-xs text-red-700">
                        laag
                      </span>
                    )}
                  </span>
                </div>
              </div>
            )
          })}
        </div>
      )}

      {/* Alert badges */}
      {client.hasIssues && (
        <div className="mt-2 flex flex-wrap gap-2">
          {client.hasLowEmails && (
            <span className="inline-flex items-center rounded-full bg-yellow-100 px-2 py-0.5 text-xs font-medium text-yellow-800">
              Te weinig emails ({client.totalEmailsYesterday}/74)
            </span>
          )}
          {client.hasLowContacts && (
            <span className="inline-flex items-center rounded-full bg-red-100 px-2 py-0.5 text-xs font-medium text-red-800">
              Contacten opraken
            </span>
          )}
        </div>
      )}
    </div>
  )
}
