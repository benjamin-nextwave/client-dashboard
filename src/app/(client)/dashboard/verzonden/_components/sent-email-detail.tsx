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
        className="inline-flex items-center text-[12.5px] text-muted hover:text-fg"
      >
        &larr; Terug naar verzonden
      </Link>

      <div className="mt-4 rounded-panel border border-line bg-panel p-6">
        <h1 className="text-xl font-semibold text-fg">
          {email.subject || 'Geen onderwerp'}
        </h1>

        <div className="mt-3 space-y-1 text-[12.5px] text-muted">
          <p>
            <span className="font-medium text-fg">Van:</span>{' '}
            {email.fromAddress}
          </p>
          <p>
            <span className="font-medium text-fg">Aan:</span>{' '}
            {email.toAddress}
          </p>
          <p>
            <span className="font-medium text-fg">Datum:</span>{' '}
            {email.sentAt
              ? format(new Date(email.sentAt), 'd MMMM yyyy HH:mm', {
                  locale: nl,
                })
              : 'Onbekend'}
          </p>
        </div>

        <div className="mt-4 border-t border-line pt-4">
          {email.bodyHtml ? (
            <div
              className="prose max-w-none"
              dangerouslySetInnerHTML={{ __html: email.bodyHtml }}
            />
          ) : (
            <pre className="whitespace-pre-wrap text-[12.5px] text-fg">
              {email.bodyText || 'Geen inhoud.'}
            </pre>
          )}
        </div>
      </div>
    </div>
  )
}
