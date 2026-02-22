'use client'

import { useState } from 'react'
import { submitFeedback } from '@/lib/actions/feedback-actions'
import type { FeedbackRequest } from '@/lib/data/feedback-data'
import { EmptyState } from '@/components/ui/empty-state'

const CATEGORY_LABELS: Record<string, string> = {
  bug: 'Bug melden',
  new_feature: 'Nieuwe functie',
  optimization: 'Bestaande functie verbeteren',
  other: 'Anders',
}

const STATUS_CONFIG: Record<string, { label: string; color: string }> = {
  new: { label: 'Nieuw', color: 'bg-gray-100 text-gray-700' },
  in_progress: { label: 'In behandeling', color: 'bg-blue-100 text-blue-700' },
  thinking: { label: 'In overweging', color: 'bg-yellow-100 text-yellow-700' },
  denied: { label: 'Afgewezen', color: 'bg-red-100 text-red-700' },
  applied: { label: 'Doorgevoerd', color: 'bg-green-100 text-green-700' },
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
    <div className="space-y-8">
      {/* Submission Form */}
      <div className="rounded-lg border border-gray-200 bg-white p-6">
        <h2 className="text-lg font-semibold text-gray-900">Nieuw verzoek</h2>
        <form onSubmit={handleSubmit} className="mt-4 space-y-4">
          <div>
            <label htmlFor="category" className="block text-sm font-medium text-gray-700">
              Categorie
            </label>
            <select
              id="category"
              value={category}
              onChange={(e) => setCategory(e.target.value)}
              className="mt-1 block w-full rounded-md border border-gray-300 px-3 py-2 text-sm shadow-sm focus:border-blue-500 focus:outline-none focus:ring-1 focus:ring-blue-500"
            >
              <option value="bug">Bug melden</option>
              <option value="new_feature">Nieuwe functie</option>
              <option value="optimization">Bestaande functie verbeteren</option>
              <option value="other">Anders</option>
            </select>
          </div>

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
              className="mt-1 block w-full rounded-md border border-gray-300 px-3 py-2 text-sm shadow-sm focus:border-blue-500 focus:outline-none focus:ring-1 focus:ring-blue-500"
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
              className="mt-1 block w-full rounded-md border border-gray-300 px-3 py-2 text-sm shadow-sm focus:border-blue-500 focus:outline-none focus:ring-1 focus:ring-blue-500"
            />
          </div>

          {feedback && (
            <div
              className={`rounded-md p-3 text-sm ${
                feedback.type === 'success'
                  ? 'bg-green-50 text-green-700'
                  : 'bg-red-50 text-red-700'
              }`}
            >
              {feedback.message}
            </div>
          )}

          <button
            type="submit"
            disabled={submitting}
            className="rounded-md bg-blue-600 px-4 py-2 text-sm font-medium text-white shadow-sm hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-2 disabled:opacity-50"
          >
            {submitting ? 'Bezig met indienen...' : 'Verzoek indienen'}
          </button>
        </form>
      </div>

      {/* Past Submissions */}
      <div>
        <h2 className="text-lg font-semibold text-gray-900">Mijn verzoeken</h2>

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
          <div className="mt-4 space-y-4">
            {feedbackRequests.map((req) => {
              const statusConfig = STATUS_CONFIG[req.status] ?? STATUS_CONFIG.new
              return (
                <div key={req.id} className="rounded-lg border border-gray-200 bg-white p-5">
                  <div className="flex items-start justify-between gap-4">
                    <div className="min-w-0 flex-1">
                      <div className="flex items-center gap-2">
                        <span className="inline-flex rounded-full bg-gray-100 px-2.5 py-0.5 text-xs font-medium text-gray-700">
                          {CATEGORY_LABELS[req.category] ?? req.category}
                        </span>
                        <span className={`inline-flex rounded-full px-2.5 py-0.5 text-xs font-medium ${statusConfig.color}`}>
                          {statusConfig.label}
                        </span>
                      </div>
                      <h3 className="mt-2 text-sm font-semibold text-gray-900">{req.title}</h3>
                      <p className="mt-1 text-sm text-gray-600">{req.description}</p>
                    </div>
                    <span className="shrink-0 text-xs text-gray-400">
                      {new Date(req.created_at).toLocaleDateString('nl-NL')}
                    </span>
                  </div>

                  {req.operator_response && (
                    <div className="mt-3 rounded-md bg-gray-50 p-3">
                      <p className="text-xs font-medium text-gray-500">Reactie van NextWave</p>
                      <p className="mt-1 text-sm text-gray-700">{req.operator_response}</p>
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
