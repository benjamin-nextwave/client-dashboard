'use client'

import { format } from 'date-fns'
import { nl } from 'date-fns/locale'

interface ThreadMessageProps {
  fromAddress: string
  toAddress: string
  subject: string | null
  bodyHtml: string | null
  bodyText: string | null
  timestamp: string
  isFromClient: boolean
}

export function ThreadMessage({
  fromAddress,
  subject,
  bodyHtml,
  bodyText,
  timestamp,
  isFromClient,
}: ThreadMessageProps) {
  const formattedDate = (() => {
    try {
      return format(new Date(timestamp), 'dd MMM yyyy, HH:mm', { locale: nl })
    } catch {
      return timestamp
    }
  })()

  return (
    <div
      className={`flex ${isFromClient ? 'justify-end' : 'justify-start'} mb-4`}
    >
      <div
        className={`max-w-[80%] rounded-lg px-4 py-3 ${
          isFromClient
            ? 'bg-[var(--brand-color)] text-white'
            : 'bg-gray-100 text-gray-900'
        }`}
      >
        <div
          className={`mb-1 flex items-baseline justify-between gap-4 text-xs ${
            isFromClient ? 'text-white/70' : 'text-gray-500'
          }`}
        >
          <span className="font-medium">{fromAddress}</span>
          <span className="whitespace-nowrap">{formattedDate}</span>
        </div>

        {subject && (
          <p
            className={`mb-2 text-xs font-semibold ${
              isFromClient ? 'text-white/80' : 'text-gray-700'
            }`}
          >
            {subject}
          </p>
        )}

        {bodyHtml ? (
          <div
            className="prose prose-sm max-w-none"
            dangerouslySetInnerHTML={{ __html: bodyHtml }}
          />
        ) : bodyText ? (
          <pre className="whitespace-pre-wrap text-sm font-sans">
            {bodyText}
          </pre>
        ) : (
          <p className="text-sm italic opacity-60">Geen inhoud</p>
        )}
      </div>
    </div>
  )
}
