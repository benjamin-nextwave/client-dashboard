'use client'

import { useState } from 'react'
import { useT } from '@/lib/i18n/client'
import { NewsSidebar, type NewsSidebarItem } from './news-sidebar'

// =============================================================================
// NewsMegaphoneButton — outlined icon-button + slide-in sidebar (ARCH-01..04).
//
// Owns the sidebar's open/close state internally so the dashboard page only
// needs to drop <NewsMegaphoneButton unreadCount={...} archiveItems={...} />
// next to <RefreshButton />.
//
// Visual treatment is deliberately SECONDARY (outlined neutral, NOT brand-
// colored) — the brand-color CTA is reserved for primary actions like
// RefreshButton. The unread badge is the visual signal for unread news.
// =============================================================================

export interface NewsMegaphoneButtonProps {
  unreadCount: number
  archiveItems: NewsSidebarItem[]
}

export function NewsMegaphoneButton({
  unreadCount,
  archiveItems,
}: NewsMegaphoneButtonProps) {
  const t = useT()
  const [open, setOpen] = useState(false)

  // Cap displayed badge count per D-13: counts greater than nine collapse to
  // the literal token below, keeping the badge visually compact.
  const badgeLabel = unreadCount > 9 ? '9+' : String(unreadCount)
  const showBadge = unreadCount > 0

  return (
    <>
      <button
        type="button"
        onClick={() => setOpen(true)}
        aria-label={t('client.news.megaphoneAriaLabel')}
        className="relative inline-flex items-center justify-center rounded-xl border border-gray-200 bg-white px-3 py-3 text-gray-600 shadow-sm transition-all hover:bg-gray-50 hover:text-gray-900"
      >
        <MegaphoneIcon />
        {showBadge && (
          <span
            className="absolute -right-1 -top-1 inline-flex min-w-[18px] items-center justify-center rounded-full bg-red-500 px-1 text-[10px] font-semibold leading-none text-white"
            aria-hidden="true"
          >
            {badgeLabel}
          </span>
        )}
      </button>

      <NewsSidebar
        open={open}
        onClose={() => setOpen(false)}
        items={archiveItems}
      />
    </>
  )
}

// Inline SVG matches existing project pattern (refresh-button et al.) — no
// icon library dependency. D-14.
function MegaphoneIcon() {
  return (
    <svg
      className="h-5 w-5"
      fill="none"
      viewBox="0 0 24 24"
      strokeWidth={1.8}
      stroke="currentColor"
      aria-hidden="true"
    >
      <path
        strokeLinecap="round"
        strokeLinejoin="round"
        d="M10.34 15.84c-.688-.06-1.386-.09-2.09-.09H7.5a4.5 4.5 0 110-9h.75c.704 0 1.402-.03 2.09-.09m0 9.18c.253.962.584 1.892.985 2.783.247.55.06 1.21-.463 1.511l-.657.38c-.551.318-1.26.117-1.527-.461a20.845 20.845 0 01-1.44-4.282m3.102.069a18.03 18.03 0 01-.59-4.59c0-1.586.205-3.124.59-4.59m0 9.18a23.848 23.848 0 018.835 2.535M10.34 6.66a23.847 23.847 0 008.835-2.535m0 0A23.74 23.74 0 0018.795 3m.38 1.125a23.91 23.91 0 011.014 5.395m-1.014 8.855c-.118.38-.245.754-.38 1.125m.38-1.125a23.91 23.91 0 001.014-5.395m0-3.46c.495.413.811 1.035.811 1.73 0 .695-.316 1.317-.811 1.73m0-3.46a24.347 24.347 0 010 3.46"
      />
    </svg>
  )
}
