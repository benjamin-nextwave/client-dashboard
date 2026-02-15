'use client'

import { useState } from 'react'
import { removeDncEntry } from '@/lib/actions/dnc-actions'
import type { DncEntry } from '@/lib/actions/dnc-actions'

export function DncList({ entries }: { entries: DncEntry[] }) {
  const [feedback, setFeedback] = useState<{
    type: 'success' | 'error'
    message: string
  } | null>(null)
  const [removing, setRemoving] = useState<string | null>(null)

  async function handleRemove(id: string) {
    setRemoving(id)
    setFeedback(null)

    const result = await removeDncEntry(id)

    if ('error' in result) {
      setFeedback({ type: 'error', message: result.error })
    } else {
      setFeedback({ type: 'success', message: 'Vermelding verwijderd.' })
    }

    setRemoving(null)

    // Auto-dismiss feedback
    setTimeout(() => setFeedback(null), 3000)
  }

  if (entries.length === 0) {
    return (
      <div className="rounded-lg border border-gray-200 bg-white p-8 text-center">
        <p className="text-gray-500">Geen DNC-vermeldingen gevonden.</p>
      </div>
    )
  }

  return (
    <div>
      {feedback && (
        <div
          className={`mb-4 rounded-md p-3 text-sm ${
            feedback.type === 'success'
              ? 'bg-green-50 text-green-700'
              : 'bg-red-50 text-red-700'
          }`}
        >
          {feedback.message}
        </div>
      )}

      <div className="overflow-hidden rounded-lg border border-gray-200 bg-white">
        <table className="min-w-full divide-y divide-gray-200">
          <thead className="bg-gray-50">
            <tr>
              <th className="px-6 py-3 text-left text-xs font-medium uppercase tracking-wider text-gray-500">
                Type
              </th>
              <th className="px-6 py-3 text-left text-xs font-medium uppercase tracking-wider text-gray-500">
                Waarde
              </th>
              <th className="px-6 py-3 text-left text-xs font-medium uppercase tracking-wider text-gray-500">
                Toegevoegd op
              </th>
              <th className="px-6 py-3 text-right text-xs font-medium uppercase tracking-wider text-gray-500">
                Actie
              </th>
            </tr>
          </thead>
          <tbody className="divide-y divide-gray-200">
            {entries.map((entry) => (
              <tr key={entry.id}>
                <td className="whitespace-nowrap px-6 py-4 text-sm text-gray-900">
                  {entry.entry_type === 'email' ? 'E-mail' : 'Domein'}
                </td>
                <td className="whitespace-nowrap px-6 py-4 text-sm text-gray-900">
                  {entry.value}
                </td>
                <td className="whitespace-nowrap px-6 py-4 text-sm text-gray-500">
                  {new Date(entry.created_at).toLocaleDateString('nl-NL')}
                </td>
                <td className="whitespace-nowrap px-6 py-4 text-right text-sm">
                  <button
                    onClick={() => handleRemove(entry.id)}
                    disabled={removing === entry.id}
                    className="text-red-600 hover:text-red-800 disabled:opacity-50"
                  >
                    {removing === entry.id ? 'Bezig...' : 'Verwijderen'}
                  </button>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  )
}
