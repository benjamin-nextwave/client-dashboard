'use client'

import { useState, useTransition } from 'react'
import { useRouter } from 'next/navigation'
import type { CampaignState } from '@/lib/data/campaign'
import {
  updateCampaignFlags,
  updateApprovalDeadline,
  requestPreviewApproval,
  triggerDraftsReadyWebhook,
  allowAnotherFormSubmission,
} from '../actions'

interface Props {
  clientId: string
  state: CampaignState
}

function formatDateTime(iso: string | null): string {
  if (!iso) return '—'
  return new Date(iso).toLocaleString('nl-NL', {
    day: 'numeric',
    month: 'short',
    year: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
  })
}

export function CampaignControls({ clientId, state }: Props) {
  const router = useRouter()
  const [pending, startTransition] = useTransition()
  const [error, setError] = useState<string | null>(null)
  const [webhookStatus, setWebhookStatus] = useState<'idle' | 'sent' | 'error'>('idle')

  const [draftsReady, setDraftsReady] = useState(state.mailDraftsReady)
  const [previewFilled, setPreviewFilled] = useState(state.previewFilled)
  const [deadline, setDeadline] = useState(state.approvalDeadline ?? '')

  const canTriggerWebhook = draftsReady && previewFilled
  const isLocked = !!state.completedAt

  const handleToggle = (field: 'draftsReady' | 'previewFilled', value: boolean) => {
    setError(null)
    if (field === 'draftsReady') setDraftsReady(value)
    else setPreviewFilled(value)

    startTransition(async () => {
      const result = await updateCampaignFlags(clientId, {
        [field === 'draftsReady' ? 'mailDraftsReady' : 'previewFilled']: value,
      })
      if (result.error) {
        setError(result.error)
        if (field === 'draftsReady') setDraftsReady(!value)
        else setPreviewFilled(!value)
      } else {
        router.refresh()
      }
    })
  }

  const handleDeadlineSave = () => {
    setError(null)
    startTransition(async () => {
      const result = await updateApprovalDeadline(clientId, deadline || null)
      if (result.error) setError(result.error)
      else router.refresh()
    })
  }

  const handleTriggerWebhook = () => {
    setError(null)
    setWebhookStatus('idle')
    startTransition(async () => {
      const result = await triggerDraftsReadyWebhook(clientId)
      if (result.error) {
        setError(result.error)
        setWebhookStatus('error')
      } else {
        setWebhookStatus('sent')
        setTimeout(() => setWebhookStatus('idle'), 3000)
      }
    })
  }

  const handleRequestPreview = () => {
    setError(null)
    startTransition(async () => {
      const result = await requestPreviewApproval(clientId)
      if (result.error) setError(result.error)
      else router.refresh()
    })
  }

  const handleAllowAnotherForm = () => {
    setError(null)
    startTransition(async () => {
      const result = await allowAnotherFormSubmission(clientId)
      if (result.error) setError(result.error)
      else router.refresh()
    })
  }

  const formSlotsRemaining = state.formAllowedCount - state.formSubmissionCount
  const clientCanSubmit = formSlotsRemaining > 0

  return (
    <section className="rounded-2xl border border-gray-200 bg-white p-6 shadow-sm">
      <div className="mb-5 flex items-start justify-between gap-4 border-b border-gray-100 pb-4">
        <div>
          <h2 className="text-sm font-semibold text-gray-900">Status en acties</h2>
          <p className="mt-0.5 text-xs text-gray-500">Werk de campagne-onboarding bij en trigger notificaties.</p>
        </div>
        {isLocked && (
          <span className="inline-flex items-center gap-1.5 rounded-full bg-emerald-50 px-3 py-1 text-[11px] font-semibold text-emerald-700 ring-1 ring-emerald-100">
            <svg className="h-3 w-3" fill="none" viewBox="0 0 24 24" strokeWidth={3} stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" d="m4.5 12.75 6 6 9-13.5" />
            </svg>
            Afgerond op {formatDateTime(state.completedAt)}
          </span>
        )}
      </div>

      {error && (
        <div className="mb-4 rounded-xl border border-red-200 bg-red-50 p-3 text-sm text-red-700">
          {error}
        </div>
      )}

      {/* Invulformulier submission control */}
      <div className="mb-4 flex flex-wrap items-center justify-between gap-3 rounded-xl border border-gray-200 bg-gray-50/50 p-4">
        <div>
          <div className="text-sm font-semibold text-gray-900">Invulformulier</div>
          <p className="mt-0.5 text-xs text-gray-500">
            {state.formSubmissionCount === 0
              ? 'Klant heeft het formulier nog niet ingediend.'
              : `Klant heeft het formulier ${state.formSubmissionCount}× ingediend.`}
            {' '}
            <span className="font-medium text-gray-700">
              {state.formSubmissionCount} / {state.formAllowedCount} gebruikt
            </span>
            {clientCanSubmit && state.formSubmissionCount > 0 && (
              <span className="ml-1 text-indigo-600">· klant kan opnieuw indienen</span>
            )}
          </p>
        </div>
        <button
          type="button"
          onClick={handleAllowAnotherForm}
          disabled={pending || isLocked}
          className="inline-flex items-center gap-2 rounded-xl border border-indigo-200 bg-white px-4 py-2 text-xs font-semibold text-indigo-700 shadow-sm transition-all hover:-translate-y-0.5 hover:border-indigo-300 hover:bg-indigo-50 hover:shadow disabled:cursor-not-allowed disabled:opacity-50 disabled:hover:translate-y-0"
        >
          <svg className="h-3.5 w-3.5" fill="none" viewBox="0 0 24 24" strokeWidth={2.5} stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" d="M12 4.5v15m7.5-7.5h-15" />
          </svg>
          Invulformulier toevoegen
        </button>
      </div>

      {/* Checkboxes */}
      <div className="grid gap-3 sm:grid-cols-2">
        <CheckCard
          label="Mailopzetjes gemaakt"
          description="Markeer wanneer alle varianten klaar staan."
          checked={draftsReady}
          onChange={(v) => handleToggle('draftsReady', v)}
          disabled={pending || isLocked}
        />
        <CheckCard
          label="Voorvertoning aangevuld"
          description="Bevestig dat de voorvertoning klaar is voor review."
          checked={previewFilled}
          onChange={(v) => handleToggle('previewFilled', v)}
          disabled={pending || isLocked}
        />
      </div>

      {/* Webhook button */}
      <div className="mt-6 flex flex-wrap items-center justify-between gap-3 rounded-xl border border-gray-200 bg-gray-50/50 p-4">
        <div>
          <div className="text-sm font-semibold text-gray-900">Notificatie versturen</div>
          <p className="mt-0.5 text-xs text-gray-500">
            {canTriggerWebhook
              ? 'Beide vinkjes staan — klaar om te triggeren.'
              : 'Zet beide vinkjes aan om te activeren.'}
          </p>
        </div>
        <button
          type="button"
          onClick={handleTriggerWebhook}
          disabled={!canTriggerWebhook || pending || isLocked}
          className={`inline-flex items-center gap-2 rounded-xl px-5 py-2.5 text-sm font-semibold transition-all ${
            canTriggerWebhook && !pending && !isLocked
              ? 'bg-gray-900 text-white shadow-sm hover:bg-indigo-600 hover:shadow-md'
              : 'cursor-not-allowed bg-gray-200 text-gray-400'
          }`}
        >
          {webhookStatus === 'sent' ? (
            <>
              <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" strokeWidth={3} stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" d="m4.5 12.75 6 6 9-13.5" />
              </svg>
              Verstuurd
            </>
          ) : (
            <>
              Notificatie versturen
              <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" strokeWidth={2.5} stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" d="M13.5 4.5 21 12m0 0-7.5 7.5M21 12H3" />
              </svg>
            </>
          )}
        </button>
      </div>

      {/* Deadline picker */}
      <div className="mt-4 rounded-xl border border-gray-200 bg-gray-50/50 p-4">
        <div className="flex flex-wrap items-end gap-3">
          <div className="flex-1 min-w-[220px]">
            <label htmlFor="deadline" className="block text-xs font-semibold uppercase tracking-wide text-gray-600">
              Deadline goedkeuring
            </label>
            <p className="mt-0.5 text-[11px] text-gray-500">Wordt groot getoond in het klantdashboard.</p>
            <input
              id="deadline"
              type="date"
              value={deadline}
              onChange={(e) => setDeadline(e.target.value)}
              disabled={pending || isLocked}
              className="mt-2 w-full rounded-xl border border-gray-200 bg-white px-3 py-2 text-sm text-gray-900 shadow-sm focus:border-indigo-400 focus:outline-none focus:ring-4 focus:ring-indigo-100 disabled:opacity-50"
            />
          </div>
          <button
            type="button"
            onClick={handleDeadlineSave}
            disabled={pending || isLocked || deadline === (state.approvalDeadline ?? '')}
            className="rounded-xl bg-gray-900 px-4 py-2 text-xs font-semibold text-white shadow-sm transition-all hover:bg-indigo-600 disabled:cursor-not-allowed disabled:bg-gray-200 disabled:text-gray-400"
          >
            Opslaan
          </button>
        </div>
      </div>

      {/* Preview approval request */}
      <div className="mt-4 flex flex-wrap items-center justify-between gap-3 rounded-xl border border-gray-200 bg-gray-50/50 p-4">
        <div>
          <div className="text-sm font-semibold text-gray-900">Voorvertoning ter goedkeuring</div>
          <p className="mt-0.5 text-xs text-gray-500">
            {state.previewApprovalRequestedAt
              ? `Aangevraagd op ${formatDateTime(state.previewApprovalRequestedAt)}`
              : 'Client ziet pas een "Goedkeuren" knop nadat jij deze aanvraag verstuurt.'}
          </p>
          {state.previewApprovedAt && (
            <p className="mt-1 text-[11px] font-semibold text-emerald-600">
              ✓ Goedgekeurd op {formatDateTime(state.previewApprovedAt)}
            </p>
          )}
        </div>
        <button
          type="button"
          onClick={handleRequestPreview}
          disabled={pending || isLocked || !!state.previewApprovalRequestedAt}
          className="rounded-xl bg-gray-900 px-5 py-2.5 text-sm font-semibold text-white shadow-sm transition-all hover:bg-indigo-600 disabled:cursor-not-allowed disabled:bg-gray-200 disabled:text-gray-400"
        >
          {state.previewApprovalRequestedAt ? 'Reeds aangevraagd' : 'Voorvertoning om goedkeuring vragen'}
        </button>
      </div>

    </section>
  )
}

function CheckCard({
  label,
  description,
  checked,
  onChange,
  disabled,
}: {
  label: string
  description: string
  checked: boolean
  onChange: (v: boolean) => void
  disabled?: boolean
}) {
  return (
    <label
      className={`flex cursor-pointer items-start gap-3 rounded-xl border p-4 transition-all ${
        checked ? 'border-indigo-200 bg-indigo-50/50' : 'border-gray-200 bg-white hover:border-gray-300'
      } ${disabled ? 'cursor-not-allowed opacity-60' : ''}`}
    >
      <div className="relative mt-0.5">
        <input
          type="checkbox"
          checked={checked}
          onChange={(e) => onChange(e.target.checked)}
          disabled={disabled}
          className="peer sr-only"
        />
        <div className="h-5 w-5 rounded-md border-2 border-gray-300 bg-white transition-all peer-checked:border-indigo-500 peer-checked:bg-indigo-500" />
        {checked && (
          <svg
            className="absolute left-0 top-0 h-5 w-5 p-0.5 text-white"
            fill="none"
            viewBox="0 0 24 24"
            strokeWidth={3}
            stroke="currentColor"
          >
            <path strokeLinecap="round" strokeLinejoin="round" d="m4.5 12.75 6 6 9-13.5" />
          </svg>
        )}
      </div>
      <div className="min-w-0 flex-1">
        <div className="text-sm font-semibold text-gray-900">{label}</div>
        <div className="mt-0.5 text-xs text-gray-500">{description}</div>
      </div>
    </label>
  )
}
