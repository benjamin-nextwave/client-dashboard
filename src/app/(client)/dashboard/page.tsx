import type { Metadata } from 'next'
import { redirect } from 'next/navigation'
import { getClientBranding } from '@/lib/client/get-client-branding'
import { getOverviewStats, getDailyStats } from '@/lib/data/campaign-stats'
import { getLocale, getTranslator } from '@/lib/i18n/server'
import { createClient } from '@/lib/supabase/server'
import type { Locale, Translator } from '@/lib/i18n'
import { OverzichtDashboard } from './_components/overzicht-dashboard'
import { RefreshButton } from './_components/refresh-button'
import { NewsOverlay, type NewsOverlayItem } from './_components/news-overlay'
import { NewsMegaphoneButton } from './_components/news-megaphone-button'
import type { NewsSidebarItem } from './_components/news-sidebar'

export const metadata: Metadata = { title: 'Overzicht' }
export const dynamic = 'force-dynamic'

function getDateRange(
  range: string | undefined,
  t: Translator
): { startDate?: string; endDate?: string; label: string } {
  const now = new Date()
  const endDate = now.toISOString().split('T')[0]

  switch (range) {
    case '7d':
      return {
        startDate: new Date(Date.now() - 7 * 24 * 60 * 60 * 1000).toISOString().split('T')[0],
        endDate,
        label: t('overview.rangePeriodLast', { days: 7 }),
      }
    case '30d':
      return {
        startDate: new Date(Date.now() - 30 * 24 * 60 * 60 * 1000).toISOString().split('T')[0],
        endDate,
        label: t('overview.rangePeriodLast', { days: 30 }),
      }
    case '90d':
      return {
        startDate: new Date(Date.now() - 90 * 24 * 60 * 60 * 1000).toISOString().split('T')[0],
        endDate,
        label: t('overview.rangePeriodLast', { days: 90 }),
      }
    case 'all':
      return { label: t('overview.rangeAllPeriod') }
    default:
      return {
        startDate: new Date(Date.now() - 30 * 24 * 60 * 60 * 1000).toISOString().split('T')[0],
        endDate,
        label: t('overview.rangePeriodLast', { days: 30 }),
      }
  }
}

// =============================================================================
// News data fetching helpers (Phase 10).
// =============================================================================

interface NewsRow {
  id: string
  title_nl: string
  title_en: string
  title_hi: string
  body_nl: string
  body_en: string
  body_hi: string
  image_path: string | null
  published_at: string | null
}

/**
 * Resolve the per-locale title/body for a news row, with NL fallback.
 * Phase 9's publish gate guarantees all 6 fields are non-empty for published rows,
 * so the fallback only fires if `locale` is somehow unexpected (defensive).
 */
function localizeRow(row: NewsRow, locale: Locale): { title: string; body: string } {
  const title = (
    locale === 'en' ? row.title_en :
    locale === 'hi' ? row.title_hi :
    row.title_nl
  ) || row.title_nl

  const body = (
    locale === 'en' ? row.body_en :
    locale === 'hi' ? row.body_hi :
    row.body_nl
  ) || row.body_nl

  return { title, body }
}

export default async function OverzichtPage({
  searchParams,
}: {
  searchParams: Promise<{ range?: string }>
}) {
  const client = await getClientBranding()
  if (!client) redirect('/login')

  const t = await getTranslator()
  const params = await searchParams
  const { startDate, endDate, label: periodLabel } = getDateRange(params.range, t)

  // -------------------------------------------------------------------------
  // News fetching (Phase 10 — DELIVER-01, DELIVER-04, DELIVER-05, ARCH-02..04)
  // -------------------------------------------------------------------------
  // Two queries:
  //   1. archiveRows — all currently-published items (used by the sidebar).
  //   2. dismissalRows — the current user's dismissals.
  // The unread queue is computed in TS by filtering archiveRows against the
  // dismissalRows set. Per D-17, we deliberately pick the two-query pattern
  // over a subquery-string-interpolation pattern: it avoids any string-
  // interpolation hazard and keeps the query plan simple. RLS on news_items
  // already restricts SELECT to status='published'; RLS on news_dismissals
  // restricts SELECT to user_id = auth.uid().
  const supabase = await createClient()
  const locale = await getLocale()
  const {
    data: { user },
  } = await supabase.auth.getUser()

  const newsColumns =
    'id, title_nl, title_en, title_hi, body_nl, body_en, body_hi, image_path, published_at'

  const archiveQuery = supabase
    .from('news_items')
    .select(newsColumns)
    .eq('status', 'published')
    .order('published_at', { ascending: false })

  const dismissalsQuery = user
    ? supabase
        .from('news_dismissals')
        .select('news_item_id')
        .eq('user_id', user.id)
    : Promise.resolve({ data: [] as { news_item_id: string }[], error: null })

  const [archiveResult, dismissalsResult] = await Promise.all([
    archiveQuery,
    dismissalsQuery,
  ])

  const archiveRows = (archiveResult.data ?? []) as NewsRow[]
  const dismissalIds = new Set(
    (dismissalsResult.data ?? []).map((d) => d.news_item_id)
  )

  // Resolve image_path → public URL once per row, server-side (T-3 mitigation:
  // client never sees image_path, only the resolved public URL).
  function rowToImageUrl(row: NewsRow): string | null {
    if (!row.image_path) return null
    const { data } = supabase.storage.from('news-images').getPublicUrl(row.image_path)
    return data.publicUrl
  }

  // Build sidebar items (full archive — recent-first per ARCH-02).
  const archiveItems: NewsSidebarItem[] = archiveRows.map((row) => {
    const { title, body } = localizeRow(row, locale)
    return {
      id: row.id,
      title,
      body,
      image_url: rowToImageUrl(row),
      published_at: row.published_at ?? new Date(0).toISOString(),
    }
  })

  // Build overlay queue — UNREAD items only, OLDEST FIRST (DELIVER-01 / D-17).
  // archiveRows is recent-first; reverse + filter for the unread queue.
  const unreadItems: NewsOverlayItem[] = archiveRows
    .filter((row) => !dismissalIds.has(row.id))
    .slice() // copy before reverse to avoid mutating archiveRows
    .reverse() // oldest-first per SPEC DELIVER-01 acceptance
    .map((row) => {
      const { title, body } = localizeRow(row, locale)
      return {
        id: row.id,
        title,
        body,
        image_url: rowToImageUrl(row),
      }
    })

  // -------------------------------------------------------------------------
  // Existing dashboard data fetch — UNCHANGED.
  // -------------------------------------------------------------------------
  const [stats, dailyStats] = await Promise.all([
    getOverviewStats(client.id, startDate, endDate),
    getDailyStats(client.id, startDate, endDate),
  ])

  return (
    <div>
      <div className="mb-6 flex items-center justify-between">
        <h1 className="text-2xl font-bold text-gray-900">{t('overview.title')}</h1>
        <div className="flex items-center gap-3">
          <NewsMegaphoneButton
            unreadCount={unreadItems.length}
            archiveItems={archiveItems}
          />
          <RefreshButton />
        </div>
      </div>
      <OverzichtDashboard
        emailsSent={stats.emailsSent}
        uniqueReplies={stats.uniqueReplies}
        bounced={stats.bounced}
        dailyStats={dailyStats}
        brandColor={client.primary_color ?? '#3B82F6'}
        currentRange={params.range ?? '30d'}
        periodLabel={periodLabel}
      />
      <NewsOverlay items={unreadItems} />
    </div>
  )
}
