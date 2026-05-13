'use client'

import { useState, useTransition } from 'react'
import { useRouter } from 'next/navigation'
import {
  LINKEDIN_FLOW_STEPS,
  type LinkedInEditableStepKey,
  type LinkedInFlowState,
  type LinkedInFlowStep,
} from '@/lib/data/linkedin-flow'
import {
  publishLinkedInFlow,
  setLinkedInFlowEnabled,
  updateLinkedInMessages,
} from '../actions'

interface Props {
  clientId: string
  state: LinkedInFlowState
}

function formatTimestamp(iso: string): string {
  return new Date(iso).toLocaleString('nl-NL', {
    day: 'numeric',
    month: 'long',
    year: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
  })
}

export function LinkedInFlowEditor({ clientId, state }: Props) {
  const router = useRouter()
  const [pending, startTransition] = useTransition()
  const [error, setError] = useState<string | null>(null)
  const [messages, setMessages] = useState(state.messages)
  const [savingStep, setSavingStep] = useState<LinkedInEditableStepKey | null>(null)
  const [savedAt, setSavedAt] = useState<LinkedInEditableStepKey | null>(null)
  const [publishStatus, setPublishStatus] = useState<'idle' | 'published'>('idle')

  const isPublished = !!state.publishedAt
  const isApproved =
    !!state.approvedAt &&
    !!state.publishedAt &&
    new Date(state.approvedAt).getTime() >= new Date(state.publishedAt).getTime()

  const dirtyKeys = (Object.keys(messages) as LinkedInEditableStepKey[]).filter(
    (k) => messages[k] !== state.messages[k]
  )
  const hasDirty = dirtyKeys.length > 0

  const handleToggleEnabled = () => {
    setError(null)
    startTransition(async () => {
      const result = await setLinkedInFlowEnabled(clientId, !state.enabled)
      if (result.error) setError(result.error)
      else router.refresh()
    })
  }

  const handleSaveStep = (key: LinkedInEditableStepKey) => {
    setError(null)
    setSavingStep(key)
    startTransition(async () => {
      const result = await updateLinkedInMessages(clientId, { [key]: messages[key] })
      setSavingStep(null)
      if (result.error) {
        setError(result.error)
      } else {
        setSavedAt(key)
        setTimeout(() => setSavedAt((cur) => (cur === key ? null : cur)), 1500)
        router.refresh()
      }
    })
  }

  const handlePublish = () => {
    setError(null)
    setPublishStatus('idle')

    startTransition(async () => {
      if (hasDirty) {
        const patch: Partial<Record<LinkedInEditableStepKey, string>> = {}
        for (const k of dirtyKeys) patch[k] = messages[k]
        const saveResult = await updateLinkedInMessages(clientId, patch)
        if (saveResult.error) {
          setError(saveResult.error)
          return
        }
      }

      const result = await publishLinkedInFlow(clientId)
      if (result.error) {
        setError(result.error)
      } else {
        setPublishStatus('published')
        setTimeout(() => setPublishStatus('idle'), 3000)
        router.refresh()
      }
    })
  }

  if (!state.enabled) {
    return (
      <section className="rounded-2xl border-2 border-dashed border-blue-200 bg-blue-50/40 p-6">
        <div className="flex items-start gap-4">
          <div className="flex h-10 w-10 flex-shrink-0 items-center justify-center rounded-xl bg-blue-100 text-blue-600">
            <LinkedInIcon className="h-5 w-5" />
          </div>
          <div className="min-w-0 flex-1">
            <h2 className="text-sm font-semibold text-blue-900">LinkedIn-flow (optioneel)</h2>
            <p className="mt-1 text-xs leading-relaxed text-blue-800/90">
              Voeg een LinkedIn-flow toe na de mailcampagne. Leads die op geen van de drie mails
              hebben gereageerd, krijgen automatisch deze acht stappen.
            </p>
            <button
              type="button"
              onClick={handleToggleEnabled}
              disabled={pending}
              className="mt-4 inline-flex items-center gap-2 rounded-xl bg-blue-600 px-4 py-2.5 text-sm font-semibold text-white shadow-sm transition-all hover:-translate-y-0.5 hover:bg-blue-700 hover:shadow-md disabled:cursor-not-allowed disabled:opacity-60"
            >
              <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" strokeWidth={2.5} stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" d="M12 4.5v15m7.5-7.5h-15" />
              </svg>
              LinkedIn-flow toevoegen
            </button>
            {error && (
              <div className="mt-3 rounded-xl border border-red-200 bg-red-50 p-3 text-sm text-red-700">
                {error}
              </div>
            )}
          </div>
        </div>
      </section>
    )
  }

  return (
    <section className="rounded-2xl border-2 border-blue-200 bg-blue-50/30 p-6 shadow-sm">
      <div className="mb-5 border-b border-blue-100 pb-4">
        <div className="flex items-start justify-between gap-4">
          <div className="flex items-start gap-3 min-w-0">
            <div className="flex h-9 w-9 flex-shrink-0 items-center justify-center rounded-xl bg-blue-600 text-white shadow-sm shadow-blue-500/30">
              <LinkedInIcon className="h-4 w-4" />
            </div>
            <div className="min-w-0">
              <h2 className="text-sm font-semibold text-blue-900">LinkedIn-flow</h2>
              <p className="mt-0.5 text-xs leading-relaxed text-blue-800/80">
                Acht-stappen sequence na de mailflow. Leads komen hier alleen in als ze op
                geen van de drie mails hebben gereageerd. Alleen de berichten op dag +1, +4,
                +9 en +14 zijn bewerkbaar.
              </p>
            </div>
          </div>
          <button
            type="button"
            onClick={handleToggleEnabled}
            disabled={pending}
            className="inline-flex flex-shrink-0 items-center gap-1.5 rounded-lg border border-blue-200 bg-white px-3 py-1.5 text-xs font-semibold text-blue-700 shadow-sm transition-colors hover:border-blue-300 hover:bg-blue-50 disabled:opacity-50"
          >
            <svg className="h-3.5 w-3.5" fill="none" viewBox="0 0 24 24" strokeWidth={2} stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" d="M6 18 18 6M6 6l12 12" />
            </svg>
            Verwijder uit campagne
          </button>
        </div>

        <div className="mt-4 grid gap-2 sm:grid-cols-2">
          <button
            type="button"
            onClick={handlePublish}
            disabled={pending}
            className={`group inline-flex items-center justify-center gap-2 rounded-xl px-4 py-3 text-sm font-semibold transition-all ${
              isApproved && !hasDirty
                ? 'cursor-default bg-emerald-50 text-emerald-700 ring-1 ring-emerald-200'
                : 'bg-blue-600 text-white shadow-sm hover:-translate-y-0.5 hover:bg-blue-700 hover:shadow-md disabled:cursor-not-allowed disabled:opacity-60'
            }`}
          >
            {publishStatus === 'published' ? (
              <>
                <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" strokeWidth={3} stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" d="m4.5 12.75 6 6 9-13.5" />
                </svg>
                Gepubliceerd naar klant
              </>
            ) : isApproved && !hasDirty ? (
              <>
                <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" strokeWidth={3} stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" d="m4.5 12.75 6 6 9-13.5" />
                </svg>
                Goedgekeurd door klant
              </>
            ) : (
              <>
                {isPublished
                  ? hasDirty
                    ? 'Sla wijzigingen op en publiceer opnieuw'
                    : 'Publiceer opnieuw naar klant'
                  : 'Publiceer naar klantendashboard'}
                <svg className="h-4 w-4 transition-transform group-hover:translate-x-0.5" fill="none" viewBox="0 0 24 24" strokeWidth={2.5} stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" d="M13.5 4.5 21 12m0 0-7.5 7.5M21 12H3" />
                </svg>
              </>
            )}
          </button>

          <div className="flex flex-col justify-center gap-0.5 rounded-xl border border-blue-100 bg-white px-4 py-2.5 text-[11px] text-blue-800/90">
            {isPublished ? (
              <>
                <div>
                  <span className="font-semibold text-blue-900">Laatste publicatie:</span>{' '}
                  {formatTimestamp(state.publishedAt!)}
                </div>
                <div>
                  <span className="font-semibold text-blue-900">Goedkeuring:</span>{' '}
                  {isApproved
                    ? `geaccepteerd op ${formatTimestamp(state.approvedAt!)}`
                    : 'in afwachting van klant'}
                </div>
              </>
            ) : (
              <div>Nog niet gepubliceerd — de klant ziet deze flow pas na publicatie.</div>
            )}
          </div>
        </div>
      </div>

      {error && (
        <div className="mb-4 rounded-xl border border-red-200 bg-red-50 p-3 text-sm text-red-700">
          {error}
        </div>
      )}

      <div className="space-y-4">
        <PhaseGroup
          title="Vóór acceptatie"
          subtitle="Warmen op zonder bericht — bouw zichtbaarheid op."
          steps={LINKEDIN_FLOW_STEPS.filter((s) => s.phase === 'pre_accept')}
          messages={messages}
          baseline={state.messages}
          onChange={(k, v) => setMessages((m) => ({ ...m, [k]: v }))}
          onSave={handleSaveStep}
          savingStep={savingStep}
          savedAt={savedAt}
          disabled={pending}
        />
        <PhaseGroup
          title="Na acceptatie"
          subtitle="Vier berichten op vaste momenten. Alleen de inhoud is bewerkbaar."
          steps={LINKEDIN_FLOW_STEPS.filter((s) => s.phase === 'post_accept')}
          messages={messages}
          baseline={state.messages}
          onChange={(k, v) => setMessages((m) => ({ ...m, [k]: v }))}
          onSave={handleSaveStep}
          savingStep={savingStep}
          savedAt={savedAt}
          disabled={pending}
        />
      </div>
    </section>
  )
}

function PhaseGroup({
  title,
  subtitle,
  steps,
  messages,
  baseline,
  onChange,
  onSave,
  savingStep,
  savedAt,
  disabled,
}: {
  title: string
  subtitle: string
  steps: LinkedInFlowStep[]
  messages: Record<LinkedInEditableStepKey, string>
  baseline: Record<LinkedInEditableStepKey, string>
  onChange: (key: LinkedInEditableStepKey, value: string) => void
  onSave: (key: LinkedInEditableStepKey) => void
  savingStep: LinkedInEditableStepKey | null
  savedAt: LinkedInEditableStepKey | null
  disabled?: boolean
}) {
  return (
    <div className="rounded-xl border border-blue-100 bg-white p-5">
      <div className="mb-3">
        <h3 className="text-sm font-semibold text-blue-900">{title}</h3>
        <p className="mt-0.5 text-[11px] text-blue-700/80">{subtitle}</p>
      </div>
      <ol className="relative space-y-3 border-l-2 border-blue-100 pl-5">
        {steps.map((step) => (
          <li key={step.key} className="relative">
            <span className="absolute -left-[27px] top-1.5 flex h-4 w-4 items-center justify-center rounded-full border-2 border-blue-300 bg-white">
              <span className="h-1.5 w-1.5 rounded-full bg-blue-500" />
            </span>
            <StepCard
              step={step}
              value={step.editable ? messages[step.key as LinkedInEditableStepKey] : ''}
              dirty={
                step.editable &&
                messages[step.key as LinkedInEditableStepKey] !==
                  baseline[step.key as LinkedInEditableStepKey]
              }
              saving={savingStep === step.key}
              justSaved={savedAt === step.key}
              onChange={(v) => onChange(step.key as LinkedInEditableStepKey, v)}
              onSave={() => onSave(step.key as LinkedInEditableStepKey)}
              disabled={disabled}
            />
          </li>
        ))}
      </ol>
    </div>
  )
}

function StepCard({
  step,
  value,
  dirty,
  saving,
  justSaved,
  onChange,
  onSave,
  disabled,
}: {
  step: LinkedInFlowStep
  value: string
  dirty: boolean
  saving: boolean
  justSaved: boolean
  onChange: (value: string) => void
  onSave: () => void
  disabled?: boolean
}) {
  return (
    <div
      className={`rounded-xl border bg-white p-4 shadow-sm ${
        dirty ? 'border-amber-300 bg-amber-50/30' : 'border-blue-100'
      }`}
    >
      <div className="flex flex-wrap items-center gap-2">
        <span className="inline-flex items-center rounded-md bg-blue-600 px-2 py-0.5 text-[10px] font-bold uppercase tracking-wide text-white">
          {step.dayLabel}
        </span>
        <span className="text-sm font-semibold text-blue-900">{step.title}</span>
        {!step.editable && (
          <span className="inline-flex items-center rounded-md bg-blue-50 px-1.5 py-0.5 text-[9px] font-bold uppercase tracking-wide text-blue-700 ring-1 ring-blue-200">
            Vaste actie
          </span>
        )}
        {dirty && (
          <span className="inline-flex items-center gap-1 rounded-md bg-amber-100 px-1.5 py-0.5 text-[9px] font-bold uppercase tracking-wide text-amber-700">
            <span className="h-1 w-1 rounded-full bg-amber-500" />
            Onopgeslagen
          </span>
        )}
      </div>
      <p className="mt-1 text-[11px] leading-relaxed text-gray-600">{step.description}</p>

      {step.editable && (
        <div className="mt-3">
          <textarea
            value={value}
            onChange={(e) => onChange(e.target.value)}
            rows={4}
            placeholder="Schrijf hier het LinkedIn-bericht..."
            disabled={disabled || saving}
            maxLength={step.charLimit}
            className="w-full rounded-lg border border-blue-200 bg-white px-3 py-2 text-sm shadow-sm focus:border-blue-400 focus:outline-none focus:ring-4 focus:ring-blue-100"
          />
          <div className="mt-2 flex items-center justify-between gap-2">
            <span
              className={`text-[10px] font-medium ${
                step.charLimit && value.length >= step.charLimit
                  ? 'text-red-600'
                  : 'text-blue-700/80'
              }`}
            >
              {value.length}
              {step.charLimit ? ` / ${step.charLimit} tekens` : ' tekens'}
            </span>
            <button
              type="button"
              onClick={onSave}
              disabled={disabled || saving || !dirty}
              className={`inline-flex items-center gap-1.5 rounded-lg px-4 py-1.5 text-[11px] font-bold shadow-sm transition-all ${
                dirty && !saving
                  ? 'bg-amber-500 text-white shadow-amber-500/30 hover:-translate-y-0.5 hover:bg-amber-600'
                  : 'bg-gray-200 text-gray-500'
              } disabled:cursor-not-allowed`}
            >
              {justSaved ? (
                <>
                  <svg className="h-3 w-3" fill="none" viewBox="0 0 24 24" strokeWidth={3} stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" d="m4.5 12.75 6 6 9-13.5" />
                  </svg>
                  Opgeslagen
                </>
              ) : saving ? (
                'Opslaan...'
              ) : dirty ? (
                'Opslaan'
              ) : (
                'Opgeslagen'
              )}
            </button>
          </div>
        </div>
      )}
    </div>
  )
}

function LinkedInIcon({ className }: { className?: string }) {
  return (
    <svg className={className} fill="currentColor" viewBox="0 0 24 24" aria-hidden="true">
      <path d="M19 3a2 2 0 0 1 2 2v14a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h14ZM8.4 18v-7.5H5.9V18h2.5Zm-1.25-8.62a1.45 1.45 0 1 0 0-2.9 1.45 1.45 0 0 0 0 2.9ZM18.1 18v-4.1c0-2.2-1.18-3.23-2.75-3.23-1.27 0-1.83.7-2.15 1.2v-1.03h-2.5c.03.7 0 7.5 0 7.5h2.5v-4.2c0-.22.02-.45.08-.6.18-.45.59-.92 1.27-.92.9 0 1.25.68 1.25 1.68V18h2.5Z" />
    </svg>
  )
}
