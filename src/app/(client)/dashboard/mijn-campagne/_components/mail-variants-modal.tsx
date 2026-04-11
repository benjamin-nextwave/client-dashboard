'use client'

import { useState } from 'react'
import type { MailVariant } from '@/lib/data/campaign'

interface Props {
  variants: MailVariant[]
  onClose: () => void
}

export function MailVariantsModal({ variants, onClose }: Props) {
  const mails = [1, 2, 3] as const

  // Default to the first mail number that has variants
  const firstNonEmpty = (mails.find((m) => variants.some((v) => v.mailNumber === m)) ?? 1) as
    | 1
    | 2
    | 3
  const [activeMail, setActiveMail] = useState<1 | 2 | 3>(firstNonEmpty)

  const activeVariants = variants.filter((v) => v.mailNumber === activeMail)

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm p-4"
      onClick={onClose}
    >
      <div
        className="flex h-[85vh] w-full max-w-3xl flex-col overflow-hidden rounded-2xl bg-white shadow-2xl"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header */}
        <div className="flex items-center justify-between border-b border-gray-200 px-6 py-4">
          <div>
            <h3 className="text-lg font-semibold text-gray-900">Mailvarianten</h3>
            <p className="text-xs text-gray-500">Bekijk alle voorgestelde varianten per mail.</p>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="rounded-lg p-2 text-gray-400 hover:bg-gray-100 hover:text-gray-700"
          >
            <svg className="h-5 w-5" fill="none" viewBox="0 0 24 24" strokeWidth={2} stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" d="M6 18 18 6M6 6l12 12" />
            </svg>
          </button>
        </div>

        {/* Tabs */}
        <div className="flex gap-1 border-b border-gray-200 bg-gray-50 px-6">
          {mails.map((n) => {
            const count = variants.filter((v) => v.mailNumber === n).length
            const active = activeMail === n
            return (
              <button
                key={n}
                type="button"
                onClick={() => setActiveMail(n)}
                className={`relative px-4 py-3 text-sm font-semibold transition-colors ${
                  active ? 'text-indigo-600' : 'text-gray-500 hover:text-gray-900'
                }`}
              >
                Mail {n}
                <span className="ml-1.5 rounded-full bg-gray-200 px-1.5 py-0.5 text-[10px] text-gray-600">
                  {count}
                </span>
                {active && <span className="absolute inset-x-4 bottom-0 h-0.5 rounded-full bg-indigo-500" />}
              </button>
            )
          })}
        </div>

        {/* Body */}
        <div className="flex-1 overflow-y-auto px-6 py-5">
          {activeVariants.length === 0 ? (
            <div className="flex h-full items-center justify-center text-sm text-gray-400">
              Nog geen varianten voor Mail {activeMail}
            </div>
          ) : (
            <div className="space-y-5">
              {activeVariants.map((v) => (
                <VariantView key={v.id} variant={v} />
              ))}
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

function VariantView({ variant }: { variant: MailVariant }) {
  return (
    <article className="overflow-hidden rounded-2xl border border-gray-200 bg-white shadow-sm">
      <header className="flex items-center gap-3 border-b border-gray-100 bg-gray-50/50 px-5 py-3">
        <div className="flex h-7 w-7 items-center justify-center rounded-lg bg-indigo-100 text-xs font-bold text-indigo-700">
          {variant.variantLabel.replace('Variant ', '')}
        </div>
        <div className="flex-1">
          <div className="text-sm font-semibold text-gray-900">{variant.variantLabel}</div>
        </div>
      </header>

      {variant.explanation && (
        <div className="border-b border-gray-100 bg-indigo-50/40 px-5 py-3">
          <div className="text-[10px] font-semibold uppercase tracking-wide text-indigo-600">Toelichting</div>
          <p className="mt-0.5 text-xs text-indigo-900">{variant.explanation}</p>
        </div>
      )}

      <div className="space-y-3 px-5 py-4">
        <div>
          <div className="text-[10px] font-semibold uppercase tracking-wide text-gray-500">Onderwerp</div>
          <p className="mt-0.5 text-sm font-medium text-gray-900">{variant.subject || '—'}</p>
        </div>
        <div>
          <div className="text-[10px] font-semibold uppercase tracking-wide text-gray-500">Mail body</div>
          <pre className="mt-1 whitespace-pre-wrap rounded-xl bg-gray-50 p-4 font-sans text-sm leading-relaxed text-gray-800">
            {variant.body || '—'}
          </pre>
        </div>
      </div>
    </article>
  )
}
