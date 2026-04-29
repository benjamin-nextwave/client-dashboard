'use client'

import { useT } from '@/lib/i18n/client'

// =============================================================================
// News page headers — chrome for /admin/news/new and /admin/news/[id]/edit
// -----------------------------------------------------------------------------
// Both headers live in the same file so the new/edit pages share a single
// import surface. Each is a client component because it uses useT() (D-23).
// =============================================================================

export function NewNewsHeader() {
  const t = useT()
  return (
    <div className="mt-5 mb-8">
      <div className="inline-flex items-center gap-1.5 rounded-full border border-indigo-200/60 bg-indigo-50 px-3 py-1 text-[11px] font-semibold text-indigo-700">
        <span className="h-1.5 w-1.5 rounded-full bg-indigo-500 shadow-[0_0_8px_rgba(99,102,241,0.8)]" />
        {t('operator.news.createButton')}
      </div>
      <h1 className="mt-3 text-3xl font-semibold tracking-tight text-gray-900">
        {t('operator.news.createButton')}
      </h1>
      <p className="mt-2 max-w-xl text-sm leading-relaxed text-gray-500">
        {t('operator.news.sectionContentDescription')}
      </p>
    </div>
  )
}

export function EditNewsHeader({ statusLabel }: { statusLabel: string }) {
  const t = useT()
  return (
    <div className="mt-5 mb-8">
      <div className="inline-flex items-center gap-1.5 rounded-full border border-indigo-200/60 bg-indigo-50 px-3 py-1 text-[11px] font-semibold text-indigo-700">
        <span className="h-1.5 w-1.5 rounded-full bg-indigo-500 shadow-[0_0_8px_rgba(99,102,241,0.8)]" />
        {statusLabel}
      </div>
      <h1 className="mt-3 text-3xl font-semibold tracking-tight text-gray-900">
        {t('operator.news.pageTitle')}
      </h1>
    </div>
  )
}
