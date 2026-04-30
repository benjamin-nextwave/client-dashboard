import { createAdminClient } from '@/lib/supabase/admin'
import { NewsCard, type NewsCardItem } from '@/components/admin/news-card'
import { NewsListChrome } from './_components/news-list-chrome'

export const dynamic = 'force-dynamic'

const NEWS_BUCKET = 'news-images'

export default async function NewsListPage() {
  const supabase = createAdminClient()

  const { data: rows, error } = await supabase
    .from('news_items')
    .select('id, title_nl, title_en, status, image_path, created_at, published_at')
    .order('created_at', { ascending: false })

  if (error) {
    return (
      <div className="mx-auto max-w-7xl">
        <div className="rounded-2xl border border-red-200 bg-red-50 p-6 text-sm text-red-800">
          Nieuwsberichten ophalen mislukt: {error.message}
        </div>
      </div>
    )
  }

  // Build public image URLs from image_path. The bucket is public; getPublicUrl is
  // a deterministic URL builder (no network call), so this is cheap.
  const items: NewsCardItem[] = (rows ?? []).map((row) => {
    let imageUrl: string | null = null
    if (row.image_path) {
      const { data } = supabase.storage.from(NEWS_BUCKET).getPublicUrl(row.image_path)
      imageUrl = data.publicUrl
    }
    return {
      id: row.id,
      title_nl: row.title_nl ?? '',
      title_en: row.title_en ?? '',
      status: row.status as 'draft' | 'published' | 'withdrawn',
      image_url: imageUrl,
      created_at: row.created_at,
      published_at: row.published_at ?? null,
    }
  })

  return (
    <div className="mx-auto max-w-7xl">
      <NewsListChrome itemCount={items.length} />

      {items.length > 0 && (
        <div className="grid grid-cols-1 gap-6 sm:grid-cols-2 lg:grid-cols-3">
          {items.map((item) => (
            <NewsCard key={item.id} item={item} />
          ))}
        </div>
      )}
    </div>
  )
}
