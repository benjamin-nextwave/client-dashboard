'use client'

import { useState } from 'react'
import {
  OUTCOME_META,
  RESPONSIBILITY_LABEL,
  type CampaignFlowStep,
  type CampaignFlowOutcome,
} from '@/lib/data/campaign-flow'
import { FlowStepModal } from './flow-step-modal'
import { FlowDropoffModal } from './flow-dropoff-modal'
import { FlowSuccessModal } from './flow-success-modal'

interface Props {
  step: CampaignFlowStep
  stepLabel: string
  isLast: boolean
}

export function FlowStepBlock({ step, stepLabel, isLast }: Props) {
  const [openMail, setOpenMail] = useState(false)
  const [openDropoff, setOpenDropoff] = useState(false)
  const [openSuccess, setOpenSuccess] = useState(false)

  const continueOutcome = step.outcomes.find((o) => o.kind === 'continue')
  const successOutcome = step.outcomes.find((o) => o.kind === 'success')
  const dropoffOutcome = step.outcomes.find((o) => o.kind === 'dropoff')

  const variantCount = step.variants.length
  const hasMultipleVariants = variantCount > 1

  return (
    <div className="relative">
      {/* Mail-stap kaart */}
      <div className="relative mx-auto w-full max-w-md">
        {/* Stack effect achter de kaart */}
        {hasMultipleVariants && (
          <>
            {variantCount >= 3 && (
              <div className="pointer-events-none absolute inset-0 -translate-y-1.5 translate-x-1.5 rounded-2xl border border-indigo-200/60 bg-white/60 shadow-sm" />
            )}
            <div className="pointer-events-none absolute inset-0 -translate-y-0.5 translate-x-0.5 rounded-2xl border border-indigo-300/70 bg-white/80 shadow-sm" />
          </>
        )}

        <button
          type="button"
          onClick={() => setOpenMail(true)}
          className="group relative block w-full overflow-hidden rounded-2xl border-2 border-indigo-200 bg-white text-left shadow-md transition-all hover:-translate-y-0.5 hover:border-indigo-400 hover:shadow-lg focus:outline-none focus:ring-4 focus:ring-indigo-100"
        >
          <div className="flex items-center gap-3 border-b border-gray-100 bg-gradient-to-r from-indigo-50 via-white to-white px-5 py-3">
            <div className="flex h-9 w-9 flex-shrink-0 items-center justify-center rounded-xl bg-indigo-600 text-sm font-bold text-white shadow-sm shadow-indigo-500/30">
              {step.stepNumber}
            </div>
            <div className="min-w-0 flex-1">
              <div className="text-[10px] font-semibold uppercase tracking-wide text-indigo-600">
                {stepLabel}
              </div>
              <div className="truncate text-sm font-bold text-gray-900">
                {step.title || 'Geen titel'}
              </div>
            </div>
            {hasMultipleVariants && (
              <span className="inline-flex items-center gap-1 rounded-full bg-indigo-100 px-2 py-0.5 text-[10px] font-bold text-indigo-700 ring-1 ring-indigo-200">
                <svg className="h-3 w-3" fill="none" viewBox="0 0 24 24" strokeWidth={2.5} stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" d="M3.75 6A2.25 2.25 0 0 1 6 3.75h2.25A2.25 2.25 0 0 1 10.5 6v2.25a2.25 2.25 0 0 1-2.25 2.25H6a2.25 2.25 0 0 1-2.25-2.25V6ZM3.75 15.75A2.25 2.25 0 0 1 6 13.5h2.25a2.25 2.25 0 0 1 2.25 2.25V18a2.25 2.25 0 0 1-2.25 2.25H6A2.25 2.25 0 0 1 3.75 18v-2.25ZM13.5 6a2.25 2.25 0 0 1 2.25-2.25H18A2.25 2.25 0 0 1 20.25 6v2.25A2.25 2.25 0 0 1 18 10.5h-2.25a2.25 2.25 0 0 1-2.25-2.25V6ZM13.5 15.75a2.25 2.25 0 0 1 2.25-2.25H18a2.25 2.25 0 0 1 2.25 2.25V18A2.25 2.25 0 0 1 18 20.25h-2.25A2.25 2.25 0 0 1 13.5 18v-2.25Z" />
                </svg>
                {variantCount} varianten
              </span>
            )}
          </div>
          <div className="flex items-center justify-between px-5 py-3">
            <span className="text-xs text-gray-500">
              {hasMultipleVariants
                ? 'Klik om alle varianten te bekijken'
                : 'Klik om de mail te bekijken'}
            </span>
            <span className="inline-flex items-center gap-1 text-xs font-semibold text-indigo-600 transition-transform group-hover:translate-x-0.5">
              Bekijk
              <svg className="h-3.5 w-3.5" fill="none" viewBox="0 0 24 24" strokeWidth={2.5} stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" d="M13.5 4.5 21 12m0 0-7.5 7.5M21 12H3" />
              </svg>
            </span>
          </div>
        </button>
      </div>

      {/* Branches: dead-end links + dead-end rechts + continue midden */}
      <div className="relative mt-2">
        <Branches
          successOutcome={successOutcome}
          dropoffOutcome={dropoffOutcome}
          continueOutcome={!isLast ? continueOutcome : undefined}
          onSuccessClick={() => setOpenSuccess(true)}
          onDropoffClick={() => setOpenDropoff(true)}
        />
      </div>

      {/* Modals */}
      {openMail && (
        <FlowStepModal step={step} stepLabel={stepLabel} onClose={() => setOpenMail(false)} />
      )}
      {openDropoff && dropoffOutcome && (
        <FlowDropoffModal outcome={dropoffOutcome} onClose={() => setOpenDropoff(false)} />
      )}
      {openSuccess && successOutcome && (
        <FlowSuccessModal outcome={successOutcome} onClose={() => setOpenSuccess(false)} />
      )}
    </div>
  )
}

function Branches({
  successOutcome,
  dropoffOutcome,
  continueOutcome,
  onSuccessClick,
  onDropoffClick,
}: {
  successOutcome?: CampaignFlowOutcome
  dropoffOutcome?: CampaignFlowOutcome
  continueOutcome?: CampaignFlowOutcome
  onSuccessClick: () => void
  onDropoffClick: () => void
}) {
  const hasContinue = !!continueOutcome

  return (
    <div className="relative">
      {/* SVG-takken */}
      <svg
        className="pointer-events-none absolute left-1/2 top-0 h-12 w-full -translate-x-1/2"
        viewBox="0 0 400 48"
        preserveAspectRatio="none"
        aria-hidden
      >
        {/* Vertical short stem from card */}
        <line x1="200" y1="0" x2="200" y2="14" stroke="#cbd5e1" strokeWidth="2" />
        {/* Branch left to dropoff */}
        {dropoffOutcome && (
          <path
            d="M 200 14 Q 200 24 100 24 Q 60 24 60 38"
            fill="none"
            stroke="#fda4af"
            strokeWidth="2"
            strokeLinecap="round"
          />
        )}
        {/* Branch right to success */}
        {successOutcome && (
          <path
            d="M 200 14 Q 200 24 300 24 Q 340 24 340 38"
            fill="none"
            stroke="#86efac"
            strokeWidth="2"
            strokeLinecap="round"
          />
        )}
        {/* Center continue */}
        {hasContinue && (
          <line x1="200" y1="14" x2="200" y2="48" stroke="#a5b4fc" strokeWidth="2" strokeLinecap="round" />
        )}
      </svg>

      <div className="relative grid grid-cols-3 gap-2 pt-12 sm:gap-4">
        {/* Links: dropoff (afgehaakt) */}
        <div className="flex justify-start">
          {dropoffOutcome ? (
            <DeadEndCard
              outcome={dropoffOutcome}
              onClick={onDropoffClick}
              align="left"
            />
          ) : (
            <div />
          )}
        </div>

        {/* Midden: continue arrow OR niets (laatste stap) */}
        <div className="flex flex-col items-center justify-start">
          {hasContinue ? (
            <ContinueArrow label={continueOutcome.label || 'Geen reactie'} />
          ) : (
            <div className="rounded-full bg-gray-100 px-3 py-1 text-[10px] font-semibold uppercase tracking-wide text-gray-500">
              Einde campagne
            </div>
          )}
        </div>

        {/* Rechts: success */}
        <div className="flex justify-end">
          {successOutcome ? (
            <DeadEndCard outcome={successOutcome} onClick={onSuccessClick} align="right" />
          ) : (
            <div />
          )}
        </div>
      </div>

      {/* Connector naar volgende stap */}
      {hasContinue && (
        <div className="flex justify-center pt-3 pb-2">
          <div className="h-8 w-0.5 rounded-full bg-indigo-200" />
        </div>
      )}
    </div>
  )
}

function DeadEndCard({
  outcome,
  onClick,
  align,
}: {
  outcome: CampaignFlowOutcome
  onClick: () => void
  align: 'left' | 'right'
}) {
  const meta = OUTCOME_META[outcome.kind]
  const respLabel = outcome.responsibility ? RESPONSIBILITY_LABEL[outcome.responsibility] : null

  return (
    <button
      type="button"
      onClick={onClick}
      className={`group relative w-full max-w-[170px] overflow-hidden rounded-xl border ${meta.softBorder} ${meta.softBg} px-3 py-2.5 text-${align} shadow-sm transition-all hover:-translate-y-0.5 hover:shadow-md focus:outline-none focus:ring-4 focus:ring-${meta.accent}-100`}
    >
      <div className={`mb-1 flex items-center gap-1.5 ${align === 'right' ? 'justify-end' : ''}`}>
        <span
          className={`inline-flex h-5 w-5 flex-shrink-0 items-center justify-center rounded-md ${meta.badge} text-[10px] font-bold`}
        >
          {outcome.kind === 'success' ? '✓' : '×'}
        </span>
        <div className={`text-[9px] font-bold uppercase tracking-wide ${meta.softText}`}>
          Dead-end
        </div>
      </div>
      <div className="text-[12px] font-bold leading-tight text-gray-900">
        {outcome.label || meta.label}
      </div>
      {respLabel && (
        <div className="mt-1.5 inline-flex items-center gap-1 rounded-full bg-white/70 px-1.5 py-0.5 text-[9px] font-semibold text-gray-600 ring-1 ring-gray-200">
          <span className={`h-1 w-1 rounded-full ${meta.dot}`} />
          {respLabel}
        </div>
      )}
      <div className={`mt-2 inline-flex items-center gap-0.5 text-[10px] font-semibold ${meta.softText} opacity-70 transition-opacity group-hover:opacity-100 ${align === 'right' ? 'float-right' : ''}`}>
        Bekijk
        <svg className="h-2.5 w-2.5" fill="none" viewBox="0 0 24 24" strokeWidth={2.5} stroke="currentColor">
          <path strokeLinecap="round" strokeLinejoin="round" d="M13.5 4.5 21 12m0 0-7.5 7.5M21 12H3" />
        </svg>
      </div>
    </button>
  )
}

function ContinueArrow({ label }: { label: string }) {
  return (
    <div className="flex flex-col items-center gap-1.5">
      <div className="rounded-full bg-indigo-50 px-2.5 py-0.5 text-[10px] font-semibold text-indigo-700 ring-1 ring-indigo-200">
        {label}
      </div>
      <svg
        className="h-5 w-5 text-indigo-400"
        fill="none"
        viewBox="0 0 24 24"
        strokeWidth={2.5}
        stroke="currentColor"
      >
        <path strokeLinecap="round" strokeLinejoin="round" d="M19.5 13.5 12 21m0 0-7.5-7.5M12 21V3" />
      </svg>
    </div>
  )
}
