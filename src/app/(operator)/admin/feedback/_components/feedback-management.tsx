'use client'

import { useState } from 'react'
import { updateFeedbackStatus, notifyClientFeedbackReply } from '@/lib/actions/feedback-actions'
import {
  VARIANT_REASON_LABELS,
  type FeedbackWithClient,
  type VariantReason,
} from '@/lib/data/feedback-types'
import { EmptyState } from '@/components/ui/empty-state'

const CATEGORY_LABELS: Record<string, string> = {
  bug: 'Bug',
  new_feature: 'Nieuwe functie',
  optimization: 'Verbetering',
  other: 'Anders',
  campaign_performance: 'Campagne prestaties',
  new_mail_variants: 'Nieuwe mailvarianten',
}

const CATEGORY_COLORS: Record<string, string> = {
  bug: 'bg-red-100 text-red-700',
  new_feature: 'bg-purple-100 text-purple-700',
  optimization: 'bg-amber-100 text-amber-700',
  other: 'bg-gray-100 text-gray-700',
  campaign_performance: 'bg-rose-100 text-rose-700',
  new_mail_variants: 'bg-indigo-100 text-indigo-700',
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
  const [categoryFilter, setCategoryFilter] = useState<string>('all')
  const [search, setSearch] = useState('')
  const [expandedId, setExpandedId] = useState<string | null>(null)
  const [editStatus, setEditStatus] = useState('')
  const [editResponse, setEditResponse] = useState('')
  const [saving, setSaving] = useState(false)
  const [notifying, setNotifying] = useState(false)
  const [feedback, setFeedback] = useState<{ type: 'success' | 'error'; message: string } | null>(null)

  const filtered = feedbackRequests.filter((req) => {
    if (statusFilter !== 'all' && req.status !== statusFilter) return false
    if (categoryFilter !== 'all' && req.category !== categoryFilter) return false
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
    }

    setSaving(false)
    setTimeout(() => setFeedback(null), 3000)
  }

  async function handleNotify(id: string) {
    if (!editResponse.trim()) {
      setFeedback({ type: 'error', message: 'Schrijf eerst een reactie en sla op voordat je notificeert.' })
      setTimeout(() => setFeedback(null), 3000)
      return
    }
    setNotifying(true)
    setFeedback(null)

    // Save first, then notify (ensures DB has latest response)
    const saveResult = await updateFeedbackStatus({
      id,
      status: editStatus,
      operator_response: editResponse || null,
    })
    if ('error' in saveResult) {
      setFeedback({ type: 'error', message: saveResult.error })
      setNotifying(false)
      setTimeout(() => setFeedback(null), 4000)
      return
    }

    const notifyResult = await notifyClientFeedbackReply(id)
    if ('error' in notifyResult) {
      setFeedback({ type: 'error', message: notifyResult.error })
    } else {
      setFeedback({ type: 'success', message: 'Klant is genotificeerd via e-mail.' })
    }

    setNotifying(false)
    setTimeout(() => setFeedback(null), 4000)
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
            <option key={opt.value} value={opt.value}>
              {opt.label}
            </option>
          ))}
        </select>

        <select
          value={categoryFilter}
          onChange={(e) => setCategoryFilter(e.target.value)}
          className="rounded-md border border-gray-300 px-3 py-2 text-sm shadow-sm focus:border-blue-500 focus:outline-none focus:ring-1 focus:ring-blue-500"
        >
          <option value="all">Alle categorieën</option>
          {Object.entries(CATEGORY_LABELS).map(([v, l]) => (
            <option key={v} value={v}>
              {l}
            </option>
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
            feedback.type === 'success' ? 'bg-green-50 text-green-700' : 'bg-red-50 text-red-700'
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
            const catColor = CATEGORY_COLORS[req.category] ?? CATEGORY_COLORS.other
            const isExpanded = expandedId === req.id
            const reasons = (req.metadata?.variant_reasons ?? []) as VariantReason[]

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
                        <span className={`inline-flex rounded-full px-2.5 py-0.5 text-xs font-medium ${catColor}`}>
                          {CATEGORY_LABELS[req.category] ?? req.category}
                        </span>
                        <span className={`inline-flex rounded-full px-2.5 py-0.5 text-xs font-medium ${statusColor}`}>
                          {statusLabel}
                        </span>
                      </div>
                      <h3 className="mt-2 text-sm font-semibold text-gray-900">{req.title}</h3>
                      <p className="mt-1 text-sm text-gray-600 line-clamp-2">{req.description}</p>
                      {reasons.length > 0 && (
                        <div className="mt-2 flex flex-wrap gap-1.5">
                          {reasons.map((r) => (
                            <span
                              key={r}
                              className="inline-flex items-center rounded-full bg-indigo-50 px-2 py-0.5 text-[10px] font-semibold text-indigo-700 ring-1 ring-indigo-100"
                            >
                              {VARIANT_REASON_LABELS[r]}
                            </span>
                          ))}
                        </div>
                      )}
                    </div>
                    <span className="shrink-0 text-xs text-gray-400">
                      {new Date(req.created_at).toLocaleDateString('nl-NL')}
                    </span>
                  </div>
                </button>

                {isExpanded && (
                  <div className="border-t border-gray-200 p-5">
                    <p className="whitespace-pre-wrap text-sm text-gray-700">{req.description}</p>

                    {reasons.length > 0 && (
                      <div className="mt-4 rounded-lg border border-indigo-100 bg-indigo-50/50 p-3">
                        <div className="text-[11px] font-semibold uppercase tracking-wide text-indigo-700">
                          Redenen voor nieuwe mailvarianten
                        </div>
                        <div className="mt-2 flex flex-wrap gap-1.5">
                          {reasons.map((r) => (
                            <span
                              key={r}
                              className="inline-flex items-center rounded-full bg-white px-2.5 py-1 text-xs font-semibold text-indigo-700 ring-1 ring-indigo-200"
                            >
                              {VARIANT_REASON_LABELS[r]}
                            </span>
                          ))}
                        </div>
                      </div>
                    )}

                    <div className="mt-4 space-y-3">
                      <div>
                        <label
                          htmlFor={`status-${req.id}`}
                          className="block text-sm font-medium text-gray-700"
                        >
                          Status
                        </label>
                        <select
                          id={`status-${req.id}`}
                          value={editStatus}
                          onChange={(e) => setEditStatus(e.target.value)}
                          className="mt-1 block w-full rounded-md border border-gray-300 px-3 py-2 text-sm shadow-sm focus:border-blue-500 focus:outline-none focus:ring-1 focus:ring-blue-500 sm:w-64"
                        >
                          {STATUS_OPTIONS.map((opt) => (
                            <option key={opt.value} value={opt.value}>
                              {opt.label}
                            </option>
                          ))}
                        </select>
                      </div>

                      <div>
                        <label
                          htmlFor={`response-${req.id}`}
                          className="block text-sm font-medium text-gray-700"
                        >
                          Reactie
                        </label>
                        <textarea
                          id={`response-${req.id}`}
                          value={editResponse}
                          onChange={(e) => setEditResponse(e.target.value)}
                          rows={4}
                          placeholder="Schrijf een reactie voor de klant..."
                          className="mt-1 block w-full rounded-md border border-gray-300 px-3 py-2 text-sm shadow-sm focus:border-blue-500 focus:outline-none focus:ring-1 focus:ring-blue-500"
                        />
                      </div>

                      <div className="flex flex-wrap items-center gap-2">
                        <button
                          type="button"
                          onClick={() => handleSave(req.id)}
                          disabled={saving || notifying}
                          className="rounded-md bg-blue-600 px-4 py-2 text-sm font-medium text-white shadow-sm hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-2 disabled:opacity-50"
                        >
                          {saving ? 'Opslaan...' : 'Opslaan'}
                        </button>
                        <button
                          type="button"
                          onClick={() => handleNotify(req.id)}
                          disabled={saving || notifying || !editResponse.trim()}
                          className="inline-flex items-center gap-1.5 rounded-md bg-emerald-600 px-4 py-2 text-sm font-medium text-white shadow-sm hover:bg-emerald-700 focus:outline-none focus:ring-2 focus:ring-emerald-500 focus:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-50"
                        >
                          <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" strokeWidth={2} stroke="currentColor">
                            <path strokeLinecap="round" strokeLinejoin="round" d="M21.75 6.75v10.5a2.25 2.25 0 0 1-2.25 2.25h-15a2.25 2.25 0 0 1-2.25-2.25V6.75m19.5 0A2.25 2.25 0 0 0 19.5 4.5h-15a2.25 2.25 0 0 0-2.25 2.25m19.5 0v.243a2.25 2.25 0 0 1-1.07 1.916l-7.5 4.615a2.25 2.25 0 0 1-2.36 0L3.32 8.91a2.25 2.25 0 0 1-1.07-1.916V6.75" />
                          </svg>
                          {notifying ? 'Versturen...' : 'Opslaan & klant mailen'}
                        </button>
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
  )
}
