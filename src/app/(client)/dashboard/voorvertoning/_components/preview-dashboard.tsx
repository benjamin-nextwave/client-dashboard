'use client'

import { format } from 'date-fns'
import { nl } from 'date-fns/locale'

interface Entry {
  title?: string
  name?: string
  percentage: number
}

interface PreviewDashboardProps {
  contactCount: number | null
  jobTitles: Entry[]
  industries: Entry[]
  locations: Entry[]
  launchDate: string | null
}

const CHART_COLORS = [
  '#3B82F6', '#10B981', '#F59E0B', '#EF4444', '#8B5CF6',
  '#EC4899', '#06B6D4', '#F97316', '#14B8A6', '#6366F1',
  '#84CC16', '#E11D48', '#0EA5E9', '#D946EF', '#22C55E',
]

function DonutChart({ items, label }: { items: { name: string; percentage: number }[]; label: string }) {
  const size = 180
  const strokeWidth = 32
  const radius = (size - strokeWidth) / 2
  const circumference = 2 * Math.PI * radius
  const center = size / 2

  let cumulativePercent = 0
  const segments = items.map((item, i) => {
    const offset = circumference * (1 - cumulativePercent / 100)
    const length = circumference * (item.percentage / 100)
    cumulativePercent += item.percentage
    return {
      ...item,
      offset,
      length,
      color: CHART_COLORS[i % CHART_COLORS.length],
    }
  })

  // Remaining percentage
  const totalPct = items.reduce((sum, i) => sum + i.percentage, 0)
  const remaining = Math.max(0, 100 - totalPct)

  return (
    <div className="flex flex-col items-center">
      <div className="relative">
        <svg width={size} height={size} className="-rotate-90">
          {/* Background circle */}
          <circle
            cx={center}
            cy={center}
            r={radius}
            fill="none"
            stroke="#F3F4F6"
            strokeWidth={strokeWidth}
          />
          {/* Segments */}
          {segments.map((seg, i) => (
            <circle
              key={i}
              cx={center}
              cy={center}
              r={radius}
              fill="none"
              stroke={seg.color}
              strokeWidth={strokeWidth}
              strokeDasharray={`${seg.length} ${circumference - seg.length}`}
              strokeDashoffset={seg.offset}
              className="transition-all duration-500"
            />
          ))}
        </svg>
        <div className="absolute inset-0 flex flex-col items-center justify-center">
          <span className="text-2xl font-bold text-gray-900">
            {totalPct}%
          </span>
          <span className="text-xs text-gray-500">{label}</span>
        </div>
      </div>
      {/* Legend */}
      <div className="mt-4 space-y-1.5 w-full">
        {segments.map((seg, i) => (
          <div key={i} className="flex items-center justify-between text-sm">
            <div className="flex items-center gap-2 min-w-0">
              <span
                className="h-2.5 w-2.5 flex-shrink-0 rounded-full"
                style={{ backgroundColor: seg.color }}
              />
              <span className="truncate text-gray-700">{seg.name}</span>
            </div>
            <span className="ml-2 flex-shrink-0 font-medium text-gray-900">{seg.percentage}%</span>
          </div>
        ))}
        {remaining > 0 && (
          <div className="flex items-center justify-between text-sm">
            <div className="flex items-center gap-2">
              <span className="h-2.5 w-2.5 flex-shrink-0 rounded-full bg-gray-200" />
              <span className="text-gray-500">Overig</span>
            </div>
            <span className="ml-2 font-medium text-gray-400">{remaining}%</span>
          </div>
        )}
      </div>
    </div>
  )
}

function HorizontalBarChart({ items }: { items: { name: string; percentage: number }[] }) {
  const sorted = [...items].sort((a, b) => b.percentage - a.percentage)

  return (
    <div className="space-y-3">
      {sorted.map((item, i) => (
        <div key={i}>
          <div className="flex items-center justify-between mb-1">
            <span className="text-sm text-gray-700">{item.name}</span>
            <span className="text-sm font-medium text-gray-900">{item.percentage}%</span>
          </div>
          <div className="h-3 w-full overflow-hidden rounded-full bg-gray-100">
            <div
              className="h-full rounded-full transition-all duration-700"
              style={{
                width: `${item.percentage}%`,
                backgroundColor: CHART_COLORS[i % CHART_COLORS.length],
              }}
            />
          </div>
        </div>
      ))}
    </div>
  )
}

export function PreviewDashboard({
  contactCount,
  jobTitles,
  industries,
  locations,
  launchDate,
}: PreviewDashboardProps) {
  const jobTitleItems = jobTitles.map((jt) => ({
    name: jt.title ?? jt.name ?? '',
    percentage: jt.percentage,
  }))
  const industryItems = industries.map((i) => ({
    name: i.name ?? '',
    percentage: i.percentage,
  }))
  const locationItems = locations.map((l) => ({
    name: l.name ?? '',
    percentage: l.percentage,
  }))

  return (
    <div className="mt-6 space-y-6">
      {/* Top row: Contact count + Launch date */}
      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
        {contactCount != null && (
          <div className="rounded-xl border border-gray-200 bg-white p-6">
            <p className="text-sm font-medium text-gray-500">Aantal contacten</p>
            <p className="mt-2 text-3xl font-bold" style={{ color: 'var(--brand-color)' }}>
              {contactCount.toLocaleString('nl-NL')}
            </p>
            <p className="mt-1 text-xs text-gray-400">Unieke contactpersonen in de campagne</p>
          </div>
        )}
        {launchDate && (
          <div className="rounded-xl border border-gray-200 bg-white p-6">
            <p className="text-sm font-medium text-gray-500">Livegang</p>
            <p className="mt-2 text-3xl font-bold" style={{ color: 'var(--brand-color)' }}>
              {format(new Date(launchDate), 'd MMMM yyyy', { locale: nl })}
            </p>
            <p className="mt-1 text-xs text-gray-400">Geplande startdatum van de campagne</p>
          </div>
        )}
      </div>

      {/* Charts row */}
      <div className="grid grid-cols-1 gap-6 lg:grid-cols-2">
        {/* Job titles - Donut chart */}
        {jobTitleItems.length > 0 && (
          <div className="rounded-xl border border-gray-200 bg-white p-6">
            <h2 className="text-sm font-semibold text-gray-900 mb-4">Functietitels</h2>
            <DonutChart items={jobTitleItems} label="Ingevuld" />
          </div>
        )}

        {/* Industries - Donut chart */}
        {industryItems.length > 0 && (
          <div className="rounded-xl border border-gray-200 bg-white p-6">
            <h2 className="text-sm font-semibold text-gray-900 mb-4">Industrie</h2>
            <DonutChart items={industryItems} label="Ingevuld" />
          </div>
        )}
      </div>

      {/* Locations - Bar chart (full width) */}
      {locationItems.length > 0 && (
        <div className="rounded-xl border border-gray-200 bg-white p-6">
          <h2 className="text-sm font-semibold text-gray-900 mb-4">Locatie</h2>
          <HorizontalBarChart items={locationItems} />
        </div>
      )}
    </div>
  )
}
