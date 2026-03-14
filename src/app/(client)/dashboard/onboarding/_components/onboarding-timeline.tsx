'use client'

interface Step {
  id: string
  title: string
  assigned_to: string
  sort_order: number
  is_completed: boolean
  completed_at: string | null
}

interface OnboardingTimelineProps {
  steps: Step[]
}

export function OnboardingTimeline({ steps }: OnboardingTimelineProps) {
  const currentIndex = steps.findIndex((s) => !s.is_completed)
  const allDone = currentIndex === -1 && steps.length > 0

  return (
    <div className="mt-8 space-y-0">
      {steps.map((step, index) => {
        const isCompleted = step.is_completed
        const isCurrent = index === currentIndex
        const isFuture = !isCompleted && !isCurrent
        const isLast = index === steps.length - 1

        return (
          <div key={step.id} className="relative flex gap-4">
            {/* Vertical line + circle */}
            <div className="flex flex-col items-center">
              {/* Circle */}
              <div
                className={`relative z-10 flex h-10 w-10 flex-shrink-0 items-center justify-center rounded-full border-2 transition-all ${
                  isCompleted
                    ? 'border-green-500 bg-green-500'
                    : isCurrent
                      ? 'border-[var(--brand-color)] bg-white shadow-md shadow-blue-100'
                      : 'border-gray-200 bg-white'
                }`}
              >
                {isCompleted ? (
                  <svg className="h-5 w-5 text-white" fill="none" viewBox="0 0 24 24" strokeWidth={2.5} stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" d="M4.5 12.75l6 6 9-13.5" />
                  </svg>
                ) : isCurrent ? (
                  <span className="h-3 w-3 rounded-full animate-pulse" style={{ backgroundColor: 'var(--brand-color)' }} />
                ) : (
                  <span className="text-xs font-medium text-gray-400">{step.sort_order}</span>
                )}
              </div>

              {/* Connector line */}
              {!isLast && (
                <div
                  className={`w-0.5 flex-1 min-h-[24px] ${
                    isCompleted ? 'bg-green-500' : 'bg-gray-200'
                  }`}
                />
              )}
            </div>

            {/* Content card */}
            <div
              className={`mb-4 flex-1 rounded-lg border p-4 transition-all ${
                isCurrent
                  ? 'border-[var(--brand-color)] bg-white shadow-sm'
                  : isCompleted
                    ? 'border-green-100 bg-green-50/50'
                    : 'border-gray-100 bg-gray-50/50'
              }`}
              style={isCurrent ? { borderColor: 'var(--brand-color)' } : undefined}
            >
              <div className="flex items-start justify-between gap-3">
                <div className="min-w-0">
                  <h3
                    className={`text-sm font-semibold ${
                      isCompleted
                        ? 'text-green-800'
                        : isCurrent
                          ? 'text-gray-900'
                          : 'text-gray-400'
                    }`}
                  >
                    {step.title}
                  </h3>

                  {/* Status label */}
                  <div className="mt-1.5 flex items-center gap-2">
                    {isCompleted ? (
                      <span className="inline-flex items-center gap-1 text-xs text-green-600">
                        <svg className="h-3.5 w-3.5" fill="none" viewBox="0 0 24 24" strokeWidth={2} stroke="currentColor">
                          <path strokeLinecap="round" strokeLinejoin="round" d="M9 12.75L11.25 15 15 9.75M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                        </svg>
                        Afgerond
                      </span>
                    ) : isCurrent ? (
                      <span className="inline-flex items-center gap-1 text-xs font-medium" style={{ color: 'var(--brand-color)' }}>
                        <svg className="h-3.5 w-3.5" fill="none" viewBox="0 0 24 24" strokeWidth={2} stroke="currentColor">
                          <path strokeLinecap="round" strokeLinejoin="round" d="M12 6v6h4.5m4.5 0a9 9 0 11-18 0 9 9 0 0118 0z" />
                        </svg>
                        Huidige stap
                      </span>
                    ) : (
                      <span className="inline-flex items-center gap-1 text-xs text-gray-400">
                        Nog niet gestart
                      </span>
                    )}
                  </div>
                </div>

                {/* Assigned to */}
                <div
                  className={`flex-shrink-0 rounded-full px-3 py-1 text-xs font-medium ${
                    isFuture
                      ? 'bg-gray-100 text-gray-400'
                      : step.assigned_to === 'client'
                        ? 'bg-blue-100 text-blue-700'
                        : 'bg-gray-100 text-gray-700'
                  }`}
                >
                  {step.assigned_to === 'client' ? 'Jouw actie' : 'NextWave'}
                </div>
              </div>

              {/* Active step call-to-action */}
              {isCurrent && (
                <div className="mt-3 rounded-md bg-gray-50 px-3 py-2">
                  <p className="text-xs text-gray-600">
                    {step.assigned_to === 'client'
                      ? 'Wij wachten op jouw input voor deze stap.'
                      : 'Wij zijn hier momenteel mee bezig. Je wordt op de hoogte gehouden.'}
                  </p>
                </div>
              )}
            </div>
          </div>
        )
      })}

      {/* Completion message */}
      {allDone && (
        <div className="mt-4 rounded-lg border border-green-200 bg-green-50 p-6 text-center">
          <div className="mx-auto flex h-12 w-12 items-center justify-center rounded-full bg-green-100">
            <svg className="h-6 w-6 text-green-600" fill="none" viewBox="0 0 24 24" strokeWidth={2} stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" d="M9 12.75L11.25 15 15 9.75M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
            </svg>
          </div>
          <h3 className="mt-3 text-lg font-semibold text-green-800">
            Alle stappen zijn afgerond!
          </h3>
          <p className="mt-1 text-sm text-green-600">
            Jouw campagne wordt binnenkort live gezet.
          </p>
        </div>
      )}
    </div>
  )
}
