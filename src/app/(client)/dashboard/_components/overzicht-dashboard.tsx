'use client'

import { StatsCards } from './stats-cards'
import { DailyChart } from './daily-chart'
import { DateRangePicker } from './date-range-picker'
import { EmptyState } from '@/components/ui/empty-state'

interface OverzichtDashboardProps {
  emailsSent: number
  uniqueReplies: number
  bounced: number
  dailyStats: { date: string; emailsSent: number; replies: number }[]
  brandColor: string
  currentRange: string
  periodLabel: string
}

export function OverzichtDashboard({
  emailsSent,
  uniqueReplies,
  bounced,
  dailyStats,
  brandColor,
  currentRange,
  periodLabel,
}: OverzichtDashboardProps) {
  const hasData = emailsSent > 0 || uniqueReplies > 0

  if (!hasData) {
    return (
      <EmptyState
        icon={
          <svg className="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
            <path strokeLinecap="round" strokeLinejoin="round" d="M3.75 3v11.25A2.25 2.25 0 006 16.5h2.25M3.75 3h-1.5m1.5 0h16.5m0 0h1.5m-1.5 0v11.25A2.25 2.25 0 0118 16.5h-2.25m-7.5 0h7.5m-7.5 0l-1 3m8.5-3l1 3m0 0l.5 1.5m-.5-1.5h-9.5m0 0l-.5 1.5m.75-9l3-1.5M12 12.75l3 1.5m-3-1.5V18" />
          </svg>
        }
        title="Nog geen data"
        description="Klik op 'Ververs de data' om de nieuwste statistieken op te halen uit uw Instantly workspace."
      />
    )
  }

  return (
    <div className="space-y-6">
      <StatsCards
        emailsSent={emailsSent}
        uniqueReplies={uniqueReplies}
        bounced={bounced}
        periodLabel={periodLabel}
      />

      <DateRangePicker currentRange={currentRange} />

      <DailyChart data={dailyStats} brandColor={brandColor} />

      <p className="text-center text-xs text-gray-400">
        Klik op &ldquo;Ververs de data&rdquo; om de nieuwste statistieken op te halen.
      </p>
    </div>
  )
}
