'use client'

import { useEffect, useMemo, useState } from 'react'
import type {
  MailVariant,
  MailVariantFeedbackActionType,
  MailVariantFeedbackSubmission,
  MailVariantTimelineEvent,
} from '@/lib/data/campaign'
import { buildMailVariantTimeline } from '@/lib/data/campaign'

interface Props {
  variant: MailVariant
  submissions: MailVariantFeedbackSubmission[]
  /**
   * Header label — e.g. "Mail 1, variant 2". When omitted we fall back to
   * the variant's label so the component is usable standalone.
   */
  headerLabel?: string
  onClose: () => void
}

const ACTION_LABELS: Record<MailVariantFeedbackActionType, string> = {
  replace_with: 'Vervangen door',
  remove: 'Verwijderen',
  other: 'Overige feedback',
}

const ACTION_COLORS: Record<MailVariantFeedbackActionType, string> = {
  replace_with: 'bg-indigo-100 text-indigo-800 ring-indigo-200',
  remove: 'bg-red-100 text-red-800 ring-red-200',
  other: 'bg-amber-100 text-amber-800 ring-amber-200',
}

function formatLong(iso: string): string {
  return new Date(iso).toLocaleDateString('nl-NL', {
    day: 'numeric',
    month: 'long',
    year: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
  })
}

export function MailVariantTimeline({
  variant,
  submissions,
  headerLabel,
  onClose,
}: Props) {
  useEffect(() => {
    const handler = (e: KeyboardEvent) => {
      if (e.key === 'Escape') onClose()
    }
    window.addEventListener('keydown', handler)
    return () => window.removeEventListener('keydown', handler)
  }, [onClose])

  const events = useMemo(
    () => buildMailVariantTimeline(variant, submissions),
    [variant, submissions]
  )

  return (
    <div
      className="fixed inset-0 z-[60] flex items-center justify-center bg-black/60 p-4 backdrop-blur-sm"
      onClick={onClose}
    >
      <div
        className="flex max-h-[90vh] w-full max-w-3xl flex-col overflow-hidden rounded-2xl bg-white shadow-2xl"
        onClick={(e) => e.stopPropagation()}
      >
        <header className="flex flex-shrink-0 items-center justify-between border-b border-gray-100 px-5 py-3">
          <div className="flex items-center gap-2 min-w-0">
            <svg className="h-4 w-4 text-indigo-600" fill="none" viewBox="0 0 24 24" strokeWidth={2} stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" d="M12 6v6h4.5m4.5 0a9 9 0 1 1-18 0 9 9 0 0 1 18 0Z" />
            </svg>
            <div className="min-w-0">
              <div className="text-[10px] font-semibold uppercase tracking-[0.08em] text-indigo-600">
                Tijdlijn
              </div>
              <h3 className="truncate text-sm font-semibold text-gray-900">
                {headerLabel ?? variant.variantLabel}
              </h3>
            </div>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="rounded-lg p-1.5 text-gray-400 hover:bg-gray-100 hover:text-gray-700"
            aria-label="Sluiten"
          >
            <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" strokeWidth={2} stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" d="M6 18 18 6M6 6l12 12" />
            </svg>
          </button>
        </header>

        <div className="flex-1 overflow-y-auto bg-gray-50/60 px-5 py-5">
          {events.length === 0 ? (
            <div className="rounded-xl border border-dashed border-gray-200 bg-white px-4 py-8 text-center text-xs text-gray-500">
              Nog geen gebeurtenissen voor deze variant.
            </div>
          ) : (
            <ol className="relative space-y-4 border-l-2 border-gray-200 pl-6">
              {events.map((evt, idx) => (
                <TimelineItem key={idx} event={evt} variant={variant} />
              ))}
            </ol>
          )}
        </div>

        <footer className="flex-shrink-0 border-t border-gray-100 bg-white px-5 py-3 text-right">
          <button
            type="button"
            onClick={onClose}
            className="inline-flex items-center gap-1.5 rounded-xl bg-gray-100 px-5 py-2 text-xs font-bold text-gray-700 hover:bg-gray-200"
          >
            Sluiten
          </button>
        </footer>
      </div>
    </div>
  )
}

function TimelineItem({
  event,
  variant,
}: {
  event: MailVariantTimelineEvent
  variant: MailVariant
}) {
  if (event.kind === 'created') {
    return (
      <li className="relative">
        <Dot color="gray" />
        <div className="rounded-xl bg-white px-4 py-3 shadow-sm ring-1 ring-gray-200/70">
          <div className="text-sm font-semibold text-gray-900">Variant aangemaakt</div>
          <div className="mt-0.5 text-[11px] text-gray-500">{formatLong(event.at)}</div>
        </div>
      </li>
    )
  }
  if (event.kind === 'approved') {
    return (
      <li className="relative">
        <Dot color="emerald" />
        <div className="rounded-xl bg-emerald-50/60 px-4 py-3 ring-1 ring-emerald-200/70">
          <div className="flex items-center gap-1.5 text-sm font-semibold text-emerald-900">
            <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" strokeWidth={3} stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" d="m4.5 12.75 6 6 9-13.5" />
            </svg>
            Klant heeft variant goedgekeurd
          </div>
          <div className="mt-0.5 text-[11px] text-emerald-700/80">{formatLong(event.at)}</div>
        </div>
      </li>
    )
  }
  return <FeedbackTimelineItem submission={event.submission} variant={variant} />
}

function FeedbackTimelineItem({
  submission,
  variant,
}: {
  submission: MailVariantFeedbackSubmission
  variant: MailVariant
}) {
  const [expanded, setExpanded] = useState(false)
  const itemCount = submission.items.length
  const hasGeneral = !!submission.generalFeedback && submission.generalFeedback.trim().length > 0

  // Pick body for the snapshot view: prefer the captured snapshot, fall
  // back to the current variant body when the row predates the snapshot
  // migration (rare).
  const snapshotBody = submission.variantBodySnapshot ?? variant.body
  const snapshotSubject = submission.variantSubjectSnapshot ?? variant.subject
  const snapshotIsApproximate = submission.variantBodySnapshot === null

  // Build segments with the items highlighted (sorted, non-overlapping).
  const segments = useMemo(() => {
    const sorted = submission.items.slice().sort((a, b) => a.selectionStart - b.selectionStart)
    const segs: Array<{ key: string; text: string; highlight?: boolean }> = []
    let cursor = 0
    let idx = 0
    for (const it of sorted) {
      if (it.selectionStart < cursor) continue
      if (it.selectionStart > cursor) {
        segs.push({ key: `t-${idx++}`, text: snapshotBody.slice(cursor, it.selectionStart) })
      }
      segs.push({
        key: `h-${it.id}-${idx++}`,
        text: snapshotBody.slice(it.selectionStart, it.selectionEnd),
        highlight: true,
      })
      cursor = it.selectionEnd
    }
    if (cursor < snapshotBody.length) {
      segs.push({ key: `t-${idx++}`, text: snapshotBody.slice(cursor) })
    }
    return segs
  }, [snapshotBody, submission.items])

  return (
    <li className="relative">
      <Dot color="amber" />
      <div className="overflow-hidden rounded-xl bg-amber-50/40 ring-1 ring-amber-200/70">
        <button
          type="button"
          onClick={() => setExpanded((v) => !v)}
          className="flex w-full items-center justify-between gap-2 px-4 py-3 text-left transition-colors hover:bg-amber-50/70"
        >
          <div className="min-w-0">
            <div className="flex items-center gap-1.5 text-sm font-semibold text-amber-900">
              <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" strokeWidth={2} stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" d="M12 20.25c4.97 0 9-3.694 9-8.25s-4.03-8.25-9-8.25S3 7.444 3 12c0 2.104.859 4.023 2.273 5.48.432.447.74 1.04.586 1.641a4.483 4.483 0 0 1-.923 1.785A5.969 5.969 0 0 0 6 21c1.282 0 2.47-.402 3.445-1.087.81.22 1.668.337 2.555.337Z" />
              </svg>
              Klant heeft feedback ingediend
            </div>
            <div className="mt-0.5 text-[11px] text-amber-800/80">
              {formatLong(submission.submittedAt)} · {itemCount}{' '}
              {itemCount === 1 ? 'blok' : 'blokken'}
              {hasGeneral && ' + algemene feedback'}
            </div>
          </div>
          <svg
            className={`h-4 w-4 flex-shrink-0 text-amber-700 transition-transform ${expanded ? 'rotate-180' : ''}`}
            fill="none"
            viewBox="0 0 24 24"
            strokeWidth={2}
            stroke="currentColor"
          >
            <path strokeLinecap="round" strokeLinejoin="round" d="M19.5 8.25l-7.5 7.5-7.5-7.5" />
          </svg>
        </button>

        {expanded && (
          <div className="border-t border-amber-200/70 bg-white px-4 py-3">
            {snapshotIsApproximate && (
              <div className="mb-3 rounded-md bg-amber-50 px-2.5 py-1.5 text-[10px] italic text-amber-700 ring-1 ring-amber-200">
                Voor deze oudere feedback is geen exacte snapshot bewaard — de body hieronder is de
                huidige versie.
              </div>
            )}
            <div className="text-[10px] font-semibold uppercase tracking-[0.08em] text-gray-400">
              Onderwerp
            </div>
            <p className="mt-0.5 text-sm font-medium text-gray-900">{snapshotSubject || '—'}</p>

            <div className="mt-3 text-[10px] font-semibold uppercase tracking-[0.08em] text-gray-400">
              Mail body op moment van feedback
            </div>
            <pre className="mt-1 whitespace-pre-wrap break-words rounded-md bg-gray-50 px-3 py-2.5 font-sans text-xs leading-relaxed text-gray-700 ring-1 ring-gray-200">
              {segments.map((seg) =>
                seg.highlight ? (
                  <mark key={seg.key} className="rounded bg-yellow-200 px-0.5">
                    {seg.text}
                  </mark>
                ) : (
                  <span key={seg.key}>{seg.text}</span>
                )
              )}
            </pre>

            {hasGeneral && (
              <div className="mt-3 rounded-md bg-amber-50/60 px-3 py-2 ring-1 ring-amber-100">
                <div className="text-[10px] font-semibold uppercase tracking-[0.08em] text-amber-700">
                  Algemene feedback
                </div>
                <p className="mt-0.5 whitespace-pre-wrap text-xs leading-relaxed text-gray-800">
                  {submission.generalFeedback}
                </p>
              </div>
            )}

            {submission.items.length > 0 && (
              <div className="mt-3 space-y-1.5">
                <div className="text-[10px] font-semibold uppercase tracking-[0.08em] text-gray-400">
                  Feedback per stukje
                </div>
                {submission.items
                  .slice()
                  .sort((a, b) => a.position - b.position)
                  .map((it) => (
                    <div
                      key={it.id}
                      className="rounded-md bg-gray-50 px-3 py-2 ring-1 ring-gray-200"
                    >
                      <span
                        className={`inline-flex rounded-md px-1.5 py-0.5 text-[10px] font-semibold uppercase tracking-[0.06em] ring-1 ${ACTION_COLORS[it.actionType]}`}
                      >
                        {ACTION_LABELS[it.actionType]}
                      </span>
                      <div className="mt-1 rounded bg-yellow-50/80 px-2 py-0.5 text-[11px] italic text-yellow-900 ring-1 ring-yellow-100">
                        &ldquo;{it.selectionText}&rdquo;
                      </div>
                      {it.feedbackText && (
                        <p className="mt-1 whitespace-pre-wrap text-xs leading-relaxed text-gray-700">
                          {it.feedbackText}
                        </p>
                      )}
                    </div>
                  ))}
              </div>
            )}
          </div>
        )}
      </div>
    </li>
  )
}

function Dot({ color }: { color: 'gray' | 'emerald' | 'amber' }) {
  const cls =
    color === 'emerald'
      ? 'bg-emerald-500 ring-emerald-100'
      : color === 'amber'
        ? 'bg-amber-500 ring-amber-100'
        : 'bg-gray-400 ring-gray-100'
  return (
    <span
      className={`absolute -left-[1.4rem] top-3 h-2.5 w-2.5 rounded-full ring-4 ${cls}`}
      aria-hidden
    />
  )
}
