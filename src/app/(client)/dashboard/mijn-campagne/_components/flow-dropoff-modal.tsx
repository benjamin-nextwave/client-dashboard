'use client'

import { useEffect } from 'react'
import {
  OUTCOME_META,
  type CampaignFlowOutcome,
  type FlowResponsibility,
} from '@/lib/data/campaign-flow'
import { useT } from '@/lib/i18n/client'
import { displayOutcomeLabel } from './flow-outcome-label'

interface Props {
  outcome: CampaignFlowOutcome
  onClose: () => void
}

function useResponsibilityLabel() {
  const t = useT()
  return (r: FlowResponsibility | null): string | null => {
    if (r === 'client') return t('flow.byYou')
    if (r === 'nextwave') return t('flow.byNextwave')
    return null
  }
}

export function FlowDropoffModal({ outcome, onClose }: Props) {
  const t = useT()
  const respLabelOf = useResponsibilityLabel()

  useEffect(() => {
    const handler = (e: KeyboardEvent) => {
      if (e.key === 'Escape') onClose()
    }
    window.addEventListener('keydown', handler)
    return () => window.removeEventListener('keydown', handler)
  }, [onClose])

  const meta = OUTCOME_META.dropoff
  const respLabel = respLabelOf(outcome.responsibility)
  const reasons = outcome.dropoffReasons

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 p-4 backdrop-blur-sm"
      onClick={onClose}
    >
      <div
        className="flex max-h-[85vh] w-full max-w-2xl flex-col overflow-hidden rounded-2xl bg-white shadow-2xl"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header */}
        <div className="relative overflow-hidden border-b border-rose-100 bg-gradient-to-br from-rose-50 via-white to-rose-50 px-6 py-5">
          <div className="pointer-events-none absolute -right-8 -top-8 h-32 w-32 rounded-full bg-rose-200/40 blur-2xl" />
          <div className="relative flex items-start gap-4">
            <div className="flex h-12 w-12 flex-shrink-0 items-center justify-center rounded-2xl bg-rose-500 text-white shadow-sm shadow-rose-500/30">
              <svg className="h-6 w-6" fill="none" viewBox="0 0 24 24" strokeWidth={2.5} stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" d="M9.75 9.75 14.25 14.25m0-4.5L9.75 14.25M21 12a9 9 0 1 1-18 0 9 9 0 0 1 18 0Z" />
              </svg>
            </div>
            <div className="min-w-0 flex-1">
              <div className="text-[10px] font-bold uppercase tracking-wider text-rose-600">
                {t('flow.deadEnd')}
              </div>
              <h3 className="mt-0.5 text-xl font-bold text-gray-900">
                {displayOutcomeLabel(outcome, t)}
              </h3>
              <p className="mt-1 text-xs text-gray-500">{t('flow.dropoffIntro')}</p>
              {respLabel && (
                <div className="mt-2 inline-flex items-center gap-1.5 rounded-full bg-white px-2.5 py-1 text-[11px] font-semibold text-rose-700 ring-1 ring-rose-200">
                  <span className="h-1.5 w-1.5 rounded-full bg-rose-500" />
                  {t('flow.handledBy', { role: respLabel })}
                </div>
              )}
            </div>
            <button
              type="button"
              onClick={onClose}
              className="rounded-lg p-2 text-gray-400 hover:bg-white/60 hover:text-gray-700"
              aria-label={t('common.close')}
            >
              <svg className="h-5 w-5" fill="none" viewBox="0 0 24 24" strokeWidth={2} stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" d="M6 18 18 6M6 6l12 12" />
              </svg>
            </button>
          </div>
        </div>

        {/* Body — reasons list */}
        <div className="flex-1 overflow-y-auto px-6 py-5">
          {reasons.length === 0 ? (
            <div className="rounded-xl border border-dashed border-gray-200 bg-gray-50 px-4 py-8 text-center text-sm text-gray-400">
              {t('flow.dropoffNoReasons')}
            </div>
          ) : (
            <>
              <div className="mb-3 text-[10px] font-bold uppercase tracking-wider text-gray-500">
                {reasons.length === 1
                  ? t('flow.dropoffReasonCountSingular')
                  : t('flow.dropoffReasonCount', { count: reasons.length })}
              </div>
              <ul className="grid gap-2 sm:grid-cols-2">
                {reasons.map((r, idx) => (
                  <li
                    key={idx}
                    className="group flex items-center gap-3 rounded-xl border border-gray-200 bg-white p-3 shadow-sm transition-all hover:-translate-y-0.5 hover:border-rose-200 hover:shadow"
                  >
                    <div className="flex h-7 w-7 flex-shrink-0 items-center justify-center rounded-lg bg-rose-100 text-[11px] font-bold text-rose-700">
                      {idx + 1}
                    </div>
                    <div className="min-w-0 flex-1 text-sm font-medium text-gray-900">
                      {r.label || `${idx + 1}`}
                    </div>
                  </li>
                ))}
              </ul>
            </>
          )}

          <div className="mt-5 rounded-xl border border-rose-100 bg-rose-50/40 px-4 py-3 text-xs text-rose-900">
            {respLabel
              ? t('flow.dropoffOutroWithRole', { role: respLabel.toLowerCase() })
              : t('flow.dropoffOutroNoRole')}
          </div>
        </div>

        {/* Footer */}
        <div className="border-t border-gray-200 bg-gray-50 px-6 py-4 text-right">
          <button
            type="button"
            onClick={onClose}
            className="rounded-xl border border-gray-200 bg-white px-5 py-2 text-sm font-semibold text-gray-700 hover:bg-gray-100"
          >
            {t('common.close')}
          </button>
        </div>
      </div>
    </div>
  )
}
