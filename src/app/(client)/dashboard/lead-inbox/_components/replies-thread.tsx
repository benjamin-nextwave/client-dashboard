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
  queued: { label: 'Wordt verzonden', className: 'bg-[var(--brand-12)] text-brand-ink' },
  sending: { label: 'Wordt verzonden', className: 'bg-[var(--brand-12)] text-brand-ink' },
  sent: { label: 'Verzonden', className: 'bg-[color-mix(in_oklab,var(--c-pos)_12%,transparent)] text-pos' },
  failed: { label: 'Verzending mislukt', className: 'bg-[color-mix(in_oklab,var(--c-neg)_12%,transparent)] text-neg' },
}

/**
 * Inline afbeeldingen in een handtekening komen als [cid:image001.png@...] door
 * de tekstversie heen. De afbeelding zelf zit niet in onze database — die is een
 * MIME-bijlage bij de oorspronkelijke mail. In plaats van die technische ruis
 * tonen we een klein plaatje-teken, zodat je ziet dat er een afbeelding stond.
 */
const CID_PATTERN = /\[?cid:[^\]\s>"']+\]?/gi

function renderBody(body: string) {
  const parts: React.ReactNode[] = []
  let last = 0
  let i = 0
  for (const match of body.matchAll(CID_PATTERN)) {
    const start = match.index ?? 0
    if (start > last) parts.push(body.slice(last, start))
    parts.push(
      <span
        key={`img-${i++}`}
        title="Afbeelding uit de handtekening (niet meegeleverd)"
        className="mx-0.5 inline-flex items-center gap-1 rounded bg-track px-1.5 py-0.5 align-middle text-[10.5px] font-medium text-faint"
      >
        <svg className="h-3 w-3" fill="none" viewBox="0 0 24 24" strokeWidth={1.8} stroke="currentColor" aria-hidden>
          <path strokeLinecap="round" strokeLinejoin="round" d="m2.25 15.75 5.159-5.159a2.25 2.25 0 0 1 3.182 0l5.159 5.159m-1.5-1.5 1.409-1.409a2.25 2.25 0 0 1 3.182 0l2.909 2.909M18 8.25h.008v.008H18V8.25Zm2.25 10.5H3.75A1.5 1.5 0 0 1 2.25 17.25V6.75a1.5 1.5 0 0 1 1.5-1.5h16.5a1.5 1.5 0 0 1 1.5 1.5v10.5a1.5 1.5 0 0 1-1.5 1.5Z" />
        </svg>
        afbeelding
      </span>
    )
    last = start + match[0].length
  }
  if (last < body.length) parts.push(body.slice(last))
  return parts.length ? parts : body
}

export function RepliesThread({ items }: { items: ThreadItem[] }) {
  // Outlook-stijl: doorlopend vlak, nieuwste bovenaan, alles uitgeklapt.
  const ordered = [...items].reverse()

  if (ordered.length === 0) {
    return (
      <div className="rounded-panel border border-line bg-panel px-6 py-8 text-[12.5px] text-muted">
        Geen replies in deze thread.
      </div>
    )
  }

  return (
    <div className="overflow-hidden rounded-panel border border-line bg-panel">
      {ordered.map((item, index) => {
        const isOutbound = item.kind === 'outbound'
        const statusBadge =
          item.kind === 'outbound' ? STATUS_BADGE[item.status] : null
        return (
          <article
            key={item.id}
            className={[
              index !== 0 ? 'border-t border-line' : '',
              isOutbound ? 'bg-[var(--brand-04)]' : '',
            ].join(' ')}
          >
            <header className="flex flex-wrap items-start justify-between gap-x-4 gap-y-1 px-5 pb-2 pt-4">
              <div className="min-w-0">
                <div className="flex flex-wrap items-center gap-2">
                  <p className="text-[12.5px] font-semibold text-fg">
                    {isOutbound ? 'Jij' : item.from_email}
                  </p>
                  {isOutbound && (
                    <span className="rounded-[4px] bg-[var(--brand-12)] px-1.5 py-0.5 text-[9.5px] font-semibold uppercase tracking-[0.08em] text-brand-ink">
                      Verzonden door jou
                    </span>
                  )}
                  {item.kind === 'outbound' && statusBadge && (
                    <span
                      className={`inline-flex items-center gap-1 rounded-full px-2 py-0.5 text-[10px] font-medium ${statusBadge.className}`}
                    >
                      {(item.status === 'queued' || item.status === 'sending') && (
                        <span className="h-1.5 w-1.5 animate-pulse rounded-full bg-brand" />
                      )}
                      {statusBadge.label}
                    </span>
                  )}
                </div>
                <p className="mt-0.5 text-[11.5px] text-muted">
                  {isOutbound ? `naar ${item.to_email}` : `via ${item.sending_account}`}
                </p>
              </div>
              <p className="shrink-0 text-[11.5px] text-muted">
                {formatDateTime(item.occurred_at)}
              </p>
            </header>
            <div className="px-5 pb-5">
              {item.subject && (
                <p className="mb-2 break-words text-[12.5px] font-medium text-fg">
                  {item.subject}
                </p>
              )}
              <pre className="whitespace-pre-wrap break-words font-sans text-[12.5px] leading-6 text-fg">
                {renderBody(item.body)}
              </pre>
              {item.kind === 'outbound' &&
                item.status === 'failed' &&
                item.error_message && (
                  <p className="mt-3 rounded-control bg-[color-mix(in_oklab,var(--c-neg)_10%,transparent)] px-3 py-2 text-[11.5px] text-neg">
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
