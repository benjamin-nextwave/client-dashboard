'use client'

import { useState, useMemo, useCallback } from 'react'
import Link from 'next/link'
import { useRouter } from 'next/navigation'
import type { ClientOverview } from '@/lib/data/admin-stats'
import { deleteClient, toggleClientHidden } from '../clients/actions'

type FilterType = 'all' | 'issues' | 'low_emails' | 'low_contacts' | 'hidden'

interface ClientOverviewListProps {
  clients: ClientOverview[]
  hiddenCount: number
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

export function ClientOverviewList({ clients, hiddenCount }: ClientOverviewListProps) {
  const [search, setSearch] = useState('')
  const [filter, setFilter] = useState<FilterType>('all')

  const filtered = useMemo(() => {
    let result = clients

    // Hidden filter
    if (filter === 'hidden') {
      result = result.filter((c) => c.isHidden)
    } else {
      // Default: hide hidden clients unless specifically viewing them
      result = result.filter((c) => !c.isHidden)

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
    }

    // Search filter
    if (search.trim()) {
      const q = search.toLowerCase()
      result = result.filter((c) => c.companyName.toLowerCase().includes(q))
    }

    return result
  }, [clients, search, filter])

  const visibleClients = clients.filter((c) => !c.isHidden)
  const issueCount = visibleClients.filter((c) => c.hasIssues).length
  const lowEmailCount = visibleClients.filter((c) => c.hasLowEmails).length
  const lowContactCount = visibleClients.filter((c) => c.hasLowContacts).length

  return (
    <div className="mt-6 space-y-4">
      {/* Search + Filters */}
      <div className="flex flex-wrap items-center gap-3">
        <div className="relative">
          <svg className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-gray-400" fill="none" viewBox="0 0 24 24" strokeWidth={2} stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" d="m21 21-5.197-5.197m0 0A7.5 7.5 0 1 0 5.196 5.196a7.5 7.5 0 0 0 10.607 10.607Z" />
          </svg>
          <input
            type="text"
            placeholder="Zoek klant..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="w-64 rounded-lg border border-gray-200 bg-white py-2 pl-9 pr-3 text-sm shadow-sm focus:border-blue-500 focus:outline-none focus:ring-1 focus:ring-blue-500"
          />
        </div>
        <div className="flex gap-2">
          <FilterPill
            active={filter === 'all'}
            onClick={() => setFilter('all')}
            label="Alle"
            count={visibleClients.length}
          />
          <FilterPill
            active={filter === 'issues'}
            onClick={() => setFilter('issues')}
            label="Problemen"
            count={issueCount}
            variant="red"
            icon={
              <svg className="h-3.5 w-3.5" fill="none" viewBox="0 0 24 24" strokeWidth={2} stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" d="M12 9v3.75m-9.303 3.376c-.866 1.5.217 3.374 1.948 3.374h14.71c1.73 0 2.813-1.874 1.948-3.374L13.949 3.378c-.866-1.5-3.032-1.5-3.898 0L2.697 16.126ZM12 15.75h.007v.008H12v-.008Z" />
              </svg>
            }
          />
          <FilterPill
            active={filter === 'low_emails'}
            onClick={() => setFilter('low_emails')}
            label="Emails laag"
            count={lowEmailCount}
            variant="amber"
            icon={
              <svg className="h-3.5 w-3.5" fill="none" viewBox="0 0 24 24" strokeWidth={2} stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" d="M21.75 6.75v10.5a2.25 2.25 0 0 1-2.25 2.25h-15a2.25 2.25 0 0 1-2.25-2.25V6.75m19.5 0A2.25 2.25 0 0 0 19.5 4.5h-15a2.25 2.25 0 0 0-2.25 2.25m19.5 0v.243a2.25 2.25 0 0 1-1.07 1.916l-7.5 4.615a2.25 2.25 0 0 1-2.36 0L3.32 8.91a2.25 2.25 0 0 1-1.07-1.916V6.75" />
              </svg>
            }
          />
          <FilterPill
            active={filter === 'low_contacts'}
            onClick={() => setFilter('low_contacts')}
            label="Contacten op"
            count={lowContactCount}
            variant="amber"
            icon={
              <svg className="h-3.5 w-3.5" fill="none" viewBox="0 0 24 24" strokeWidth={2} stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" d="M15 19.128a9.38 9.38 0 0 0 2.625.372 9.337 9.337 0 0 0 4.121-.952 4.125 4.125 0 0 0-7.533-2.493M15 19.128v-.003c0-1.113-.285-2.16-.786-3.07M15 19.128v.106A12.318 12.318 0 0 1 8.624 21c-2.331 0-4.512-.645-6.374-1.766l-.001-.109a6.375 6.375 0 0 1 11.964-3.07M12 6.375a3.375 3.375 0 1 1-6.75 0 3.375 3.375 0 0 1 6.75 0Zm8.25 2.25a2.625 2.625 0 1 1-5.25 0 2.625 2.625 0 0 1 5.25 0Z" />
              </svg>
            }
          />
          {hiddenCount > 0 && (
            <FilterPill
              active={filter === 'hidden'}
              onClick={() => setFilter('hidden')}
              label="Verborgen"
              count={hiddenCount}
              variant="gray"
              icon={
                <svg className="h-3.5 w-3.5" fill="none" viewBox="0 0 24 24" strokeWidth={2} stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" d="M3.98 8.223A10.477 10.477 0 0 0 1.934 12c1.292 4.338 5.31 7.5 10.066 7.5.993 0 1.953-.138 2.863-.395M6.228 6.228A10.451 10.451 0 0 1 12 4.5c4.756 0 8.773 3.162 10.065 7.498a10.522 10.522 0 0 1-4.293 5.774M6.228 6.228 3 3m3.228 3.228 3.65 3.65m7.894 7.894L21 21m-3.228-3.228-3.65-3.65m0 0a3 3 0 1 0-4.243-4.243m4.242 4.242L9.88 9.88" />
                </svg>
              }
            />
          )}
        </div>
      </div>

      {/* Client cards */}
      {filtered.length === 0 ? (
        <div className="flex flex-col items-center rounded-xl border border-dashed border-gray-200 bg-gray-50/50 px-6 py-12 text-center">
          <svg className="h-10 w-10 text-gray-300" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" d="m21 21-5.197-5.197m0 0A7.5 7.5 0 1 0 5.196 5.196a7.5 7.5 0 0 0 10.607 10.607Z" />
          </svg>
          <p className="mt-3 text-sm text-gray-500">
            Geen klanten gevonden{search ? ` voor "${search}"` : ''}.
          </p>
        </div>
      ) : (
        <div className="space-y-2">
          {filtered.map((client) => (
            <ClientCard key={client.id} client={client} />
          ))}
        </div>
      )}
    </div>
  )
}

function FilterPill({
  active,
  onClick,
  label,
  count,
  variant,
  icon,
}: {
  active: boolean
  onClick: () => void
  label: string
  count: number
  variant?: 'red' | 'amber' | 'gray'
  icon?: React.ReactNode
}) {
  if (active) {
    return (
      <button type="button" onClick={onClick} className="inline-flex items-center gap-1.5 rounded-lg bg-gray-900 px-3 py-2 text-xs font-medium text-white transition-all">
        {icon}
        {label}
        <span className="rounded-md bg-white/20 px-1.5 py-0.5 text-[10px] font-bold">{count}</span>
      </button>
    )
  }

  const countColor = variant === 'red'
    ? 'bg-red-100 text-red-700'
    : variant === 'amber'
      ? 'bg-amber-100 text-amber-700'
      : variant === 'gray'
        ? 'bg-gray-100 text-gray-500'
        : 'bg-gray-100 text-gray-600'

  return (
    <button
      type="button"
      onClick={onClick}
      className="inline-flex items-center gap-1.5 rounded-lg border border-gray-200 bg-white px-3 py-2 text-xs font-medium text-gray-600 transition-all hover:border-gray-300 hover:bg-gray-50"
    >
      {icon}
      {label}
      {count > 0 && (
        <span className={`rounded-md px-1.5 py-0.5 text-[10px] font-bold ${countColor}`}>{count}</span>
      )}
    </button>
  )
}

function PasswordReveal({ password }: { password: string }) {
  const [visible, setVisible] = useState(false)

  return (
    <span className="inline-flex items-center gap-1.5">
      <code className="rounded-md bg-gray-100 px-2 py-0.5 font-mono text-xs text-gray-600">
        {visible ? password : '••••••••'}
      </code>
      <button
        type="button"
        onClick={() => setVisible(!visible)}
        className="rounded p-0.5 text-gray-400 hover:bg-gray-100 hover:text-gray-600"
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
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-sm" onClick={onCancel}>
      <div className="mx-4 w-full max-w-md rounded-2xl bg-white p-6 shadow-2xl" onClick={(e) => e.stopPropagation()}>
        <div className="mb-4 flex items-center gap-3">
          <div className="flex h-11 w-11 items-center justify-center rounded-full bg-red-100">
            <svg className="h-5 w-5 text-red-600" fill="none" viewBox="0 0 24 24" strokeWidth={2} stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" d="m14.74 9-.346 9m-4.788 0L9.26 9m9.968-3.21c.342.052.682.107 1.022.166m-1.022-.165L18.16 19.673a2.25 2.25 0 0 1-2.244 2.077H8.084a2.25 2.25 0 0 1-2.244-2.077L4.772 5.79m14.456 0a48.108 48.108 0 0 0-3.478-.397m-12 .562c.34-.059.68-.114 1.022-.165m0 0a48.11 48.11 0 0 1 3.478-.397m7.5 0v-.916c0-1.18-.91-2.164-2.09-2.201a51.964 51.964 0 0 0-3.32 0c-1.18.037-2.09 1.022-2.09 2.201v.916m7.5 0a48.667 48.667 0 0 0-7.5 0" />
            </svg>
          </div>
          <div>
            <h3 className="text-lg font-semibold text-gray-900">Klant verwijderen</h3>
            <p className="text-sm text-gray-500">Dit kan niet ongedaan worden gemaakt!</p>
          </div>
        </div>

        <div className="mb-4 rounded-lg bg-red-50 p-3 text-sm text-red-800">
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
            className="mt-1 w-full rounded-lg border border-gray-200 px-3 py-2 text-sm focus:border-red-500 focus:outline-none focus:ring-1 focus:ring-red-500"
            placeholder={clientName}
            disabled={isDeleting}
          />
        </div>

        <div className="flex justify-end gap-3">
          <button
            type="button"
            onClick={onCancel}
            disabled={isDeleting}
            className="rounded-lg bg-gray-100 px-4 py-2 text-sm font-medium text-gray-700 hover:bg-gray-200 disabled:opacity-50"
          >
            Annuleren
          </button>
          <button
            type="button"
            onClick={onConfirm}
            disabled={!isMatch || isDeleting}
            className="rounded-lg bg-red-600 px-4 py-2 text-sm font-medium text-white hover:bg-red-700 disabled:cursor-not-allowed disabled:opacity-50"
          >
            {isDeleting ? 'Verwijderen...' : 'Definitief verwijderen'}
          </button>
        </div>
      </div>
    </div>
  )
}

function StatusBadge({ status, color, icon }: { status: string; color: string; icon?: React.ReactNode }) {
  const colorMap: Record<string, string> = {
    green: 'bg-emerald-50 text-emerald-700 border-emerald-200',
    red: 'bg-red-50 text-red-700 border-red-200',
    amber: 'bg-amber-50 text-amber-700 border-amber-200',
    purple: 'bg-purple-50 text-purple-700 border-purple-200',
    gray: 'bg-gray-50 text-gray-500 border-gray-200',
  }

  return (
    <span className={`inline-flex items-center gap-1 rounded-md border px-2 py-0.5 text-[11px] font-medium ${colorMap[color] ?? colorMap.gray}`}>
      {icon}
      {status}
    </span>
  )
}

function ClientCard({ client }: { client: ClientOverview }) {
  const router = useRouter()
  const [expanded, setExpanded] = useState(false)
  const [showDeleteDialog, setShowDeleteDialog] = useState(false)
  const [isDeleting, setIsDeleting] = useState(false)
  const [deleteError, setDeleteError] = useState<string | null>(null)
  const [togglingHidden, setTogglingHidden] = useState(false)

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

  const handleToggleHidden = useCallback(async () => {
    setTogglingHidden(true)
    await toggleClientHidden(client.id, !client.isHidden)
    router.refresh()
    setTogglingHidden(false)
  }, [client.id, client.isHidden, router])

  // Health status
  const getHealthInfo = () => {
    if (client.campaigns.length === 0) return { color: 'gray', label: 'Geen campagnes', dotColor: 'bg-gray-300' }
    if (client.hasLowEmails && client.hasLowContacts) return { color: 'red', label: 'Kritiek', dotColor: 'bg-red-500' }
    if (client.hasLowEmails) return { color: 'amber', label: 'Emails laag', dotColor: 'bg-amber-400' }
    if (client.hasLowContacts) return { color: 'amber', label: 'Contacten laag', dotColor: 'bg-amber-400' }
    return { color: 'green', label: 'Gezond', dotColor: 'bg-emerald-500' }
  }

  const health = getHealthInfo()

  return (
    <div className={`rounded-xl border bg-white shadow-sm transition-all ${client.isHidden ? 'border-dashed border-gray-200 opacity-60' : 'border-gray-100'}`}>
      {/* Collapsed row */}
      <button
        type="button"
        onClick={() => setExpanded(!expanded)}
        className="flex w-full items-center gap-3 px-5 py-3.5 text-left transition-colors hover:bg-gray-50/50"
      >
        {/* Health dot */}
        <span className={`h-2.5 w-2.5 flex-shrink-0 rounded-full ${health.dotColor}`} title={health.label} />

        {/* Client color + name */}
        <div className="flex items-center gap-2.5 min-w-0">
          <div
            className="h-8 w-8 flex-shrink-0 rounded-lg border border-gray-100 shadow-sm"
            style={{ backgroundColor: client.primaryColor ?? '#e5e7eb' }}
          />
          <span className="truncate text-sm font-semibold text-gray-900">{client.companyName}</span>
        </div>

        {/* Badges */}
        <div className="flex items-center gap-1.5 ml-1">
          {client.isRecruitment && (
            <StatusBadge
              status="Recruitment"
              color="purple"
              icon={
                <svg className="h-3 w-3" fill="none" viewBox="0 0 24 24" strokeWidth={2} stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" d="M20.25 14.15v4.25c0 1.094-.787 2.036-1.872 2.18-2.087.277-4.216.42-6.378.42s-4.291-.143-6.378-.42c-1.085-.144-1.872-1.086-1.872-2.18v-4.25m16.5 0a2.18 2.18 0 0 0 .75-1.661V8.706c0-1.081-.768-2.015-1.837-2.175a48.114 48.114 0 0 0-3.413-.387m4.5 8.006c-.194.165-.42.295-.673.38A23.978 23.978 0 0 1 12 15.75c-2.648 0-5.195-.429-7.577-1.22a2.016 2.016 0 0 1-.673-.38m0 0A2.18 2.18 0 0 1 3 12.489V8.706c0-1.081.768-2.015 1.837-2.175a48.111 48.111 0 0 1 3.413-.387m7.5 0V5.25A2.25 2.25 0 0 0 13.5 3h-3a2.25 2.25 0 0 0-2.25 2.25v.894m7.5 0a48.667 48.667 0 0 0-7.5 0" />
                </svg>
              }
            />
          )}
          {client.onboardingStatus === 'onboarding' && (
            <StatusBadge
              status="Onboarding"
              color="amber"
              icon={
                <svg className="h-3 w-3" fill="none" viewBox="0 0 24 24" strokeWidth={2} stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" d="M12 6v6h4.5m4.5 0a9 9 0 1 1-18 0 9 9 0 0 1 18 0Z" />
                </svg>
              }
            />
          )}
          {client.isHidden && (
            <StatusBadge
              status="Verborgen"
              color="gray"
              icon={
                <svg className="h-3 w-3" fill="none" viewBox="0 0 24 24" strokeWidth={2} stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" d="M3.98 8.223A10.477 10.477 0 0 0 1.934 12c1.292 4.338 5.31 7.5 10.066 7.5.993 0 1.953-.138 2.863-.395M6.228 6.228A10.451 10.451 0 0 1 12 4.5c4.756 0 8.773 3.162 10.065 7.498a10.522 10.522 0 0 1-4.293 5.774M6.228 6.228 3 3m3.228 3.228 3.65 3.65m7.894 7.894L21 21m-3.228-3.228-3.65-3.65m0 0a3 3 0 1 0-4.243-4.243m4.242 4.242L9.88 9.88" />
                </svg>
              }
            />
          )}
        </div>

        {/* Quick stats (right-aligned) */}
        <div className="ml-auto flex items-center gap-4 flex-shrink-0">
          {client.campaigns.length > 0 && (
            <>
              <div className="hidden sm:flex items-center gap-1.5 text-xs text-gray-500">
                <svg className="h-3.5 w-3.5 text-gray-400" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" d="M3.75 13.5l10.5-11.25L12 10.5h8.25L9.75 21.75 12 13.5H3.75Z" />
                </svg>
                <span className={client.hasLowEmails ? 'font-semibold text-red-600' : ''}>
                  {client.totalEmailsYesterday}
                </span>
                <span className="text-gray-300">/dag</span>
              </div>
              <div className="hidden sm:flex items-center gap-1.5 text-xs text-gray-500">
                <svg className="h-3.5 w-3.5 text-gray-400" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" d="M15 19.128a9.38 9.38 0 0 0 2.625.372 9.337 9.337 0 0 0 4.121-.952 4.125 4.125 0 0 0-7.533-2.493M15 19.128v-.003c0-1.113-.285-2.16-.786-3.07M15 19.128v.106A12.318 12.318 0 0 1 8.624 21c-2.331 0-4.512-.645-6.374-1.766l-.001-.109a6.375 6.375 0 0 1 11.964-3.07M12 6.375a3.375 3.375 0 1 1-6.75 0 3.375 3.375 0 0 1 6.75 0Zm8.25 2.25a2.625 2.625 0 1 1-5.25 0 2.625 2.625 0 0 1 5.25 0Z" />
                </svg>
                {client.totalLeads}
              </div>
            </>
          )}
          <svg
            className={`h-4 w-4 flex-shrink-0 text-gray-400 transition-transform ${expanded ? 'rotate-180' : ''}`}
            fill="none"
            viewBox="0 0 24 24"
            strokeWidth={2}
            stroke="currentColor"
          >
            <path strokeLinecap="round" strokeLinejoin="round" d="M19.5 8.25l-7.5 7.5-7.5-7.5" />
          </svg>
        </div>
      </button>

      {/* Expanded details */}
      {expanded && (
        <div className="border-t border-gray-100 px-5 pb-5 pt-4 space-y-4">
          {/* Action buttons */}
          <div className="flex flex-wrap items-center gap-2">
            <ActionButton href={`/admin/clients/${client.id}/edit`} icon={
              <svg className="h-3.5 w-3.5" fill="none" viewBox="0 0 24 24" strokeWidth={2} stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" d="m16.862 4.487 1.687-1.688a1.875 1.875 0 1 1 2.652 2.652L6.832 19.82a4.5 4.5 0 0 1-1.897 1.13l-2.685.8.8-2.685a4.5 4.5 0 0 1 1.13-1.897L16.863 4.487Zm0 0L19.5 7.125" />
              </svg>
            } label="Bewerken" />
            <ActionButton href={`/admin/clients/${client.id}/csv`} icon={
              <svg className="h-3.5 w-3.5" fill="none" viewBox="0 0 24 24" strokeWidth={2} stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" d="M19.5 14.25v-2.625a3.375 3.375 0 0 0-3.375-3.375h-1.5A1.125 1.125 0 0 1 13.5 7.125v-1.5a3.375 3.375 0 0 0-3.375-3.375H8.25m2.25 0H5.625c-.621 0-1.125.504-1.125 1.125v17.25c0 .621.504 1.125 1.125 1.125h12.75c.621 0 1.125-.504 1.125-1.125V11.25a9 9 0 0 0-9-9Z" />
              </svg>
            } label="CSV" />
            <ActionButton href={`/admin/clients/${client.id}/voorvertoning`} icon={
              <svg className="h-3.5 w-3.5" fill="none" viewBox="0 0 24 24" strokeWidth={2} stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" d="M2.036 12.322a1.012 1.012 0 0 1 0-.639C3.423 7.51 7.36 4.5 12 4.5c4.638 0 8.573 3.007 9.963 7.178.07.207.07.431 0 .639C20.577 16.49 16.64 19.5 12 19.5c-4.638 0-8.573-3.007-9.963-7.178Z" />
                <path strokeLinecap="round" strokeLinejoin="round" d="M15 12a3 3 0 1 1-6 0 3 3 0 0 1 6 0Z" />
              </svg>
            } label="Voorvertoning" />
            <ActionButton href={`/admin/clients/${client.id}/onboarding`} icon={
              <svg className="h-3.5 w-3.5" fill="none" viewBox="0 0 24 24" strokeWidth={2} stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" d="M4.26 10.147a60.438 60.438 0 0 0-.491 6.347A48.62 48.62 0 0 1 12 20.904a48.62 48.62 0 0 1 8.232-4.41 60.46 60.46 0 0 0-.491-6.347m-15.482 0a50.636 50.636 0 0 0-2.658-.813A59.906 59.906 0 0 1 12 3.493a59.903 59.903 0 0 1 10.399 5.84c-.896.248-1.783.52-2.658.814m-15.482 0A50.717 50.717 0 0 1 12 13.489a50.702 50.702 0 0 1 7.74-3.342" />
              </svg>
            } label="Onboarding" variant="amber" />

            {/* Hide/show toggle */}
            <button
              type="button"
              onClick={handleToggleHidden}
              disabled={togglingHidden}
              className={`inline-flex items-center gap-1.5 rounded-lg border px-3 py-1.5 text-xs font-medium transition-colors disabled:opacity-50 ${
                client.isHidden
                  ? 'border-emerald-200 bg-emerald-50 text-emerald-700 hover:bg-emerald-100'
                  : 'border-gray-200 bg-gray-50 text-gray-600 hover:bg-gray-100'
              }`}
            >
              {client.isHidden ? (
                <>
                  <svg className="h-3.5 w-3.5" fill="none" viewBox="0 0 24 24" strokeWidth={2} stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" d="M2.036 12.322a1.012 1.012 0 0 1 0-.639C3.423 7.51 7.36 4.5 12 4.5c4.638 0 8.573 3.007 9.963 7.178.07.207.07.431 0 .639C20.577 16.49 16.64 19.5 12 19.5c-4.638 0-8.573-3.007-9.963-7.178Z" />
                    <path strokeLinecap="round" strokeLinejoin="round" d="M15 12a3 3 0 1 1-6 0 3 3 0 0 1 6 0Z" />
                  </svg>
                  Tonen
                </>
              ) : (
                <>
                  <svg className="h-3.5 w-3.5" fill="none" viewBox="0 0 24 24" strokeWidth={2} stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" d="M3.98 8.223A10.477 10.477 0 0 0 1.934 12c1.292 4.338 5.31 7.5 10.066 7.5.993 0 1.953-.138 2.863-.395M6.228 6.228A10.451 10.451 0 0 1 12 4.5c4.756 0 8.773 3.162 10.065 7.498a10.522 10.522 0 0 1-4.293 5.774M6.228 6.228 3 3m3.228 3.228 3.65 3.65m7.894 7.894L21 21m-3.228-3.228-3.65-3.65m0 0a3 3 0 1 0-4.243-4.243m4.242 4.242L9.88 9.88" />
                  </svg>
                  Verbergen
                </>
              )}
            </button>

            <button
              type="button"
              onClick={() => setShowDeleteDialog(true)}
              className="inline-flex items-center gap-1.5 rounded-lg border border-red-200 bg-red-50 px-3 py-1.5 text-xs font-medium text-red-600 transition-colors hover:bg-red-100"
            >
              <svg className="h-3.5 w-3.5" fill="none" viewBox="0 0 24 24" strokeWidth={2} stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" d="m14.74 9-.346 9m-4.788 0L9.26 9m9.968-3.21c.342.052.682.107 1.022.166m-1.022-.165L18.16 19.673a2.25 2.25 0 0 1-2.244 2.077H8.084a2.25 2.25 0 0 1-2.244-2.077L4.772 5.79m14.456 0a48.108 48.108 0 0 0-3.478-.397m-12 .562c.34-.059.68-.114 1.022-.165m0 0a48.11 48.11 0 0 1 3.478-.397m7.5 0v-.916c0-1.18-.91-2.164-2.09-2.201a51.964 51.964 0 0 0-3.32 0c-1.18.037-2.09 1.022-2.09 2.201v.916m7.5 0a48.667 48.667 0 0 0-7.5 0" />
              </svg>
              Verwijderen
            </button>

            {client.lastSyncedAt && (
              <span className="ml-auto inline-flex items-center gap-1 text-[11px] text-gray-400" title={new Date(client.lastSyncedAt).toLocaleString('nl-NL')}>
                <svg className="h-3 w-3" fill="none" viewBox="0 0 24 24" strokeWidth={2} stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" d="M16.023 9.348h4.992v-.001M2.985 19.644v-4.992m0 0h4.992m-4.993 0 3.181 3.183a8.25 8.25 0 0 0 13.803-3.7M4.031 9.865a8.25 8.25 0 0 1 13.803-3.7l3.181 3.182" />
                </svg>
                {formatTimeAgo(client.lastSyncedAt)}
              </span>
            )}
          </div>

          {/* Stats grid */}
          <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
            <StatBox
              label="Emails gisteren"
              value={String(client.totalEmailsYesterday)}
              alert={client.hasLowEmails}
              alertText="< 74"
              icon={
                <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" d="M21.75 6.75v10.5a2.25 2.25 0 0 1-2.25 2.25h-15a2.25 2.25 0 0 1-2.25-2.25V6.75m19.5 0A2.25 2.25 0 0 0 19.5 4.5h-15a2.25 2.25 0 0 0-2.25 2.25m19.5 0v.243a2.25 2.25 0 0 1-1.07 1.916l-7.5 4.615a2.25 2.25 0 0 1-2.36 0L3.32 8.91a2.25 2.25 0 0 1-1.07-1.916V6.75" />
                </svg>
              }
            />
            <StatBox
              label="Contacten"
              value={String(client.totalLeads)}
              icon={
                <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" d="M15 19.128a9.38 9.38 0 0 0 2.625.372 9.337 9.337 0 0 0 4.121-.952 4.125 4.125 0 0 0-7.533-2.493M15 19.128v-.003c0-1.113-.285-2.16-.786-3.07M15 19.128v.106A12.318 12.318 0 0 1 8.624 21c-2.331 0-4.512-.645-6.374-1.766l-.001-.109a6.375 6.375 0 0 1 11.964-3.07M12 6.375a3.375 3.375 0 1 1-6.75 0 3.375 3.375 0 0 1 6.75 0Zm8.25 2.25a2.625 2.625 0 1 1-5.25 0 2.625 2.625 0 0 1 5.25 0Z" />
                </svg>
              }
            />
            <StatBox
              label="Campagnes"
              value={String(client.campaigns.length)}
              icon={
                <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" d="M3.75 13.5l10.5-11.25L12 10.5h8.25L9.75 21.75 12 13.5H3.75Z" />
                </svg>
              }
            />
            <StatBox
              label="Wachtwoord"
              custom={client.password ? <PasswordReveal password={client.password} /> : <span className="text-xs text-gray-400">-</span>}
              icon={
                <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" d="M16.5 10.5V6.75a4.5 4.5 0 1 0-9 0v3.75m-.75 11.25h10.5a2.25 2.25 0 0 0 2.25-2.25v-6.75a2.25 2.25 0 0 0-2.25-2.25H6.75a2.25 2.25 0 0 0-2.25 2.25v6.75a2.25 2.25 0 0 0 2.25 2.25Z" />
                </svg>
              }
            />
          </div>

          {/* Campaign breakdown */}
          {client.campaigns.length > 0 && (
            <div className="space-y-1.5">
              <p className="text-[11px] font-medium uppercase tracking-wider text-gray-400">Campagnes</p>
              {client.campaigns.map((campaign) => {
                const lowContacts = campaign.contactsRemaining < 180
                return (
                  <div
                    key={campaign.campaignId}
                    className="flex items-center justify-between rounded-lg bg-gray-50 px-3.5 py-2.5 text-xs"
                  >
                    <span className="truncate font-medium text-gray-700" title={campaign.campaignName}>
                      {campaign.campaignName}
                    </span>
                    <div className="flex items-center gap-4 flex-shrink-0 ml-4">
                      <span className="inline-flex items-center gap-1 text-gray-500">
                        <svg className="h-3 w-3 text-gray-400" fill="none" viewBox="0 0 24 24" strokeWidth={2} stroke="currentColor">
                          <path strokeLinecap="round" strokeLinejoin="round" d="M21.75 6.75v10.5a2.25 2.25 0 0 1-2.25 2.25h-15a2.25 2.25 0 0 1-2.25-2.25V6.75m19.5 0A2.25 2.25 0 0 0 19.5 4.5h-15a2.25 2.25 0 0 0-2.25 2.25m19.5 0v.243a2.25 2.25 0 0 1-1.07 1.916l-7.5 4.615a2.25 2.25 0 0 1-2.36 0L3.32 8.91a2.25 2.25 0 0 1-1.07-1.916V6.75" />
                        </svg>
                        {campaign.emailsSentYesterday}
                      </span>
                      <span className={`inline-flex items-center gap-1 ${lowContacts ? 'font-semibold text-red-600' : 'text-gray-500'}`}>
                        <svg className="h-3 w-3" fill="none" viewBox="0 0 24 24" strokeWidth={2} stroke={lowContacts ? 'currentColor' : '#9ca3af'}>
                          <path strokeLinecap="round" strokeLinejoin="round" d="M15 19.128a9.38 9.38 0 0 0 2.625.372 9.337 9.337 0 0 0 4.121-.952 4.125 4.125 0 0 0-7.533-2.493M15 19.128v-.003c0-1.113-.285-2.16-.786-3.07M15 19.128v.106A12.318 12.318 0 0 1 8.624 21c-2.331 0-4.512-.645-6.374-1.766l-.001-.109a6.375 6.375 0 0 1 11.964-3.07M12 6.375a3.375 3.375 0 1 1-6.75 0 3.375 3.375 0 0 1 6.75 0Zm8.25 2.25a2.625 2.625 0 1 1-5.25 0 2.625 2.625 0 0 1 5.25 0Z" />
                        </svg>
                        {campaign.contactsRemaining} over
                        {lowContacts && (
                          <span className="ml-0.5 inline-flex h-4 items-center rounded bg-red-100 px-1 text-[10px] font-bold text-red-700">!</span>
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
            <div className="flex flex-wrap gap-2">
              {client.hasLowEmails && (
                <div className="inline-flex items-center gap-1.5 rounded-lg bg-amber-50 border border-amber-200 px-3 py-1.5 text-xs font-medium text-amber-800">
                  <svg className="h-3.5 w-3.5" fill="none" viewBox="0 0 24 24" strokeWidth={2} stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" d="M12 9v3.75m-9.303 3.376c-.866 1.5.217 3.374 1.948 3.374h14.71c1.73 0 2.813-1.874 1.948-3.374L13.949 3.378c-.866-1.5-3.032-1.5-3.898 0L2.697 16.126ZM12 15.75h.007v.008H12v-.008Z" />
                  </svg>
                  Te weinig emails ({client.totalEmailsYesterday}/74)
                </div>
              )}
              {client.hasLowContacts && (
                <div className="inline-flex items-center gap-1.5 rounded-lg bg-red-50 border border-red-200 px-3 py-1.5 text-xs font-medium text-red-800">
                  <svg className="h-3.5 w-3.5" fill="none" viewBox="0 0 24 24" strokeWidth={2} stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" d="M12 9v3.75m-9.303 3.376c-.866 1.5.217 3.374 1.948 3.374h14.71c1.73 0 2.813-1.874 1.948-3.374L13.949 3.378c-.866-1.5-3.032-1.5-3.898 0L2.697 16.126ZM12 15.75h.007v.008H12v-.008Z" />
                  </svg>
                  Contacten opraken
                </div>
              )}
            </div>
          )}

          {deleteError && (
            <div className="rounded-lg bg-red-50 border border-red-200 px-3 py-2 text-xs text-red-700">
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
        </div>
      )}
    </div>
  )
}

function ActionButton({
  href,
  icon,
  label,
  variant,
}: {
  href: string
  icon: React.ReactNode
  label: string
  variant?: 'amber'
}) {
  const colors = variant === 'amber'
    ? 'border-amber-200 bg-amber-50 text-amber-700 hover:bg-amber-100'
    : 'border-gray-200 bg-white text-gray-700 hover:bg-gray-50'

  return (
    <Link
      href={href}
      className={`inline-flex items-center gap-1.5 rounded-lg border px-3 py-1.5 text-xs font-medium transition-colors ${colors}`}
    >
      {icon}
      {label}
    </Link>
  )
}

function StatBox({
  label,
  value,
  alert,
  alertText,
  icon,
  custom,
}: {
  label: string
  value?: string
  alert?: boolean
  alertText?: string
  icon: React.ReactNode
  custom?: React.ReactNode
}) {
  return (
    <div className="rounded-lg bg-gray-50 p-3">
      <div className="flex items-center gap-1.5 text-gray-400">
        {icon}
        <span className="text-[11px] font-medium">{label}</span>
      </div>
      <div className="mt-1">
        {custom ?? (
          <div className="flex items-center gap-1.5">
            <span className={`text-lg font-bold ${alert ? 'text-red-600' : 'text-gray-900'}`}>
              {value}
            </span>
            {alert && alertText && (
              <span className="rounded bg-red-100 px-1 py-0.5 text-[10px] font-bold text-red-700">{alertText}</span>
            )}
          </div>
        )}
      </div>
    </div>
  )
}
