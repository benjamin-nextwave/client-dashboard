'use client'

import { useRouter } from 'next/navigation'
import { format } from 'date-fns'
import { nl } from 'date-fns/locale'
import type { SentEmail } from '@/lib/data/sent-data'

interface SentEmailListProps {
  emails: SentEmail[]
}

export function SentEmailList({ emails }: SentEmailListProps) {
  const router = useRouter()

  return (
    <div className="mt-6 overflow-hidden rounded-lg border border-gray-200 bg-white">
      <ul className="divide-y divide-gray-200">
        {emails.map((email) => (
          <li
            key={email.id}
            className="cursor-pointer px-4 py-3 transition hover:bg-gray-50"
            onClick={() => router.push(`/dashboard/verzonden/${email.id}`)}
          >
            <div className="flex items-center justify-between">
              <span className="text-sm font-medium text-gray-900 truncate">
                {email.toAddress}
              </span>
              <span className="ml-2 flex-shrink-0 text-xs text-gray-500">
                {email.sentAt
                  ? format(new Date(email.sentAt), 'd MMM yyyy HH:mm', {
                      locale: nl,
                    })
                  : ''}
              </span>
            </div>
            <p className="mt-0.5 text-sm text-gray-700 truncate">
              {email.subject || 'Geen onderwerp'}
            </p>
            {email.previewText && (
              <p className="mt-0.5 text-sm text-gray-500 truncate">
                {email.previewText}
              </p>
            )}
          </li>
        ))}
      </ul>
    </div>
  )
}
