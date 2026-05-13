'use client'

import { useCallback, useEffect, useMemo, useRef, useState } from 'react'
import type {
  MailVariant,
  MailVariantFeedbackActionType,
  MailVariantFeedbackSubmission,
} from '@/lib/data/campaign'

type ActionType = MailVariantFeedbackActionType

interface PendingSelection {
  start: number
  end: number
  text: string
  popover: { top: number; left: number } | null
}

export interface FeedbackDraft {
  items: Array<{
    start: number
    end: number
    text: string
    actionType: ActionType
    feedbackText: string
  }>
  generalFeedback: string
}

interface FeedbackItem {
  id: string
  start: number
  end: number
  text: string
  actionType: ActionType
  feedbackText: string
}

interface Props {
  variant: MailVariant
  initialDraft?: FeedbackDraft | null
  onCancel: () => void
  onComplete: (draft: FeedbackDraft) => void
}

const ACTION_LABELS: Record<ActionType, string> = {
  replace_with: 'Vervangen door',
  remove: 'Verwijderen',
  other: 'Overige feedback',
}

const ACTION_COLORS: Record<ActionType, string> = {
  replace_with: 'bg-indigo-100 text-indigo-800 ring-indigo-200',
  remove: 'bg-red-100 text-red-800 ring-red-200',
  other: 'bg-amber-100 text-amber-800 ring-amber-200',
}

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

export function MailVariantFeedbackEditor({
  variant,
  initialDraft,
  onCancel,
  onComplete,
}: Props) {
  const [error, setError] = useState<string | null>(null)
  const [items, setItems] = useState<FeedbackItem[]>(() =>
    (initialDraft?.items ?? []).map((it, idx) => ({
      id: `init-${idx}-${Math.random().toString(36).slice(2, 7)}`,
      start: it.start,
      end: it.end,
      text: it.text,
      actionType: it.actionType,
      feedbackText: it.feedbackText,
    }))
  )
  const [activeItemId, setActiveItemId] = useState<string | null>(null)
  const [pendingSelection, setPendingSelection] = useState<PendingSelection | null>(null)
  const [draftActionType, setDraftActionType] = useState<ActionType | null>(null)
  const [draftFeedbackText, setDraftFeedbackText] = useState('')
  const [editingItemId, setEditingItemId] = useState<string | null>(null)
  const [lockedSelection, setLockedSelection] = useState<{
    start: number
    end: number
    text: string
  } | null>(null)
  const [generalOpen, setGeneralOpen] = useState(
    !!(initialDraft?.generalFeedback && initialDraft.generalFeedback.length > 0)
  )
  const [generalFeedback, setGeneralFeedback] = useState(initialDraft?.generalFeedback ?? '')
  const [helpOpen, setHelpOpen] = useState(false)

  const bodyRef = useRef<HTMLDivElement | null>(null)

  const highlights = useMemo(() => {
    const list: Array<{ start: number; end: number; kind: 'committed' | 'pending'; id: string; active: boolean }> = []
    for (const it of items) {
      list.push({
        start: it.start,
        end: it.end,
        kind: 'committed',
        id: it.id,
        active: it.id === activeItemId,
      })
    }
    if (pendingSelection) {
      list.push({
        start: pendingSelection.start,
        end: pendingSelection.end,
        kind: 'pending',
        id: '__pending__',
        active: true,
      })
    }
    list.sort((a, b) => a.start - b.start)
    return list
  }, [items, activeItemId, pendingSelection])

  const bodySegments = useMemo(() => {
    const segs: Array<{
      key: string
      text: string
      highlight?: { kind: 'committed' | 'pending'; id: string; active: boolean }
    }> = []
    const body = variant.body
    let cursor = 0
    let idx = 0
    for (const h of highlights) {
      if (h.start < cursor) continue
      if (h.start > cursor) {
        segs.push({ key: `t-${idx++}`, text: body.slice(cursor, h.start) })
      }
      segs.push({
        key: `h-${h.id}-${idx++}`,
        text: body.slice(h.start, h.end),
        highlight: { kind: h.kind, id: h.id, active: h.active },
      })
      cursor = h.end
    }
    if (cursor < body.length) {
      segs.push({ key: `t-${idx++}`, text: body.slice(cursor) })
    }
    return segs
  }, [variant.body, highlights])

  const overlapsExisting = useCallback(
    (start: number, end: number) =>
      items.some((it) => !(end <= it.start || start >= it.end)),
    [items]
  )

  const handleMouseUp = useCallback(
    (e: React.MouseEvent<HTMLDivElement>) => {
      if (draftActionType !== null) return
      if ((e.target as HTMLElement).closest('[data-feedback-popover]')) return

      const selection = window.getSelection()
      if (!selection || selection.rangeCount === 0 || !bodyRef.current) {
        setPendingSelection(null)
        return
      }
      const range = selection.getRangeAt(0)
      if (range.collapsed) {
        setPendingSelection(null)
        return
      }
      if (!bodyRef.current.contains(range.commonAncestorContainer)) {
        setPendingSelection(null)
        return
      }
      const start = domOffsetToCharOffset(bodyRef.current, range.startContainer, range.startOffset)
      const end = domOffsetToCharOffset(bodyRef.current, range.endContainer, range.endOffset)
      const lo = Math.min(start, end)
      const hi = Math.max(start, end)
      if (hi - lo === 0) {
        setPendingSelection(null)
        return
      }
      if (overlapsExisting(lo, hi)) {
        setError('Deze tekst overlapt met een bestaand feedbackblok. Verwijder eerst dat blok.')
        setPendingSelection(null)
        selection.removeAllRanges()
        return
      }
      const text = variant.body.slice(lo, hi)
      const rects = range.getClientRects()
      const lastRect = rects[rects.length - 1]
      const containerRect = bodyRef.current.getBoundingClientRect()
      const popover = lastRect
        ? {
            top: lastRect.bottom - containerRect.top + bodyRef.current.scrollTop + 4,
            left: lastRect.right - containerRect.left + bodyRef.current.scrollLeft,
          }
        : null

      setError(null)
      setPendingSelection({ start: lo, end: hi, text, popover })
    },
    [draftActionType, overlapsExisting, variant.body]
  )

  const cancelDraft = () => {
    setDraftActionType(null)
    setDraftFeedbackText('')
    setPendingSelection(null)
    setLockedSelection(null)
    setEditingItemId(null)
    window.getSelection()?.removeAllRanges()
  }

  const startDraft = (type: ActionType) => {
    if (pendingSelection) {
      setLockedSelection({
        start: pendingSelection.start,
        end: pendingSelection.end,
        text: pendingSelection.text,
      })
    }
    setDraftActionType(type)
    setDraftFeedbackText('')
  }

  const confirmDraft = () => {
    if (!draftActionType) return
    const trimmed = draftFeedbackText.trim()
    if ((draftActionType === 'replace_with' || draftActionType === 'other') && !trimmed) {
      setError('Vul feedback in voor dit stukje tekst.')
      return
    }

    if (editingItemId) {
      setItems((prev) =>
        prev.map((it) =>
          it.id === editingItemId
            ? { ...it, actionType: draftActionType, feedbackText: trimmed }
            : it
        )
      )
      setEditingItemId(null)
    } else {
      const source = lockedSelection ?? pendingSelection
      if (!source) {
        setError('Selectie is verloren. Selecteer opnieuw.')
        return
      }
      const id = `tmp-${Date.now()}-${Math.random().toString(36).slice(2, 7)}`
      setItems((prev) => [
        ...prev,
        {
          id,
          start: source.start,
          end: source.end,
          text: source.text,
          actionType: draftActionType,
          feedbackText: trimmed,
        },
      ])
    }

    setDraftActionType(null)
    setDraftFeedbackText('')
    setPendingSelection(null)
    setLockedSelection(null)
    setActiveItemId(null)
    setError(null)
    window.getSelection()?.removeAllRanges()
  }

  const handleItemClick = (id: string) => {
    if (draftActionType) return
    setActiveItemId((cur) => (cur === id ? null : id))
  }

  const handleEditItem = (id: string) => {
    const it = items.find((x) => x.id === id)
    if (!it) return
    setActiveItemId(id)
    setEditingItemId(id)
    setLockedSelection({ start: it.start, end: it.end, text: it.text })
    setDraftActionType(it.actionType)
    setDraftFeedbackText(it.feedbackText)
  }

  const handleDeleteItem = (id: string) => {
    setItems((prev) => prev.filter((x) => x.id !== id))
    if (activeItemId === id) setActiveItemId(null)
    if (editingItemId === id) cancelDraft()
  }

  const handleConfirm = () => {
    setError(null)
    const trimmedGeneral = generalFeedback.trim()
    if (items.length === 0 && trimmedGeneral.length === 0) {
      setError('Voeg minstens één feedbackblok of algemene feedback toe voor je bevestigt.')
      return
    }
    if (draftActionType) {
      setError('Bevestig of annuleer eerst het openstaande feedbackveld.')
      return
    }
    onComplete({
      items: items.map((it) => ({
        start: it.start,
        end: it.end,
        text: it.text,
        actionType: it.actionType,
        feedbackText: it.feedbackText,
      })),
      generalFeedback: trimmedGeneral,
    })
  }

  useEffect(() => {
    const handler = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        if (draftActionType) cancelDraft()
        else if (pendingSelection) setPendingSelection(null)
      }
    }
    window.addEventListener('keydown', handler)
    return () => window.removeEventListener('keydown', handler)
  }, [draftActionType, pendingSelection])

  const editingItem = editingItemId ? items.find((it) => it.id === editingItemId) ?? null : null
  const draftSelectionText = editingItem
    ? editingItem.text
    : lockedSelection?.text ?? pendingSelection?.text ?? ''

  return (
    <div className="flex h-full flex-col">
      {/* Editor header */}
      <div className="flex items-center justify-between border-b border-gray-200 px-6 py-3">
        <div className="flex items-center gap-3 min-w-0">
          <button
            type="button"
            onClick={onCancel}
            className="inline-flex items-center gap-1.5 rounded-lg border border-gray-200 bg-white px-3 py-1.5 text-xs font-semibold text-gray-700 shadow-sm hover:bg-gray-50"
          >
            <svg className="h-3.5 w-3.5" fill="none" viewBox="0 0 24 24" strokeWidth={2.5} stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" d="M15.75 19.5 8.25 12l7.5-7.5" />
            </svg>
            Annuleren
          </button>
          <div className="min-w-0">
            <div className="text-[10px] font-semibold uppercase tracking-wide text-indigo-600">
              Feedback geven · Mail {variant.mailNumber}
            </div>
            <div className="truncate text-sm font-semibold text-gray-900">
              {variant.variantLabel}
            </div>
          </div>
        </div>
        <button
          type="button"
          onClick={() => setHelpOpen(true)}
          className="inline-flex flex-shrink-0 items-center gap-2 rounded-xl border border-indigo-300 bg-indigo-50 px-5 py-2.5 text-sm font-bold text-indigo-700 shadow-sm transition-colors hover:border-indigo-400 hover:bg-indigo-100"
        >
          <svg className="h-5 w-5" fill="none" viewBox="0 0 24 24" strokeWidth={2} stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" d="M9.879 7.519c1.171-1.025 3.071-1.025 4.242 0 1.172 1.025 1.172 2.687 0 3.712-.203.179-.43.326-.67.442-.745.361-1.45.999-1.45 1.827v.75M21 12a9 9 0 1 1-18 0 9 9 0 0 1 18 0Zm-9 5.25h.008v.008H12v-.008Z" />
          </svg>
          Uitleg
        </button>
      </div>

      <div className="grid flex-1 grid-cols-1 overflow-hidden md:grid-cols-[1fr_22rem]">
        {/* Left: template body */}
        <div className="relative flex flex-col overflow-hidden border-b border-gray-200 md:border-b-0 md:border-r">
          <div className="border-b border-gray-100 bg-gray-50 px-5 py-2 text-[11px] font-semibold uppercase tracking-wide text-gray-500">
            Mail body — selecteer tekst om feedback te geven
          </div>
          {variant.subject && (
            <div className="border-b border-gray-100 bg-white px-5 py-3">
              <div className="text-[10px] font-semibold uppercase tracking-wide text-gray-400">
                Onderwerp
              </div>
              <div className="mt-0.5 text-sm font-medium text-gray-900">{variant.subject}</div>
            </div>
          )}
          <div
            ref={bodyRef}
            onMouseUp={handleMouseUp}
            className="relative flex-1 overflow-y-auto overflow-x-hidden whitespace-pre-wrap break-words bg-white px-6 py-5 font-sans text-sm leading-relaxed text-gray-900 selection:bg-yellow-200"
            style={{ userSelect: 'text' }}
          >
            {bodySegments.map((seg) => {
              if (!seg.highlight) return <span key={seg.key}>{seg.text}</span>
              const { kind, id, active } = seg.highlight
              const isCommitted = kind === 'committed'
              return (
                <mark
                  key={seg.key}
                  onClick={() => isCommitted && handleItemClick(id)}
                  className={`${
                    isCommitted
                      ? `cursor-pointer rounded px-0.5 ${
                          active ? 'bg-yellow-300 ring-2 ring-yellow-500' : 'bg-yellow-200 hover:bg-yellow-300'
                        }`
                      : 'rounded bg-yellow-200 px-0.5'
                  }`}
                >
                  {seg.text}
                </mark>
              )
            })}

            {pendingSelection?.popover && !draftActionType && (
              <div
                data-feedback-popover
                className="absolute z-10 flex flex-wrap gap-1.5 rounded-xl border border-gray-200 bg-white p-1.5 shadow-xl"
                style={{
                  top: pendingSelection.popover.top,
                  left: pendingSelection.popover.left,
                }}
              >
                {(['replace_with', 'remove', 'other'] as ActionType[]).map((t) => (
                  <button
                    key={t}
                    type="button"
                    onMouseDown={(e) => e.preventDefault()}
                    onClick={() => startDraft(t)}
                    className={`rounded-lg px-3 py-1.5 text-xs font-semibold ring-1 transition-colors ${ACTION_COLORS[t]} hover:brightness-95`}
                  >
                    {ACTION_LABELS[t]}
                  </button>
                ))}
              </div>
            )}
          </div>
        </div>

        {/* Right: feedback panel */}
        <div className="flex min-h-0 flex-col bg-gray-50/50">
          <div className="border-b border-gray-100 bg-white px-5 py-2 text-[11px] font-semibold uppercase tracking-wide text-gray-500">
            Feedback
          </div>

          <div className="flex-1 overflow-y-auto px-4 py-4">
            {draftActionType && (
              <div className="mb-3 rounded-xl border-2 border-indigo-200 bg-white p-3 shadow-sm">
                <div className="flex items-center justify-between gap-2">
                  <span
                    className={`inline-flex rounded-md px-2 py-0.5 text-[10px] font-bold uppercase tracking-wide ring-1 ${ACTION_COLORS[draftActionType]}`}
                  >
                    {ACTION_LABELS[draftActionType]}
                  </span>
                  <button
                    type="button"
                    onClick={cancelDraft}
                    className="text-[11px] font-medium text-gray-500 hover:text-gray-700"
                  >
                    Annuleren
                  </button>
                </div>
                <div className="mt-2 rounded-lg bg-yellow-50 px-2 py-1.5 text-[11px] italic text-yellow-900 ring-1 ring-yellow-200">
                  &ldquo;{draftSelectionText}&rdquo;
                </div>
                <textarea
                  value={draftFeedbackText}
                  onChange={(e) => setDraftFeedbackText(e.target.value)}
                  rows={3}
                  placeholder={
                    draftActionType === 'replace_with'
                      ? 'Welke tekst moet hier komen?'
                      : draftActionType === 'remove'
                        ? 'Optioneel: waarom verwijderen?'
                        : 'Beschrijf je feedback'
                  }
                  className="mt-2 w-full resize-y rounded-lg border border-gray-200 bg-white px-3 py-2 text-xs shadow-sm focus:border-indigo-400 focus:outline-none focus:ring-4 focus:ring-indigo-100"
                  autoFocus
                />
                <div className="mt-2 flex justify-end">
                  <button
                    type="button"
                    onClick={confirmDraft}
                    className="inline-flex items-center gap-1.5 rounded-lg bg-indigo-600 px-4 py-1.5 text-xs font-bold text-white shadow-sm hover:bg-indigo-700"
                  >
                    Bevestigen
                  </button>
                </div>
              </div>
            )}

            {items.length === 0 && !draftActionType && (
              <div className="rounded-lg border border-dashed border-gray-300 bg-white px-3 py-6 text-center text-[11px] text-gray-500">
                Selecteer een woord, zin of alinea in de mail om feedback toe te voegen.
              </div>
            )}

            <div className="space-y-2">
              {items.map((it) => {
                const active = it.id === activeItemId
                return (
                  <div
                    key={it.id}
                    onClick={() => handleItemClick(it.id)}
                    className={`cursor-pointer rounded-xl border bg-white p-3 shadow-sm transition-colors ${
                      active ? 'border-yellow-400 ring-2 ring-yellow-200' : 'border-gray-200 hover:border-indigo-200'
                    }`}
                  >
                    <div className="flex items-center justify-between gap-2">
                      <span
                        className={`inline-flex rounded-md px-2 py-0.5 text-[10px] font-bold uppercase tracking-wide ring-1 ${ACTION_COLORS[it.actionType]}`}
                      >
                        {ACTION_LABELS[it.actionType]}
                      </span>
                      {active && (
                        <div className="flex gap-1">
                          <button
                            type="button"
                            onClick={(e) => {
                              e.stopPropagation()
                              handleEditItem(it.id)
                            }}
                            className="rounded px-2 py-0.5 text-[11px] font-semibold text-indigo-700 hover:bg-indigo-50"
                          >
                            Bewerken
                          </button>
                          <button
                            type="button"
                            onClick={(e) => {
                              e.stopPropagation()
                              handleDeleteItem(it.id)
                            }}
                            className="rounded px-2 py-0.5 text-[11px] font-semibold text-red-600 hover:bg-red-50"
                          >
                            Verwijderen
                          </button>
                        </div>
                      )}
                    </div>
                    <div className="mt-1.5 line-clamp-2 rounded-md bg-yellow-50 px-2 py-1 text-[11px] italic text-yellow-900 ring-1 ring-yellow-100">
                      &ldquo;{it.text}&rdquo;
                    </div>
                    {it.feedbackText && (
                      <div className="mt-1.5 whitespace-pre-wrap text-[12px] text-gray-700">
                        {it.feedbackText}
                      </div>
                    )}
                  </div>
                )
              })}
            </div>

            <div className="mt-4 border-t border-gray-200 pt-4">
              {!generalOpen ? (
                <button
                  type="button"
                  onClick={() => setGeneralOpen(true)}
                  className="inline-flex w-full items-center justify-center gap-2 rounded-lg border border-dashed border-gray-300 bg-white px-3 py-2.5 text-xs font-semibold text-gray-700 hover:border-indigo-300 hover:text-indigo-700"
                >
                  <svg className="h-3.5 w-3.5" fill="none" viewBox="0 0 24 24" strokeWidth={2.5} stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" d="M12 4.5v15m7.5-7.5h-15" />
                  </svg>
                  Algemene feedback toevoegen
                </button>
              ) : (
                <div className="rounded-xl border border-gray-200 bg-white p-3 shadow-sm">
                  <div className="flex items-center justify-between">
                    <div className="text-[11px] font-bold uppercase tracking-wide text-gray-600">
                      Algemene feedback
                    </div>
                    <button
                      type="button"
                      onClick={() => {
                        setGeneralOpen(false)
                        setGeneralFeedback('')
                      }}
                      className="text-[11px] font-medium text-gray-500 hover:text-gray-700"
                    >
                      Verwijderen
                    </button>
                  </div>
                  <p className="mt-0.5 text-[11px] text-gray-500">
                    Voor feedback over de mail in zijn geheel (tone of voice, aanbod, etc.)
                  </p>
                  <textarea
                    value={generalFeedback}
                    onChange={(e) => setGeneralFeedback(e.target.value)}
                    rows={4}
                    placeholder="Bv. de toon is te formeel voor onze doelgroep"
                    className="mt-2 w-full resize-y rounded-lg border border-gray-200 bg-white px-3 py-2 text-xs shadow-sm focus:border-indigo-400 focus:outline-none focus:ring-4 focus:ring-indigo-100"
                  />
                </div>
              )}
            </div>
          </div>

          <div className="border-t border-gray-200 bg-white px-4 py-3">
            {error && (
              <div className="mb-2 rounded-lg border border-red-200 bg-red-50 px-3 py-2 text-[11px] text-red-700">
                {error}
              </div>
            )}
            <div className="flex items-center justify-between gap-2">
              <span className="text-[11px] text-gray-500">
                {items.length} {items.length === 1 ? 'blok' : 'blokken'}
                {generalFeedback.trim().length > 0 && ' · algemene feedback'}
              </span>
              <button
                type="button"
                onClick={handleConfirm}
                className="inline-flex items-center gap-1.5 rounded-xl bg-indigo-600 px-5 py-2.5 text-xs font-bold text-white shadow-md shadow-indigo-500/30 transition-all hover:bg-indigo-700"
              >
                Bevestig feedback
                <svg className="h-3.5 w-3.5" fill="none" viewBox="0 0 24 24" strokeWidth={2.5} stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" d="M4.5 12.75 9 17.25 19.5 6.75" />
                </svg>
              </button>
            </div>
            <p className="mt-1.5 text-[10px] italic text-gray-400">
              Je definitieve indiening volgt onderaan de modal — bij &lsquo;Indienen&rsquo;.
            </p>
          </div>
        </div>
      </div>

      {helpOpen && <FeedbackHelpOverlay onClose={() => setHelpOpen(false)} />}
    </div>
  )
}

function FeedbackHelpOverlay({ onClose }: { onClose: () => void }) {
  // Lock scroll inside the editor while the help overlay is shown
  useEffect(() => {
    const handler = (e: KeyboardEvent) => {
      if (e.key === 'Escape') onClose()
    }
    window.addEventListener('keydown', handler)
    return () => window.removeEventListener('keydown', handler)
  }, [onClose])

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
          <div className="flex items-center gap-2">
            <svg className="h-4 w-4 text-indigo-600" fill="none" viewBox="0 0 24 24" strokeWidth={2} stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" d="M9.879 7.519c1.171-1.025 3.071-1.025 4.242 0 1.172 1.025 1.172 2.687 0 3.712-.203.179-.43.326-.67.442-.745.361-1.45.999-1.45 1.827v.75M21 12a9 9 0 1 1-18 0 9 9 0 0 1 18 0Zm-9 5.25h.008v.008H12v-.008Z" />
            </svg>
            <h3 className="text-sm font-semibold text-gray-900">Hoe geef je feedback?</h3>
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

        <div className="flex-1 overflow-y-auto px-5 py-5">
          {/* Loom video */}
          <div className="aspect-video w-full overflow-hidden rounded-xl bg-gray-900 ring-1 ring-gray-200">
            <iframe
              src="https://www.loom.com/embed/196a958eb7144391afb4788dd60d2f2f"
              title="Uitleg feedback geven"
              allowFullScreen
              className="h-full w-full"
            />
          </div>

          {/* Step-by-step explanation */}
          <ol className="mt-6 space-y-4">
            <HelpStep
              n={1}
              title="Selecteer tekst in de mail"
              body="Sleep met je muis over een woord, zin of alinea links in de mail. De geselecteerde tekst wordt geel gemarkeerd en er verschijnt direct een klein menu naast je selectie."
            />
            <HelpStep
              n={2}
              title="Kies wat er moet gebeuren"
              body={
                <>
                  <strong className="font-semibold text-gray-900">Vervangen door</strong> — geef aan welke tekst hier moet komen.{' '}
                  <strong className="font-semibold text-gray-900">Verwijderen</strong> — markeer dit stuk om weg te halen (uitleg optioneel).{' '}
                  <strong className="font-semibold text-gray-900">Overige feedback</strong> — voor algemene opmerkingen over dit stukje tekst.
                </>
              }
            />
            <HelpStep
              n={3}
              title="Typ je feedback en bevestig"
              body="Rechts verschijnt een tekstvak. Vul je opmerking in en klik op Bevestigen. Het feedbackblok verschijnt rechts in de lijst en de gele markering verdwijnt — je kan direct een nieuw stuk tekst selecteren voor het volgende blok."
            />
            <HelpStep
              n={4}
              title="Bewerken of verwijderen"
              body="Klik op een feedbackblok in de rechterlijst om het opnieuw geel te zien. Daar staan ook de knoppen Bewerken en Verwijderen."
            />
            <HelpStep
              n={5}
              title="Voeg eventueel algemene feedback toe"
              body="Onderaan kan je klikken op Algemene feedback toevoegen — voor opmerkingen die over de hele mail gaan, zoals de tone of voice of het aanbod."
            />
            <HelpStep
              n={6}
              title="Klik op Bevestig feedback"
              body="Hiermee sla je alle feedbackblokken op voor deze variant en ga je terug naar de varianten-flow. Daar klik je later op Volgende of Feedback indienen om de hele ronde te versturen naar NextWave."
            />
          </ol>
        </div>

        <footer className="flex-shrink-0 border-t border-gray-100 bg-gray-50 px-5 py-3 text-right">
          <button
            type="button"
            onClick={onClose}
            className="inline-flex items-center gap-1.5 rounded-xl bg-indigo-600 px-5 py-2 text-xs font-bold text-white shadow-sm hover:bg-indigo-700"
          >
            Sluiten
          </button>
        </footer>
      </div>
    </div>
  )
}

function HelpStep({
  n,
  title,
  body,
}: {
  n: number
  title: string
  body: React.ReactNode
}) {
  return (
    <li className="flex gap-3">
      <span className="flex h-6 w-6 flex-shrink-0 items-center justify-center rounded-full bg-indigo-600 text-[11px] font-bold text-white">
        {n}
      </span>
      <div className="min-w-0 flex-1">
        <div className="text-sm font-semibold text-gray-900">{title}</div>
        <p className="mt-0.5 text-xs leading-relaxed text-gray-600">{body}</p>
      </div>
    </li>
  )
}

/**
 * Read-only version: shown when the client reopens the modal after a
 * feedback submission has already been committed (status feedback_pending).
 * Renders the same body with yellow highlights, but everything is locked.
 */
export function MailVariantFeedbackReadOnly({
  variant,
  submission,
  onBack,
}: {
  variant: MailVariant
  submission: MailVariantFeedbackSubmission
  onBack: () => void
}) {
  const items = submission.items
    .slice()
    .sort((a, b) => a.selectionStart - b.selectionStart)

  const segments = useMemo(() => {
    const segs: Array<{
      key: string
      text: string
      highlight?: { itemId: string }
    }> = []
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
        highlight: { itemId: it.id },
      })
      cursor = it.selectionEnd
    }
    if (cursor < body.length) {
      segs.push({ key: `t-${idx++}`, text: body.slice(cursor) })
    }
    return segs
  }, [variant.body, items])

  return (
    <div className="flex h-full flex-col">
      <div className="flex items-center justify-between border-b border-gray-200 px-6 py-3">
        <div className="flex items-center gap-3 min-w-0">
          <button
            type="button"
            onClick={onBack}
            className="inline-flex items-center gap-1.5 rounded-lg border border-gray-200 bg-white px-3 py-1.5 text-xs font-semibold text-gray-700 shadow-sm hover:bg-gray-50"
          >
            <svg className="h-3.5 w-3.5" fill="none" viewBox="0 0 24 24" strokeWidth={2.5} stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" d="M15.75 19.5 8.25 12l7.5-7.5" />
            </svg>
            Terug
          </button>
          <div className="min-w-0">
            <div className="text-[10px] font-semibold uppercase tracking-wide text-amber-600">
              Jouw feedback · Mail {variant.mailNumber}
            </div>
            <div className="truncate text-sm font-semibold text-gray-900">
              {variant.variantLabel}
            </div>
          </div>
        </div>
        <span className="hidden sm:inline-flex items-center gap-1 rounded-full bg-amber-100 px-2 py-0.5 text-[10px] font-bold uppercase tracking-wide text-amber-700">
          <span className="h-1.5 w-1.5 rounded-full bg-amber-500" />
          Wacht op nieuwe versie
        </span>
      </div>

      <div className="grid flex-1 grid-cols-1 overflow-hidden md:grid-cols-[1fr_22rem]">
        <div className="flex flex-col overflow-hidden border-b border-gray-200 md:border-b-0 md:border-r">
          <div className="border-b border-gray-100 bg-gray-50 px-5 py-2 text-[11px] font-semibold uppercase tracking-wide text-gray-500">
            Mail body
          </div>
          {variant.subject && (
            <div className="border-b border-gray-100 bg-white px-5 py-3">
              <div className="text-[10px] font-semibold uppercase tracking-wide text-gray-400">
                Onderwerp
              </div>
              <div className="mt-0.5 text-sm font-medium text-gray-900">{variant.subject}</div>
            </div>
          )}
          <div className="relative flex-1 overflow-y-auto overflow-x-hidden whitespace-pre-wrap break-words bg-white px-6 py-5 font-sans text-sm leading-relaxed text-gray-900">
            {segments.map((seg) =>
              seg.highlight ? (
                <mark key={seg.key} className="rounded bg-yellow-200 px-0.5">
                  {seg.text}
                </mark>
              ) : (
                <span key={seg.key}>{seg.text}</span>
              )
            )}
          </div>
        </div>

        <div className="flex min-h-0 flex-col bg-gray-50/50">
          <div className="border-b border-gray-100 bg-white px-5 py-2 text-[11px] font-semibold uppercase tracking-wide text-gray-500">
            Feedback ({submission.items.length}
            {submission.generalFeedback ? ' + algemeen' : ''})
          </div>
          <div className="flex-1 overflow-y-auto px-4 py-4">
            {submission.generalFeedback && (
              <div className="mb-3 rounded-xl border border-amber-200 bg-amber-50/50 p-3">
                <div className="text-[10px] font-bold uppercase tracking-wide text-amber-700">
                  Algemene feedback
                </div>
                <p className="mt-1 whitespace-pre-wrap text-xs text-gray-800">
                  {submission.generalFeedback}
                </p>
              </div>
            )}
            <div className="space-y-2">
              {items.map((it) => (
                <div key={it.id} className="rounded-xl border border-gray-200 bg-white p-3 shadow-sm">
                  <span
                    className={`inline-flex rounded-md px-2 py-0.5 text-[10px] font-bold uppercase tracking-wide ring-1 ${ACTION_COLORS[it.actionType]}`}
                  >
                    {ACTION_LABELS[it.actionType]}
                  </span>
                  <div className="mt-1.5 rounded-md bg-yellow-50 px-2 py-1 text-[11px] italic text-yellow-900 ring-1 ring-yellow-100">
                    &ldquo;{it.selectionText}&rdquo;
                  </div>
                  {it.feedbackText && (
                    <p className="mt-1.5 whitespace-pre-wrap text-[12px] text-gray-700">
                      {it.feedbackText}
                    </p>
                  )}
                </div>
              ))}
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}
