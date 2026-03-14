'use client'

import { useState, useTransition } from 'react'
import { useRouter } from 'next/navigation'
import type { OnboardingStep } from '@/lib/actions/onboarding-actions'
import {
  setOnboardingStatus,
  toggleStepCompletion,
  addOnboardingStep,
  removeOnboardingStep,
} from '@/lib/actions/onboarding-actions'

interface OnboardingManagerProps {
  clientId: string
  status: string
  initialSteps: OnboardingStep[]
}

export function OnboardingManager({ clientId, status, initialSteps }: OnboardingManagerProps) {
  const router = useRouter()
  const [isPending, startTransition] = useTransition()
  const [steps, setSteps] = useState(initialSteps)
  const [showAddForm, setShowAddForm] = useState(false)
  const [newTitle, setNewTitle] = useState('')
  const [newAssignedTo, setNewAssignedTo] = useState<'client' | 'nextwave'>('nextwave')
  const [insertAfter, setInsertAfter] = useState(0)

  const isOnboarding = status === 'onboarding'

  function refresh() {
    startTransition(() => {
      router.refresh()
    })
  }

  async function handleStatusToggle() {
    const newStatus = isOnboarding ? 'live' : 'onboarding'
    const result = await setOnboardingStatus(clientId, newStatus)
    if (!result.error) {
      refresh()
    }
  }

  async function handleToggleStep(stepId: string, completed: boolean) {
    // Optimistic update
    setSteps((prev) =>
      prev.map((s) =>
        s.id === stepId
          ? { ...s, is_completed: completed, completed_at: completed ? new Date().toISOString() : null }
          : s
      )
    )
    const result = await toggleStepCompletion(stepId, completed)
    if (result.error) {
      refresh()
    }
  }

  async function handleAddStep() {
    if (!newTitle.trim()) return
    const result = await addOnboardingStep(clientId, newTitle.trim(), newAssignedTo, insertAfter)
    if (!result.error) {
      setNewTitle('')
      setShowAddForm(false)
      refresh()
    }
  }

  async function handleRemoveStep(stepId: string) {
    setSteps((prev) => prev.filter((s) => s.id !== stepId))
    const result = await removeOnboardingStep(stepId)
    if (result.error) {
      refresh()
    }
  }

  // Find the current active step (first incomplete)
  const currentStepIndex = steps.findIndex((s) => !s.is_completed)

  return (
    <div className="mt-6 space-y-6">
      {/* Status toggle */}
      <div className="flex items-center justify-between rounded-lg border border-gray-200 bg-white p-4">
        <div>
          <span className="text-sm font-medium text-gray-700">Status: </span>
          {isOnboarding ? (
            <span className="inline-flex items-center rounded-full bg-amber-100 px-2.5 py-0.5 text-xs font-medium text-amber-800">
              Binnen onboarding
            </span>
          ) : (
            <span className="inline-flex items-center rounded-full bg-green-100 px-2.5 py-0.5 text-xs font-medium text-green-800">
              Live
            </span>
          )}
        </div>
        <button
          type="button"
          onClick={handleStatusToggle}
          disabled={isPending}
          className={`rounded-md px-4 py-2 text-sm font-medium transition-colors disabled:opacity-50 ${
            isOnboarding
              ? 'bg-green-600 text-white hover:bg-green-700'
              : 'bg-amber-600 text-white hover:bg-amber-700'
          }`}
        >
          {isOnboarding ? 'Markeer als Live' : 'Markeer als Onboarding'}
        </button>
      </div>

      {/* Steps list */}
      {isOnboarding && (
        <>
          <div className="rounded-lg border border-gray-200 bg-white">
            <div className="border-b border-gray-200 px-4 py-3">
              <h2 className="text-sm font-semibold text-gray-900">Onboarding stappen</h2>
            </div>
            <div className="divide-y divide-gray-100">
              {steps.map((step, index) => (
                <div
                  key={step.id}
                  className={`flex items-center gap-3 px-4 py-3 ${
                    index === currentStepIndex ? 'bg-blue-50' : ''
                  }`}
                >
                  {/* Checkbox */}
                  <button
                    type="button"
                    onClick={() => handleToggleStep(step.id, !step.is_completed)}
                    className={`flex h-5 w-5 flex-shrink-0 items-center justify-center rounded border transition-colors ${
                      step.is_completed
                        ? 'border-green-500 bg-green-500 text-white'
                        : index === currentStepIndex
                          ? 'border-blue-400 bg-white'
                          : 'border-gray-300 bg-white'
                    }`}
                  >
                    {step.is_completed && (
                      <svg className="h-3 w-3" fill="none" viewBox="0 0 24 24" strokeWidth={3} stroke="currentColor">
                        <path strokeLinecap="round" strokeLinejoin="round" d="M4.5 12.75l6 6 9-13.5" />
                      </svg>
                    )}
                  </button>

                  {/* Step info */}
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2">
                      <span className="text-xs font-medium text-gray-400">{step.sort_order}.</span>
                      <span className={`text-sm ${step.is_completed ? 'text-gray-400 line-through' : 'text-gray-900'}`}>
                        {step.title}
                      </span>
                    </div>
                  </div>

                  {/* Assigned to badge */}
                  <span className={`flex-shrink-0 rounded-full px-2 py-0.5 text-xs font-medium ${
                    step.assigned_to === 'client'
                      ? 'bg-blue-100 text-blue-700'
                      : 'bg-gray-100 text-gray-700'
                  }`}>
                    {step.assigned_to === 'client' ? 'Klant' : 'NextWave'}
                  </span>

                  {/* Current indicator */}
                  {index === currentStepIndex && !step.is_completed && (
                    <span className="flex-shrink-0 text-xs font-medium text-blue-600">Actief</span>
                  )}

                  {/* Remove button */}
                  <button
                    type="button"
                    onClick={() => handleRemoveStep(step.id)}
                    className="flex-shrink-0 text-gray-300 hover:text-red-500 transition-colors"
                    title="Verwijderen"
                  >
                    <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor">
                      <path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" />
                    </svg>
                  </button>
                </div>
              ))}

              {steps.length === 0 && (
                <div className="px-4 py-8 text-center text-sm text-gray-500">
                  Geen stappen gevonden. Klik op &quot;Stap toevoegen&quot; om te beginnen.
                </div>
              )}
            </div>
          </div>

          {/* Add step form */}
          {showAddForm ? (
            <div className="rounded-lg border border-gray-200 bg-white p-4 space-y-3">
              <h3 className="text-sm font-medium text-gray-900">Nieuwe stap toevoegen</h3>

              <input
                type="text"
                value={newTitle}
                onChange={(e) => setNewTitle(e.target.value)}
                placeholder="Beschrijving van de stap..."
                className="w-full rounded-md border border-gray-300 px-3 py-2 text-sm focus:border-blue-500 focus:outline-none focus:ring-1 focus:ring-blue-500"
              />

              <div className="flex gap-4">
                <div className="flex-1">
                  <label className="block text-xs font-medium text-gray-600 mb-1">Verantwoordelijke</label>
                  <select
                    value={newAssignedTo}
                    onChange={(e) => setNewAssignedTo(e.target.value as 'client' | 'nextwave')}
                    className="w-full rounded-md border border-gray-300 px-3 py-2 text-sm focus:border-blue-500 focus:outline-none focus:ring-1 focus:ring-blue-500"
                  >
                    <option value="client">Klant</option>
                    <option value="nextwave">NextWave</option>
                  </select>
                </div>

                <div className="flex-1">
                  <label className="block text-xs font-medium text-gray-600 mb-1">Invoegen na stap</label>
                  <select
                    value={insertAfter}
                    onChange={(e) => setInsertAfter(Number(e.target.value))}
                    className="w-full rounded-md border border-gray-300 px-3 py-2 text-sm focus:border-blue-500 focus:outline-none focus:ring-1 focus:ring-blue-500"
                  >
                    <option value={0}>Aan het begin</option>
                    {steps.map((s) => (
                      <option key={s.id} value={s.sort_order}>
                        Na stap {s.sort_order}: {s.title.substring(0, 40)}
                      </option>
                    ))}
                  </select>
                </div>
              </div>

              <div className="flex gap-2">
                <button
                  type="button"
                  onClick={handleAddStep}
                  disabled={!newTitle.trim()}
                  className="rounded-md bg-black px-4 py-2 text-sm font-medium text-white hover:bg-gray-800 disabled:opacity-50"
                >
                  Toevoegen
                </button>
                <button
                  type="button"
                  onClick={() => { setShowAddForm(false); setNewTitle('') }}
                  className="rounded-md bg-gray-100 px-4 py-2 text-sm font-medium text-gray-700 hover:bg-gray-200"
                >
                  Annuleren
                </button>
              </div>
            </div>
          ) : (
            <button
              type="button"
              onClick={() => setShowAddForm(true)}
              className="flex items-center gap-2 rounded-md bg-white border border-gray-200 px-4 py-2 text-sm font-medium text-gray-700 hover:bg-gray-50 transition-colors"
            >
              <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" d="M12 4.5v15m7.5-7.5h-15" />
              </svg>
              Stap toevoegen
            </button>
          )}
        </>
      )}
    </div>
  )
}
