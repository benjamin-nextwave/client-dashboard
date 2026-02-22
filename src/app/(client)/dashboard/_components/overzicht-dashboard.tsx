'use client'

import { StatsCards } from './stats-cards'
import { EmailsPerDayChart } from './emails-per-day-chart'
import { ComingSoonCharts } from './coming-soon-charts'
import { DateRangePicker } from './date-range-picker'
import { EmptyState } from '@/components/ui/empty-state'

interface OverzichtDashboardProps {
  unansweredPositive: number
  totalReplies: number
  positiveLeads: number
  emailsSent: number
  dailyEmailsSent: { date: string; count: number }[]
  brandColor: string
  currentRange: string
  periodLabel: string
}

export function OverzichtDashboard({
  unansweredPositive,
  totalReplies,
  positiveLeads,
  emailsSent,
  dailyEmailsSent,
  brandColor,
  currentRange,
  periodLabel,
}: OverzichtDashboardProps) {
  const hasData = emailsSent > 0

  if (!hasData) {
    return (
      <EmptyState
        icon={
          <svg className="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
            <path strokeLinecap="round" strokeLinejoin="round" d="M3.75 3v11.25A2.25 2.25 0 006 16.5h2.25M3.75 3h-1.5m1.5 0h16.5m0 0h1.5m-1.5 0v11.25A2.25 2.25 0 0118 16.5h-2.25m-7.5 0h7.5m-7.5 0l-1 3m8.5-3l1 3m0 0l.5 1.5m-.5-1.5h-9.5m0 0l-.5 1.5m.75-9l3-1.5M12 12.75l3 1.5m-3-1.5V18" />
          </svg>
        }
        title="Welkom bij NextWave"
        description="Zodra uw campagnes zijn gesynchroniseerd, verschijnen hier uw statistieken en leads."
      />
    )
  }

  return (
    <div className="space-y-6">
      <StatsCards
        unansweredPositive={unansweredPositive}
        totalReplies={totalReplies}
        positiveLeads={positiveLeads}
        emailsSent={emailsSent}
        periodLabel={periodLabel}
      />

      <DateRangePicker currentRange={currentRange} />

      <EmailsPerDayChart data={dailyEmailsSent} brandColor={brandColor} />

      <ComingSoonCharts />
    </div>
  )
}
