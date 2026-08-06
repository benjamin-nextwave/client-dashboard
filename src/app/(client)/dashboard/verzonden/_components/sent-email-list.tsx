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
    <div className="mt-6 overflow-hidden rounded-panel border border-line bg-panel">
      <ul className="divide-y divide-line">
        {emails.map((email) => (
          <li
            key={email.id}
            className="cursor-pointer px-4 py-3 transition hover:bg-track"
            onClick={() => router.push(`/dashboard/verzonden/${email.id}`)}
          >
            <div className="flex items-center justify-between">
              <span className="text-[12.5px] font-medium text-fg truncate">
                {email.toAddress}
              </span>
              <span className="ml-2 flex-shrink-0 text-[11.5px] text-muted">
                {email.sentAt
                  ? format(new Date(email.sentAt), 'd MMM yyyy HH:mm', {
                      locale: nl,
                    })
                  : ''}
              </span>
            </div>
            <p className="mt-0.5 text-[12.5px] text-fg truncate">
              {email.subject || 'Geen onderwerp'}
            </p>
            {email.previewText && (
              <p className="mt-0.5 text-[12.5px] text-muted truncate">
                {email.previewText}
              </p>
            )}
          </li>
        ))}
      </ul>
    </div>
  )
}
