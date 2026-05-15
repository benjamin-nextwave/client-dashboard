'use client'

import { useState, useTransition } from 'react'
import { useRouter } from 'next/navigation'
import {
  LINKEDIN_FLOW_STEPS,
  type LinkedInEditableStepKey,
  type LinkedInFlowState,
  type LinkedInFlowStep,
  linkedInFlowNeedsApproval,
} from '@/lib/data/linkedin-flow'
import { approveLinkedInFlow } from '../actions'

interface Props {
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

export function LinkedInFlowBlock({ state }: Props) {
  const router = useRouter()
  const [pending, startTransition] = useTransition()
  const [error, setError] = useState<string | null>(null)

  // Block is invisible to the client when the operator hasn't enabled or
  // published it yet — same convention as the mail variants editor.
  if (!state.enabled || !state.publishedAt) return null

  const needsApproval = linkedInFlowNeedsApproval(state)
  const isApproved = !needsApproval && !!state.approvedAt

  const handleApprove = () => {
    setError(null)
    startTransition(async () => {
      const result = await approveLinkedInFlow(state.flowId)
      if (result.error) setError(result.error)
      else router.refresh()
    })
  }

  return (
    <section className="overflow-hidden rounded-2xl border-2 border-blue-200 bg-gradient-to-br from-blue-50 via-white to-sky-50 shadow-sm">
      <header className="border-b border-blue-100 px-6 py-5">
        <div className="flex items-start gap-3">
          <div className="flex h-10 w-10 flex-shrink-0 items-center justify-center rounded-xl bg-blue-600 text-white shadow-sm shadow-blue-500/30">
            <LinkedInIcon className="h-5 w-5" />
          </div>
          <div className="min-w-0 flex-1">
            <div className="flex flex-wrap items-center gap-2">
              <h2 className="text-base font-semibold tracking-tight text-blue-900">
                LinkedIn-flow
              </h2>
              {isApproved && (
                <span className="inline-flex items-center gap-1 rounded-full bg-emerald-100 px-2 py-0.5 text-[10px] font-bold uppercase tracking-wide text-emerald-700">
                  <span className="h-1 w-1 rounded-full bg-emerald-500" />
                  Goedgekeurd
                </span>
              )}
              {needsApproval && (
                <span className="inline-flex items-center gap-1 rounded-full bg-amber-100 px-2 py-0.5 text-[10px] font-bold uppercase tracking-wide text-amber-700">
                  <span className="h-1 w-1 rounded-full bg-amber-500" />
                  Goedkeuring vereist
                </span>
              )}
            </div>
            <p className="mt-1 text-xs leading-relaxed text-blue-900/70">
              Acht-stappen LinkedIn-sequence na de mailcampagne. Leads stromen alleen door
              naar deze flow als ze op geen van de drie mails hebben gereageerd. De volgorde
              en timing liggen vast; alleen de berichten op dag +1, +4, +9 en +14 zijn
              door NextWave ingevuld.
            </p>
          </div>
        </div>
      </header>

      <div className="space-y-4 px-6 py-5">
        <PhaseGroup
          title="Vóór acceptatie"
          subtitle="Warmen op zonder bericht — bouw zichtbaarheid op."
          steps={LINKEDIN_FLOW_STEPS.filter((s) => s.phase === 'pre_accept')}
          messages={state.messages}
        />
        <PhaseGroup
          title="Na acceptatie"
          subtitle="Vier berichten op vaste momenten."
          steps={LINKEDIN_FLOW_STEPS.filter((s) => s.phase === 'post_accept')}
          messages={state.messages}
        />
      </div>

      <footer className="border-t border-blue-100 bg-blue-50/60 px-6 py-4">
        {error && (
          <div className="mb-3 rounded-lg border border-red-200 bg-red-50 px-3 py-2 text-xs text-red-700">
            {error}
          </div>
        )}
        <div className="flex flex-wrap items-center justify-between gap-3">
          <div className="text-[11px] text-blue-900/70">
            {isApproved ? (
              <>Goedgekeurd op {formatTimestamp(state.approvedAt!)}</>
            ) : (
              <>Gepubliceerd op {formatTimestamp(state.publishedAt)}</>
            )}
          </div>
          {needsApproval ? (
            <button
              type="button"
              onClick={handleApprove}
              disabled={pending}
              className="inline-flex items-center gap-1.5 rounded-xl bg-blue-600 px-5 py-2.5 text-sm font-bold text-white shadow-md shadow-blue-500/30 transition-all hover:-translate-y-0.5 hover:bg-blue-700 hover:shadow-lg disabled:cursor-not-allowed disabled:opacity-60"
            >
              {pending ? (
                <>
                  <svg className="h-4 w-4 animate-spin" fill="none" viewBox="0 0 24 24">
                    <circle cx="12" cy="12" r="10" stroke="currentColor" strokeOpacity="0.25" strokeWidth="4" />
                    <path d="M12 2a10 10 0 0 1 10 10" stroke="currentColor" strokeWidth="4" strokeLinecap="round" />
                  </svg>
                  Versturen...
                </>
              ) : (
                <>
                  <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" strokeWidth={3} stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" d="m4.5 12.75 6 6 9-13.5" />
                  </svg>
                  LinkedIn-flow goedkeuren
                </>
              )}
            </button>
          ) : (
            <span className="inline-flex items-center gap-1.5 rounded-xl bg-emerald-50 px-4 py-2 text-xs font-semibold text-emerald-800 ring-1 ring-emerald-200">
              <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" strokeWidth={3} stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" d="m4.5 12.75 6 6 9-13.5" />
              </svg>
              Akkoord gegeven
            </span>
          )}
        </div>
      </footer>
    </section>
  )
}

function PhaseGroup({
  title,
  subtitle,
  steps,
  messages,
}: {
  title: string
  subtitle: string
  steps: LinkedInFlowStep[]
  messages: LinkedInFlowState['messages']
}) {
  return (
    <div className="rounded-xl border border-blue-100 bg-white p-5">
      <div className="mb-3">
        <h3 className="text-sm font-semibold text-blue-900">{title}</h3>
        <p className="mt-0.5 text-[11px] text-blue-700/80">{subtitle}</p>
      </div>
      <ol className="relative space-y-3 border-l-2 border-blue-100 pl-5">
        {steps.map((step) => {
          const message = step.editable
            ? messages[step.key as LinkedInEditableStepKey]
            : ''
          return (
            <li key={step.key} className="relative">
              <span className="absolute -left-[27px] top-1.5 flex h-4 w-4 items-center justify-center rounded-full border-2 border-blue-300 bg-white">
                <span className="h-1.5 w-1.5 rounded-full bg-blue-500" />
              </span>
              <div className="rounded-xl border border-blue-100 bg-white p-4 shadow-sm">
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
                </div>
                <p className="mt-1 text-[11px] leading-relaxed text-gray-600">
                  {step.description}
                </p>
                {step.editable && (
                  <pre className="mt-3 whitespace-pre-wrap break-words rounded-lg border border-blue-100 bg-blue-50/40 px-3 py-2 font-sans text-sm leading-relaxed text-blue-950">
                    {message.trim().length > 0 ? message : (
                      <span className="italic text-blue-700/60">
                        Nog niet ingevuld door NextWave.
                      </span>
                    )}
                  </pre>
                )}
              </div>
            </li>
          )
        })}
      </ol>
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
