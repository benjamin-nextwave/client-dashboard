import type { LeadReply } from '../_lib/types'

function formatDateTime(iso: string): string {
  const d = new Date(iso)
  return d.toLocaleString('nl-NL', {
    day: '2-digit',
    month: '2-digit',
    year: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
  })
}

export function RepliesThread({ replies }: { replies: LeadReply[] }) {
  if (replies.length === 0) {
    return (
      <div className="rounded-xl border border-gray-200 bg-white px-6 py-8 text-sm text-gray-600">
        Geen replies in deze thread.
      </div>
    )
  }

  return (
    <ol className="space-y-4">
      {replies.map((reply, index) => (
        <li
          key={reply.instantly_email_id || index}
          className="rounded-xl border border-gray-200 bg-white"
        >
          <div className="flex items-start justify-between gap-4 border-b border-gray-100 px-5 py-3">
            <div className="min-w-0">
              <p className="truncate text-sm font-semibold text-gray-900">
                {reply.from_email}
              </p>
              <p className="mt-0.5 truncate text-xs text-gray-600">
                via {reply.sending_account}
              </p>
            </div>
            <div className="text-right text-xs text-gray-600">
              <p>{formatDateTime(reply.received_at)}</p>
              {typeof reply.ai_interest_value === 'number' && (
                <p className="mt-0.5">
                  AI interest: <span className="font-medium">{reply.ai_interest_value}</span>
                </p>
              )}
            </div>
          </div>
          <div className="px-5 py-4">
            {reply.subject && (
              <p className="text-sm font-medium text-gray-900">{reply.subject}</p>
            )}
            <pre className="mt-2 whitespace-pre-wrap font-sans text-sm leading-6 text-gray-800">
              {reply.body}
            </pre>
          </div>
        </li>
      ))}
    </ol>
  )
}
