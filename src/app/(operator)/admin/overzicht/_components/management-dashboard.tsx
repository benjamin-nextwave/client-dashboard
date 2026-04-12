'use client'

import { useState, useMemo } from 'react'
import Link from 'next/link'
import type { ClientTaskOverview } from '@/lib/data/management-overview'

type FilterMode = 'all' | 'action_needed' | 'onboarding' | 'completed' | 'overdue'

const STEP_LABELS: Record<string, string> = {
  dashboard: 'Dashboard opgeleverd',
  form: 'Invulformulier',
  drafts: 'Mailopzetjes & voorvertoning',
  variants: 'Mailvarianten goedkeuren',
  preview: 'Voorvertoning goedkeuren',
  dnc: 'DNC-lijst',
}

function formatDate(dateStr: string | null): string {
  if (!dateStr) return '—'
  return new Date(dateStr).toLocaleDateString('nl-NL', {
    day: 'numeric',
    month: 'short',
  })
}

function formatDeadline(dateStr: string | null, daysLeft: number | null, overdue: boolean): React.ReactNode {
  if (!dateStr) return <span className="text-gray-400">Geen</span>
  const formatted = new Date(dateStr).toLocaleDateString('nl-NL', {
    day: 'numeric',
    month: 'short',
    year: 'numeric',
  })
  if (overdue) {
    return (
      <span className="inline-flex items-center gap-1 font-semibold text-red-600">
        <span className="h-1.5 w-1.5 rounded-full bg-red-500" />
        {formatted} ({Math.abs(daysLeft!)}d te laat)
      </span>
    )
  }
  if (daysLeft !== null && daysLeft <= 3) {
    return (
      <span className="inline-flex items-center gap-1 font-semibold text-amber-600">
        <span className="h-1.5 w-1.5 rounded-full bg-amber-500" />
        {formatted} ({daysLeft}d)
      </span>
    )
  }
  return <span className="text-gray-700">{formatted} ({daysLeft}d)</span>
}

function hasActionNeeded(c: ClientTaskOverview): boolean {
  return (
    c.variantsNeedApproval ||
    c.proposalNeedsApproval ||
    c.openFeedbackCount > 0 ||
    c.deadlineOverdue ||
    (!c.onboardingComplete && (c.deadlineDaysLeft ?? 999) <= 3)
  )
}

export function ManagementDashboard({ clients }: { clients: ClientTaskOverview[] }) {
  const [filter, setFilter] = useState<FilterMode>('all')
  const [search, setSearch] = useState('')

  const stats = useMemo(() => {
    const total = clients.length
    const onboarding = clients.filter((c) => !c.onboardingComplete).length
    const completed = clients.filter((c) => c.onboardingComplete).length
    const actionNeeded = clients.filter(hasActionNeeded).length
    const overdue = clients.filter((c) => c.deadlineOverdue).length
    return { total, onboarding, completed, actionNeeded, overdue }
  }, [clients])

  const filtered = useMemo(() => {
    let result = clients
    if (search.trim()) {
      const q = search.toLowerCase()
      result = result.filter((c) => c.companyName.toLowerCase().includes(q))
    }
    switch (filter) {
      case 'action_needed':
        result = result.filter(hasActionNeeded)
        break
      case 'onboarding':
        result = result.filter((c) => !c.onboardingComplete)
        break
      case 'completed':
        result = result.filter((c) => c.onboardingComplete)
        break
      case 'overdue':
        result = result.filter((c) => c.deadlineOverdue)
        break
    }
    // Sort: overdue first, then by deadline, then alphabetical
    result = [...result].sort((a, b) => {
      if (a.deadlineOverdue && !b.deadlineOverdue) return -1
      if (!a.deadlineOverdue && b.deadlineOverdue) return 1
      const aAction = hasActionNeeded(a) ? 0 : 1
      const bAction = hasActionNeeded(b) ? 0 : 1
      if (aAction !== bAction) return aAction - bAction
      return a.companyName.localeCompare(b.companyName)
    })
    return result
  }, [clients, filter, search])

  return (
    <div className="space-y-6">
      {/* Stats cards */}
      <div className="grid grid-cols-2 gap-3 sm:grid-cols-5">
        <StatCard
          label="Totaal"
          value={stats.total}
          active={filter === 'all'}
          onClick={() => setFilter('all')}
        />
        <StatCard
          label="Actie nodig"
          value={stats.actionNeeded}
          dot="bg-amber-500"
          active={filter === 'action_needed'}
          onClick={() => setFilter('action_needed')}
        />
        <StatCard
          label="In onboarding"
          value={stats.onboarding}
          dot="bg-indigo-500"
          active={filter === 'onboarding'}
          onClick={() => setFilter('onboarding')}
        />
        <StatCard
          label="Voltooid"
          value={stats.completed}
          dot="bg-emerald-500"
          active={filter === 'completed'}
          onClick={() => setFilter('completed')}
        />
        <StatCard
          label="Deadline over"
          value={stats.overdue}
          dot="bg-red-500"
          active={filter === 'overdue'}
          onClick={() => setFilter('overdue')}
        />
      </div>

      {/* Search */}
      <div className="relative max-w-md">
        <svg
          className="pointer-events-none absolute left-4 top-1/2 h-4 w-4 -translate-y-1/2 text-gray-400"
          fill="none"
          viewBox="0 0 24 24"
          strokeWidth={2}
          stroke="currentColor"
        >
          <path strokeLinecap="round" strokeLinejoin="round" d="m21 21-5.197-5.197m0 0A7.5 7.5 0 1 0 5.196 5.196a7.5 7.5 0 0 0 10.607 10.607Z" />
        </svg>
        <input
          type="text"
          placeholder="Zoek een klant..."
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          className="w-full rounded-xl border border-gray-200 bg-white py-3 pl-11 pr-4 text-sm text-gray-900 placeholder:text-gray-400 shadow-sm transition-all focus:border-indigo-400 focus:outline-none focus:ring-4 focus:ring-indigo-100"
        />
      </div>

      {/* Table */}
      {filtered.length === 0 ? (
        <div className="rounded-2xl border border-dashed border-gray-200 bg-white px-6 py-16 text-center text-sm text-gray-500">
          Geen klanten gevonden{search ? ` voor "${search}"` : ''}.
        </div>
      ) : (
        <div className="overflow-hidden rounded-2xl border border-gray-200 bg-white shadow-sm">
          <div className="overflow-x-auto">
            <table className="w-full text-left text-sm">
              <thead>
                <tr className="border-b border-gray-100 bg-gray-50/60">
                  <th className="px-5 py-3 text-[11px] font-semibold uppercase tracking-wide text-gray-500">
                    Klant
                  </th>
                  <th className="px-4 py-3 text-[11px] font-semibold uppercase tracking-wide text-gray-500">
                    Onboarding
                  </th>
                  <th className="px-4 py-3 text-[11px] font-semibold uppercase tracking-wide text-gray-500">
                    Huidige stap
                  </th>
                  <th className="px-4 py-3 text-[11px] font-semibold uppercase tracking-wide text-gray-500">
                    Deadline
                  </th>
                  <th className="px-4 py-3 text-[11px] font-semibold uppercase tracking-wide text-gray-500">
                    Openstaand
                  </th>
                  <th className="px-4 py-3 text-[11px] font-semibold uppercase tracking-wide text-gray-500">
                    Acties
                  </th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-100">
                {filtered.map((client) => (
                  <ClientRow key={client.id} client={client} />
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}
    </div>
  )
}

function StatCard({
  label,
  value,
  dot,
  active,
  onClick,
}: {
  label: string
  value: number
  dot?: string
  active: boolean
  onClick: () => void
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      className={`flex items-center gap-3 rounded-xl border px-4 py-3 text-left transition-all ${
        active
          ? 'border-indigo-500 bg-indigo-50 shadow-sm ring-2 ring-indigo-100'
          : 'border-gray-200 bg-white hover:border-gray-300'
      }`}
    >
      {dot && <span className={`h-2 w-2 flex-shrink-0 rounded-full ${dot}`} />}
      <div>
        <div className="text-2xl font-bold text-gray-900">{value}</div>
        <div className="text-[11px] text-gray-500">{label}</div>
      </div>
    </button>
  )
}

function ClientRow({ client: c }: { client: ClientTaskOverview }) {
  const progressPercent = Math.round((c.completedSteps / c.totalSteps) * 100)

  const badges: React.ReactNode[] = []
  if (c.variantsNeedApproval) {
    badges.push(
      <Badge key="variants" color="amber" label="Mailvarianten wacht" />
    )
  }
  if (c.proposalNeedsApproval) {
    badges.push(
      <Badge key="proposal" color="violet" label="Voorstel wacht" />
    )
  }
  if (c.openFeedbackCount > 0) {
    badges.push(
      <Badge
        key="feedback"
        color="blue"
        label={`${c.openFeedbackCount} feedback`}
      />
    )
  }
  if (c.deadlineOverdue) {
    badges.push(<Badge key="overdue" color="red" label="Deadline verlopen" />)
  }

  const initials = c.companyName
    .split(/\s+/)
    .slice(0, 2)
    .map((w) => w.charAt(0))
    .join('')
    .toUpperCase()

  return (
    <tr className="group transition-colors hover:bg-gray-50/50">
      {/* Client name */}
      <td className="px-5 py-4">
        <div className="flex items-center gap-3">
          <div
            className="flex h-9 w-9 flex-shrink-0 items-center justify-center rounded-lg text-xs font-bold text-white"
            style={{ background: c.primaryColor ?? '#6366f1' }}
          >
            {initials}
          </div>
          <div className="min-w-0">
            <div className="truncate text-sm font-semibold text-gray-900">
              {c.companyName}
            </div>
          </div>
        </div>
      </td>

      {/* Progress */}
      <td className="px-4 py-4">
        {c.onboardingComplete ? (
          <span className="inline-flex items-center gap-1.5 rounded-full bg-emerald-50 px-2.5 py-1 text-[11px] font-semibold text-emerald-700 ring-1 ring-emerald-200">
            <svg className="h-3 w-3" fill="none" viewBox="0 0 24 24" strokeWidth={3} stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" d="m4.5 12.75 6 6 9-13.5" />
            </svg>
            Voltooid
          </span>
        ) : (
          <div className="flex items-center gap-2">
            <div className="h-1.5 w-20 overflow-hidden rounded-full bg-gray-200">
              <div
                className="h-full rounded-full bg-indigo-500 transition-all"
                style={{ width: `${progressPercent}%` }}
              />
            </div>
            <span className="text-[11px] font-semibold text-gray-500">
              {c.completedSteps}/{c.totalSteps}
            </span>
          </div>
        )}
      </td>

      {/* Current step */}
      <td className="px-4 py-4">
        {c.currentStep ? (
          <span className="text-xs text-gray-700">
            {STEP_LABELS[c.currentStep]}
          </span>
        ) : (
          <span className="text-xs text-gray-400">—</span>
        )}
      </td>

      {/* Deadline */}
      <td className="px-4 py-4 text-xs">
        {formatDeadline(c.approvalDeadline, c.deadlineDaysLeft, c.deadlineOverdue)}
      </td>

      {/* Open items */}
      <td className="px-4 py-4">
        {badges.length > 0 ? (
          <div className="flex flex-wrap gap-1">{badges}</div>
        ) : (
          <span className="text-xs text-gray-400">Geen</span>
        )}
      </td>

      {/* Actions */}
      <td className="px-4 py-4">
        <div className="flex items-center gap-1.5">
          <Link
            href={`/admin/clients/${c.id}/campagne`}
            className="inline-flex items-center gap-1 rounded-lg border border-gray-200 bg-white px-2.5 py-1.5 text-[11px] font-semibold text-gray-700 shadow-sm transition-all hover:border-indigo-200 hover:text-indigo-600"
          >
            Campagne
          </Link>
          <Link
            href={`/admin/clients/${c.id}/edit`}
            className="inline-flex items-center gap-1 rounded-lg border border-gray-200 bg-white px-2.5 py-1.5 text-[11px] font-semibold text-gray-700 shadow-sm transition-all hover:border-indigo-200 hover:text-indigo-600"
          >
            Bewerken
          </Link>
        </div>
      </td>
    </tr>
  )
}

function Badge({ color, label }: { color: 'amber' | 'violet' | 'blue' | 'red'; label: string }) {
  const colors: Record<string, string> = {
    amber: 'bg-amber-50 text-amber-700 ring-amber-200',
    violet: 'bg-violet-50 text-violet-700 ring-violet-200',
    blue: 'bg-blue-50 text-blue-700 ring-blue-200',
    red: 'bg-red-50 text-red-700 ring-red-200',
  }
  return (
    <span
      className={`inline-flex items-center rounded-full px-2 py-0.5 text-[10px] font-semibold ring-1 ${colors[color]}`}
    >
      {label}
    </span>
  )
}
