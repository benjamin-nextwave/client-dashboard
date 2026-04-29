import type { Metadata } from 'next'
import { redirect } from 'next/navigation'
import { getClientBranding } from '@/lib/client/get-client-branding'
import { getOverviewStats, getDailyStats } from '@/lib/data/campaign-stats'
import { getTranslator } from '@/lib/i18n/server'
import { OverzichtDashboard } from './_components/overzicht-dashboard'
import { RefreshButton } from './_components/refresh-button'
import type { Translator } from '@/lib/i18n'

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

  const [stats, dailyStats] = await Promise.all([
    getOverviewStats(client.id, startDate, endDate),
    getDailyStats(client.id, startDate, endDate),
  ])

  return (
    <div>
      <div className="mb-6 flex items-center justify-between">
        <h1 className="text-2xl font-bold text-gray-900">{t('overview.title')}</h1>
        <RefreshButton />
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
    </div>
  )
}
