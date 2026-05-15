'use client'

import { useEffect, useMemo, useState, useTransition } from 'react'
import { useRouter } from 'next/navigation'
import type {
  MailVariant,
  MailVariantFeedbackActionType,
  MailVariantFeedbackSubmission,
} from '@/lib/data/campaign'
import { deriveVariantStatus } from '@/lib/data/campaign'
import { commitMailVariantDecisions, type CommitMailVariantDecision } from '../actions'
import {
  MailVariantFeedbackEditor,
  type FeedbackDraft,
} from './mail-variant-feedback-editor'

interface Props {
  variants: MailVariant[]
  feedbackByVariant: Record<string, MailVariantFeedbackSubmission>
  onClose: () => void
}

type LocalDecision =
  | { type: 'approve' }
  | { type: 'feedback'; draft: FeedbackDraft }

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

export function MailVariantsModal({ variants, feedbackByVariant, onClose }: Props) {
  const router = useRouter()

  const orderedVariants = useMemo(
    () =>
      [...variants].sort((a, b) => {
        if (a.mailNumber !== b.mailNumber) return a.mailNumber - b.mailNumber
        return a.position - b.position
      }),
    [variants]
  )

  const [index, setIndex] = useState(0)
  const [decisions, setDecisions] = useState<Record<string, LocalDecision>>({})
  const [editorOpen, setEditorOpen] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [pending, startTransition] = useTransition()

  // Lock background scroll while the full-screen modal is mounted, so the
  // dashboard underneath doesn't pan horizontally/vertically behind it.
  useEffect(() => {
    const originalOverflow = document.body.style.overflow
    const originalHtmlOverflow = document.documentElement.style.overflow
    document.body.style.overflow = 'hidden'
    document.documentElement.style.overflow = 'hidden'
    return () => {
      document.body.style.overflow = originalOverflow
      document.documentElement.style.overflow = originalHtmlOverflow
    }
  }, [])

  if (orderedVariants.length === 0) return null

  const safeIndex = Math.min(index, orderedVariants.length - 1)
  const current = orderedVariants[safeIndex]
  const isLast = safeIndex === orderedVariants.length - 1

  const status = deriveVariantStatus(current)
  const decision = decisions[current.id]
  const submission = feedbackByVariant[current.id]

  // Header: "Mail X" — or "Mail X, variant Y" when there are multiple
  // variants for that same mail number.
  const variantsInMail = orderedVariants.filter((v) => v.mailNumber === current.mailNumber)
  const variantIdxInMail = variantsInMail.findIndex((v) => v.id === current.id) + 1
  const headerText =
    variantsInMail.length === 1
      ? `Mail ${current.mailNumber}`
      : `Mail ${current.mailNumber}, variant ${variantIdxInMail}`

  // Resolve states
  const currentResolved = status !== 'open' || !!decision
  const openVariants = orderedVariants.filter((v) => deriveVariantStatus(v) === 'open')
  const openWithDecisions = openVariants.filter((v) => decisions[v.id])
  const allOpenHaveDecisions = openWithDecisions.length === openVariants.length

  // Button on the bottom-right:
  //   not last → "Volgende" (green when current is resolved)
  //   last + no open variants at all → "Sluiten"
  //   last + open variants exist → "Feedback indienen" (green when all have a decision)
  const lastButtonIsClose = isLast && openVariants.length === 0
  const lastButtonIsSubmit = isLast && openVariants.length > 0
  const canProceed = isLast
    ? lastButtonIsClose || allOpenHaveDecisions
    : currentResolved
  const buttonLabel = lastButtonIsClose
    ? 'Sluiten'
    : lastButtonIsSubmit
      ? 'Feedback indienen'
      : 'Volgende'

  const handleApprove = () => {
    setDecisions((prev) => ({ ...prev, [current.id]: { type: 'approve' } }))
  }

  const handleStartFeedback = () => {
    setEditorOpen(true)
  }

  const handleFeedbackComplete = (draft: FeedbackDraft) => {
    setDecisions((prev) => ({ ...prev, [current.id]: { type: 'feedback', draft } }))
    setEditorOpen(false)
  }

  const handleCommit = () => {
    setError(null)
    const payload: CommitMailVariantDecision[] = openVariants
      .filter((v) => decisions[v.id])
      .map((v) => {
        const d = decisions[v.id]
        if (d.type === 'approve') return { variantId: v.id, type: 'approve' as const }
        return {
          variantId: v.id,
          type: 'feedback' as const,
          items: d.draft.items.map((it) => ({
            selectionText: it.text,
            selectionStart: it.start,
            selectionEnd: it.end,
            actionType: it.actionType,
            feedbackText:
              it.actionType === 'remove' && !it.feedbackText.trim() ? null : it.feedbackText,
          })),
          generalFeedback: d.draft.generalFeedback.trim() || null,
        }
      })

    startTransition(async () => {
      const result = await commitMailVariantDecisions({ decisions: payload })
      if (result.error) {
        setError(result.error)
        return
      }
      setDecisions({})
      router.refresh()
      onClose()
    })
  }

  const handleNext = () => {
    if (!canProceed) return
    if (lastButtonIsClose) {
      onClose()
      return
    }
    if (lastButtonIsSubmit) {
      handleCommit()
      return
    }
    setIndex(safeIndex + 1)
  }

  const handleClose = () => {
    if (Object.keys(decisions).length === 0) {
      onClose()
      return
    }
    if (
      window.confirm(
        'Je hebt nog niet-ingediende keuzes. Modal sluiten betekent dat alles weg is. Toch sluiten?'
      )
    ) {
      onClose()
    }
  }

  return (
    <div className="fixed inset-0 z-50 flex h-screen w-screen flex-col overflow-hidden bg-white">
      {editorOpen ? (
        <MailVariantFeedbackEditor
          variant={current}
          initialDraft={decision?.type === 'feedback' ? decision.draft : null}
          onCancel={() => setEditorOpen(false)}
          onComplete={handleFeedbackComplete}
        />
      ) : (
        <>
          {/* Minimal header */}
          <header className="flex flex-shrink-0 items-center justify-between border-b border-gray-100 bg-white px-6 py-4">
            <h2 className="text-lg font-semibold tracking-tight text-gray-900">{headerText}</h2>
            <button
              type="button"
              onClick={handleClose}
              className="rounded-lg p-2 text-gray-400 hover:bg-gray-100 hover:text-gray-700"
              aria-label="Sluiten"
            >
              <svg className="h-5 w-5" fill="none" viewBox="0 0 24 24" strokeWidth={2} stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" d="M6 18 18 6M6 6l12 12" />
              </svg>
            </button>
          </header>

          {/* Action bar — directly under the header, modest size */}
          <div className="flex flex-shrink-0 flex-wrap items-center justify-center gap-2 border-b border-gray-100 bg-white px-6 py-3">
            {status === 'open' && !decision && (
              <>
                <button
                  type="button"
                  onClick={handleApprove}
                  className="inline-flex items-center gap-1.5 rounded-lg bg-emerald-600 px-5 py-2 text-sm font-bold text-white shadow-sm transition-colors hover:bg-emerald-700"
                >
                  <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" strokeWidth={3} stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" d="m4.5 12.75 6 6 9-13.5" />
                  </svg>
                  Goedkeuren
                </button>
                <button
                  type="button"
                  onClick={handleStartFeedback}
                  className="inline-flex items-center gap-1.5 rounded-lg border border-indigo-300 bg-white px-5 py-2 text-sm font-bold text-indigo-700 shadow-sm transition-colors hover:border-indigo-400 hover:bg-indigo-50"
                >
                  <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" strokeWidth={2} stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" d="M12 20.25c4.97 0 9-3.694 9-8.25s-4.03-8.25-9-8.25S3 7.444 3 12c0 2.104.859 4.023 2.273 5.48.432.447.74 1.04.586 1.641a4.483 4.483 0 0 1-.923 1.785A5.969 5.969 0 0 0 6 21c1.282 0 2.47-.402 3.445-1.087.81.22 1.668.337 2.555.337Z" />
                  </svg>
                  Feedback geven
                </button>
              </>
            )}
            {status === 'open' && decision?.type === 'approve' && (
              <div className="inline-flex items-center gap-1.5 rounded-lg bg-emerald-50 px-3 py-1.5 text-sm font-semibold text-emerald-800 ring-1 ring-emerald-200">
                <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" strokeWidth={3} stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" d="m4.5 12.75 6 6 9-13.5" />
                </svg>
                Goedgekeurd
              </div>
            )}
            {status === 'open' && decision?.type === 'feedback' && (
              <div className="inline-flex items-center gap-1.5 rounded-lg bg-indigo-50 px-3 py-1.5 text-sm font-semibold text-indigo-800 ring-1 ring-indigo-200">
                <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" strokeWidth={2.5} stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" d="M4.5 12.75 9 17.25 19.5 6.75" />
                </svg>
                Feedback klaar
              </div>
            )}
            {status === 'approved' && (
              <div className="inline-flex items-center gap-1.5 rounded-lg bg-emerald-50 px-3 py-1.5 text-sm font-semibold text-emerald-800 ring-1 ring-emerald-200">
                <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" strokeWidth={3} stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" d="m4.5 12.75 6 6 9-13.5" />
                </svg>
                Eerder goedgekeurd
              </div>
            )}
            {status === 'feedback_pending' && (
              <div className="inline-flex items-center gap-1.5 rounded-lg bg-amber-50 px-3 py-1.5 text-sm font-semibold text-amber-800 ring-1 ring-amber-200">
                <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" strokeWidth={2} stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" d="M12 8v4l2 2m6-2a8 8 0 1 1-16 0 8 8 0 0 1 16 0Z" />
                </svg>
                Feedback verstuurd
              </div>
            )}
          </div>

          {/* One-variant body — fixed window, no scrolling between variants */}
          <div className="flex-1 overflow-y-auto overflow-x-hidden">
            {status === 'feedback_pending' && submission ? (
              <FeedbackReadonlyBody variant={current} submission={submission} />
            ) : (
              <VariantBody variant={current} />
            )}
          </div>

          {/* Footer: only the next/submit button */}
          <footer className="flex-shrink-0 border-t border-gray-100 bg-white px-6 py-4">
            {error && (
              <div className="mb-3 rounded-lg border border-red-200 bg-red-50 px-3 py-2 text-xs text-red-700">
                {error}
              </div>
            )}
            <div className="flex items-center justify-end">
              <button
                type="button"
                onClick={handleNext}
                disabled={!canProceed || pending}
                className={`inline-flex items-center gap-1.5 rounded-xl px-7 py-3 text-sm font-bold transition-all ${
                  canProceed && !pending
                    ? 'bg-emerald-600 text-white shadow-md shadow-emerald-500/30 hover:bg-emerald-700'
                    : 'cursor-not-allowed bg-gray-200 text-gray-500 shadow-none'
                }`}
              >
                {pending ? (
                  <>
                    <svg className="h-4 w-4 animate-spin" fill="none" viewBox="0 0 24 24">
                      <circle cx="12" cy="12" r="10" stroke="currentColor" strokeOpacity="0.25" strokeWidth="4" />
                      <path d="M12 2a10 10 0 0 1 10 10" stroke="currentColor" strokeWidth="4" strokeLinecap="round" />
                    </svg>
                    Versturen...
                  </>
                ) : (
                  <>
                    {buttonLabel}
                    {!lastButtonIsClose && (
                      <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" strokeWidth={2.5} stroke="currentColor">
                        <path strokeLinecap="round" strokeLinejoin="round" d="M13.5 4.5 21 12m0 0-7.5 7.5M21 12H3" />
                      </svg>
                    )}
                  </>
                )}
              </button>
            </div>
          </footer>
        </>
      )}

    </div>
  )
}

function VariantBody({ variant }: { variant: MailVariant }) {
  return (
    <div className="min-h-full bg-gray-50/70">
      <div className="mx-auto max-w-5xl space-y-5 px-6 py-8">
        {variant.explanation && (
          <div className="rounded-xl border border-indigo-100 bg-indigo-50/60 px-5 py-3">
            <div className="text-[10px] font-semibold uppercase tracking-[0.08em] text-indigo-600/90">
              Toelichting
            </div>
            <p className="mt-1 text-sm leading-relaxed text-indigo-900/90">
              {variant.explanation}
            </p>
          </div>
        )}

        <article className="overflow-hidden rounded-2xl bg-white shadow-sm ring-1 ring-gray-200/70">
          <header className="border-b border-gray-100 px-6 py-4">
            <div className="text-[10px] font-semibold uppercase tracking-[0.08em] text-gray-400">
              Onderwerp
            </div>
            <h3 className="mt-1 text-base font-semibold text-gray-900">
              {variant.subject || '—'}
            </h3>
          </header>

          <div
            className={
              variant.exampleBody
                ? 'grid lg:grid-cols-2 lg:divide-x lg:divide-gray-100'
                : ''
            }
          >
            <section className="px-6 py-5">
              <div className="text-[10px] font-semibold uppercase tracking-[0.08em] text-gray-400">
                {variant.exampleBody ? 'Mail body · met variabelen' : 'Mail body'}
              </div>
              <pre className="mt-2 whitespace-pre-wrap break-words font-sans text-sm leading-relaxed text-gray-700">
                {variant.body || '—'}
              </pre>
            </section>
            {variant.exampleBody && (
              <section className="bg-emerald-50/30 px-6 py-5">
                <div className="text-[10px] font-semibold uppercase tracking-[0.08em] text-emerald-700/80">
                  Voorbeeld · ingevuld
                </div>
                <pre className="mt-2 whitespace-pre-wrap break-words font-sans text-sm leading-relaxed text-emerald-900/90">
                  {variant.exampleBody}
                </pre>
              </section>
            )}
          </div>
        </article>
      </div>
    </div>
  )
}

function FeedbackReadonlyBody({
  variant,
  submission,
}: {
  variant: MailVariant
  submission: MailVariantFeedbackSubmission
}) {
  const items = submission.items.slice().sort((a, b) => a.selectionStart - b.selectionStart)

  const segments = useMemo(() => {
    const segs: Array<{ key: string; text: string; highlight?: boolean }> = []
    const body = variant.body
    let cursor = 0
    let idx = 0
    for (const it of items) {
      if (it.selectionStart < cursor) continue
      if (it.selectionStart > cursor) {
        segs.push({ key: `t-${idx++}`, text: body.slice(cursor, it.selectionStart) })
      }
      segs.push({
        key: `h-${it.id}-${idx++}`,
        text: body.slice(it.selectionStart, it.selectionEnd),
        highlight: true,
      })
      cursor = it.selectionEnd
    }
    if (cursor < body.length) {
      segs.push({ key: `t-${idx++}`, text: body.slice(cursor) })
    }
    return segs
  }, [variant.body, items])

  return (
    <div className="min-h-full bg-gray-50/70">
      <div className="mx-auto max-w-5xl space-y-5 px-6 py-8">
        <div className="grid gap-5 lg:grid-cols-[1fr_22rem]">
          <article className="overflow-hidden rounded-2xl bg-white shadow-sm ring-1 ring-gray-200/70">
            <header className="border-b border-gray-100 px-6 py-4">
              <div className="text-[10px] font-semibold uppercase tracking-[0.08em] text-gray-400">
                Onderwerp
              </div>
              <h3 className="mt-1 text-base font-semibold text-gray-900">
                {variant.subject || '—'}
              </h3>
            </header>
            <div className="px-6 py-5">
              <div className="text-[10px] font-semibold uppercase tracking-[0.08em] text-gray-400">
                Mail body
              </div>
              <pre className="mt-2 whitespace-pre-wrap break-words font-sans text-sm leading-relaxed text-gray-700">
                {segments.map((seg) =>
                  seg.highlight ? (
                    <mark key={seg.key} className="rounded bg-yellow-200/80 px-0.5">
                      {seg.text}
                    </mark>
                  ) : (
                    <span key={seg.key}>{seg.text}</span>
                  )
                )}
              </pre>
            </div>
          </article>

          <aside className="space-y-3">
            <div className="text-[10px] font-semibold uppercase tracking-[0.08em] text-gray-400">
              Jouw feedback
            </div>
            {submission.generalFeedback && (
              <div className="rounded-xl bg-amber-50/60 px-4 py-3 ring-1 ring-amber-100">
                <div className="text-[10px] font-semibold uppercase tracking-[0.08em] text-amber-700/90">
                  Algemene feedback
                </div>
                <p className="mt-1 whitespace-pre-wrap text-xs leading-relaxed text-gray-800">
                  {submission.generalFeedback}
                </p>
              </div>
            )}
            {items.map((it) => (
              <div
                key={it.id}
                className="rounded-xl bg-white px-4 py-3 shadow-sm ring-1 ring-gray-200/70"
              >
                <span
                  className={`inline-flex rounded-md px-2 py-0.5 text-[10px] font-semibold uppercase tracking-[0.06em] ring-1 ${ACTION_COLORS[it.actionType]}`}
                >
                  {ACTION_LABELS[it.actionType]}
                </span>
                <div className="mt-2 rounded-md bg-yellow-50/80 px-2 py-1 text-[11px] italic text-yellow-900/90 ring-1 ring-yellow-100">
                  &ldquo;{it.selectionText}&rdquo;
                </div>
                {it.feedbackText && (
                  <p className="mt-1.5 whitespace-pre-wrap text-[12px] leading-relaxed text-gray-700">
                    {it.feedbackText}
                  </p>
                )}
              </div>
            ))}
          </aside>
        </div>
      </div>
    </div>
  )
}
