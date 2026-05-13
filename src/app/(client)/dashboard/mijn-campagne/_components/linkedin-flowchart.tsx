'use client'

import { useState } from 'react'
import {
  LINKEDIN_FLOW_STEPS,
  type LinkedInEditableStepKey,
  type LinkedInFlowState,
  type LinkedInFlowStep,
} from '@/lib/data/linkedin-flow'

interface Props {
  state: LinkedInFlowState
}

/**
 * Vertical, blue-styled extension of the campaign flowchart that visualises
 * the LinkedIn sequence. Sits below the email-flow steps inside the same
 * "Campagne flow" section.
 *
 * Each step is a clickable card; clicking the four post-accept steps opens
 * a modal with the actual message body. Pre-accept steps are read-only
 * action cards.
 */
export function LinkedInFlowChart({ state }: Props) {
  const [openStep, setOpenStep] = useState<LinkedInFlowStep | null>(null)

  if (!state.enabled || !state.publishedAt) return null

  const preAccept = LINKEDIN_FLOW_STEPS.filter((s) => s.phase === 'pre_accept')
  const postAccept = LINKEDIN_FLOW_STEPS.filter((s) => s.phase === 'post_accept')

  return (
    <div className="relative mx-auto mt-2 max-w-2xl">
      {/* Transition: mail flow → LinkedIn */}
      <div className="flex flex-col items-center pt-1">
        <div className="h-6 w-0.5 rounded-full bg-blue-200" />
        <div className="inline-flex items-center gap-1.5 rounded-full border border-blue-200 bg-blue-50 px-3 py-1 text-[10px] font-bold uppercase tracking-wide text-blue-700 shadow-sm">
          <svg className="h-3 w-3" fill="currentColor" viewBox="0 0 24 24" aria-hidden="true">
            <path d="M19 3a2 2 0 0 1 2 2v14a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h14ZM8.4 18v-7.5H5.9V18h2.5Zm-1.25-8.62a1.45 1.45 0 1 0 0-2.9 1.45 1.45 0 0 0 0 2.9ZM18.1 18v-4.1c0-2.2-1.18-3.23-2.75-3.23-1.27 0-1.83.7-2.15 1.2v-1.03h-2.5c.03.7 0 7.5 0 7.5h2.5v-4.2c0-.22.02-.45.08-.6.18-.45.59-.92 1.27-.92.9 0 1.25.68 1.25 1.68V18h2.5Z" />
          </svg>
          Geen reactie · door naar LinkedIn
        </div>
        <div className="h-6 w-0.5 rounded-full bg-blue-200" />
      </div>

      {/* Header card */}
      <div className="overflow-hidden rounded-2xl border-2 border-blue-200 bg-gradient-to-r from-blue-50 via-white to-sky-50 px-5 py-4 shadow-md">
        <div className="flex items-center gap-3">
          <div className="flex h-9 w-9 flex-shrink-0 items-center justify-center rounded-xl bg-blue-600 text-white shadow-sm shadow-blue-500/30">
            <svg className="h-4 w-4" fill="currentColor" viewBox="0 0 24 24" aria-hidden="true">
              <path d="M19 3a2 2 0 0 1 2 2v14a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h14ZM8.4 18v-7.5H5.9V18h2.5Zm-1.25-8.62a1.45 1.45 0 1 0 0-2.9 1.45 1.45 0 0 0 0 2.9ZM18.1 18v-4.1c0-2.2-1.18-3.23-2.75-3.23-1.27 0-1.83.7-2.15 1.2v-1.03h-2.5c.03.7 0 7.5 0 7.5h2.5v-4.2c0-.22.02-.45.08-.6.18-.45.59-.92 1.27-.92.9 0 1.25.68 1.25 1.68V18h2.5Z" />
            </svg>
          </div>
          <div className="min-w-0 flex-1">
            <div className="text-[10px] font-semibold uppercase tracking-wide text-blue-600">
              LinkedIn-sequence
            </div>
            <div className="truncate text-sm font-bold text-blue-900">
              8 stappen — alleen voor leads zonder mailreactie
            </div>
          </div>
        </div>
      </div>

      {/* Pre-accept phase */}
      <PhaseGroup
        label="Vóór acceptatie"
        steps={preAccept}
        messages={state.messages}
        onOpen={(s) => setOpenStep(s)}
      />

      {/* Acceptance gate */}
      <div className="flex flex-col items-center py-2">
        <div className="h-6 w-0.5 rounded-full bg-blue-200" />
        <div className="inline-flex items-center gap-1.5 rounded-full border border-emerald-200 bg-emerald-50 px-3 py-1 text-[10px] font-bold uppercase tracking-wide text-emerald-700 shadow-sm">
          <svg className="h-3 w-3" fill="none" viewBox="0 0 24 24" strokeWidth={3} stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" d="m4.5 12.75 6 6 9-13.5" />
          </svg>
          Connectie geaccepteerd
        </div>
        <div className="h-6 w-0.5 rounded-full bg-blue-200" />
      </div>

      {/* Post-accept phase */}
      <PhaseGroup
        label="Na acceptatie"
        steps={postAccept}
        messages={state.messages}
        onOpen={(s) => setOpenStep(s)}
      />

      {/* End cap */}
      <div className="flex flex-col items-center pt-2">
        <div className="h-6 w-0.5 rounded-full bg-blue-200" />
        <div className="rounded-full bg-gray-100 px-3 py-1 text-[10px] font-semibold uppercase tracking-wide text-gray-500">
          Einde sequence
        </div>
      </div>

      {openStep && (
        <LinkedInStepModal
          step={openStep}
          messages={state.messages}
          onClose={() => setOpenStep(null)}
        />
      )}
    </div>
  )
}

function PhaseGroup({
  label,
  steps,
  messages,
  onOpen,
}: {
  label: string
  steps: LinkedInFlowStep[]
  messages: LinkedInFlowState['messages']
  onOpen: (step: LinkedInFlowStep) => void
}) {
  return (
    <div className="mt-2">
      <div className="mb-2 flex justify-center">
        <span className="inline-flex items-center rounded-full bg-blue-100 px-3 py-0.5 text-[9px] font-bold uppercase tracking-wide text-blue-700">
          {label}
        </span>
      </div>
      <div className="space-y-2">
        {steps.map((step, idx) => (
          <div key={step.key} className="relative">
            <StepCard step={step} messages={messages} onOpen={() => onOpen(step)} />
            {idx < steps.length - 1 && (
              <div className="flex justify-center">
                <div className="h-4 w-0.5 rounded-full bg-blue-200" />
              </div>
            )}
          </div>
        ))}
      </div>
    </div>
  )
}

function StepCard({
  step,
  messages,
  onOpen,
}: {
  step: LinkedInFlowStep
  messages: LinkedInFlowState['messages']
  onOpen: () => void
}) {
  const message = step.editable ? messages[step.key as LinkedInEditableStepKey] : ''
  const preview = message.trim().split(/\s+/).slice(0, 12).join(' ')

  return (
    <button
      type="button"
      onClick={onOpen}
      className="group relative block w-full overflow-hidden rounded-2xl border-2 border-blue-200 bg-white text-left shadow-sm transition-all hover:-translate-y-0.5 hover:border-blue-400 hover:shadow-md focus:outline-none focus:ring-4 focus:ring-blue-100"
    >
      <div className="flex items-center gap-3 border-b border-blue-100 bg-gradient-to-r from-blue-50 via-white to-white px-4 py-2.5">
        <span className="inline-flex flex-shrink-0 items-center rounded-md bg-blue-600 px-2 py-0.5 text-[10px] font-bold uppercase tracking-wide text-white">
          {step.dayLabel}
        </span>
        <span className="truncate text-sm font-bold text-blue-900">{step.title}</span>
        {!step.editable && (
          <span className="ml-auto inline-flex flex-shrink-0 items-center rounded-md bg-blue-50 px-1.5 py-0.5 text-[9px] font-bold uppercase tracking-wide text-blue-700 ring-1 ring-blue-200">
            Actie
          </span>
        )}
      </div>
      <div className="px-4 py-2 text-[11px] leading-relaxed text-gray-600">
        {step.editable ? (
          message.trim().length > 0 ? (
            <span>“{preview}{message.trim().split(/\s+/).length > 12 ? '…' : ''}”</span>
          ) : (
            <span className="italic text-blue-700/60">Nog niet ingevuld door NextWave.</span>
          )
        ) : (
          step.description
        )}
      </div>
      <div className="flex items-center justify-end px-4 pb-2">
        <span className="inline-flex items-center gap-0.5 text-[10px] font-semibold text-blue-600 transition-transform group-hover:translate-x-0.5">
          Bekijk
          <svg className="h-2.5 w-2.5" fill="none" viewBox="0 0 24 24" strokeWidth={2.5} stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" d="M13.5 4.5 21 12m0 0-7.5 7.5M21 12H3" />
          </svg>
        </span>
      </div>
    </button>
  )
}

function LinkedInStepModal({
  step,
  messages,
  onClose,
}: {
  step: LinkedInFlowStep
  messages: LinkedInFlowState['messages']
  onClose: () => void
}) {
  const message = step.editable ? messages[step.key as LinkedInEditableStepKey] : ''

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-4"
      onClick={onClose}
    >
      <div
        className="relative w-full max-w-lg overflow-hidden rounded-2xl bg-white shadow-2xl"
        onClick={(e) => e.stopPropagation()}
      >
        <header className="flex items-start justify-between gap-3 border-b border-blue-100 bg-gradient-to-r from-blue-50 via-white to-white px-5 py-4">
          <div className="flex items-center gap-3">
            <span className="inline-flex items-center rounded-md bg-blue-600 px-2 py-0.5 text-[10px] font-bold uppercase tracking-wide text-white">
              {step.dayLabel}
            </span>
            <h3 className="text-base font-bold text-blue-900">{step.title}</h3>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="rounded-lg p-1.5 text-gray-400 transition-colors hover:bg-gray-100 hover:text-gray-700"
            aria-label="Sluiten"
          >
            <svg className="h-5 w-5" fill="none" viewBox="0 0 24 24" strokeWidth={2} stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" d="M6 18 18 6M6 6l12 12" />
            </svg>
          </button>
        </header>

        <div className="space-y-3 px-5 py-4">
          <p className="text-xs leading-relaxed text-gray-600">{step.description}</p>
          {step.editable ? (
            <div>
              <div className="text-[10px] font-bold uppercase tracking-wide text-blue-700">
                Bericht
              </div>
              <pre className="mt-1 whitespace-pre-wrap break-words rounded-xl border border-blue-100 bg-blue-50/40 px-3 py-2.5 font-sans text-sm leading-relaxed text-blue-950">
                {message.trim().length > 0 ? (
                  message
                ) : (
                  <span className="italic text-blue-700/60">Nog niet ingevuld door NextWave.</span>
                )}
              </pre>
              {step.charLimit && (
                <div className="mt-1 text-[10px] text-blue-700/70">
                  Limiet: max {step.charLimit} tekens
                </div>
              )}
            </div>
          ) : (
            <div className="rounded-xl border border-blue-100 bg-blue-50/40 px-3 py-2.5 text-sm leading-relaxed text-blue-900">
              Geen bericht — vaste actie binnen de sequence.
            </div>
          )}
        </div>
      </div>
    </div>
  )
}
