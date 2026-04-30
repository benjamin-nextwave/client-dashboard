'use client'

import Link from 'next/link'
import { useT } from '@/lib/i18n/client'

// =============================================================================
// NewsListChrome — page header + create CTA + empty state for /admin/news
// -----------------------------------------------------------------------------
// Lives as a client component so it can use useT() for the localized chrome
// strings (D-23: operator-facing chrome lives in i18n, not hardcoded).
//
// The empty-state UI is rendered conditionally HERE (not in the server page)
// so it can use the same translator. The server page does NOT define its own
// EmptyState — keeps the i18n surface in one place.
// =============================================================================

interface NewsListChromeProps {
  itemCount: number
}

export function NewsListChrome({ itemCount }: NewsListChromeProps) {
  const t = useT()
  return (
    <>
      <div className="mb-8 flex flex-wrap items-end justify-between gap-4">
        <div>
          <div className="inline-flex items-center gap-1.5 rounded-full border border-indigo-200/60 bg-indigo-50 px-3 py-1 text-[11px] font-semibold text-indigo-700">
            <span className="h-1.5 w-1.5 rounded-full bg-indigo-500 shadow-[0_0_8px_rgba(99,102,241,0.8)]" />
            {itemCount} {itemCount === 1 ? 'item' : 'items'}
          </div>
          <h1 className="mt-3 text-3xl font-semibold tracking-tight text-gray-900">
            {t('operator.news.pageTitle')}
          </h1>
          <p className="mt-2 max-w-xl text-sm leading-relaxed text-gray-500">
            {t('operator.news.pageDescription')}
          </p>
        </div>
        <Link
          href="/admin/news/new"
          className="inline-flex items-center gap-2 rounded-xl bg-gradient-to-br from-indigo-600 via-violet-600 to-fuchsia-600 px-4 py-2.5 text-sm font-semibold text-white shadow-lg shadow-violet-600/30 transition-all hover:-translate-y-0.5 hover:shadow-xl"
        >
          {t('operator.news.createButton')}
        </Link>
      </div>

      {itemCount === 0 && (
        <div className="rounded-2xl border border-dashed border-gray-300 bg-gray-50/50 p-12 text-center">
          <p className="text-sm text-gray-500">
            {t('operator.news.listEmpty')}
          </p>
          <Link
            href="/admin/news/new"
            className="mt-4 inline-flex items-center gap-2 rounded-xl bg-gradient-to-br from-indigo-600 to-violet-600 px-4 py-2 text-xs font-semibold text-white shadow-sm hover:shadow-md"
          >
            {t('operator.news.createButton')}
          </Link>
        </div>
      )}
    </>
  )
}
