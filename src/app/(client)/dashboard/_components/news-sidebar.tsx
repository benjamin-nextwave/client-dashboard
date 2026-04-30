'use client'

import { useEffect, useState } from 'react'
import { useT } from '@/lib/i18n/client'
import { NewsContentRenderer } from '@/components/admin/news-preview-modal'

// =============================================================================
// NewsSidebar — right-side slide-in panel for the news archive (ARCH-02..04).
//
// Unlike NewsOverlay (10-03), the sidebar follows STANDARD modal conventions:
//   - X close button in the header
//   - Escape-key closes
//   - Backdrop click closes
// (D-08 — sidebar may have normal close affordances, unlike the overlay.)
//
// Internal state — D-10:
//   { view: 'list' | 'detail', activeItemId: string | null }
//   Clicking a list item flips view='detail' + activeItemId=item.id.
//   Clicking "Terug naar overzicht" resets to view='list', activeItemId=null.
//   Closing the sidebar (X / Esc / backdrop) resets to list view (clean state
//   on re-open).
// =============================================================================

export interface NewsSidebarItem {
  id: string
  title: string
  body: string
  image_url: string | null
  published_at: string // ISO 8601
}

export interface NewsSidebarProps {
  open: boolean
  onClose: () => void
  items: NewsSidebarItem[]
}

const PREVIEW_MAX_CHARS = 120

function getPreview(body: string): string {
  if (body.length <= PREVIEW_MAX_CHARS) return body
  // Truncate at PREVIEW_MAX_CHARS and append a single ellipsis. Using a hard
  // char-count truncation is acceptable per ARCH-03 acceptance ("first ~120
  // characters followed by an ellipsis").
  return body.slice(0, PREVIEW_MAX_CHARS).trimEnd() + '…'
}

function useRelativeTime(iso: string): string {
  // Converts ISO timestamp → localized relative-time string using the
  // client.news.relativeTime* i18n keys. Re-renders happen only on prop change
  // (intentional — minute-level precision is sufficient for a news archive).
  const t = useT()
  const now = Date.now()
  const past = new Date(iso).getTime()
  const deltaSec = Math.max(0, Math.floor((now - past) / 1000))

  if (deltaSec < 60) return t('client.news.relativeTimeJustNow')
  const deltaMin = Math.floor(deltaSec / 60)
  if (deltaMin < 60) return t('client.news.relativeTimeMinutes', { count: deltaMin })
  const deltaHr = Math.floor(deltaMin / 60)
  if (deltaHr < 24) return t('client.news.relativeTimeHours', { count: deltaHr })
  const deltaDay = Math.floor(deltaHr / 24)
  if (deltaDay < 7) return t('client.news.relativeTimeDays', { count: deltaDay })
  const deltaWk = Math.floor(deltaDay / 7)
  return t('client.news.relativeTimeWeeks', { count: deltaWk })
}

export function NewsSidebar({ open, onClose, items }: NewsSidebarProps) {
  const t = useT()
  const [view, setView] = useState<'list' | 'detail'>('list')
  const [activeItemId, setActiveItemId] = useState<string | null>(null)

  // Reset to list view when the sidebar closes — clean state on next open.
  useEffect(() => {
    if (!open) {
      setView('list')
      setActiveItemId(null)
    }
  }, [open])

  // Escape closes the sidebar (D-08 — normal modal conventions for the SIDEBAR).
  useEffect(() => {
    if (!open) return
    function onKey(e: KeyboardEvent) {
      if (e.key === 'Escape') onClose()
    }
    window.addEventListener('keydown', onKey)
    return () => window.removeEventListener('keydown', onKey)
  }, [open, onClose])

  if (!open) return null

  const activeItem = activeItemId ? items.find((i) => i.id === activeItemId) ?? null : null

  return (
    <>
      {/* Backdrop — clicking closes the sidebar (D-08). Fades in via existing fadeIn keyframe. */}
      <div
        className="fixed inset-0 z-[54] bg-black/40 animate-fadeIn"
        onClick={onClose}
        aria-hidden="true"
      />

      {/* Slide-in panel — z-55 (just below overlay's z-60 per D-04/D-08).
        * Animation per D-08: slides in from right (translateX(100%) → 0) over 0.25s ease-out
        * via the `slideInFromRight` keyframe added to globals.css in Task 0.
        */}
      <aside
        role="dialog"
        aria-modal="true"
        aria-label={t('client.news.sidebarTitle')}
        className="fixed right-0 top-0 z-[55] flex h-screen w-full flex-col bg-white shadow-2xl sm:w-[420px] animate-slideInFromRight"
      >
        {/* Header */}
        <header className="flex items-center justify-between border-b border-gray-200 px-5 py-4">
          {view === 'detail' ? (
            <button
              type="button"
              onClick={() => {
                setView('list')
                setActiveItemId(null)
              }}
              className="inline-flex items-center gap-1.5 text-sm font-medium text-gray-600 transition-colors hover:text-gray-900"
            >
              <svg
                className="h-4 w-4"
                fill="none"
                viewBox="0 0 24 24"
                strokeWidth={2}
                stroke="currentColor"
                aria-hidden="true"
              >
                <path strokeLinecap="round" strokeLinejoin="round" d="M15.75 19.5L8.25 12l7.5-7.5" />
              </svg>
              {t('client.news.sidebarBackToList')}
            </button>
          ) : (
            <h2 className="text-base font-semibold text-gray-900">
              {t('client.news.sidebarTitle')}
            </h2>
          )}
          <button
            type="button"
            onClick={onClose}
            aria-label={t('common.close')}
            className="rounded-full p-1.5 text-gray-500 transition-colors hover:bg-gray-100 hover:text-gray-900"
          >
            <svg
              className="h-5 w-5"
              fill="none"
              viewBox="0 0 24 24"
              strokeWidth={2}
              stroke="currentColor"
              aria-hidden="true"
            >
              <path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" />
            </svg>
          </button>
        </header>

        {/* Body */}
        <div className="flex-1 overflow-y-auto p-5">
          {view === 'list' ? (
            items.length === 0 ? (
              <p className="py-12 text-center text-sm text-gray-500">
                {t('client.news.sidebarEmpty')}
              </p>
            ) : (
              <ul className="space-y-3">
                {items.map((item) => (
                  <NewsSidebarListItem
                    key={item.id}
                    item={item}
                    onClick={() => {
                      setView('detail')
                      setActiveItemId(item.id)
                    }}
                  />
                ))}
              </ul>
            )
          ) : activeItem ? (
            // Detail view — full content via NewsContentRenderer (D-23 reuse).
            <NewsContentRenderer
              image_url={activeItem.image_url}
              title={activeItem.title}
              body={activeItem.body}
            />
          ) : (
            // Defensive: detail view requested but item not in list (e.g.,
            // race with withdrawal). Fall back to empty-state message.
            <p className="py-12 text-center text-sm text-gray-500">
              {t('client.news.sidebarEmpty')}
            </p>
          )}
        </div>
      </aside>
    </>
  )
}

interface NewsSidebarListItemProps {
  item: NewsSidebarItem
  onClick: () => void
}

function NewsSidebarListItem({ item, onClick }: NewsSidebarListItemProps) {
  const relativeTime = useRelativeTime(item.published_at)
  const preview = getPreview(item.body)

  return (
    // Card-like list item per D-26. NO image (D-27 — sidebar list items NEVER
    // show the news image; only title + preview + date).
    <li>
      <button
        type="button"
        onClick={onClick}
        className="block w-full cursor-pointer rounded-xl border border-gray-200 bg-white p-4 text-left transition-all hover:border-gray-300 hover:shadow-sm"
      >
        <p className="text-sm font-semibold leading-tight text-gray-900">
          {item.title}
        </p>
        <p className="mt-1.5 line-clamp-2 text-xs leading-relaxed text-gray-600">
          {preview}
        </p>
        <p className="mt-2 text-[11px] font-medium uppercase tracking-wide text-gray-400">
          {relativeTime}
        </p>
      </button>
    </li>
  )
}
