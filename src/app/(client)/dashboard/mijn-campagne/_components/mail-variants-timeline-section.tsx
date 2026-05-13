'use client'

import { useMemo, useState } from 'react'
import type {
  MailVariant,
  MailVariantFeedbackActionType,
  MailVariantFeedbackItem,
  MailVariantFeedbackSubmission,
  MailVariantsTimelineEntry,
} from '@/lib/data/campaign'
import {
  buildAllMailVariantsTimeline,
  deriveVariantHeaderLabel,
} from '@/lib/data/campaign'

interface Props {
  variants: MailVariant[]
  allFeedbackByVariant: Record<string, MailVariantFeedbackSubmission[]>
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

function formatDate(iso: string): string {
  return new Date(iso).toLocaleDateString('nl-NL', {
    day: 'numeric',
    month: 'long',
    year: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
  })
}

export function MailVariantsTimelineSection({ variants, allFeedbackByVariant }: Props) {
  const entries = useMemo(
    () => buildAllMailVariantsTimeline(variants, allFeedbackByVariant),
    [variants, allFeedbackByVariant]
  )

  if (variants.length === 0 || entries.length === 0) return null

  const visible = entries.filter((e) => e.variant.isPublished)
  if (visible.length === 0) return null

  return (
    <section className="overflow-hidden rounded-2xl border border-gray-200 bg-white shadow-sm">
      <header className="border-b border-gray-100 px-6 py-4">
        <div className="flex items-center gap-2">
          <svg className="h-4 w-4 text-indigo-600" fill="none" viewBox="0 0 24 24" strokeWidth={2} stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" d="M12 6v6h4.5m4.5 0a9 9 0 1 1-18 0 9 9 0 0 1 18 0Z" />
          </svg>
          <div className="text-[10px] font-semibold uppercase tracking-[0.08em] text-indigo-600">
            Tijdlijn
          </div>
        </div>
        <h2 className="mt-1 text-base font-semibold text-gray-900">Geschiedenis mailvarianten</h2>
        <p className="mt-0.5 text-xs text-gray-500">
          Klik op een blok om de mailinhoud van dat moment te bekijken.
        </p>
      </header>

      <div className="bg-gray-50/50 px-6 py-5">
        <ol className="relative space-y-3 border-l-2 border-gray-200 pl-6">
          {visible.map((entry, idx) => (
            <TimelineRow
              key={`${entry.variant.id}-${entry.event.kind}-${entry.event.at}-${idx}`}
              entry={entry}
              allVariants={variants}
            />
          ))}
        </ol>
      </div>
    </section>
  )
}

interface EventContext {
  subject: string
  body: string
  exampleBody: string
  /** Items to highlight in the body (only set for feedback events). */
  highlightItems: MailVariantFeedbackItem[]
  /** Optional disclaimer about the freshness of the body shown. */
  disclaimer: string | null
}

function getEventContext(entry: MailVariantsTimelineEntry): EventContext {
  const v = entry.variant
  if (entry.event.kind === 'feedback') {
    const s = entry.event.submission
    const usingSnapshot = s.variantBodySnapshot !== null
    return {
      subject: s.variantSubjectSnapshot ?? v.subject,
      body: s.variantBodySnapshot ?? v.body,
      exampleBody: s.variantExampleBodySnapshot ?? v.exampleBody,
      highlightItems: s.items,
      disclaimer: usingSnapshot
        ? null
        : 'Voor deze oudere feedback is geen exacte snapshot bewaard — onderstaande inhoud is de huidige versie van de variant.',
    }
  }
  if (entry.event.kind === 'approved') {
    const editedSince =
      v.clientApprovedVersion &&
      new Date(v.updatedAt).getTime() > new Date(v.clientApprovedVersion).getTime()
    return {
      subject: v.subject,
      body: v.body,
      exampleBody: v.exampleBody,
      highlightItems: [],
      disclaimer: editedSince
        ? 'NextWave heeft de variant sinds de goedkeuring bewerkt — onderstaande inhoud is de huidige versie.'
        : null,
    }
  }
  // created
  const editedSince = new Date(v.updatedAt).getTime() > new Date(v.createdAt).getTime()
  return {
    subject: v.subject,
    body: v.body,
    exampleBody: v.exampleBody,
    highlightItems: [],
    disclaimer: editedSince
      ? 'De variant is sinds de aanmaak bewerkt — onderstaande inhoud is de huidige versie.'
      : null,
  }
}

function TimelineRow({
  entry,
  allVariants,
}: {
  entry: MailVariantsTimelineEntry
  allVariants: MailVariant[]
}) {
  const [expanded, setExpanded] = useState(false)
  const label = deriveVariantHeaderLabel(entry.variant, allVariants)
  const ctx = getEventContext(entry)

  const segments = useMemo(() => {
    if (ctx.highlightItems.length === 0) {
      return [{ key: 'all', text: ctx.body, highlight: false }] as Array<{
        key: string
        text: string
        highlight: boolean
      }>
    }
    const sorted = ctx.highlightItems
      .slice()
      .sort((a, b) => a.selectionStart - b.selectionStart)
    const segs: Array<{ key: string; text: string; highlight: boolean }> = []
    let cursor = 0
    let idx = 0
    for (const it of sorted) {
      if (it.selectionStart < cursor) continue
      if (it.selectionStart > cursor) {
        segs.push({
          key: `t-${idx++}`,
          text: ctx.body.slice(cursor, it.selectionStart),
          highlight: false,
        })
      }
      segs.push({
        key: `h-${it.id}-${idx++}`,
        text: ctx.body.slice(it.selectionStart, it.selectionEnd),
        highlight: true,
      })
      cursor = it.selectionEnd
    }
    if (cursor < ctx.body.length) {
      segs.push({
        key: `t-${idx++}`,
        text: ctx.body.slice(cursor),
        highlight: false,
      })
    }
    return segs
  }, [ctx.body, ctx.highlightItems])

  const variant = entry.variant
  const event = entry.event

  const visual = (() => {
    if (event.kind === 'feedback') {
      const submission = event.submission
      const items = submission.items.length
      const hasGeneral =
        !!submission.generalFeedback && submission.generalFeedback.trim().length > 0
      return {
        dotColor: 'amber' as const,
        kindBg: 'bg-amber-50/40 ring-amber-200/70',
        titleColor: 'text-amber-900',
        secondaryColor: 'text-amber-700/80',
        icon: (
          <svg className="h-4 w-4 flex-shrink-0" fill="none" viewBox="0 0 24 24" strokeWidth={2} stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" d="M12 20.25c4.97 0 9-3.694 9-8.25s-4.03-8.25-9-8.25S3 7.444 3 12c0 2.104.859 4.023 2.273 5.48.432.447.74 1.04.586 1.641a4.483 4.483 0 0 1-.923 1.785A5.969 5.969 0 0 0 6 21c1.282 0 2.47-.402 3.445-1.087.81.22 1.668.337 2.555.337Z" />
          </svg>
        ),
        title: (
          <>
            {label}{' '}
            <span className="font-normal text-amber-800/80">
              — feedback ingediend ({items} {items === 1 ? 'blok' : 'blokken'}
              {hasGeneral && ' + algemeen'})
            </span>
          </>
        ),
      }
    }
    if (event.kind === 'approved') {
      return {
        dotColor: 'emerald' as const,
        kindBg: 'bg-emerald-50/60 ring-emerald-200/70',
        titleColor: 'text-emerald-900',
        secondaryColor: 'text-emerald-700/80',
        icon: (
          <svg className="h-4 w-4 flex-shrink-0" fill="none" viewBox="0 0 24 24" strokeWidth={3} stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" d="m4.5 12.75 6 6 9-13.5" />
          </svg>
        ),
        title: (
          <>
            {label}{' '}
            <span className="font-normal text-emerald-700/80">— goedgekeurd</span>
          </>
        ),
      }
    }
    return {
      dotColor: 'gray' as const,
      kindBg: 'bg-white ring-gray-200/70',
      titleColor: 'text-gray-900',
      secondaryColor: 'text-gray-500',
      icon: (
        <svg className="h-4 w-4 flex-shrink-0 text-gray-500" fill="none" viewBox="0 0 24 24" strokeWidth={2} stroke="currentColor">
          <path strokeLinecap="round" strokeLinejoin="round" d="M12 4.5v15m7.5-7.5h-15" />
        </svg>
      ),
      title: (
        <>
          {label} <span className="font-normal text-gray-500">— aangemaakt</span>
        </>
      ),
    }
  })()

  return (
    <li className="relative">
      <Dot color={visual.dotColor} />
      <div className={`overflow-hidden rounded-xl ring-1 ${visual.kindBg}`}>
        <button
          type="button"
          onClick={() => setExpanded((v) => !v)}
          className="flex w-full items-center justify-between gap-2 px-4 py-3 text-left transition-colors hover:bg-black/[0.02]"
        >
          <div
            className={`flex min-w-0 items-center gap-1.5 text-sm font-semibold ${visual.titleColor}`}
          >
            {visual.icon}
            <span className="min-w-0 truncate">{visual.title}</span>
          </div>
          <div className="flex items-center gap-2">
            <span
              className={`hidden flex-shrink-0 text-[11px] sm:inline ${visual.secondaryColor}`}
            >
              {formatDate(event.at)}
            </span>
            <svg
              className={`h-4 w-4 flex-shrink-0 transition-transform ${
                expanded ? 'rotate-180' : ''
              } ${visual.secondaryColor}`}
              fill="none"
              viewBox="0 0 24 24"
              strokeWidth={2}
              stroke="currentColor"
            >
              <path strokeLinecap="round" strokeLinejoin="round" d="M19.5 8.25l-7.5 7.5-7.5-7.5" />
            </svg>
          </div>
        </button>

        {expanded && (
          <div className="border-t border-black/5 bg-white px-4 py-3">
            <div className="text-[11px] text-gray-500 sm:hidden">{formatDate(event.at)}</div>

            {ctx.disclaimer && (
              <div className="mb-3 rounded-md bg-gray-50 px-3 py-2 text-[11px] italic text-gray-600 ring-1 ring-gray-200">
                {ctx.disclaimer}
              </div>
            )}

            <div className="text-[10px] font-semibold uppercase tracking-[0.08em] text-gray-400">
              Onderwerp
            </div>
            <p className="mt-0.5 text-sm font-medium text-gray-900">{ctx.subject || '—'}</p>

            <div
              className={
                ctx.exampleBody
                  ? 'mt-3 grid gap-3 lg:grid-cols-2'
                  : 'mt-3'
              }
            >
              <div>
                <div className="text-[10px] font-semibold uppercase tracking-[0.08em] text-gray-400">
                  {ctx.exampleBody ? 'Mail body · met variabelen' : 'Mail body'}
                </div>
                <pre className="mt-1 whitespace-pre-wrap break-words rounded-md bg-gray-50 px-3 py-2.5 font-sans text-xs leading-relaxed text-gray-700 ring-1 ring-gray-200">
                  {segments.length === 0 || (segments.length === 1 && !segments[0].text)
                    ? '—'
                    : segments.map((seg) =>
                        seg.highlight ? (
                          <mark key={seg.key} className="rounded bg-yellow-200 px-0.5">
                            {seg.text}
                          </mark>
                        ) : (
                          <span key={seg.key}>{seg.text}</span>
                        )
                      )}
                </pre>
              </div>
              {ctx.exampleBody && (
                <div>
                  <div className="text-[10px] font-semibold uppercase tracking-[0.08em] text-emerald-700/80">
                    Voorbeeld · ingevuld
                  </div>
                  <pre className="mt-1 whitespace-pre-wrap break-words rounded-md bg-emerald-50/40 px-3 py-2.5 font-sans text-xs leading-relaxed text-emerald-900/90 ring-1 ring-emerald-100">
                    {ctx.exampleBody}
                  </pre>
                </div>
              )}
            </div>

            {event.kind === 'feedback' && (
              <FeedbackExtras submission={event.submission} />
            )}

            {event.kind === 'created' && variant.explanation && (
              <div className="mt-3 rounded-md bg-indigo-50/50 px-3 py-2 ring-1 ring-indigo-100">
                <div className="text-[10px] font-semibold uppercase tracking-[0.08em] text-indigo-600/90">
                  Toelichting (huidige versie)
                </div>
                <p className="mt-0.5 whitespace-pre-wrap text-xs leading-relaxed text-indigo-900/90">
                  {variant.explanation}
                </p>
              </div>
            )}
          </div>
        )}
      </div>
    </li>
  )
}

function FeedbackExtras({ submission }: { submission: MailVariantFeedbackSubmission }) {
  const hasGeneral =
    !!submission.generalFeedback && submission.generalFeedback.trim().length > 0
  return (
    <>
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
    </>
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
      className={`absolute -left-[1.4rem] top-3.5 h-2.5 w-2.5 rounded-full ring-4 ${cls}`}
      aria-hidden
    />
  )
}
