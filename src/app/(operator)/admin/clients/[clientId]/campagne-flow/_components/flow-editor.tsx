'use client'

import { useState, useTransition } from 'react'
import { useRouter } from 'next/navigation'
import type { CampaignFlow } from '@/lib/data/campaign-flow'
import { addStep, setFlowPublished } from '../actions'
import { StepEditor } from './step-editor'

interface Props {
  clientId: string
  initialFlow: CampaignFlow
}

export function FlowEditor({ clientId, initialFlow }: Props) {
  const router = useRouter()
  const [pending, startTransition] = useTransition()
  const [error, setError] = useState<string | null>(null)
  // Toon optimistisch een nieuwe publish-state tijdens de transitie. Wordt
  // teruggezet zodra de server-data binnen is via router.refresh().
  const [optimisticPublished, setOptimisticPublished] = useState<boolean | null>(null)

  const flow = initialFlow
  const isPublished = optimisticPublished ?? flow.isPublished

  const handleAddStep = () => {
    setError(null)
    startTransition(async () => {
      const result = await addStep(clientId)
      if (result.error) setError(result.error)
      else router.refresh()
    })
  }

  const handleTogglePublish = () => {
    setError(null)
    const newPublished = !isPublished
    setOptimisticPublished(newPublished)
    startTransition(async () => {
      const result = await setFlowPublished(clientId, newPublished)
      if (result.error) {
        setError(result.error)
        setOptimisticPublished(null)
      } else {
        router.refresh()
        setOptimisticPublished(null)
      }
    })
  }

  return (
    <div className="space-y-6">
      {/* Publish-bar */}
      <section className="rounded-2xl border border-gray-200 bg-white p-5 shadow-sm">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <div className="min-w-0">
            <h2 className="text-sm font-semibold text-gray-900">Zichtbaarheid</h2>
            <p className="mt-0.5 text-xs text-gray-500">
              {isPublished
                ? 'De flow is zichtbaar onderaan de Mijn campagne pagina van deze klant.'
                : 'De flow is nog niet zichtbaar voor de klant.'}
            </p>
          </div>
          <button
            type="button"
            onClick={handleTogglePublish}
            disabled={pending || flow.steps.length === 0}
            className={`group inline-flex items-center justify-center gap-2 rounded-xl px-4 py-2.5 text-xs font-bold uppercase tracking-wide shadow-sm transition-all disabled:cursor-not-allowed disabled:opacity-50 ${
              isPublished
                ? 'bg-emerald-100 text-emerald-700 ring-1 ring-emerald-300 hover:bg-emerald-200'
                : 'bg-gray-900 text-white hover:bg-indigo-600 hover:shadow-md'
            }`}
          >
            {isPublished ? (
              <>
                <span className="h-2 w-2 rounded-full bg-emerald-500" />
                Zichtbaar voor klant
              </>
            ) : (
              <>
                Toon aan klant
                <svg
                  className="h-3.5 w-3.5 transition-transform group-hover:translate-x-0.5"
                  fill="none"
                  viewBox="0 0 24 24"
                  strokeWidth={2.5}
                  stroke="currentColor"
                >
                  <path strokeLinecap="round" strokeLinejoin="round" d="M13.5 4.5 21 12m0 0-7.5 7.5M21 12H3" />
                </svg>
              </>
            )}
          </button>
        </div>
        {flow.steps.length === 0 && (
          <p className="mt-3 rounded-lg bg-amber-50 px-3 py-2 text-[11px] text-amber-700">
            Voeg eerst minimaal één stap toe voordat je de flow kunt publiceren.
          </p>
        )}
      </section>

      {error && (
        <div className="rounded-xl border border-red-200 bg-red-50 p-3 text-sm text-red-700">
          {error}
        </div>
      )}

      {/* Steps */}
      <div className="space-y-5">
        {flow.steps.map((step, idx) => (
          <StepEditor
            key={step.id}
            step={step}
            stepLabel={`Mail ${step.stepNumber}`}
            isFirst={idx === 0}
            isLast={idx === flow.steps.length - 1}
            disabled={pending}
          />
        ))}

        {flow.steps.length === 0 && (
          <div className="rounded-2xl border border-dashed border-gray-300 bg-white p-10 text-center">
            <div className="mx-auto flex h-12 w-12 items-center justify-center rounded-2xl bg-indigo-50 text-indigo-500">
              <svg className="h-6 w-6" fill="none" viewBox="0 0 24 24" strokeWidth={2} stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" d="M3.75 6.75h16.5M3.75 12h16.5m-16.5 5.25h16.5" />
              </svg>
            </div>
            <h3 className="mt-3 text-sm font-semibold text-gray-900">Nog geen stappen</h3>
            <p className="mt-1 text-xs text-gray-500">
              Voeg de eerste mail-stap toe om de flow op te bouwen.
            </p>
          </div>
        )}
      </div>

      {/* Add step */}
      <button
        type="button"
        onClick={handleAddStep}
        disabled={pending}
        className="group flex w-full items-center justify-center gap-2 rounded-2xl border-2 border-dashed border-indigo-200 bg-indigo-50/40 px-4 py-5 text-sm font-semibold text-indigo-700 transition-all hover:-translate-y-0.5 hover:border-indigo-400 hover:bg-indigo-50 hover:shadow-sm disabled:cursor-not-allowed disabled:opacity-60 disabled:hover:translate-y-0"
      >
        <svg
          className="h-4 w-4 transition-transform group-hover:scale-110"
          fill="none"
          viewBox="0 0 24 24"
          strokeWidth={2.5}
          stroke="currentColor"
        >
          <path strokeLinecap="round" strokeLinejoin="round" d="M12 4.5v15m7.5-7.5h-15" />
        </svg>
        Stap toevoegen
      </button>
    </div>
  )
}
