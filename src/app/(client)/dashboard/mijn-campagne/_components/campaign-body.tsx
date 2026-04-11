'use client'

import { useState, useTransition } from 'react'
import Link from 'next/link'
import { useRouter } from 'next/navigation'
import type { CampaignState } from '@/lib/data/campaign'
import { approvePreview, confirmCampaignApproval } from '../actions'

interface Props {
  state: CampaignState
}

function formatDeadline(dateStr: string | null): string | null {
  if (!dateStr) return null
  const d = new Date(dateStr)
  return d.toLocaleDateString('nl-NL', { day: 'numeric', month: 'long', year: 'numeric' })
}

export function CampaignBody({ state }: Props) {
  const router = useRouter()
  const [pending, startTransition] = useTransition()
  const [error, setError] = useState<string | null>(null)
  const [showConfirmModal, setShowConfirmModal] = useState(false)

  const isCompleted = !!state.completedAt
  const deadline = formatDeadline(state.approvalDeadline)

  const canApprovePreview = !!state.previewApprovalRequestedAt && !state.previewApprovedAt && !isCompleted

  const bothApproved = !!state.previewApprovedAt && !!state.variantsApprovedAt && !isCompleted

  const handleApprovePreview = () => {
    setError(null)
    startTransition(async () => {
      const r = await approvePreview()
      if (r.error) setError(r.error)
      else {
        router.refresh()
        if (state.variantsApprovedAt) setShowConfirmModal(true)
      }
    })
  }

  const handleConfirm = () => {
    setError(null)
    startTransition(async () => {
      const r = await confirmCampaignApproval()
      if (r.error) {
        setError(r.error)
      } else {
        setShowConfirmModal(false)
        router.refresh()
      }
    })
  }

  return (
    <div className="space-y-6">
      {error && (
        <div className="rounded-xl border border-red-200 bg-red-50 p-4 text-sm text-red-700">
          {error}
        </div>
      )}

      {/* Deadline hero */}
      {deadline && !isCompleted && (
        <section className="relative overflow-hidden rounded-2xl border border-indigo-200 bg-gradient-to-br from-indigo-50 via-white to-violet-50 p-8 shadow-sm">
          <div className="pointer-events-none absolute -right-20 -top-20 h-56 w-56 rounded-full bg-gradient-to-br from-violet-400/30 to-transparent blur-3xl" />
          <div className="relative">
            <div className="text-[11px] font-semibold uppercase tracking-wide text-indigo-600">
              Deadline goedkeuring mailvarianten en voorvertoning
            </div>
            <div className="mt-2 text-4xl font-bold tracking-tight text-gray-900 sm:text-5xl">
              {deadline}
            </div>
          </div>
        </section>
      )}

      {isCompleted && (
        <section className="flex items-center gap-4 rounded-2xl border border-emerald-200 bg-emerald-50 p-6">
          <div className="flex h-12 w-12 flex-shrink-0 items-center justify-center rounded-2xl bg-emerald-500 text-white shadow-lg shadow-emerald-500/30">
            <svg className="h-6 w-6" fill="none" viewBox="0 0 24 24" strokeWidth={3} stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" d="m4.5 12.75 6 6 9-13.5" />
            </svg>
          </div>
          <div>
            <div className="text-base font-semibold text-emerald-900">Campagne goedgekeurd</div>
            <p className="mt-0.5 text-sm text-emerald-700">
              Bedankt voor je bevestiging. We gaan verder met de lancering.
            </p>
          </div>
        </section>
      )}

      {/* Task 2: Invulformulier */}
      {state.formSubmissionCount < state.formAllowedCount && (
        <TaskCard
          number={2}
          highlight
          title={
            state.formSubmissionCount === 0
              ? 'Invulformulier invullen'
              : 'Extra invulformulier beschikbaar'
          }
          description={
            state.formSubmissionCount === 0
              ? 'Vul het invulformulier in zodat we jouw campagne kunnen opstellen. Dit is een belangrijke eerste stap.'
              : 'NextWave heeft een nieuw invulformulier voor je klaargezet. Je eerdere antwoorden blijven bewaard.'
          }
        >
          <Link
            href="/dashboard/mijn-campagne/invulformulier"
            className="inline-flex items-center gap-2 rounded-xl bg-red-600 px-6 py-3 text-sm font-semibold text-white shadow-lg shadow-red-500/30 transition-all hover:-translate-y-0.5 hover:bg-red-700 hover:shadow-xl"
          >
            {state.formSubmissionCount === 0 ? 'Invulformulier invullen' : 'Nieuw invulformulier invullen'}
            <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" strokeWidth={2.5} stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" d="M13.5 4.5 21 12m0 0-7.5 7.5M21 12H3" />
            </svg>
          </Link>
        </TaskCard>
      )}

      {/* Task 3 notice */}
      {state.formSubmittedAt && !(state.mailDraftsReady && state.previewFilled) && (
        <TaskCard
          number={3}
          title="Mailopzetjes & voorvertoning worden voorbereid"
          description="Ons team werkt aan je mailopzetjes en voorvertoning. Dit gebeurt binnen 48 uur."
          noAction
        />
      )}

      {/* Task 5: Voorvertoning goedkeuren */}
      {canApprovePreview && (
        <TaskCard
          number={5}
          highlight
          urgencyNote="Binnen 5 werkdagen om op schema te blijven lopen"
          title="Voorvertoning goedkeuren"
          description="Bekijk hoe je campagne eruit komt te zien en keur de voorvertoning goed."
        >
          <div className="flex flex-wrap gap-3">
            <Link
              href="/dashboard/voorvertoning"
              className="inline-flex items-center gap-2 rounded-xl border border-gray-200 bg-white px-5 py-2.5 text-sm font-semibold text-gray-700 shadow-sm hover:border-indigo-200 hover:text-indigo-600"
            >
              Voorvertoning openen
            </Link>
            <button
              type="button"
              onClick={handleApprovePreview}
              disabled={pending}
              className="inline-flex items-center gap-2 rounded-xl bg-emerald-600 px-6 py-3 text-base font-bold text-white shadow-lg shadow-emerald-500/40 transition-all hover:-translate-y-0.5 hover:bg-emerald-700 hover:shadow-xl disabled:opacity-50 disabled:hover:translate-y-0"
            >
              Goedkeuren
              <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" strokeWidth={3} stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" d="m4.5 12.75 6 6 9-13.5" />
              </svg>
            </button>
          </div>
        </TaskCard>
      )}

      {state.previewApprovedAt && !isCompleted && <ApprovedNotice label="Voorvertoning goedgekeurd" />}

      {/* If both approved but not confirmed — show banner */}
      {bothApproved && !isCompleted && !showConfirmModal && (
        <section className="flex flex-wrap items-center justify-between gap-4 rounded-2xl border border-amber-200 bg-amber-50 p-6">
          <div>
            <div className="text-sm font-semibold text-amber-900">Laatste stap: bevestigen</div>
            <p className="mt-0.5 text-xs text-amber-800">
              Je hebt beide onderdelen goedgekeurd. Bevestig om de campagne definitief te finaliseren.
            </p>
          </div>
          <button
            type="button"
            onClick={() => setShowConfirmModal(true)}
            className="rounded-xl bg-amber-600 px-5 py-2.5 text-sm font-semibold text-white shadow-lg shadow-amber-500/30 hover:bg-amber-700"
          >
            Definitief bevestigen
          </button>
        </section>
      )}

      {/* Modals */}
      {showConfirmModal && (
        <ConfirmModal
          onConfirm={handleConfirm}
          onCancel={() => setShowConfirmModal(false)}
          pending={pending}
        />
      )}
    </div>
  )
}

function TaskCard({
  number,
  title,
  description,
  children,
  noAction,
  highlight,
  urgencyNote,
}: {
  number: number
  title: string
  description: string
  children?: React.ReactNode
  noAction?: boolean
  highlight?: boolean
  urgencyNote?: string
}) {
  return (
    <section
      className={`relative overflow-hidden rounded-2xl border-2 p-6 shadow-sm transition-all ${
        highlight
          ? 'border-amber-300 bg-gradient-to-br from-amber-50 via-white to-orange-50 shadow-amber-200/40'
          : 'border-gray-200 bg-white'
      }`}
    >
      {highlight && (
        <div className="pointer-events-none absolute -right-16 -top-16 h-40 w-40 rounded-full bg-gradient-to-br from-amber-300/30 to-transparent blur-3xl" />
      )}
      <div className="relative flex items-start gap-4">
        <div
          className={`flex h-10 w-10 flex-shrink-0 items-center justify-center rounded-xl text-sm font-bold ring-1 ${
            highlight
              ? 'bg-amber-500 text-white shadow-lg shadow-amber-500/30 ring-amber-400'
              : 'bg-indigo-50 text-indigo-600 ring-indigo-100'
          }`}
        >
          {number}
        </div>
        <div className="min-w-0 flex-1">
          <h3 className={`text-lg font-bold ${highlight ? 'text-gray-900' : 'text-gray-900'}`}>
            {title}
          </h3>
          <p className="mt-1 text-sm leading-relaxed text-gray-600">{description}</p>
          {urgencyNote && (
            <div className="mt-3 inline-flex items-center gap-1.5 rounded-full bg-red-50 px-3 py-1 text-[11px] font-bold text-red-700 ring-1 ring-red-200">
              <svg className="h-3 w-3" fill="none" viewBox="0 0 24 24" strokeWidth={2.5} stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" d="M12 9v3.75m-9.303 3.376c-.866 1.5.217 3.374 1.948 3.374h14.71c1.73 0 2.813-1.874 1.948-3.374L13.949 3.378c-.866-1.5-3.032-1.5-3.898 0L2.697 16.126ZM12 15.75h.007v.008H12v-.008Z" />
              </svg>
              {urgencyNote}
            </div>
          )}
          {children && <div className="mt-4">{children}</div>}
          {noAction && (
            <div className="mt-3 inline-flex items-center gap-1.5 text-[11px] font-medium text-gray-400">
              <svg className="h-3.5 w-3.5 animate-spin" fill="none" viewBox="0 0 24 24">
                <circle cx="12" cy="12" r="10" stroke="currentColor" strokeOpacity="0.25" strokeWidth="3" />
                <path d="M12 2a10 10 0 0 1 10 10" stroke="currentColor" strokeWidth="3" strokeLinecap="round" />
              </svg>
              In behandeling
            </div>
          )}
        </div>
      </div>
    </section>
  )
}

function ApprovedNotice({ label, onView }: { label: string; onView?: () => void }) {
  return (
    <div className="flex items-center gap-3 rounded-xl border border-emerald-200 bg-emerald-50 px-4 py-3">
      <div className="flex h-7 w-7 flex-shrink-0 items-center justify-center rounded-full bg-emerald-500 text-white">
        <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" strokeWidth={3} stroke="currentColor">
          <path strokeLinecap="round" strokeLinejoin="round" d="m4.5 12.75 6 6 9-13.5" />
        </svg>
      </div>
      <div className="flex-1 text-sm font-semibold text-emerald-900">{label}</div>
      {onView && (
        <button
          type="button"
          onClick={onView}
          className="text-xs font-semibold text-emerald-700 hover:text-emerald-800"
        >
          Bekijk
        </button>
      )}
    </div>
  )
}

function ConfirmModal({
  onConfirm,
  onCancel,
  pending,
}: {
  onConfirm: () => void
  onCancel: () => void
  pending: boolean
}) {
  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm p-4" onClick={onCancel}>
      <div className="w-full max-w-md rounded-2xl bg-white p-6 shadow-2xl" onClick={(e) => e.stopPropagation()}>
        <div className="mb-4 flex items-center gap-3">
          <div className="flex h-11 w-11 items-center justify-center rounded-full bg-amber-100">
            <svg className="h-5 w-5 text-amber-600" fill="none" viewBox="0 0 24 24" strokeWidth={2} stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" d="M12 9v3.75m9-.75a9 9 0 1 1-18 0 9 9 0 0 1 18 0Zm-9 3.75h.008v.008H12v-.008Z" />
            </svg>
          </div>
          <div>
            <h3 className="text-lg font-semibold text-gray-900">Definitief bevestigen</h3>
            <p className="text-xs text-gray-500">Deze actie kan niet ongedaan worden gemaakt</p>
          </div>
        </div>

        <div className="rounded-xl bg-gray-50 p-4 text-sm text-gray-700">
          Weet je zeker dat je beide goedkeuringen wilt bevestigen? Na deze stap worden de
          mailvarianten en voorvertoning definitief vastgezet en wordt ons team ingelicht.
        </div>

        <div className="mt-5 flex justify-end gap-3">
          <button
            type="button"
            onClick={onCancel}
            disabled={pending}
            className="rounded-xl border border-gray-200 bg-white px-4 py-2.5 text-sm font-medium text-gray-700 hover:bg-gray-50 disabled:opacity-50"
          >
            Annuleren
          </button>
          <button
            type="button"
            onClick={onConfirm}
            disabled={pending}
            className="rounded-xl bg-emerald-600 px-5 py-2.5 text-sm font-semibold text-white shadow-lg shadow-emerald-500/30 hover:bg-emerald-700 disabled:opacity-50"
          >
            {pending ? 'Bevestigen...' : 'Ja, bevestigen'}
          </button>
        </div>
      </div>
    </div>
  )
}
