'use client'

import Link from 'next/link'
import { useTransition } from 'react'
import { useT } from '@/lib/i18n/client'
import {
  publishNewsItem,
  withdrawNewsItem,
} from '@/app/(operator)/admin/news/actions'

// =============================================================================
// NewsCard — list-view card with status badge + per-status action button
// -----------------------------------------------------------------------------
// Action wiring:
// - draft  → Edit (link) + Publish (button via useTransition)
// - published → Edit (link) + Withdraw (button via useTransition)
// - withdrawn → Edit (link) only — no further state transition in Phase 9
//
// The server actions perform their own status-precondition guards and (for
// publish) a server-authoritative DB re-read + newsPublishSchema gate. UI
// gating here is decoration — server is the source of truth (T-09-22).
// =============================================================================

export interface NewsCardItem {
  id: string
  title_nl: string
  title_en: string
  status: 'draft' | 'published' | 'withdrawn'
  image_url: string | null
  created_at: string
  published_at: string | null
}

export interface NewsCardProps {
  item: NewsCardItem
}

export function NewsCard({ item }: NewsCardProps) {
  const t = useT()
  const [pending, startTransition] = useTransition()

  // Display title: NL preferred, EN fallback if NL is empty (drafts can be partial).
  const displayTitle =
    item.title_nl?.trim() || item.title_en?.trim() || '(zonder titel)'

  const statusLabel: Record<NewsCardItem['status'], string> = {
    draft: t('operator.news.statusDraft'),
    published: t('operator.news.statusPublished'),
    withdrawn: t('operator.news.statusWithdrawn'),
  }

  const statusClass: Record<NewsCardItem['status'], string> = {
    draft: 'bg-gray-100 text-gray-700 ring-gray-200',
    published: 'bg-emerald-50 text-emerald-700 ring-emerald-200',
    withdrawn: 'bg-amber-50 text-amber-700 ring-amber-200',
  }

  function onPublish() {
    startTransition(async () => {
      const result = await publishNewsItem(item.id)
      if (result.error) {
        // Toast system out of scope for Phase 9; alert() is acceptable v1.1.
        alert(result.error)
      }
    })
  }

  function onWithdraw() {
    startTransition(async () => {
      const result = await withdrawNewsItem(item.id)
      if (result.error) {
        alert(result.error)
      }
    })
  }

  return (
    <div className="group flex flex-col overflow-hidden rounded-2xl border border-gray-200 bg-white shadow-sm transition-all hover:-translate-y-0.5 hover:border-indigo-200 hover:shadow-lg">
      {/* Thumbnail (or placeholder) */}
      <Link href={`/admin/news/${item.id}/edit`} className="block">
        {item.image_url ? (
          // eslint-disable-next-line @next/next/no-img-element
          <img
            src={item.image_url}
            alt=""
            className="aspect-[16/9] w-full object-cover"
          />
        ) : (
          <div className="flex aspect-[16/9] w-full items-center justify-center bg-gradient-to-br from-gray-100 to-gray-50 text-xs text-gray-400">
            {t('operator.news.previewNoImage')}
          </div>
        )}
      </Link>

      {/* Body */}
      <div className="flex flex-1 flex-col gap-3 p-5">
        <div className="flex items-start justify-between gap-3">
          <Link
            href={`/admin/news/${item.id}/edit`}
            className="line-clamp-2 text-base font-semibold leading-tight text-gray-900 transition-colors group-hover:text-indigo-600"
          >
            {displayTitle}
          </Link>
          <span
            className={`flex-shrink-0 rounded-full px-2.5 py-1 text-[10px] font-semibold uppercase tracking-wide ring-1 ${statusClass[item.status]}`}
          >
            {statusLabel[item.status]}
          </span>
        </div>

        {/* Timestamps */}
        <dl className="space-y-0.5 text-[11px] text-gray-500">
          <div className="flex items-center justify-between gap-2">
            <dt>{t('operator.news.cardCreatedAt')}</dt>
            <dd className="font-mono">{formatDate(item.created_at)}</dd>
          </div>
          <div className="flex items-center justify-between gap-2">
            <dt>{t('operator.news.cardPublishedAt')}</dt>
            <dd className="font-mono">
              {item.published_at ? formatDate(item.published_at) : '—'}
            </dd>
          </div>
        </dl>

        {/* Actions */}
        <div className="mt-auto flex items-center gap-2 pt-2">
          <Link
            href={`/admin/news/${item.id}/edit`}
            className="flex-1 rounded-lg border border-gray-200 bg-white px-3 py-1.5 text-center text-xs font-semibold text-gray-700 transition-all hover:border-gray-300 hover:bg-gray-50"
          >
            {t('operator.news.cardEditAction')}
          </Link>
          {item.status === 'draft' && (
            <button
              type="button"
              onClick={onPublish}
              disabled={pending}
              className="flex-1 rounded-lg bg-gradient-to-br from-indigo-600 via-violet-600 to-fuchsia-600 px-3 py-1.5 text-xs font-semibold text-white shadow-sm transition-all hover:shadow disabled:cursor-not-allowed disabled:opacity-50"
            >
              {pending ? t('operator.news.publishing') : t('operator.news.cardPublishAction')}
            </button>
          )}
          {item.status === 'published' && (
            <button
              type="button"
              onClick={onWithdraw}
              disabled={pending}
              className="flex-1 rounded-lg border border-amber-200 bg-amber-50 px-3 py-1.5 text-xs font-semibold text-amber-700 transition-all hover:border-amber-300 hover:bg-amber-100 disabled:cursor-not-allowed disabled:opacity-50"
            >
              {pending ? t('operator.news.withdrawing') : t('operator.news.cardWithdrawAction')}
            </button>
          )}
          {/* withdrawn: only Edit action visible (no further state transition in Phase 9) */}
        </div>
      </div>
    </div>
  )
}

function formatDate(iso: string): string {
  const d = new Date(iso)
  // Locale-stable Dutch format: 29 apr 2026
  return d.toLocaleDateString('nl-NL', { day: 'numeric', month: 'short', year: 'numeric' })
}
