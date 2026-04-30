'use client'

import { useTransition } from 'react'
import { useRouter } from 'next/navigation'
import { useT } from '@/lib/i18n/client'
import {
  publishNewsItem,
  withdrawNewsItem,
  deleteNewsItem,
} from '../actions'

// =============================================================================
// NewsItemActionPanel — status-aware action buttons for the edit page
// -----------------------------------------------------------------------------
// Visibility (mirrors news-card.tsx + D-06):
//   draft     → Publish + Delete
//   published → Withdraw + Delete
//   withdrawn → Delete only (no further state transition in Phase 9)
//
// All three server actions are id-keyed (NOT useActionState-shaped per 09-03).
// Calls go through useTransition so the buttons surface a pending state without
// needing an inline form.
//
// On success:
//   publish/withdraw → router.refresh() so the server-rendered status badge updates
//   delete            → router.push('/admin/news') back to the list
// =============================================================================

interface NewsItemActionPanelProps {
  newsItemId: string
  status: 'draft' | 'published' | 'withdrawn'
}

export function NewsItemActionPanel({ newsItemId, status }: NewsItemActionPanelProps) {
  const t = useT()
  const router = useRouter()
  const [pending, startTransition] = useTransition()

  function onPublish() {
    startTransition(async () => {
      const result = await publishNewsItem(newsItemId)
      if (result.error) {
        alert(result.error)
      } else {
        router.refresh()
      }
    })
  }

  function onWithdraw() {
    startTransition(async () => {
      const result = await withdrawNewsItem(newsItemId)
      if (result.error) {
        alert(result.error)
      } else {
        router.refresh()
      }
    })
  }

  function onDelete() {
    if (!confirm('Dit nieuwsbericht definitief verwijderen?')) return
    startTransition(async () => {
      const result = await deleteNewsItem(newsItemId)
      if (result.error) {
        alert(result.error)
      } else {
        router.push('/admin/news')
      }
    })
  }

  return (
    <div className="mt-8 rounded-2xl border border-gray-200 bg-gray-50/60 p-5">
      <div className="mb-3 text-xs font-semibold uppercase tracking-wide text-gray-500">
        Acties
      </div>
      <div className="flex flex-wrap gap-2">
        {(status === 'draft' || status === 'withdrawn') && (
          <button
            type="button"
            onClick={onPublish}
            disabled={pending}
            className="inline-flex items-center gap-2 rounded-xl bg-gradient-to-br from-indigo-600 via-violet-600 to-fuchsia-600 px-4 py-2 text-xs font-semibold text-white shadow-sm transition-all hover:shadow disabled:cursor-not-allowed disabled:opacity-50"
          >
            {pending ? t('operator.news.publishing') : t('operator.news.publishButton')}
          </button>
        )}
        {status === 'published' && (
          <button
            type="button"
            onClick={onWithdraw}
            disabled={pending}
            className="inline-flex items-center gap-2 rounded-xl border border-amber-200 bg-amber-50 px-4 py-2 text-xs font-semibold text-amber-700 transition-all hover:border-amber-300 hover:bg-amber-100 disabled:cursor-not-allowed disabled:opacity-50"
          >
            {pending ? t('operator.news.withdrawing') : t('operator.news.withdrawButton')}
          </button>
        )}
        <button
          type="button"
          onClick={onDelete}
          disabled={pending}
          className="inline-flex items-center gap-2 rounded-xl border border-red-200 bg-red-50 px-4 py-2 text-xs font-semibold text-red-700 transition-all hover:border-red-300 hover:bg-red-100 disabled:cursor-not-allowed disabled:opacity-50"
        >
          Verwijderen
        </button>
      </div>
    </div>
  )
}
