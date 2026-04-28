'use client'

import { useEffect } from 'react'
import {
  OUTCOME_META,
  RESPONSIBILITY_LABEL,
  type CampaignFlowOutcome,
} from '@/lib/data/campaign-flow'

interface Props {
  outcome: CampaignFlowOutcome
  onClose: () => void
}

export function FlowSuccessModal({ outcome, onClose }: Props) {
  useEffect(() => {
    const handler = (e: KeyboardEvent) => {
      if (e.key === 'Escape') onClose()
    }
    window.addEventListener('keydown', handler)
    return () => window.removeEventListener('keydown', handler)
  }, [onClose])

  const meta = OUTCOME_META.success
  const respLabel = outcome.responsibility ? RESPONSIBILITY_LABEL[outcome.responsibility] : null

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 p-4 backdrop-blur-sm"
      onClick={onClose}
    >
      <div
        className="flex max-h-[85vh] w-full max-w-xl flex-col overflow-hidden rounded-2xl bg-white shadow-2xl"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header */}
        <div className="relative overflow-hidden border-b border-emerald-100 bg-gradient-to-br from-emerald-50 via-white to-teal-50 px-6 py-5">
          <div className="pointer-events-none absolute -right-8 -top-8 h-32 w-32 rounded-full bg-emerald-200/40 blur-2xl" />
          <div className="relative flex items-start gap-4">
            <div className="flex h-12 w-12 flex-shrink-0 items-center justify-center rounded-2xl bg-gradient-to-br from-emerald-500 to-teal-500 text-white shadow-sm shadow-emerald-500/30">
              <svg className="h-6 w-6" fill="none" viewBox="0 0 24 24" strokeWidth={3} stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" d="m4.5 12.75 6 6 9-13.5" />
              </svg>
            </div>
            <div className="min-w-0 flex-1">
              <div className="text-[10px] font-bold uppercase tracking-wider text-emerald-600">
                Dead-end · Succes
              </div>
              <h3 className="mt-0.5 text-xl font-bold text-gray-900">
                {outcome.label || meta.label}
              </h3>
              <p className="mt-1 text-xs text-gray-500">{meta.description}</p>
              {respLabel && (
                <div className="mt-2 inline-flex items-center gap-1.5 rounded-full bg-white px-2.5 py-1 text-[11px] font-semibold text-emerald-700 ring-1 ring-emerald-200">
                  <span className="h-1.5 w-1.5 rounded-full bg-emerald-500" />
                  Afhandeling: {respLabel}
                </div>
              )}
            </div>
            <button
              type="button"
              onClick={onClose}
              className="rounded-lg p-2 text-gray-400 hover:bg-white/60 hover:text-gray-700"
              aria-label="Sluiten"
            >
              <svg className="h-5 w-5" fill="none" viewBox="0 0 24 24" strokeWidth={2} stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" d="M6 18 18 6M6 6l12 12" />
              </svg>
            </button>
          </div>
        </div>

        {/* Body */}
        <div className="flex-1 overflow-y-auto px-6 py-5">
          <div className="rounded-xl border border-emerald-100 bg-emerald-50/40 px-4 py-4">
            <div className="text-[10px] font-bold uppercase tracking-wider text-emerald-700">
              Wat gebeurt er?
            </div>
            <p className="mt-1.5 text-sm leading-relaxed text-emerald-900">
              {respLabel ? (
                <>
                  De lead heeft positief gereageerd en wordt vanaf hier opgepakt door{' '}
                  <strong>{respLabel.toLowerCase()}</strong>. De campagne stopt voor deze
                  contactpersoon.
                </>
              ) : (
                <>
                  De lead heeft positief gereageerd. De campagne stopt voor deze contactpersoon en
                  wordt verder afgehandeld.
                </>
              )}
            </p>
          </div>
        </div>

        {/* Footer */}
        <div className="border-t border-gray-200 bg-gray-50 px-6 py-4 text-right">
          <button
            type="button"
            onClick={onClose}
            className="rounded-xl border border-gray-200 bg-white px-5 py-2 text-sm font-semibold text-gray-700 hover:bg-gray-100"
          >
            Sluiten
          </button>
        </div>
      </div>
    </div>
  )
}
