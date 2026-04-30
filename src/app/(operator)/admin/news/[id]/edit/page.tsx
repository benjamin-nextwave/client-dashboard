import Link from 'next/link'
import { notFound } from 'next/navigation'
import { createAdminClient } from '@/lib/supabase/admin'
import { NewsForm } from '@/components/admin/news-form'
import { updateNewsItem } from '../../actions'
import { EditNewsHeader } from '../../_components/news-page-headers'
import { NewsItemActionPanel } from '../../_components/news-item-action-panel'

export const dynamic = 'force-dynamic'

const NEWS_BUCKET = 'news-images'

interface EditNewsPageProps {
  params: Promise<{ id: string }>
}

export default async function EditNewsPage({ params }: EditNewsPageProps) {
  const { id } = await params

  const supabase = createAdminClient()

  const { data: row, error } = await supabase
    .from('news_items')
    .select(
      'id, title_nl, title_en, title_hi, body_nl, body_en, body_hi, image_path, status, created_at, published_at, withdrawn_at'
    )
    .eq('id', id)
    .single()

  if (error || !row) {
    notFound()
  }

  let currentImageUrl: string | null = null
  if (row.image_path) {
    const { data } = supabase.storage.from(NEWS_BUCKET).getPublicUrl(row.image_path)
    currentImageUrl = data.publicUrl
  }

  const boundUpdate = updateNewsItem.bind(null, row.id)

  // Status label is computed server-side as a stable Dutch literal — matches the
  // operator's primary working language. The header is a client component so it
  // can use useT() for the rest of the chrome.
  const statusLabelMap: Record<string, string> = {
    draft: 'Concept',
    published: 'Gepubliceerd',
    withdrawn: 'Ingetrokken',
  }
  const statusLabel = statusLabelMap[row.status] ?? row.status

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

      <EditNewsHeader statusLabel={statusLabel} />

      <NewsForm
        key={row.id}
        action={boundUpdate}
        isEditing
        currentImageUrl={currentImageUrl}
        defaultValues={{
          title_nl: row.title_nl ?? '',
          title_en: row.title_en ?? '',
          title_hi: row.title_hi ?? '',
          body_nl: row.body_nl ?? '',
          body_en: row.body_en ?? '',
          body_hi: row.body_hi ?? '',
        }}
      />

      {/* Status-aware action panel: Publish (drafts) / Withdraw (published) / Delete (always) */}
      <NewsItemActionPanel
        newsItemId={row.id}
        status={row.status as 'draft' | 'published' | 'withdrawn'}
      />
    </div>
  )
}
