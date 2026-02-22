'use client'

import { useState, useEffect } from 'react'

// Total estimated time: ~7 minutes (420 seconds)
const TOTAL_ESTIMATED_MS = 7 * 60 * 1000

const STEPS = [
  { message: 'Verbinding maken met uw mailbox...', atPercent: 0 },
  { message: 'Accounts verifi\u00EBren...', atPercent: 5 },
  { message: 'Nieuwe berichten ophalen...', atPercent: 10 },
  { message: 'Gesprekken koppelen...', atPercent: 20 },
  { message: 'Contactgegevens bijwerken...', atPercent: 30 },
  { message: 'Reacties verwerken...', atPercent: 40 },
  { message: 'Leads classificeren...', atPercent: 50 },
  { message: 'Statistieken berekenen...', atPercent: 60 },
  { message: 'Dashboard gegevens bijwerken...', atPercent: 70 },
  { message: 'Laatste controles uitvoeren...', atPercent: 80 },
  { message: 'Bijna klaar, nog even geduld...', atPercent: 90 },
]

interface RefreshOverlayProps {
  isRefreshing: boolean
  mode?: 'inline' | 'fullcard'
}

export function RefreshOverlay({ isRefreshing, mode = 'fullcard' }: RefreshOverlayProps) {
  const [elapsed, setElapsed] = useState(0)

  // Reset on start
  useEffect(() => {
    if (isRefreshing) {
      setElapsed(0)
    }
  }, [isRefreshing])

  // Elapsed timer
  useEffect(() => {
    if (!isRefreshing) return

    const interval = setInterval(() => {
      setElapsed((e) => e + 1000)
    }, 1000)

    return () => clearInterval(interval)
  }, [isRefreshing])

  if (!isRefreshing) return null

  // Progress uses an easing curve so it slows down toward the end, capped at 95%
  const linearProgress = elapsed / TOTAL_ESTIMATED_MS
  const progress = Math.min(linearProgress * 100, 95)

  // Find current step based on progress
  let currentStepIndex = 0
  for (let i = STEPS.length - 1; i >= 0; i--) {
    if (progress >= STEPS[i].atPercent) {
      currentStepIndex = i
      break
    }
  }
  const step = STEPS[currentStepIndex]

  // Remaining time in minutes (minimum 1 minute shown until 95%)
  const remainingMs = Math.max(TOTAL_ESTIMATED_MS - elapsed, 0)
  const remainingMinutes = Math.ceil(remainingMs / 60000)

  if (mode === 'inline') {
    return (
      <div className="flex items-center gap-3 rounded-lg border border-blue-200 bg-blue-50 px-4 py-3">
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
            <svg className="h-14 w-14 animate-spin" style={{ animationDuration: '3s' }} viewBox="0 0 56 56" fill="none">
              <circle cx="28" cy="28" r="24" stroke="#E5E7EB" strokeWidth="3" />
              <path
                d="M28 4a24 24 0 0 1 24 24"
                stroke="#3B82F6"
                strokeWidth="3"
                strokeLinecap="round"
              />
            </svg>
            <div className="absolute inset-0 flex items-center justify-center">
              <svg className="h-6 w-6 text-blue-500" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" d="M21.75 6.75v10.5a2.25 2.25 0 0 1-2.25 2.25h-15a2.25 2.25 0 0 1-2.25-2.25V6.75m19.5 0A2.25 2.25 0 0 0 19.5 4.5h-15a2.25 2.25 0 0 0-2.25 2.25m19.5 0v.243a2.25 2.25 0 0 1-1.07 1.916l-7.5 4.615a2.25 2.25 0 0 1-2.36 0L3.32 8.91a2.25 2.25 0 0 1-1.07-1.916V6.75" />
              </svg>
            </div>
          </div>
        </div>

        {/* Title + step message */}
        <div className="mt-5 text-center">
          <p className="text-sm font-semibold text-gray-900">
            Inbox wordt vernieuwd
          </p>
          <p
            key={currentStepIndex}
            className="mt-1.5 text-sm text-gray-500 animate-fadeIn"
          >
            {step.message}
          </p>
        </div>

        {/* Estimated time remaining */}
        <div className="mx-auto mt-4 flex items-center justify-center gap-2">
          <svg className="h-4 w-4 text-gray-400" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" d="M12 6v6h4.5m4.5 0a9 9 0 1 1-18 0 9 9 0 0 1 18 0Z" />
          </svg>
          <span className="text-sm font-medium text-gray-600">
            {progress >= 95
              ? 'Bijna klaar...'
              : remainingMinutes === 1
                ? 'Nog ongeveer 1 minuut'
                : `Nog ongeveer ${remainingMinutes} minuten`}
          </span>
        </div>

        {/* Progress bar */}
        <div className="mx-auto mt-5 max-w-sm">
          <div className="h-2 overflow-hidden rounded-full bg-gray-100">
            <div
              className="h-full rounded-full bg-gradient-to-r from-blue-600 via-blue-500 to-blue-400 transition-all duration-1000 ease-out"
              style={{ width: `${progress}%` }}
            />
          </div>
          <div className="mt-2 flex items-center justify-between text-xs text-gray-400">
            <span>Stap {currentStepIndex + 1} van {STEPS.length}</span>
            <span>{Math.round(progress)}%</span>
          </div>
        </div>

        {/* Step indicators */}
        <div className="mx-auto mt-4 flex max-w-sm justify-center gap-1.5">
          {STEPS.map((_, i) => (
            <div
              key={i}
              className={`h-1 rounded-full transition-all duration-500 ${
                i < currentStepIndex
                  ? 'w-5 bg-blue-500'
                  : i === currentStepIndex
                    ? 'w-5 bg-blue-300 animate-pulse'
                    : 'w-2 bg-gray-200'
              }`}
            />
          ))}
        </div>

        {/* Friendly tip */}
        <div className="mx-auto mt-6 max-w-sm rounded-lg bg-blue-50 px-4 py-3">
          <div className="flex gap-3">
            <svg className="mt-0.5 h-5 w-5 shrink-0 text-blue-400" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" d="m11.25 11.25.041-.02a.75.75 0 0 1 1.063.852l-.708 2.836a.75.75 0 0 0 1.063.853l.041-.021M21 12a9 9 0 1 1-18 0 9 9 0 0 1 18 0Zm-9-3.75h.008v.008H12V8.25Z" />
            </svg>
            <p className="text-sm text-blue-700">
              Dit is een volledige synchronisatie van al uw dashboard-gegevens. Pak gerust een kop koffie of beantwoord ondertussen uw eigen e-mails — wij laten alles netjes voor u klaarzetten.
            </p>
          </div>
        </div>
      </div>
    </div>
  )
}
