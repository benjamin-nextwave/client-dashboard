'use client'

import { useState } from 'react'
import { updateFeedbackStatus } from '@/lib/actions/feedback-actions'
import type { FeedbackWithClient } from '@/lib/data/feedback-data'
import { EmptyState } from '@/components/ui/empty-state'

const CATEGORY_LABELS: Record<string, string> = {
  bug: 'Bug',
  new_feature: 'Nieuwe functie',
  optimization: 'Verbetering',
  other: 'Anders',
}

const STATUS_OPTIONS = [
  { value: 'new', label: 'Nieuw' },
  { value: 'in_progress', label: 'In behandeling' },
  { value: 'thinking', label: 'In overweging' },
  { value: 'denied', label: 'Afgewezen' },
  { value: 'applied', label: 'Doorgevoerd' },
]

const STATUS_COLORS: Record<string, string> = {
  new: 'bg-gray-100 text-gray-700',
  in_progress: 'bg-blue-100 text-blue-700',
  thinking: 'bg-yellow-100 text-yellow-700',
  denied: 'bg-red-100 text-red-700',
  applied: 'bg-green-100 text-green-700',
}

export function FeedbackManagement({ feedbackRequests }: { feedbackRequests: FeedbackWithClient[] }) {
  const [statusFilter, setStatusFilter] = useState<string>('all')
  const [search, setSearch] = useState('')
  const [expandedId, setExpandedId] = useState<string | null>(null)
  const [editStatus, setEditStatus] = useState('')
  const [editResponse, setEditResponse] = useState('')
  const [saving, setSaving] = useState(false)
  const [feedback, setFeedback] = useState<{ type: 'success' | 'error'; message: string } | null>(null)

  const filtered = feedbackRequests.filter((req) => {
    if (statusFilter !== 'all' && req.status !== statusFilter) return false
    if (search && !req.company_name.toLowerCase().includes(search.toLowerCase())) return false
    return true
  })

  function handleExpand(req: FeedbackWithClient) {
    if (expandedId === req.id) {
      setExpandedId(null)
      return
    }
    setExpandedId(req.id)
    setEditStatus(req.status)
    setEditResponse(req.operator_response ?? '')
  }

  async function handleSave(id: string) {
    setSaving(true)
    setFeedback(null)

    const result = await updateFeedbackStatus({
      id,
      status: editStatus,
      operator_response: editResponse || null,
    })

    if ('error' in result) {
      setFeedback({ type: 'error', message: result.error })
    } else {
      setFeedback({ type: 'success', message: 'Feedback bijgewerkt.' })
      setExpandedId(null)
    }

    setSaving(false)
    setTimeout(() => setFeedback(null), 3000)
  }

  return (
    <div className="space-y-4">
      {/* Filter Bar */}
      <div className="flex flex-wrap items-center gap-3">
        <select
          value={statusFilter}
          onChange={(e) => setStatusFilter(e.target.value)}
          className="rounded-md border border-gray-300 px-3 py-2 text-sm shadow-sm focus:border-blue-500 focus:outline-none focus:ring-1 focus:ring-blue-500"
        >
          <option value="all">Alle statussen</option>
          {STATUS_OPTIONS.map((opt) => (
            <option key={opt.value} value={opt.value}>{opt.label}</option>
          ))}
        </select>

        <input
          type="text"
          placeholder="Zoek op klantnaam..."
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          className="rounded-md border border-gray-300 px-3 py-2 text-sm shadow-sm focus:border-blue-500 focus:outline-none focus:ring-1 focus:ring-blue-500"
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

      {/* Feedback List */}
      {filtered.length === 0 ? (
        <EmptyState
          icon={
            <svg className="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M12 20.25c4.97 0 9-3.694 9-8.25s-4.03-8.25-9-8.25S3 7.444 3 12c0 2.104.859 4.023 2.273 5.48.432.447.74 1.04.586 1.641a4.483 4.483 0 0 1-.923 1.785A5.969 5.969 0 0 0 6 21c1.282 0 2.47-.402 3.445-1.087.81.22 1.668.337 2.555.337Z" />
            </svg>
          }
          title="Geen feedback gevonden"
          description="Er zijn geen feedback verzoeken die aan uw filters voldoen."
        />
      ) : (
        <div className="space-y-3">
          {filtered.map((req) => {
            const statusColor = STATUS_COLORS[req.status] ?? STATUS_COLORS.new
            const statusLabel = STATUS_OPTIONS.find((o) => o.value === req.status)?.label ?? req.status
            const isExpanded = expandedId === req.id

            return (
              <div key={req.id} className="rounded-lg border border-gray-200 bg-white">
                <button
                  type="button"
                  onClick={() => handleExpand(req)}
                  className="w-full p-5 text-left"
                >
                  <div className="flex items-start justify-between gap-4">
                    <div className="min-w-0 flex-1">
                      <div className="flex flex-wrap items-center gap-2">
                        <span className="text-sm font-medium text-blue-600">{req.company_name}</span>
                        <span className="inline-flex rounded-full bg-gray-100 px-2.5 py-0.5 text-xs font-medium text-gray-700">
                          {CATEGORY_LABELS[req.category] ?? req.category}
                        </span>
                        <span className={`inline-flex rounded-full px-2.5 py-0.5 text-xs font-medium ${statusColor}`}>
                          {statusLabel}
                        </span>
                      </div>
                      <h3 className="mt-2 text-sm font-semibold text-gray-900">{req.title}</h3>
                      <p className="mt-1 text-sm text-gray-600 line-clamp-2">{req.description}</p>
                    </div>
                    <span className="shrink-0 text-xs text-gray-400">
                      {new Date(req.created_at).toLocaleDateString('nl-NL')}
                    </span>
                  </div>
                </button>

                {isExpanded && (
                  <div className="border-t border-gray-200 p-5">
                    <p className="text-sm text-gray-700 whitespace-pre-wrap">{req.description}</p>

                    <div className="mt-4 space-y-3">
                      <div>
                        <label htmlFor={`status-${req.id}`} className="block text-sm font-medium text-gray-700">
                          Status
                        </label>
                        <select
                          id={`status-${req.id}`}
                          value={editStatus}
                          onChange={(e) => setEditStatus(e.target.value)}
                          className="mt-1 block w-full rounded-md border border-gray-300 px-3 py-2 text-sm shadow-sm focus:border-blue-500 focus:outline-none focus:ring-1 focus:ring-blue-500 sm:w-64"
                        >
                          {STATUS_OPTIONS.map((opt) => (
                            <option key={opt.value} value={opt.value}>{opt.label}</option>
                          ))}
                        </select>
                      </div>

                      <div>
                        <label htmlFor={`response-${req.id}`} className="block text-sm font-medium text-gray-700">
                          Reactie
                        </label>
                        <textarea
                          id={`response-${req.id}`}
                          value={editResponse}
                          onChange={(e) => setEditResponse(e.target.value)}
                          rows={3}
                          placeholder="Schrijf een reactie voor de klant..."
                          className="mt-1 block w-full rounded-md border border-gray-300 px-3 py-2 text-sm shadow-sm focus:border-blue-500 focus:outline-none focus:ring-1 focus:ring-blue-500"
                        />
                      </div>

                      <button
                        type="button"
                        onClick={() => handleSave(req.id)}
                        disabled={saving}
                        className="rounded-md bg-blue-600 px-4 py-2 text-sm font-medium text-white shadow-sm hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-2 disabled:opacity-50"
                      >
                        {saving ? 'Opslaan...' : 'Opslaan'}
                      </button>
                    </div>
                  </div>
                )}
              </div>
            )
          })}
        </div>
      )}
    </div>
  )
}
