'use client'

import { useState } from 'react'
import { format } from 'date-fns'
import { nl } from 'date-fns/locale'
import { excludeContact } from '@/lib/actions/preview-actions'
import type { PreviewContact } from '@/lib/data/preview-data'

export function PreviewTable({ contacts }: { contacts: PreviewContact[] }) {
  const [removing, setRemoving] = useState<string | null>(null)
  const [feedback, setFeedback] = useState<{
    type: 'success' | 'error'
    message: string
  } | null>(null)

  async function handleExclude(contactId: string) {
    setRemoving(contactId)
    setFeedback(null)

    const result = await excludeContact(contactId)

    if ('error' in result) {
      setFeedback({ type: 'error', message: result.error })
    } else {
      setFeedback({
        type: 'success',
        message: 'Contact verwijderd uit voorvertoning.',
      })
    }

    setRemoving(null)

    // Auto-dismiss feedback
    setTimeout(() => setFeedback(null), 3000)
  }

  return (
    <div className="mt-6">
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
                Volledige naam
              </th>
              <th className="px-6 py-3 text-left text-xs font-medium uppercase tracking-wider text-gray-500">
                Bedrijfsnaam
              </th>
              <th className="px-6 py-3 text-left text-xs font-medium uppercase tracking-wider text-gray-500">
                Contactdatum
              </th>
              <th className="px-6 py-3 text-left text-xs font-medium uppercase tracking-wider text-gray-500">
                Sector/Industrie
              </th>
              <th className="px-6 py-3 text-left text-xs font-medium uppercase tracking-wider text-gray-500">
                Functie
              </th>
              <th className="px-6 py-3 text-right text-xs font-medium uppercase tracking-wider text-gray-500">
                Actie
              </th>
            </tr>
          </thead>
          <tbody className="divide-y divide-gray-200">
            {contacts.map((contact) => (
              <tr key={contact.id}>
                <td className="whitespace-nowrap px-6 py-4 text-sm text-gray-900">
                  {contact.fullName}
                </td>
                <td className="whitespace-nowrap px-6 py-4 text-sm text-gray-900">
                  {contact.companyName ?? '-'}
                </td>
                <td className="whitespace-nowrap px-6 py-4 text-sm text-gray-500">
                  {format(new Date(contact.updatedAt), 'd MMM yyyy', {
                    locale: nl,
                  })}
                </td>
                <td className="whitespace-nowrap px-6 py-4 text-sm text-gray-900">
                  {contact.industry ?? '-'}
                </td>
                <td className="whitespace-nowrap px-6 py-4 text-sm text-gray-900">
                  {contact.jobTitle ?? '-'}
                </td>
                <td className="whitespace-nowrap px-6 py-4 text-right text-sm">
                  <button
                    onClick={() => handleExclude(contact.id)}
                    disabled={removing === contact.id}
                    className="text-red-600 hover:text-red-800 disabled:opacity-50"
                  >
                    {removing === contact.id ? 'Bezig...' : 'Verwijderen'}
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
