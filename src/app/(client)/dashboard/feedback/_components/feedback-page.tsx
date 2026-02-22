'use client'

import { useState } from 'react'
import { submitFeedback } from '@/lib/actions/feedback-actions'
import type { FeedbackRequest } from '@/lib/data/feedback-data'
import { EmptyState } from '@/components/ui/empty-state'

const CATEGORIES = [
  {
    value: 'bug',
    label: 'Bug melden',
    description: 'Iets werkt niet goed',
    icon: (
      <svg className="h-5 w-5" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor">
        <path strokeLinecap="round" strokeLinejoin="round" d="M12 12.75c1.148 0 2.278.08 3.383.237 1.037.146 1.866.966 1.866 2.013 0 3.728-2.35 6.75-5.25 6.75S6.75 18.728 6.75 15c0-1.046.83-1.867 1.866-2.013A24.204 24.204 0 0 1 12 12.75Zm0 0c2.883 0 5.647.508 8.207 1.44a23.91 23.91 0 0 1-1.152-6.135c-.117-1.08-.83-1.965-1.777-2.413A5.98 5.98 0 0 0 12 5.25a5.98 5.98 0 0 0-5.278.465c-.947.448-1.66 1.333-1.777 2.413a23.91 23.91 0 0 1-1.152 6.135A24.29 24.29 0 0 1 12 12.75ZM2.695 18.678a17.891 17.891 0 0 1 2.555-7.384m13.5 7.384a17.891 17.891 0 0 0-2.555-7.384" />
      </svg>
    ),
    color: 'border-red-200 bg-red-50 text-red-700',
    selectedColor: 'border-red-400 bg-red-50 ring-2 ring-red-200',
    iconBg: 'bg-red-100',
  },
  {
    value: 'new_feature',
    label: 'Nieuwe functie',
    description: 'Iets nieuws toevoegen',
    icon: (
      <svg className="h-5 w-5" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor">
        <path strokeLinecap="round" strokeLinejoin="round" d="M12 18v-5.25m0 0a6.01 6.01 0 0 0 1.5-.189m-1.5.189a6.01 6.01 0 0 1-1.5-.189m3.75 7.478a12.06 12.06 0 0 1-4.5 0m3.75 2.383a14.406 14.406 0 0 1-3 0M14.25 18v-.192c0-.983.658-1.823 1.508-2.316a7.5 7.5 0 1 0-7.517 0c.85.493 1.509 1.333 1.509 2.316V18" />
      </svg>
    ),
    color: 'border-purple-200 bg-purple-50 text-purple-700',
    selectedColor: 'border-purple-400 bg-purple-50 ring-2 ring-purple-200',
    iconBg: 'bg-purple-100',
  },
  {
    value: 'optimization',
    label: 'Verbetering',
    description: 'Bestaande functie verbeteren',
    icon: (
      <svg className="h-5 w-5" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor">
        <path strokeLinecap="round" strokeLinejoin="round" d="M3.75 13.5l10.5-11.25L12 10.5h8.25L9.75 21.75 12 13.5H3.75z" />
      </svg>
    ),
    color: 'border-amber-200 bg-amber-50 text-amber-700',
    selectedColor: 'border-amber-400 bg-amber-50 ring-2 ring-amber-200',
    iconBg: 'bg-amber-100',
  },
  {
    value: 'other',
    label: 'Anders',
    description: 'Overige feedback',
    icon: (
      <svg className="h-5 w-5" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor">
        <path strokeLinecap="round" strokeLinejoin="round" d="M8.625 12a.375.375 0 1 1-.75 0 .375.375 0 0 1 .75 0Zm0 0H8.25m4.125 0a.375.375 0 1 1-.75 0 .375.375 0 0 1 .75 0Zm0 0H12m4.125 0a.375.375 0 1 1-.75 0 .375.375 0 0 1 .75 0Zm0 0h-.375M21 12c0 4.556-4.03 8.25-9 8.25a9.764 9.764 0 0 1-2.555-.337A5.972 5.972 0 0 1 5.41 20.97a5.969 5.969 0 0 1-.474-.065 4.48 4.48 0 0 0 .978-2.025c.09-.457-.133-.901-.467-1.226C3.93 16.178 3 14.189 3 12c0-4.556 4.03-8.25 9-8.25s9 3.694 9 8.25Z" />
      </svg>
    ),
    color: 'border-gray-200 bg-gray-50 text-gray-700',
    selectedColor: 'border-gray-400 bg-gray-50 ring-2 ring-gray-200',
    iconBg: 'bg-gray-100',
  },
]

const CATEGORY_LABELS: Record<string, string> = {
  bug: 'Bug',
  new_feature: 'Nieuwe functie',
  optimization: 'Verbetering',
  other: 'Anders',
}

const STATUS_CONFIG: Record<string, { label: string; bg: string; text: string; border: string; icon: React.ReactNode }> = {
  new: {
    label: 'Nieuw',
    bg: 'bg-gray-50',
    text: 'text-gray-600',
    border: 'border-gray-200',
    icon: (
      <svg className="h-4 w-4 text-gray-400" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor">
        <path strokeLinecap="round" strokeLinejoin="round" d="M12 6v6h4.5m4.5 0a9 9 0 1 1-18 0 9 9 0 0 1 18 0Z" />
      </svg>
    ),
  },
  in_progress: {
    label: 'In behandeling',
    bg: 'bg-blue-50',
    text: 'text-blue-700',
    border: 'border-blue-200',
    icon: (
      <svg className="h-4 w-4 text-blue-500" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor">
        <path strokeLinecap="round" strokeLinejoin="round" d="M16.023 9.348h4.992v-.001M2.985 19.644v-4.992m0 0h4.992m-4.993 0 3.181 3.183a8.25 8.25 0 0 0 13.803-3.7M4.031 9.865a8.25 8.25 0 0 1 13.803-3.7l3.181 3.182" />
      </svg>
    ),
  },
  thinking: {
    label: 'In overweging',
    bg: 'bg-yellow-50',
    text: 'text-yellow-700',
    border: 'border-yellow-200',
    icon: (
      <svg className="h-4 w-4 text-yellow-500" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor">
        <path strokeLinecap="round" strokeLinejoin="round" d="M12 18v-5.25m0 0a6.01 6.01 0 0 0 1.5-.189m-1.5.189a6.01 6.01 0 0 1-1.5-.189m3.75 7.478a12.06 12.06 0 0 1-4.5 0m3.75 2.383a14.406 14.406 0 0 1-3 0M14.25 18v-.192c0-.983.658-1.823 1.508-2.316a7.5 7.5 0 1 0-7.517 0c.85.493 1.509 1.333 1.509 2.316V18" />
      </svg>
    ),
  },
  denied: {
    label: 'Afgewezen',
    bg: 'bg-red-50',
    text: 'text-red-700',
    border: 'border-red-200',
    icon: (
      <svg className="h-4 w-4 text-red-500" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor">
        <path strokeLinecap="round" strokeLinejoin="round" d="M6 18 18 6M6 6l12 12" />
      </svg>
    ),
  },
  applied: {
    label: 'Doorgevoerd',
    bg: 'bg-green-50',
    text: 'text-green-700',
    border: 'border-green-200',
    icon: (
      <svg className="h-4 w-4 text-green-500" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor">
        <path strokeLinecap="round" strokeLinejoin="round" d="m4.5 12.75 6 6 9-13.5" />
      </svg>
    ),
  },
}

const CATEGORY_TAG_COLORS: Record<string, string> = {
  bug: 'bg-red-100 text-red-700',
  new_feature: 'bg-purple-100 text-purple-700',
  optimization: 'bg-amber-100 text-amber-700',
  other: 'bg-gray-100 text-gray-700',
}

export function FeedbackPage({ feedbackRequests }: { feedbackRequests: FeedbackRequest[] }) {
  const [category, setCategory] = useState('new_feature')
  const [title, setTitle] = useState('')
  const [description, setDescription] = useState('')
  const [submitting, setSubmitting] = useState(false)
  const [feedback, setFeedback] = useState<{ type: 'success' | 'error'; message: string } | null>(null)

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    setSubmitting(true)
    setFeedback(null)

    const result = await submitFeedback({ category, title, description })

    if ('error' in result) {
      setFeedback({ type: 'error', message: result.error })
    } else {
      setFeedback({ type: 'success', message: 'Verzoek ingediend!' })
      setTitle('')
      setDescription('')
      setCategory('new_feature')
    }

    setSubmitting(false)
    setTimeout(() => setFeedback(null), 4000)
  }

  return (
    <div className="space-y-10">
      {/* Submission Form */}
      <div className="rounded-xl border border-gray-200 bg-white shadow-sm">
        <div className="border-b border-gray-100 px-6 py-4">
          <h2 className="text-base font-semibold text-gray-900">Nieuw verzoek indienen</h2>
          <p className="mt-0.5 text-sm text-gray-500">Kies een categorie en beschrijf uw verzoek.</p>
        </div>

        <form onSubmit={handleSubmit} className="p-6">
          {/* Category Cards */}
          <fieldset>
            <legend className="mb-3 text-sm font-medium text-gray-700">Categorie</legend>
            <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
              {CATEGORIES.map((cat) => {
                const isSelected = category === cat.value
                return (
                  <button
                    key={cat.value}
                    type="button"
                    onClick={() => setCategory(cat.value)}
                    className={`relative flex flex-col items-center rounded-lg border px-3 py-4 text-center transition-all ${
                      isSelected ? cat.selectedColor : 'border-gray-200 bg-white hover:border-gray-300 hover:bg-gray-50'
                    }`}
                  >
                    <span className={`flex h-9 w-9 items-center justify-center rounded-full ${isSelected ? cat.iconBg : 'bg-gray-100'}`}>
                      <span className={isSelected ? '' : 'text-gray-400'}>{cat.icon}</span>
                    </span>
                    <span className={`mt-2 text-sm font-medium ${isSelected ? 'text-gray-900' : 'text-gray-600'}`}>
                      {cat.label}
                    </span>
                    <span className="mt-0.5 text-xs text-gray-400">{cat.description}</span>
                  </button>
                )
              })}
            </div>
          </fieldset>

          {/* Title + Description */}
          <div className="mt-5 space-y-4">
            <div>
              <label htmlFor="title" className="block text-sm font-medium text-gray-700">
                Titel
              </label>
              <input
                id="title"
                type="text"
                value={title}
                onChange={(e) => setTitle(e.target.value)}
                required
                maxLength={200}
                placeholder="Korte beschrijving van uw verzoek"
                className="mt-1.5 block w-full rounded-lg border border-gray-300 px-3.5 py-2.5 text-sm shadow-sm transition-colors focus:border-blue-500 focus:outline-none focus:ring-1 focus:ring-blue-500"
              />
            </div>

            <div>
              <label htmlFor="description" className="block text-sm font-medium text-gray-700">
                Beschrijving
              </label>
              <textarea
                id="description"
                value={description}
                onChange={(e) => setDescription(e.target.value)}
                required
                maxLength={5000}
                rows={4}
                placeholder="Beschrijf uw verzoek in detail..."
                className="mt-1.5 block w-full rounded-lg border border-gray-300 px-3.5 py-2.5 text-sm shadow-sm transition-colors focus:border-blue-500 focus:outline-none focus:ring-1 focus:ring-blue-500"
              />
            </div>
          </div>

          {/* Feedback + Submit */}
          <div className="mt-5 flex items-center gap-4">
            <button
              type="submit"
              disabled={submitting}
              className="inline-flex items-center gap-2 rounded-lg bg-blue-600 px-5 py-2.5 text-sm font-medium text-white shadow-sm transition-colors hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-2 disabled:opacity-50"
            >
              {submitting ? (
                <>
                  <svg className="h-4 w-4 animate-spin" viewBox="0 0 24 24" fill="none">
                    <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                    <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z" />
                  </svg>
                  Bezig met indienen...
                </>
              ) : (
                <>
                  <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" d="M6 12 3.269 3.125A59.769 59.769 0 0 1 21.485 12 59.768 59.768 0 0 1 3.27 20.875L5.999 12Zm0 0h7.5" />
                  </svg>
                  Verzoek indienen
                </>
              )}
            </button>

            {feedback && (
              <p className={`text-sm font-medium ${feedback.type === 'success' ? 'text-green-600' : 'text-red-600'}`}>
                {feedback.message}
              </p>
            )}
          </div>
        </form>
      </div>

      {/* Past Submissions */}
      <div>
        <div className="mb-4 flex items-center justify-between">
          <h2 className="text-base font-semibold text-gray-900">Mijn verzoeken</h2>
          {feedbackRequests.length > 0 && (
            <span className="text-sm text-gray-400">{feedbackRequests.length} verzoek{feedbackRequests.length !== 1 ? 'en' : ''}</span>
          )}
        </div>

        {feedbackRequests.length === 0 ? (
          <EmptyState
            icon={
              <svg className="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
                <path strokeLinecap="round" strokeLinejoin="round" d="M12 20.25c4.97 0 9-3.694 9-8.25s-4.03-8.25-9-8.25S3 7.444 3 12c0 2.104.859 4.023 2.273 5.48.432.447.74 1.04.586 1.641a4.483 4.483 0 0 1-.923 1.785A5.969 5.969 0 0 0 6 21c1.282 0 2.47-.402 3.445-1.087.81.22 1.668.337 2.555.337Z" />
              </svg>
            }
            title="Geen verzoeken"
            description="U heeft nog geen feedback verzoeken ingediend."
          />
        ) : (
          <div className="space-y-3">
            {feedbackRequests.map((req) => {
              const status = STATUS_CONFIG[req.status] ?? STATUS_CONFIG.new
              const catColor = CATEGORY_TAG_COLORS[req.category] ?? CATEGORY_TAG_COLORS.other

              return (
                <div
                  key={req.id}
                  className={`overflow-hidden rounded-xl border ${status.border} ${status.bg} transition-colors`}
                >
                  <div className="px-5 py-4">
                    {/* Header row */}
                    <div className="flex items-start justify-between gap-3">
                      <div className="flex items-center gap-2.5">
                        <span className="flex h-7 w-7 items-center justify-center rounded-full bg-white/80 shadow-sm">
                          {status.icon}
                        </span>
                        <div>
                          <h3 className="text-sm font-semibold text-gray-900">{req.title}</h3>
                          <div className="mt-0.5 flex items-center gap-2">
                            <span className={`inline-flex rounded-full px-2 py-0.5 text-[11px] font-medium ${catColor}`}>
                              {CATEGORY_LABELS[req.category] ?? req.category}
                            </span>
                            <span className={`text-xs font-medium ${status.text}`}>
                              {status.label}
                            </span>
                          </div>
                        </div>
                      </div>
                      <span className="shrink-0 rounded-md bg-white/60 px-2 py-0.5 text-xs text-gray-500">
                        {new Date(req.created_at).toLocaleDateString('nl-NL', { day: 'numeric', month: 'short', year: 'numeric' })}
                      </span>
                    </div>

                    {/* Description */}
                    <p className="mt-3 text-sm leading-relaxed text-gray-600">{req.description}</p>
                  </div>

                  {/* Operator response */}
                  {req.operator_response && (
                    <div className="border-t border-white/50 bg-white/60 px-5 py-3">
                      <div className="flex items-start gap-2.5">
                        <span className="mt-0.5 flex h-5 w-5 shrink-0 items-center justify-center rounded-full bg-blue-100">
                          <svg className="h-3 w-3 text-blue-600" fill="none" viewBox="0 0 24 24" strokeWidth={2} stroke="currentColor">
                            <path strokeLinecap="round" strokeLinejoin="round" d="M9 12.75 11.25 15 15 9.75M21 12a9 9 0 1 1-18 0 9 9 0 0 1 18 0Z" />
                          </svg>
                        </span>
                        <div>
                          <p className="text-xs font-semibold text-gray-500">Reactie van NextWave</p>
                          <p className="mt-0.5 text-sm text-gray-700">{req.operator_response}</p>
                        </div>
                      </div>
                    </div>
                  )}
                </div>
              )
            })}
          </div>
        )}
      </div>
    </div>
  )
}
