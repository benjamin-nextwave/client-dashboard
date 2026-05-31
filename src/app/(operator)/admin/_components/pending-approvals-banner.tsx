'use client'

import Link from 'next/link'
import { useState, useTransition } from 'react'
import { sendApprovalReminder } from '../actions'

export interface PendingApprovalItem {
  type: 'voorvertoning' | 'mailvarianten_tekst' | 'mailvarianten_pdf' | 'onboarding'
  label: string
  since: string
  count?: number
}

export interface PendingApprovalClient {
  clientId: string
  companyName: string
  approvals: PendingApprovalItem[]
}

interface Props {
  clients: PendingApprovalClient[]
}

const LABEL_BY_TYPE: Record<PendingApprovalItem['type'], string> = {
  voorvertoning: 'Voorvertoning',
  mailvarianten_tekst: 'Mailvarianten (tekst)',
  mailvarianten_pdf: 'Mailvarianten (PDF)',
  onboarding: 'Onboarding-stappen',
}

function formatDutchDate(iso: string): string {
  const date = new Date(iso)
  const now = new Date()
  const sameYear = date.getFullYear() === now.getFullYear()
  if (sameYear) {
    return date.toLocaleDateString('nl-NL', { day: 'numeric', month: 'long' })
  }
  return date.toLocaleDateString('nl-NL', { day: 'numeric', month: 'long', year: 'numeric' })
}

function daysSince(iso: string): number {
  return Math.floor((Date.now() - new Date(iso).getTime()) / 86_400_000)
}

export function PendingApprovalsBanner({ clients }: Props) {
  const totalItems = clients.reduce((sum, c) => sum + c.approvals.length, 0)
  if (clients.length === 0) return null

  return (
    <section className="overflow-hidden rounded-2xl border border-amber-200 bg-gradient-to-r from-amber-50 via-orange-50 to-rose-50 shadow-sm">
      <div className="flex items-center gap-3 border-b border-amber-100/80 px-6 py-3.5">
        <div className="relative flex h-10 w-10 flex-shrink-0 items-center justify-center rounded-xl bg-amber-500 text-white shadow-lg shadow-amber-500/30">
          <svg className="h-5 w-5" fill="none" viewBox="0 0 24 24" strokeWidth={2} stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" d="M12 6v6h4.5m4.5 0a9 9 0 1 1-18 0 9 9 0 0 1 18 0Z" />
          </svg>
          <span className="absolute -right-1 -top-1 flex h-5 min-w-5 items-center justify-center rounded-full bg-gray-900 px-1 text-[10px] font-bold text-white shadow">
            {totalItems}
          </span>
        </div>
        <div>
          <div className="text-sm font-semibold text-gray-900">
            {totalItems} openstaande {totalItems === 1 ? 'goedkeuring' : 'goedkeuringen'} bij {clients.length} {clients.length === 1 ? 'klant' : 'klanten'}
          </div>
          <div className="text-xs text-gray-600">
            Items die wij hebben ingediend en waar de klant nog op moet reageren.
          </div>
        </div>
      </div>
      <ul className="divide-y divide-amber-100/70">
        {clients.map((c) => (
          <PendingClientRow key={c.clientId} client={c} />
        ))}
      </ul>
    </section>
  )
}

function PendingClientRow({ client }: { client: PendingApprovalClient }) {
  const [pending, startTransition] = useTransition()
  const [feedback, setFeedback] = useState<{ type: 'ok' | 'err'; message: string } | null>(null)

  const handleReminder = (e: React.MouseEvent) => {
    e.preventDefault()
    e.stopPropagation()
    if (pending) return
    setFeedback(null)
    startTransition(async () => {
      const result = await sendApprovalReminder(
        client.clientId,
        client.approvals.map((a) => ({
          type: a.type,
          label: a.label,
          since: a.since,
          count: a.count,
        }))
      )
      if (result.error) {
        setFeedback({ type: 'err', message: result.error })
      } else {
        setFeedback({ type: 'ok', message: 'Reminder verstuurd' })
      }
      setTimeout(() => setFeedback(null), 4000)
    })
  }

  // Oudste pending bepaalt prioriteit kleur
  const oldestDays = Math.max(...client.approvals.map((a) => daysSince(a.since)))
  const urgent = oldestDays >= 7

  return (
    <li>
      <div className="flex flex-wrap items-center gap-3 px-6 py-3.5">
        <Link
          href={`/admin/clients/${client.clientId}`}
          className="group min-w-0 flex-1 hover:opacity-80"
        >
          <div className="flex items-center gap-2">
            <span className="truncate text-sm font-semibold text-gray-900 group-hover:text-amber-700">
              {client.companyName}
            </span>
            {urgent && (
              <span className="inline-flex items-center gap-0.5 rounded-md border border-rose-200 bg-rose-50 px-1.5 py-0.5 text-[10px] font-bold uppercase text-rose-700">
                {oldestDays}d
              </span>
            )}
          </div>
          <div className="mt-1 flex flex-wrap gap-x-3 gap-y-1 text-xs text-gray-600">
            {client.approvals.map((a) => (
              <span key={a.type} className="inline-flex items-center gap-1">
                <span className="inline-block h-1.5 w-1.5 rounded-full bg-amber-500" />
                <span className="font-medium">
                  {a.label}
                  {a.count && a.count > 1 ? ` (${a.count})` : ''}
                </span>
                <span className="text-gray-400">sinds {formatDutchDate(a.since)}</span>
              </span>
            ))}
          </div>
        </Link>
        <div className="flex items-center gap-2">
          {feedback && (
            <span
              className={`text-[11px] font-semibold ${
                feedback.type === 'ok' ? 'text-emerald-700' : 'text-red-700'
              }`}
            >
              {feedback.message}
            </span>
          )}
          <button
            type="button"
            onClick={handleReminder}
            disabled={pending}
            className="inline-flex items-center gap-1.5 rounded-lg bg-gray-900 px-3 py-1.5 text-xs font-semibold text-white shadow-sm transition-all hover:bg-gray-800 disabled:opacity-50"
          >
            {pending ? (
              <>
                <svg className="h-3.5 w-3.5 animate-spin" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <circle cx="12" cy="12" r="9" strokeWidth={3} strokeLinecap="round" strokeDasharray="40 60" />
                </svg>
                Versturen…
              </>
            ) : (
              <>
                <svg className="h-3.5 w-3.5" fill="none" viewBox="0 0 24 24" strokeWidth={2} stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" d="M21.75 6.75v10.5a2.25 2.25 0 0 1-2.25 2.25h-15a2.25 2.25 0 0 1-2.25-2.25V6.75m19.5 0A2.25 2.25 0 0 0 19.5 4.5h-15a2.25 2.25 0 0 0-2.25 2.25m19.5 0v.243a2.25 2.25 0 0 1-1.07 1.916l-7.5 4.615a2.25 2.25 0 0 1-2.36 0L3.32 8.91a2.25 2.25 0 0 1-1.07-1.916V6.75" />
                </svg>
                Stuur reminder mail
              </>
            )}
          </button>
        </div>
      </div>
    </li>
  )
}
