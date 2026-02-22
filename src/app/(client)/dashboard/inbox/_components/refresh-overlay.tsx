'use client'

import { useState, useEffect } from 'react'

const STEPS = [
  { message: 'Verbinding maken met uw mailbox...', duration: 2000 },
  { message: 'Nieuwe berichten ophalen...', duration: 3000 },
  { message: 'Gesprekken synchroniseren...', duration: 3000 },
  { message: 'Contactgegevens bijwerken...', duration: 2500 },
  { message: 'Bijna klaar, nog even geduld...', duration: 4000 },
]

const TOTAL_ESTIMATED_MS = STEPS.reduce((sum, s) => sum + s.duration, 0)

interface RefreshOverlayProps {
  isRefreshing: boolean
  mode?: 'inline' | 'fullcard'
}

export function RefreshOverlay({ isRefreshing, mode = 'fullcard' }: RefreshOverlayProps) {
  const [currentStep, setCurrentStep] = useState(0)
  const [elapsed, setElapsed] = useState(0)

  // Reset on start
  useEffect(() => {
    if (isRefreshing) {
      setCurrentStep(0)
      setElapsed(0)
    }
  }, [isRefreshing])

  // Step progression
  useEffect(() => {
    if (!isRefreshing) return

    let stepStart = 0
    for (let i = 0; i < currentStep; i++) stepStart += STEPS[i].duration

    const timeout = setTimeout(() => {
      if (currentStep < STEPS.length - 1) {
        setCurrentStep((s) => s + 1)
      }
    }, STEPS[currentStep].duration)

    return () => clearTimeout(timeout)
  }, [isRefreshing, currentStep])

  // Elapsed timer for progress bar
  useEffect(() => {
    if (!isRefreshing) return

    const interval = setInterval(() => {
      setElapsed((e) => e + 100)
    }, 100)

    return () => clearInterval(interval)
  }, [isRefreshing])

  if (!isRefreshing) return null

  // Progress capped at 95% so it doesn't show 100% while still loading
  const progress = Math.min((elapsed / TOTAL_ESTIMATED_MS) * 100, 95)
  const step = STEPS[currentStep]

  if (mode === 'inline') {
    return (
      <div className="flex items-center gap-3 rounded-lg border border-blue-200 bg-blue-50 px-4 py-3">
        {/* Animated dots */}
        <div className="flex gap-1">
          <span className="h-2 w-2 animate-bounce rounded-full bg-blue-500" style={{ animationDelay: '0ms' }} />
          <span className="h-2 w-2 animate-bounce rounded-full bg-blue-500" style={{ animationDelay: '150ms' }} />
          <span className="h-2 w-2 animate-bounce rounded-full bg-blue-500" style={{ animationDelay: '300ms' }} />
        </div>
        <span className="text-sm font-medium text-blue-700">{step.message}</span>
      </div>
    )
  }

  return (
    <div className="overflow-hidden rounded-xl border border-gray-200 bg-white shadow-sm">
      <div className="px-6 py-8">
        {/* Animated icon */}
        <div className="mx-auto flex h-16 w-16 items-center justify-center">
          <div className="relative">
            {/* Outer spinning ring */}
            <svg className="h-14 w-14 animate-spin" style={{ animationDuration: '3s' }} viewBox="0 0 56 56" fill="none">
              <circle cx="28" cy="28" r="24" stroke="#E5E7EB" strokeWidth="3" />
              <path
                d="M28 4a24 24 0 0 1 24 24"
                stroke="#3B82F6"
                strokeWidth="3"
                strokeLinecap="round"
              />
            </svg>
            {/* Inner icon */}
            <div className="absolute inset-0 flex items-center justify-center">
              <svg className="h-6 w-6 text-blue-500" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" d="M21.75 6.75v10.5a2.25 2.25 0 0 1-2.25 2.25h-15a2.25 2.25 0 0 1-2.25-2.25V6.75m19.5 0A2.25 2.25 0 0 0 19.5 4.5h-15a2.25 2.25 0 0 0-2.25 2.25m19.5 0v.243a2.25 2.25 0 0 1-1.07 1.916l-7.5 4.615a2.25 2.25 0 0 1-2.36 0L3.32 8.91a2.25 2.25 0 0 1-1.07-1.916V6.75" />
              </svg>
            </div>
          </div>
        </div>

        {/* Step message with fade transition */}
        <div className="mt-5 text-center">
          <p className="text-sm font-semibold text-gray-900">
            Inbox wordt vernieuwd
          </p>
          <p
            key={currentStep}
            className="mt-1.5 text-sm text-gray-500 animate-fadeIn"
          >
            {step.message}
          </p>
        </div>

        {/* Progress bar */}
        <div className="mx-auto mt-6 max-w-xs">
          <div className="h-1.5 overflow-hidden rounded-full bg-gray-100">
            <div
              className="h-full rounded-full bg-gradient-to-r from-blue-500 to-blue-400 transition-all duration-300 ease-out"
              style={{ width: `${progress}%` }}
            />
          </div>
          <div className="mt-2 flex items-center justify-between text-xs text-gray-400">
            <span>Stap {currentStep + 1} van {STEPS.length}</span>
            <span>{Math.round(progress)}%</span>
          </div>
        </div>

        {/* Step indicators */}
        <div className="mx-auto mt-4 flex max-w-xs justify-center gap-1.5">
          {STEPS.map((_, i) => (
            <div
              key={i}
              className={`h-1 rounded-full transition-all duration-500 ${
                i < currentStep
                  ? 'w-6 bg-blue-500'
                  : i === currentStep
                    ? 'w-6 bg-blue-300 animate-pulse'
                    : 'w-3 bg-gray-200'
              }`}
            />
          ))}
        </div>
      </div>
    </div>
  )
}
