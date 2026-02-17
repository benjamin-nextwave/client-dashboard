'use client'

import { useState, useMemo, useCallback } from 'react'
import Link from 'next/link'
import { useRouter } from 'next/navigation'
import type { ClientOverview } from '@/lib/data/admin-stats'
import { deleteClient } from '../clients/actions'

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

function PasswordReveal({ password }: { password: string }) {
  const [visible, setVisible] = useState(false)

  return (
    <span className="inline-flex items-center gap-1.5">
      <span className="text-gray-400">Wachtwoord:</span>
      <code className="rounded bg-gray-100 px-1.5 py-0.5 font-mono text-xs text-gray-700">
        {visible ? password : '••••••••'}
      </code>
      <button
        type="button"
        onClick={() => setVisible(!visible)}
        className="text-gray-400 hover:text-gray-600"
        title={visible ? 'Verbergen' : 'Tonen'}
      >
        {visible ? (
          <svg className="h-3.5 w-3.5" fill="none" viewBox="0 0 24 24" strokeWidth={2} stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" d="M3.98 8.223A10.477 10.477 0 0 0 1.934 12c1.292 4.338 5.31 7.5 10.066 7.5.993 0 1.953-.138 2.863-.395M6.228 6.228A10.451 10.451 0 0 1 12 4.5c4.756 0 8.773 3.162 10.065 7.498a10.522 10.522 0 0 1-4.293 5.774M6.228 6.228 3 3m3.228 3.228 3.65 3.65m7.894 7.894L21 21m-3.228-3.228-3.65-3.65m0 0a3 3 0 1 0-4.243-4.243m4.242 4.242L9.88 9.88" />
          </svg>
        ) : (
          <svg className="h-3.5 w-3.5" fill="none" viewBox="0 0 24 24" strokeWidth={2} stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" d="M2.036 12.322a1.012 1.012 0 0 1 0-.639C3.423 7.51 7.36 4.5 12 4.5c4.638 0 8.573 3.007 9.963 7.178.07.207.07.431 0 .639C20.577 16.49 16.64 19.5 12 19.5c-4.638 0-8.573-3.007-9.963-7.178Z" />
            <path strokeLinecap="round" strokeLinejoin="round" d="M15 12a3 3 0 1 1-6 0 3 3 0 0 1 6 0Z" />
          </svg>
        )}
      </button>
    </span>
  )
}

function DeleteConfirmDialog({
  clientName,
  onConfirm,
  onCancel,
  isDeleting,
}: {
  clientName: string
  onConfirm: () => void
  onCancel: () => void
  isDeleting: boolean
}) {
  const [confirmText, setConfirmText] = useState('')
  const isMatch = confirmText === clientName

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50" onClick={onCancel}>
      <div className="mx-4 w-full max-w-md rounded-lg bg-white p-6 shadow-xl" onClick={(e) => e.stopPropagation()}>
        <div className="mb-4 flex items-center gap-3">
          <div className="flex h-10 w-10 items-center justify-center rounded-full bg-red-100">
            <svg className="h-5 w-5 text-red-600" fill="none" viewBox="0 0 24 24" strokeWidth={2} stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" d="M12 9v3.75m-9.303 3.376c-.866 1.5.217 3.374 1.948 3.374h14.71c1.73 0 2.813-1.874 1.948-3.374L13.949 3.378c-.866-1.5-3.032-1.5-3.898 0L2.697 16.126ZM12 15.75h.007v.008H12v-.008Z" />
            </svg>
          </div>
          <div>
            <h3 className="text-lg font-semibold text-gray-900">Klant verwijderen</h3>
            <p className="text-sm text-gray-500">Dit kan niet ongedaan worden gemaakt!</p>
          </div>
        </div>

        <div className="mb-4 rounded-md bg-red-50 p-3 text-sm text-red-800">
          <p className="font-medium">Je staat op het punt om alles te verwijderen van:</p>
          <p className="mt-1 font-bold">{clientName}</p>
          <ul className="mt-2 list-inside list-disc space-y-1 text-xs">
            <li>Het complete klantdashboard</li>
            <li>Alle contacten en campagnegegevens</li>
            <li>Het login-account van deze klant</li>
            <li>Alle analytics en synchronisatiedata</li>
          </ul>
        </div>

        <div className="mb-4">
          <label className="block text-sm font-medium text-gray-700">
            Typ <span className="font-bold text-red-600">{clientName}</span> om te bevestigen:
          </label>
          <input
            type="text"
            value={confirmText}
            onChange={(e) => setConfirmText(e.target.value)}
            className="mt-1 w-full rounded-md border border-gray-300 px-3 py-2 text-sm focus:border-red-500 focus:outline-none focus:ring-1 focus:ring-red-500"
            placeholder={clientName}
            disabled={isDeleting}
          />
        </div>

        <div className="flex justify-end gap-3">
          <button
            type="button"
            onClick={onCancel}
            disabled={isDeleting}
            className="rounded-md bg-gray-100 px-4 py-2 text-sm font-medium text-gray-700 hover:bg-gray-200 disabled:opacity-50"
          >
            Annuleren
          </button>
          <button
            type="button"
            onClick={onConfirm}
            disabled={!isMatch || isDeleting}
            className="rounded-md bg-red-600 px-4 py-2 text-sm font-medium text-white hover:bg-red-700 disabled:cursor-not-allowed disabled:opacity-50"
          >
            {isDeleting ? 'Verwijderen...' : 'Definitief verwijderen'}
          </button>
        </div>
      </div>
    </div>
  )
}

function ClientCard({ client }: { client: ClientOverview }) {
  const router = useRouter()
  const [showDeleteDialog, setShowDeleteDialog] = useState(false)
  const [isDeleting, setIsDeleting] = useState(false)
  const [deleteError, setDeleteError] = useState<string | null>(null)

  const handleDelete = useCallback(async () => {
    setIsDeleting(true)
    setDeleteError(null)
    const result = await deleteClient(client.id)
    if (result.error) {
      setDeleteError(result.error)
      setIsDeleting(false)
    } else {
      setShowDeleteDialog(false)
      router.refresh()
    }
  }, [client.id, router])

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
          <button
            type="button"
            onClick={() => setShowDeleteDialog(true)}
            className="rounded-md bg-red-50 px-3 py-1 text-xs font-medium text-red-600 hover:bg-red-100"
          >
            Verwijderen
          </button>
        </div>
      </div>

      {deleteError && (
        <div className="mt-2 rounded-md bg-red-50 px-3 py-2 text-xs text-red-700">
          {deleteError}
        </div>
      )}

      {showDeleteDialog && (
        <DeleteConfirmDialog
          clientName={client.companyName}
          onConfirm={handleDelete}
          onCancel={() => { setShowDeleteDialog(false); setDeleteError(null) }}
          isDeleting={isDeleting}
        />
      )}

      {/* Stats row */}
      <div className="mt-3 flex flex-wrap items-center gap-4 text-xs text-gray-500">
        <span>{client.totalLeads} contacten</span>
        <span>{client.campaigns.length} campagne{client.campaigns.length !== 1 ? 's' : ''}</span>
        <span className={client.hasLowEmails ? 'font-medium text-red-600' : ''}>
          {client.totalEmailsYesterday} emails gisteren
        </span>
        {client.password && (
          <PasswordReveal password={client.password} />
        )}
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
