import Link from 'next/link'
import { NewsForm } from '@/components/admin/news-form'
import { createNewsItem } from '../actions'
import { NewNewsHeader } from '../_components/news-page-headers'

export default function NewNewsPage() {
  return (
    <div className="mx-auto max-w-3xl">
      <Link
        href="/admin/news"
        className="group inline-flex items-center gap-1.5 text-xs font-semibold text-gray-500 transition-colors hover:text-indigo-600"
      >
        <svg className="h-3.5 w-3.5 transition-transform group-hover:-translate-x-0.5" fill="none" viewBox="0 0 24 24" strokeWidth={2.5} stroke="currentColor">
          <path strokeLinecap="round" strokeLinejoin="round" d="M10.5 19.5 3 12m0 0 7.5-7.5M3 12h18" />
        </svg>
        Terug naar overzicht
      </Link>

      <NewNewsHeader />

      <NewsForm action={createNewsItem} />
    </div>
  )
}
