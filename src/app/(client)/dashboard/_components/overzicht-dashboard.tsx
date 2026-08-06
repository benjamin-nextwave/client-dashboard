'use client'

import { StatsCards } from './stats-cards'
import { DailyChart } from './daily-chart'
import { DateRangePicker } from './date-range-picker'
import { ComingSoonCharts } from './coming-soon-charts'
import { SendingFootprintCards } from './sending-footprint'
import type { SendingFootprint } from '@/lib/data/campaign-stats'
import { EmptyState } from '@/components/client/ui/empty-state'
import { useT } from '@/lib/i18n/client'

interface OverzichtDashboardProps {
  emailsSent: number
  uniqueReplies: number
  bounced: number
  dailyStats: { date: string; emailsSent: number; replies: number }[]
  brandColor: string
  currentRange: string
  periodLabel: string
  footprint: SendingFootprint
}

export function OverzichtDashboard({
  emailsSent,
  uniqueReplies,
  bounced,
  dailyStats,
  brandColor,
  currentRange,
  periodLabel,
  footprint,
}: OverzichtDashboardProps) {
  const t = useT()
  const hasData = emailsSent > 0 || uniqueReplies > 0

  if (!hasData) {
    return (
      <EmptyState
        icon={
          <svg className="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
            <path strokeLinecap="round" strokeLinejoin="round" d="M3.75 3v11.25A2.25 2.25 0 006 16.5h2.25M3.75 3h-1.5m1.5 0h16.5m0 0h1.5m-1.5 0v11.25A2.25 2.25 0 0118 16.5h-2.25m-7.5 0h7.5m-7.5 0l-1 3m8.5-3l1 3m0 0l.5 1.5m-.5-1.5h-9.5m0 0l-.5 1.5m.75-9l3-1.5M12 12.75l3 1.5m-3-1.5V18" />
          </svg>
        }
        title={t('overview.noDataTitle')}
        description={t('overview.noDataDescription')}
      />
    )
  }

  return (
    <div className="space-y-4">
      <DateRangePicker currentRange={currentRange} />

      <StatsCards
        emailsSent={emailsSent}
        uniqueReplies={uniqueReplies}
        bounced={bounced}
        periodLabel={periodLabel}
        dailyStats={dailyStats}
      />

      <SendingFootprintCards
        mailboxes={footprint.mailboxes}
        domains={footprint.domains}
        entries={footprint.entries}
      />

      <DailyChart data={dailyStats} brandColor={brandColor} />

      <p className="text-center text-[11.5px] text-faint">
        {t('overview.refreshHint')}
      </p>

      <ComingSoonCharts />
    </div>
  )
}
