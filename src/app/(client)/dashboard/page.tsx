import type { Metadata } from 'next'
import { redirect } from 'next/navigation'
import { getClientBranding } from '@/lib/client/get-client-branding'
import { getOverviewStats, getDailyStats } from '@/lib/data/campaign-stats'
import { OverzichtDashboard } from './_components/overzicht-dashboard'
import { RefreshButton } from './_components/refresh-button'

export const metadata: Metadata = { title: 'Overzicht' }
export const dynamic = 'force-dynamic'

function getDateRange(range: string | undefined): { startDate?: string; endDate?: string; label: string } {
  const now = new Date()
  const endDate = now.toISOString().split('T')[0]

  switch (range) {
    case '7d':
      return {
        startDate: new Date(Date.now() - 7 * 24 * 60 * 60 * 1000).toISOString().split('T')[0],
        endDate,
        label: 'Afgelopen 7 dagen',
      }
    case '30d':
      return {
        startDate: new Date(Date.now() - 30 * 24 * 60 * 60 * 1000).toISOString().split('T')[0],
        endDate,
        label: 'Afgelopen 30 dagen',
      }
    case '90d':
      return {
        startDate: new Date(Date.now() - 90 * 24 * 60 * 60 * 1000).toISOString().split('T')[0],
        endDate,
        label: 'Afgelopen 90 dagen',
      }
    case 'all':
      return { label: 'Alle tijd' }
    default:
      return {
        startDate: new Date(Date.now() - 30 * 24 * 60 * 60 * 1000).toISOString().split('T')[0],
        endDate,
        label: 'Afgelopen 30 dagen',
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

  const params = await searchParams
  const { startDate, endDate, label: periodLabel } = getDateRange(params.range)

  const [stats, dailyStats] = await Promise.all([
    getOverviewStats(client.id, startDate, endDate),
    getDailyStats(client.id, startDate, endDate),
  ])

  return (
    <div>
      <div className="mb-6 flex items-center justify-between">
        <h1 className="text-2xl font-bold text-gray-900">Overzicht</h1>
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
