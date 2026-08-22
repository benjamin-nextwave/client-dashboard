'use client'

import { useCallback, useMemo, useRef, useState, useTransition } from 'react'
import { useRouter } from 'next/navigation'
import type {
  MailVariantFeedbackActionType,
  MailVariantFeedbackSubmission,
} from '@/lib/data/campaign'
import { approveMailVariant, submitMailVariantFeedback } from '../../mijn-campagne/actions'
import { useT } from '@/lib/i18n/client'
import {
  ACTION_LABEL_KEY,
  actionTagClass,
  STATUS_CHIP_CLASS,
  STATUS_COLOR,
  STATUS_HINT_KEY,
  STATUS_LABEL_KEY,
  type VariantView,
} from '../_lib/variant-groups'

/** Concept-opmerking: nog niet verstuurd, dus zonder id uit de database. */
interface DraftNote {
  key: string
  selectionText: string
  selectionStart: number
  selectionEnd: number
  actionType: MailVariantFeedbackActionType
  feedbackText: string
}

const ACTION_TYPES: MailVariantFeedbackActionType[] = ['replace_with', 'remove', 'other']

/**
 * DOM-positie → tekenpositie binnen variant.body. De body wordt als een reeks
 * losse spans gerenderd; door alle tekstknopen tot aan de selectie op te tellen
 * krijgen we exact de offset die submitMailVariantFeedback verwacht — die
 * valideert de offsets tegen de body zoals die in de database staat.
 */
function domOffsetToCharOffset(container: HTMLElement, node: Node, offset: number): number {
  let total = 0
  const walker = document.createTreeWalker(container, NodeFilter.SHOW_TEXT)
  let current = walker.nextNode()
  while (current) {
    if (current === node) return total + offset
    total += (current.textContent ?? '').length
    current = walker.nextNode()
  }
  return total
}

interface Mark {
  key: string
  start: number
  end: number
  kind: 'note' | 'previous'
}

export function VariantDetail({
  view,
  submissions,
}: {
  view: VariantView
  /** Alle eerdere feedbackrondes voor deze variant, nieuwste eerst. */
  submissions: MailVariantFeedbackSubmission[]
}) {
  const t = useT()
  const router = useRouter()
  const { variant, status, version, roundCount, isRevised } = view

  const [showExample, setShowExample] = useState(false)
  const [notes, setNotes] = useState<DraftNote[]>([])
  const [general, setGeneral] = useState('')
  const [error, setError] = useState('')
  const [pending, startTransition] = useTransition()

  const bodyRef = useRef<HTMLDivElement | null>(null)
  const canEdit = status === 'open'
  const hasExample = variant.exampleBody.trim().length > 0
  const showingExample = hasExample && showExample

  /**
   * Passages waar in de vorige ronde iets over is gezegd. De operator kan de
   * tekst intussen hebben herschreven, dus we markeren alleen wat letterlijk
   * nog in de huidige body voorkomt.
   */
  const previousMarks = useMemo<Mark[]>(() => {
    const last = submissions[0]
    if (!last) return []
    const found: Mark[] = []
    for (const item of last.items) {
      const at = variant.body.indexOf(item.selectionText)
      if (at < 0) continue
      found.push({
        key: `prev-${item.id}`,
        start: at,
        end: at + item.selectionText.length,
        kind: 'previous',
      })
    }
    return found
  }, [submissions, variant.body])

  const segments = useMemo(() => {
    const marks: Mark[] = [
      ...notes.map((n) => ({
        key: n.key,
        start: n.selectionStart,
        end: n.selectionEnd,
        kind: 'note' as const,
      })),
      ...previousMarks,
    ].sort((a, b) => a.start - b.start)

    const out: Array<{ key: string; text: string; kind?: Mark['kind'] }> = []
    const body = variant.body
    let cursor = 0
    let i = 0
    for (const mark of marks) {
      if (mark.start < cursor) continue
      if (mark.start > cursor) {
        out.push({ key: `t-${i++}`, text: body.slice(cursor, mark.start) })
      }
      out.push({ key: `${mark.key}-${i++}`, text: body.slice(mark.start, mark.end), kind: mark.kind })
      cursor = mark.end
    }
    if (cursor < body.length) out.push({ key: `t-${i++}`, text: body.slice(cursor) })
    return out
  }, [notes, previousMarks, variant.body])

  const captureSelection = useCallback(() => {
    if (!canEdit || showingExample) return
    const container = bodyRef.current
    const selection = window.getSelection()
    if (!container || !selection || selection.rangeCount === 0) return

    const range = selection.getRangeAt(0)
    if (range.collapsed || !container.contains(range.commonAncestorContainer)) return

    const a = domOffsetToCharOffset(container, range.startContainer, range.startOffset)
    const b = domOffsetToCharOffset(container, range.endContainer, range.endOffset)
    const start = Math.min(a, b)
    const end = Math.max(a, b)
    if (end - start === 0) return

    if (notes.some((n) => !(end <= n.selectionStart || start >= n.selectionEnd))) {
      setError(t('mailVariantsPage.errorOverlap'))
      selection.removeAllRanges()
      return
    }

    setError('')
    setNotes((cur) => [
      ...cur,
      {
        key: `${start}-${end}-${cur.length}`,
        selectionText: variant.body.slice(start, end),
        selectionStart: start,
        selectionEnd: end,
        actionType: 'replace_with',
        feedbackText: '',
      },
    ])
    selection.removeAllRanges()
  }, [canEdit, showingExample, notes, variant.body, t])

  function sendFeedback() {
    if (notes.length === 0 && !general.trim()) {
      setError(t('mailVariantsPage.errorEmpty'))
      return
    }
    // De server weigert een replace_with/other zonder toelichting; vang dat
    // hier af zodat de klant niet een halve ronde kwijtraakt aan een foutmelding.
    if (notes.some((n) => n.actionType !== 'remove' && !n.feedbackText.trim())) {
      setError(t('mailVariantsPage.errorNoteText'))
      return
    }
    setError('')
    startTransition(async () => {
      const res = await submitMailVariantFeedback({
        variantId: variant.id,
        generalFeedback: general.trim() || null,
        items: notes.map((n) => ({
          selectionText: n.selectionText,
          selectionStart: n.selectionStart,
          selectionEnd: n.selectionEnd,
          actionType: n.actionType,
          feedbackText: n.feedbackText.trim() || null,
        })),
      })
      if (res.error) {
        setError(res.error)
        return
      }
      setNotes([])
      setGeneral('')
      router.refresh()
    })
  }

  function approve() {
    setError('')
    startTransition(async () => {
      const res = await approveMailVariant(variant.id)
      if (res.error) {
        setError(res.error)
        return
      }
      router.refresh()
    })
  }

  return (
    <div className="flex min-h-0 min-w-0 flex-1 flex-col overflow-hidden rounded-panel border border-line bg-panel">
      <div className="shrink-0 border-b border-line px-5 py-4">
        <div className="flex flex-wrap items-start justify-between gap-4">
          <div className="min-w-0">
            <div className="flex flex-wrap items-center gap-[9px]">
              <span className="text-[10px] font-semibold uppercase tracking-[0.13em] text-faint">
                {t('mailVariantsPage.mailTitleFallback', { number: variant.mailNumber })} ·{' '}
                {variant.variantLabel}
              </span>
              {isRevised && (
                <span className="rounded-[5px] bg-[var(--brand-12)] px-1.5 py-0.5 text-[9.5px] font-bold uppercase tracking-[0.06em] text-brand-ink">
                  {t('mailVariantsPage.revised')}
                </span>
              )}
              <span
                className={`inline-flex items-center gap-[5px] rounded-[5px] px-[7px] py-[3px] text-[10px] font-bold uppercase tracking-[0.06em] ${STATUS_CHIP_CLASS[status]}`}
              >
                <span
                  className="h-[6px] w-[6px] rounded-full"
                  style={{ background: STATUS_COLOR[status] }}
                />
                {t(STATUS_LABEL_KEY[status])}
              </span>
            </div>
            <h2 className="mt-[9px] text-[17px] font-semibold tracking-[-0.022em]">
              {variant.subject}
            </h2>
            <p className="mt-[5px] text-[11.5px] leading-[1.5] text-muted">
              {t(STATUS_HINT_KEY[status])}
            </p>
            <div className="mt-[7px] flex flex-wrap items-center gap-2.5 text-[11.5px] text-faint">
              <span>
                {t('mailVariantsPage.updatedOn', {
                  date: new Date(variant.updatedAt).toLocaleDateString('nl-NL', {
                    day: 'numeric',
                    month: 'short',
                  }),
                })}
              </span>
              <span className="h-[3px] w-[3px] rounded-full bg-faint" />
              <span className="tabular-nums">
                {t('mailVariantsPage.version', { number: version })}
              </span>
              {roundCount > 0 && (
                <>
                  <span className="h-[3px] w-[3px] rounded-full bg-faint" />
                  <span className="tabular-nums">
                    {roundCount === 1
                      ? t('mailVariantsPage.roundsOne')
                      : t('mailVariantsPage.roundsMany', { count: roundCount })}
                  </span>
                </>
              )}
            </div>
          </div>

          {hasExample && (
            <div className="flex shrink-0 gap-0.5 rounded-[9px] border border-line bg-track p-[3px]">
              {[
                { label: t('mailVariantsPage.viewTemplate'), example: false },
                { label: t('mailVariantsPage.viewExample'), example: true },
              ].map((opt) => (
                <button
                  key={opt.label}
                  type="button"
                  onClick={() => setShowExample(opt.example)}
                  className={`cursor-pointer whitespace-nowrap rounded-[7px] px-[11px] py-[5px] text-[11.5px] font-semibold transition-colors ${
                    showExample === opt.example
                      ? 'border border-line bg-panel'
                      : 'border border-transparent text-muted'
                  }`}
                >
                  {opt.label}
                </button>
              ))}
            </div>
          )}
        </div>
      </div>

      <div className="flex min-h-0 flex-1 flex-col overflow-hidden lg:flex-row">
        {/* Mailtekst */}
        <div className="min-h-0 min-w-0 flex-1 overflow-y-auto px-6 py-5">
          {showingExample ? (
            <div className="max-w-[600px] whitespace-pre-wrap text-[13.5px] leading-[1.75]">
              {variant.exampleBody}
            </div>
          ) : (
            // Dat je hier tekst kunt selecteren is niet vanzelfsprekend, dus
            // krijgt het tekstvlak bij hover een markeerstift-randje en een
            // hint. De selectie zelf kleurt geel via .marker-select in
            // globals.css, in plaats van het blauw van het besturingssysteem.
            <div className="group/body relative max-w-[600px]">
              {canEdit && (
                <div
                  aria-hidden
                  className="pointer-events-none absolute -top-7 left-0 flex items-center gap-1.5 rounded-[6px] bg-[var(--c-marker)] px-2 py-[3px] text-[10.5px] font-semibold text-[#3f3000] opacity-0 transition-opacity duration-150 group-hover/body:opacity-100"
                >
                  <svg
                    viewBox="0 0 24 24"
                    fill="none"
                    stroke="currentColor"
                    strokeWidth={1.8}
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    className="h-3 w-3"
                  >
                    <path d="M15.232 5.232 18.768 8.768M16.732 3.732a2.5 2.5 0 1 1 3.536 3.536L7.5 20.036 3 21l.964-4.5L16.732 3.732Z" />
                  </svg>
                  {t('mailVariantsPage.selectHint')}
                </div>
              )}
              <div
                ref={bodyRef}
                onMouseUp={captureSelection}
                className={`marker-select -mx-2 rounded-control px-2 py-1 select-text whitespace-pre-wrap text-[13.5px] leading-[1.75] transition-colors ${
                  canEdit
                    ? 'cursor-text ring-1 ring-transparent group-hover/body:bg-[var(--brand-04)] group-hover/body:ring-[var(--brand-20)]'
                    : ''
                }`}
              >
                {segments.map((seg) =>
                  seg.kind ? (
                    <span
                      key={seg.key}
                      className={
                        seg.kind === 'note'
                          ? 'rounded-[3px] bg-[var(--brand-12)] shadow-[0_0_0_1px_var(--brand-20)]'
                          : 'rounded-[3px] bg-[var(--brand-06)]'
                      }
                    >
                      {seg.text}
                    </span>
                  ) : (
                    <span key={seg.key}>{seg.text}</span>
                  )
                )}
              </div>
            </div>
          )}

          {variant.explanation && (
            <div className="mt-[22px] max-w-[600px] border-t border-line pt-[18px]">
              <div className="text-[10px] font-semibold uppercase tracking-[0.13em] text-faint">
                {t('mailVariantsPage.whyTitle')}
              </div>
              <p className="mt-[9px] whitespace-pre-wrap text-[12.5px] leading-[1.6] text-muted">
                {variant.explanation}
              </p>
            </div>
          )}
        </div>

        {/* Feedbackpaneel */}
        <div className="flex w-full shrink-0 flex-col overflow-hidden border-t border-line bg-track lg:w-[288px] lg:border-l lg:border-t-0">
          <div className="shrink-0 border-b border-line px-4 py-3.5">
            <h3 className="text-[12.5px] font-semibold tracking-[-0.01em]">
              {t('mailVariantsPage.feedbackTitle')}
            </h3>
            <p className="mt-1.5 text-[11.5px] leading-[1.5] text-muted">
              {!canEdit
                ? status === 'approved'
                  ? t('mailVariantsPage.approvedBody')
                  : t('mailVariantsPage.awaitingBody')
                : showingExample
                  ? t('mailVariantsPage.feedbackHintExample')
                  : t('mailVariantsPage.feedbackHint')}
            </p>
          </div>

          <div className="flex min-h-0 flex-1 flex-col gap-2.5 overflow-y-auto px-4 py-3">
            {canEdit &&
              notes.map((note) => (
                <div
                  key={note.key}
                  className="shrink-0 rounded-[9px] border border-line bg-panel px-3 py-[11px]"
                >
                  <div className="flex items-center gap-[7px]">
                    <select
                      value={note.actionType}
                      onChange={(e) =>
                        setNotes((cur) =>
                          cur.map((n) =>
                            n.key === note.key
                              ? {
                                  ...n,
                                  actionType: e.target.value as MailVariantFeedbackActionType,
                                }
                              : n
                          )
                        )
                      }
                      className={`shrink-0 cursor-pointer rounded-[5px] border-0 px-[7px] py-[3px] text-[9.5px] font-bold uppercase tracking-[0.06em] outline-none ${actionTagClass(
                        note.actionType
                      )}`}
                    >
                      {ACTION_TYPES.map((a) => (
                        <option key={a} value={a}>
                          {t(ACTION_LABEL_KEY[a])}
                        </option>
                      ))}
                    </select>
                    <span className="flex-1" />
                    <button
                      type="button"
                      onClick={() => setNotes((cur) => cur.filter((n) => n.key !== note.key))}
                      aria-label={t('mailVariantsPage.noteRemove')}
                      className="flex h-5 w-5 shrink-0 cursor-pointer items-center justify-center text-faint transition-colors hover:text-fg"
                    >
                      <svg
                        viewBox="0 0 24 24"
                        fill="none"
                        stroke="currentColor"
                        strokeWidth={2.2}
                        strokeLinecap="round"
                        className="h-[11px] w-[11px]"
                      >
                        <path d="M6 18 18 6M6 6l12 12" />
                      </svg>
                    </button>
                  </div>

                  <div className="mt-2 border-l-2 border-[var(--brand-32)] pl-[9px] text-[11.5px] italic leading-[1.5] text-muted">
                    {note.selectionText}
                  </div>

                  {note.actionType !== 'remove' && (
                    <textarea
                      value={note.feedbackText}
                      onChange={(e) =>
                        setNotes((cur) =>
                          cur.map((n) =>
                            n.key === note.key ? { ...n, feedbackText: e.target.value } : n
                          )
                        )
                      }
                      placeholder={t('mailVariantsPage.notePlaceholder')}
                      rows={2}
                      className="mt-[9px] w-full resize-none rounded-[7px] border border-line bg-track px-2 py-1.5 text-[11.5px] leading-[1.5] text-fg outline-none placeholder:text-faint focus:ring-2 focus:ring-[var(--brand-color)]"
                    />
                  )}
                </div>
              ))}

            {canEdit && notes.length === 0 && (
              <div className="shrink-0 rounded-[9px] border border-dashed border-line px-3 py-3.5 text-center text-[11.5px] text-faint">
                {t('mailVariantsPage.noNotes')}
              </div>
            )}

            {submissions.length > 0 && (
              <div className="shrink-0">
                <div className="pb-2 pt-1 text-[10px] font-semibold uppercase tracking-[0.13em] text-faint">
                  {t('mailVariantsPage.previousFeedbackTitle')}
                </div>
                <div className="flex flex-col gap-2">
                  {submissions.map((submission) => (
                    <div
                      key={submission.id}
                      className="rounded-[9px] border border-line bg-panel px-3 py-[11px]"
                    >
                      <div className="text-[10.5px] tabular-nums text-faint">
                        {new Date(submission.submittedAt).toLocaleDateString('nl-NL', {
                          day: 'numeric',
                          month: 'short',
                          year: 'numeric',
                        })}
                      </div>
                      {submission.generalFeedback && (
                        <p className="mt-1.5 whitespace-pre-wrap text-[11.5px] leading-[1.5]">
                          {submission.generalFeedback}
                        </p>
                      )}
                      {submission.items.map((item) => (
                        <div key={item.id} className="mt-2.5">
                          <span
                            className={`inline-flex whitespace-nowrap rounded-[5px] px-[7px] py-[3px] text-[9.5px] font-bold uppercase tracking-[0.06em] ${actionTagClass(
                              item.actionType
                            )}`}
                          >
                            {t(ACTION_LABEL_KEY[item.actionType])}
                          </span>
                          <div className="mt-1.5 border-l-2 border-[var(--brand-32)] pl-[9px] text-[11.5px] italic leading-[1.5] text-muted">
                            {item.selectionText}
                          </div>
                          {item.feedbackText && (
                            <p className="mt-[5px] whitespace-pre-wrap text-[11.5px] leading-[1.5]">
                              {item.feedbackText}
                            </p>
                          )}
                        </div>
                      ))}
                    </div>
                  ))}
                </div>
              </div>
            )}
          </div>

          {canEdit ? (
            <div className="flex shrink-0 flex-col gap-2 border-t border-line px-4 py-3">
              {error && <p className="text-[11.5px] leading-[1.5] text-neg">{error}</p>}
              <textarea
                value={general}
                onChange={(e) => setGeneral(e.target.value)}
                placeholder={t('mailVariantsPage.generalPlaceholder')}
                className="min-h-14 w-full resize-none rounded-control border border-line bg-panel px-2.5 py-[9px] text-[11.5px] leading-[1.5] text-fg outline-none placeholder:text-faint focus:ring-2 focus:ring-[var(--brand-color)]"
              />
              <div className="flex gap-2">
                <button
                  type="button"
                  onClick={sendFeedback}
                  disabled={pending}
                  className="h-[34px] flex-1 cursor-pointer whitespace-nowrap rounded-control bg-brand text-[12.5px] font-semibold text-white transition-opacity hover:opacity-90 disabled:cursor-not-allowed disabled:opacity-50"
                >
                  {pending ? t('mailVariantsPage.sending') : t('mailVariantsPage.sendFeedback')}
                </button>
                <button
                  type="button"
                  onClick={approve}
                  disabled={pending}
                  className="flex h-[34px] shrink-0 cursor-pointer items-center gap-[7px] whitespace-nowrap rounded-control border border-[color-mix(in_oklab,var(--c-pos)_40%,var(--c-line))] bg-[color-mix(in_oklab,var(--c-pos)_9%,transparent)] px-[13px] text-[12.5px] font-semibold text-pos transition-colors hover:bg-[color-mix(in_oklab,var(--c-pos)_16%,transparent)] disabled:cursor-not-allowed disabled:opacity-50"
                >
                  <svg
                    viewBox="0 0 24 24"
                    fill="none"
                    stroke="currentColor"
                    strokeWidth={2.6}
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    className="h-3 w-3"
                  >
                    <path d="m4.5 12.75 6 6 9-13.5" />
                  </svg>
                  {t('mailVariantsPage.approve')}
                </button>
              </div>
            </div>
          ) : (
            <div className="shrink-0 border-t border-line px-4 py-3">
              {error && <p className="mb-2 text-[11.5px] leading-[1.5] text-neg">{error}</p>}
              <div
                className="flex items-center gap-[7px] text-[11.5px] font-semibold"
                style={{ color: STATUS_COLOR[status] }}
              >
                <span
                  className="h-[7px] w-[7px] shrink-0 rounded-full"
                  style={{ background: STATUS_COLOR[status] }}
                />
                {status === 'approved'
                  ? t('mailVariantsPage.approvedTitle')
                  : t('mailVariantsPage.awaitingTitle')}
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  )
}
