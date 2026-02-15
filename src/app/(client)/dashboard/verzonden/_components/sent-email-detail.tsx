import Link from 'next/link'
import { format } from 'date-fns'
import { nl } from 'date-fns/locale'
import type { SentEmailDetail as SentEmailDetailType } from '@/lib/data/sent-data'

interface SentEmailDetailProps {
  email: SentEmailDetailType
}

export function SentEmailDetail({ email }: SentEmailDetailProps) {
  return (
    <div>
      <Link
        href="/dashboard/verzonden"
        className="inline-flex items-center text-sm text-gray-600 hover:text-gray-900"
      >
        &larr; Terug naar verzonden
      </Link>

      <div className="mt-4 rounded-lg border border-gray-200 bg-white p-6 shadow-sm">
        <h1 className="text-xl font-semibold text-gray-900">
          {email.subject || 'Geen onderwerp'}
        </h1>

        <div className="mt-3 space-y-1 text-sm text-gray-600">
          <p>
            <span className="font-medium text-gray-700">Van:</span>{' '}
            {email.fromAddress}
          </p>
          <p>
            <span className="font-medium text-gray-700">Aan:</span>{' '}
            {email.toAddress}
          </p>
          <p>
            <span className="font-medium text-gray-700">Datum:</span>{' '}
            {email.sentAt
              ? format(new Date(email.sentAt), 'd MMMM yyyy HH:mm', {
                  locale: nl,
                })
              : 'Onbekend'}
          </p>
        </div>

        <div className="mt-4 border-t border-gray-200 pt-4">
          {email.bodyHtml ? (
            <div
              className="prose max-w-none"
              dangerouslySetInnerHTML={{ __html: email.bodyHtml }}
            />
          ) : (
            <pre className="whitespace-pre-wrap text-sm text-gray-800">
              {email.bodyText || 'Geen inhoud.'}
            </pre>
          )}
        </div>
      </div>
    </div>
  )
}
