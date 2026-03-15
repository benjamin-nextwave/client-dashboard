'use client'

import { useState, useTransition } from 'react'
import { useRouter } from 'next/navigation'
import { submitObjection } from '@/lib/actions/inbox-actions'

interface ObjectionFormProps {
  leadId: string
  objectionStatus: string | null
  objectionData?: {
    response?: string
    reviewed_at?: string
  } | null
}

export function ObjectionButton({ leadId, objectionStatus, objectionData }: ObjectionFormProps) {
  const [showForm, setShowForm] = useState(false)
  const [step, setStep] = useState(1)
  const [showedIntent, setShowedIntent] = useState<boolean | null>(null)
  const [askedQuestion, setAskedQuestion] = useState<boolean | null>(null)
  const [reason, setReason] = useState('')
  const [isPending, startTransition] = useTransition()
  const router = useRouter()

  if (objectionStatus === 'approved') {
    return (
      <div className="rounded-lg border border-green-200 bg-green-50 p-4">
        <div className="flex items-center gap-2">
          <svg className="h-5 w-5 text-green-600" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" d="M9 12.75L11.25 15 15 9.75M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
          </svg>
          <span className="text-sm font-medium text-green-800">Bezwaar goedgekeurd</span>
        </div>
        {objectionData?.response && (
          <p className="mt-2 text-sm text-green-700">{objectionData.response}</p>
        )}
      </div>
    )
  }

  if (objectionStatus === 'rejected') {
    return (
      <div className="rounded-lg border border-red-200 bg-red-50 p-4">
        <div className="flex items-center gap-2">
          <svg className="h-5 w-5 text-red-600" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" d="M9.75 9.75l4.5 4.5m0-4.5l-4.5 4.5M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
          </svg>
          <span className="text-sm font-medium text-red-800">Bezwaar afgekeurd</span>
        </div>
        {objectionData?.response && (
          <p className="mt-2 text-sm text-red-700">{objectionData.response}</p>
        )}
      </div>
    )
  }

  if (objectionStatus === 'submitted') {
    return (
      <div className="rounded-lg border border-amber-200 bg-amber-50 p-4">
        <div className="flex items-center gap-2">
          <svg className="h-5 w-5 text-amber-600" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" d="M12 9v3.75m9-.75a9 9 0 11-18 0 9 9 0 0118 0zm-9 3.75h.008v.008H12v-.008z" />
          </svg>
          <span className="text-sm font-medium text-amber-800">Bezwaar ingediend</span>
        </div>
        <p className="mt-1 text-xs text-amber-600">
          Jouw bezwaar wordt beoordeeld door ons team.
        </p>
      </div>
    )
  }

  if (!showForm) {
    return (
      <button
        type="button"
        onClick={() => setShowForm(true)}
        className="flex w-full items-center justify-center gap-2 rounded-lg border border-gray-200 bg-white px-4 py-2.5 text-sm font-medium text-gray-700 transition-colors hover:bg-gray-50"
      >
        <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor">
          <path strokeLinecap="round" strokeLinejoin="round" d="M12 9v3.75m-9.303 3.376c-.866 1.5.217 3.374 1.948 3.374h14.71c1.73 0 2.813-1.874 1.948-3.374L13.949 3.378c-.866-1.5-3.032-1.5-3.898 0L2.697 16.126zM12 15.75h.007v.008H12v-.008z" />
        </svg>
        Bezwaar indienen
      </button>
    )
  }

  function handleSubmit() {
    if (showedIntent === null || askedQuestion === null || !reason.trim()) return
    startTransition(async () => {
      const result = await submitObjection(leadId, {
        showed_intent: showedIntent!,
        asked_question: askedQuestion!,
        reason: reason.trim(),
      })
      if (!result.error) {
        setShowForm(false)
        router.refresh()
      }
    })
  }

  return (
    <div className="rounded-lg border border-gray-200 bg-white p-4 space-y-4">
      <div className="flex items-center justify-between">
        <h3 className="text-sm font-semibold text-gray-900">Bezwaar indienen</h3>
        <button
          type="button"
          onClick={() => { setShowForm(false); setStep(1); setShowedIntent(null); setAskedQuestion(null); setReason('') }}
          className="text-gray-400 hover:text-gray-600"
        >
          <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" />
          </svg>
        </button>
      </div>

      {/* Progress indicator */}
      <div className="flex gap-1">
        {[1, 2, 3].map((s) => (
          <div
            key={s}
            className={`h-1 flex-1 rounded-full transition-colors ${
              s <= step ? 'bg-[var(--brand-color)]' : 'bg-gray-200'
            }`}
          />
        ))}
      </div>

      {step === 1 && (
        <div className="space-y-3">
          <p className="text-sm text-gray-700">
            Toonde de initiële reactie van de lead intentie voor een afspraak?
          </p>
          <div className="flex gap-3">
            <button
              type="button"
              onClick={() => { setShowedIntent(true); setStep(2) }}
              className={`flex-1 rounded-md border px-4 py-2.5 text-sm font-medium transition-colors ${
                showedIntent === true
                  ? 'border-[var(--brand-color)] bg-[var(--brand-color)]/5 text-[var(--brand-color)]'
                  : 'border-gray-200 text-gray-700 hover:bg-gray-50'
              }`}
            >
              Ja
            </button>
            <button
              type="button"
              onClick={() => { setShowedIntent(false); setStep(2) }}
              className={`flex-1 rounded-md border px-4 py-2.5 text-sm font-medium transition-colors ${
                showedIntent === false
                  ? 'border-[var(--brand-color)] bg-[var(--brand-color)]/5 text-[var(--brand-color)]'
                  : 'border-gray-200 text-gray-700 hover:bg-gray-50'
              }`}
            >
              Nee
            </button>
          </div>
        </div>
      )}

      {step === 2 && (
        <div className="space-y-3">
          <p className="text-sm text-gray-700">
            Stelde de lead een inhoudelijke vraag?
          </p>
          <div className="flex gap-3">
            <button
              type="button"
              onClick={() => { setAskedQuestion(true); setStep(3) }}
              className={`flex-1 rounded-md border px-4 py-2.5 text-sm font-medium transition-colors ${
                askedQuestion === true
                  ? 'border-[var(--brand-color)] bg-[var(--brand-color)]/5 text-[var(--brand-color)]'
                  : 'border-gray-200 text-gray-700 hover:bg-gray-50'
              }`}
            >
              Ja
            </button>
            <button
              type="button"
              onClick={() => { setAskedQuestion(false); setStep(3) }}
              className={`flex-1 rounded-md border px-4 py-2.5 text-sm font-medium transition-colors ${
                askedQuestion === false
                  ? 'border-[var(--brand-color)] bg-[var(--brand-color)]/5 text-[var(--brand-color)]'
                  : 'border-gray-200 text-gray-700 hover:bg-gray-50'
              }`}
            >
              Nee
            </button>
          </div>
          <button
            type="button"
            onClick={() => setStep(1)}
            className="text-xs text-gray-500 hover:text-gray-700"
          >
            &larr; Vorige vraag
          </button>
        </div>
      )}

      {step === 3 && (
        <div className="space-y-3">
          <p className="text-sm text-gray-700">
            Leg hieronder uit wat de reden is voor dit bezwaar:
          </p>
          <textarea
            value={reason}
            onChange={(e) => setReason(e.target.value)}
            rows={4}
            placeholder="Beschrijf waarom je bezwaar maakt op deze lead..."
            className="w-full rounded-md border border-gray-300 px-3 py-2 text-sm focus:border-[var(--brand-color)] focus:outline-none focus:ring-1 focus:ring-[var(--brand-color)]"
          />
          <div className="flex items-center justify-between">
            <button
              type="button"
              onClick={() => setStep(2)}
              className="text-xs text-gray-500 hover:text-gray-700"
            >
              &larr; Vorige vraag
            </button>
            <button
              type="button"
              onClick={handleSubmit}
              disabled={!reason.trim() || isPending}
              className="rounded-md bg-[var(--brand-color)] px-4 py-2 text-sm font-medium text-white hover:opacity-90 disabled:opacity-50"
            >
              {isPending ? 'Indienen...' : 'Bezwaar indienen'}
            </button>
          </div>
        </div>
      )}
    </div>
  )
}
