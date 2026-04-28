'use client'

import { useEffect, useState } from 'react'
import type { CampaignFlowStep } from '@/lib/data/campaign-flow'

interface Props {
  step: CampaignFlowStep
  stepLabel: string
  onClose: () => void
}

export function FlowStepModal({ step, stepLabel, onClose }: Props) {
  const [activeVariantId, setActiveVariantId] = useState(step.variants[0]?.id)
  const [showFilled, setShowFilled] = useState(false)

  useEffect(() => {
    const handler = (e: KeyboardEvent) => {
      if (e.key === 'Escape') onClose()
    }
    window.addEventListener('keydown', handler)
    return () => window.removeEventListener('keydown', handler)
  }, [onClose])

  const activeVariant = step.variants.find((v) => v.id === activeVariantId) ?? step.variants[0]
  const hasMultipleVariants = step.variants.length > 1
  const hasExample = !!activeVariant?.exampleBody?.trim()

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 p-4 backdrop-blur-sm"
      onClick={onClose}
    >
      <div
        className="flex h-[85vh] w-full max-w-4xl flex-col overflow-hidden rounded-2xl bg-white shadow-2xl"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header */}
        <div className="flex items-center justify-between gap-4 border-b border-gray-200 px-6 py-4">
          <div className="min-w-0">
            <div className="text-[10px] font-semibold uppercase tracking-wide text-indigo-600">
              {stepLabel}
            </div>
            <h3 className="text-lg font-semibold text-gray-900">{step.title || 'Mail'}</h3>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="rounded-lg p-2 text-gray-400 hover:bg-gray-100 hover:text-gray-700"
            aria-label="Sluiten"
          >
            <svg className="h-5 w-5" fill="none" viewBox="0 0 24 24" strokeWidth={2} stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" d="M6 18 18 6M6 6l12 12" />
            </svg>
          </button>
        </div>

        {/* Variant tabs */}
        {hasMultipleVariants && (
          <div className="flex flex-wrap gap-1 border-b border-gray-200 bg-gray-50 px-6">
            {step.variants.map((v) => {
              const active = v.id === activeVariantId
              return (
                <button
                  key={v.id}
                  type="button"
                  onClick={() => {
                    setActiveVariantId(v.id)
                    setShowFilled(false)
                  }}
                  className={`relative px-4 py-3 text-sm font-semibold transition-colors ${
                    active ? 'text-indigo-600' : 'text-gray-500 hover:text-gray-900'
                  }`}
                >
                  {v.label || 'Variant'}
                  {active && <span className="absolute inset-x-4 bottom-0 h-0.5 rounded-full bg-indigo-500" />}
                </button>
              )
            })}
          </div>
        )}

        {/* Body */}
        <div className="flex-1 overflow-y-auto px-6 py-5">
          {!activeVariant ? (
            <div className="flex h-full items-center justify-center text-sm text-gray-400">
              Geen mail-inhoud beschikbaar.
            </div>
          ) : (
            <div className="space-y-4">
              {/* Toggle template / ingevuld */}
              {hasExample && (
                <div className="flex flex-wrap items-center justify-between gap-3 rounded-xl border border-gray-200 bg-gray-50 p-3">
                  <div>
                    <div className="text-[10px] font-semibold uppercase tracking-wide text-gray-500">
                      Weergave
                    </div>
                    <div className="text-sm font-semibold text-gray-900">
                      {showFilled ? 'Ingevuld voorbeeld' : 'Template (met variabelen)'}
                    </div>
                  </div>
                  <button
                    type="button"
                    onClick={() => setShowFilled(!showFilled)}
                    className={`group inline-flex items-center gap-2 rounded-xl px-4 py-2 text-xs font-bold uppercase tracking-wide shadow-sm transition-all hover:-translate-y-0.5 ${
                      showFilled
                        ? 'border border-gray-200 bg-white text-gray-700 hover:bg-gray-100'
                        : 'bg-emerald-500 text-white shadow-emerald-500/30 hover:bg-emerald-600'
                    }`}
                  >
                    {showFilled ? (
                      <>
                        <svg className="h-3.5 w-3.5" fill="none" viewBox="0 0 24 24" strokeWidth={2.5} stroke="currentColor">
                          <path strokeLinecap="round" strokeLinejoin="round" d="M9 13.5h6m-6-3h6m-6 6h6M5.625 4.5h12.75A1.125 1.125 0 0 1 19.5 5.625v12.75a1.125 1.125 0 0 1-1.125 1.125H5.625A1.125 1.125 0 0 1 4.5 18.375V5.625A1.125 1.125 0 0 1 5.625 4.5Z" />
                        </svg>
                        Bekijk template
                      </>
                    ) : (
                      <>
                        <svg className="h-3.5 w-3.5" fill="none" viewBox="0 0 24 24" strokeWidth={2.5} stroke="currentColor">
                          <path strokeLinecap="round" strokeLinejoin="round" d="M2.036 12.322a1.012 1.012 0 0 1 0-.639C3.423 7.51 7.36 4.5 12 4.5c4.638 0 8.573 3.007 9.963 7.178.07.207.07.431 0 .639C20.577 16.49 16.64 19.5 12 19.5c-4.638 0-8.573-3.007-9.963-7.178Z" />
                          <path strokeLinecap="round" strokeLinejoin="round" d="M15 12a3 3 0 1 1-6 0 3 3 0 0 1 6 0Z" />
                        </svg>
                        Bekijk ingevuld voorbeeld
                      </>
                    )}
                  </button>
                </div>
              )}

              {/* Subject + body */}
              <div className="overflow-hidden rounded-2xl border border-gray-200 bg-white">
                <div className="border-b border-gray-100 bg-gray-50/50 px-5 py-3">
                  <div className="text-[10px] font-semibold uppercase tracking-wide text-gray-500">
                    Onderwerp
                  </div>
                  <p className="mt-0.5 text-sm font-medium text-gray-900">
                    {activeVariant.subject || '—'}
                  </p>
                </div>
                <div className="px-5 py-4">
                  <div className="text-[10px] font-semibold uppercase tracking-wide text-gray-500">
                    Mail body
                  </div>
                  <pre
                    className={`mt-1 whitespace-pre-wrap rounded-xl p-4 font-sans text-sm leading-relaxed transition-colors ${
                      showFilled && hasExample
                        ? 'bg-emerald-50 text-emerald-900 ring-1 ring-emerald-100'
                        : 'bg-gray-50 text-gray-800'
                    }`}
                  >
                    {showFilled && hasExample
                      ? activeVariant.exampleBody
                      : activeVariant.body || '—'}
                  </pre>
                </div>
              </div>
            </div>
          )}
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
