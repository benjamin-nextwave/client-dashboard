'use client'

import { useEffect, useState, useTransition } from 'react'
import { useT } from '@/lib/i18n/client'
import { NewsContentRenderer } from '@/components/admin/news-preview-modal'
import { dismissNewsItem } from '../actions'

// =============================================================================
// NewsOverlay — client-side full-screen overlay for unread published news.
//
// IMPORTANT UX divergence (D-06, SPEC DELIVER-03):
//
//   This overlay is the ONLY modal in the project that does NOT close on the
//   Escape key and does NOT close on backdrop click. The dismiss button is the
//   only path. This is intentional — the user must acknowledge the message
//   before proceeding. Future contributors: do NOT "fix" this back to standard
//   modal behavior without explicit product approval. Specifically:
//
//     - There is NO global keydown listener for the Escape key.
//     - The outer fixed-inset div has NO `onClick` that closes the overlay.
//     - There is NO close (X) icon anywhere in the tree.
//
// Queue model (D-07):
//   - Items are server-fetched, pre-localized, and passed in as a prop.
//   - oldest-first ordering is the server's responsibility (page.tsx orders by
//     published_at ASC).
//   - A useState<number> tracks currentIndex. On dismiss-button click, we call
//     dismissNewsItem via useTransition; on { ok: true } we increment
//     currentIndex. When currentIndex >= items.length, isOpen flips to false
//     and the overlay unmounts.
//   - We do NOT trigger any client-side navigation refresh between dismissals
//     — queue state is client-managed during the session. The next /dashboard
//     render naturally re-queries and shows only items the user hasn't
//     dismissed yet.
// =============================================================================

export interface NewsOverlayItem {
  id: string
  title: string
  body: string
  image_url: string | null
}

export interface NewsOverlayProps {
  items: NewsOverlayItem[]
}

export function NewsOverlay({ items }: NewsOverlayProps) {
  const t = useT()
  const [currentIndex, setCurrentIndex] = useState(0)
  const [isOpen, setIsOpen] = useState(items.length > 0)
  const [pending, startTransition] = useTransition()
  const [dismissError, setDismissError] = useState<string | null>(null)

  // Body scroll lock — D-05. Standard pattern: set overflow:hidden on mount,
  // restore the previous value on unmount via the effect cleanup. Capturing the
  // previous value (instead of hard-coding '') avoids clobbering anything else
  // that may have set body overflow before us.
  useEffect(() => {
    if (!isOpen) return
    const previous = document.body.style.overflow
    document.body.style.overflow = 'hidden'
    return () => {
      document.body.style.overflow = previous
    }
  }, [isOpen])

  // INTENTIONALLY ABSENT below: a `keydown` listener for the Escape key, and
  // an `onClick` on the backdrop that calls setIsOpen(false). See block comment
  // at top — both are deliberate divergences from standard modal behavior.

  if (!isOpen || items.length === 0 || currentIndex >= items.length) {
    return null
  }

  const current = items[currentIndex]

  function handleDismiss() {
    setDismissError(null)
    startTransition(async () => {
      const result = await dismissNewsItem(current.id)
      if ('error' in result) {
        // The action failed — surface a minimal inline error and let the user
        // try again. We do NOT advance the queue on failure (the row was not
        // inserted; the next /dashboard render would re-show this item).
        setDismissError(result.error)
        return
      }
      // Success — advance the queue. If we just dismissed the last item, set
      // isOpen=false so the cleanup effect restores body overflow.
      const nextIndex = currentIndex + 1
      if (nextIndex >= items.length) {
        setIsOpen(false)
      } else {
        setCurrentIndex(nextIndex)
      }
    })
  }

  return (
    // Backdrop: NO onClick handler (D-06 — clicking backdrop must NOT dismiss).
    // role="dialog" + aria-modal="true" for accessibility.
    <div
      role="dialog"
      aria-modal="true"
      className="fixed inset-0 z-[60] flex items-center justify-center bg-black/60 p-4 backdrop-blur-sm animate-fadeIn"
    >
      {/* Card — internally scrollable if body is long.
        * Animation per D-04: subtle fade + slight rise from below (uses the
        * existing `animate-fadeIn` keyframe in globals.css which combines
        * opacity 0→1 + translateY(4px)→0 over 0.4s ease-out).
        * `key={current.id}` triggers a re-mount + replay of the animation on
        * queue advance, giving the cross-fade-between-items effect described
        * in D-04.
        */}
      <div
        key={current.id}
        className="relative flex max-h-[85vh] w-full max-w-[600px] flex-col overflow-hidden rounded-2xl bg-white shadow-2xl animate-fadeIn"
      >
        {/* Scrollable content area — uses NewsContentRenderer (D-23 reuse). */}
        <div className="overflow-y-auto">
          <NewsContentRenderer
            image_url={current.image_url}
            title={current.title}
            body={current.body}
          />
        </div>

        {/* Action footer — single button, brand-color CTA (D-25). */}
        <div className="flex flex-col gap-2 border-t border-gray-100 bg-white p-4 sm:p-6">
          {dismissError && (
            <p className="text-sm text-red-600" role="alert">
              {dismissError}
            </p>
          )}
          <button
            type="button"
            onClick={handleDismiss}
            disabled={pending}
            className="inline-flex w-full items-center justify-center gap-2 rounded-xl bg-[var(--brand-color)] px-6 py-3 text-base font-semibold text-white shadow-md transition-all hover:opacity-90 hover:shadow-lg disabled:cursor-not-allowed disabled:opacity-50"
          >
            {pending ? (
              <svg
                className="h-5 w-5 animate-spin"
                fill="none"
                viewBox="0 0 24 24"
                aria-hidden="true"
              >
                <circle
                  className="opacity-25"
                  cx="12"
                  cy="12"
                  r="10"
                  stroke="currentColor"
                  strokeWidth="4"
                />
                <path
                  className="opacity-75"
                  fill="currentColor"
                  d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"
                />
              </svg>
            ) : null}
            {t('client.news.dismissButton')}
          </button>
        </div>
      </div>
    </div>
  )
}
