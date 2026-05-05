import type { OutboundReplyStatus, ThreadItem } from '../_lib/types'

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

const STATUS_BADGE: Record<
  OutboundReplyStatus,
  { label: string; className: string }
> = {
  queued: { label: 'Wordt verzonden', className: 'bg-blue-100 text-blue-800' },
  sending: { label: 'Wordt verzonden', className: 'bg-blue-100 text-blue-800' },
  sent: { label: 'Verzonden', className: 'bg-emerald-100 text-emerald-800' },
  failed: { label: 'Verzending mislukt', className: 'bg-rose-100 text-rose-800' },
}

export function RepliesThread({ items }: { items: ThreadItem[] }) {
  // Outlook-stijl: doorlopend vlak, nieuwste bovenaan, alles uitgeklapt.
  const ordered = [...items].reverse()

  if (ordered.length === 0) {
    return (
      <div className="rounded-xl border border-gray-200 bg-white px-6 py-8 text-sm text-gray-600">
        Geen replies in deze thread.
      </div>
    )
  }

  return (
    <div className="overflow-hidden rounded-xl border border-gray-200 bg-white">
      {ordered.map((item, index) => {
        const isOutbound = item.kind === 'outbound'
        const statusBadge =
          item.kind === 'outbound' ? STATUS_BADGE[item.status] : null
        return (
          <article
            key={item.id}
            className={[
              index !== 0 ? 'border-t border-gray-200' : '',
              isOutbound ? 'bg-blue-50/30' : '',
            ].join(' ')}
          >
            <header className="flex flex-wrap items-start justify-between gap-x-4 gap-y-1 px-5 pb-2 pt-4">
              <div className="min-w-0">
                <div className="flex flex-wrap items-center gap-2">
                  <p className="text-sm font-semibold text-gray-900">
                    {isOutbound ? 'Jij' : item.from_email}
                  </p>
                  {isOutbound && (
                    <span className="rounded-full bg-blue-100 px-2 py-0.5 text-[10px] font-medium uppercase tracking-wider text-blue-700">
                      Verzonden door jou
                    </span>
                  )}
                  {item.kind === 'outbound' && statusBadge && (
                    <span
                      className={`inline-flex items-center gap-1 rounded-full px-2 py-0.5 text-[10px] font-medium ${statusBadge.className}`}
                    >
                      {(item.status === 'queued' || item.status === 'sending') && (
                        <span className="h-1.5 w-1.5 animate-pulse rounded-full bg-blue-500" />
                      )}
                      {statusBadge.label}
                    </span>
                  )}
                </div>
                <p className="mt-0.5 text-xs text-gray-600">
                  {isOutbound ? `naar ${item.to_email}` : `via ${item.sending_account}`}
                </p>
              </div>
              <p className="shrink-0 text-xs text-gray-600">
                {formatDateTime(item.occurred_at)}
              </p>
            </header>
            <div className="px-5 pb-5">
              {item.subject && (
                <p className="mb-2 break-words text-sm font-medium text-gray-900">
                  {item.subject}
                </p>
              )}
              <pre className="whitespace-pre-wrap break-words font-sans text-sm leading-6 text-gray-800">
                {item.body}
              </pre>
              {item.kind === 'outbound' &&
                item.status === 'failed' &&
                item.error_message && (
                  <p className="mt-3 rounded-md bg-rose-50 px-3 py-2 text-xs text-rose-800">
                    Fout: {item.error_message}
                  </p>
                )}
            </div>
          </article>
        )
      })}
    </div>
  )
}
