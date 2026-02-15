'use client'

import {
  PieChart,
  Pie,
  Cell,
  ResponsiveContainer,
  Tooltip,
  Legend,
} from 'recharts'

interface NameValue {
  name: string
  value: number
}

interface ICPChartsProps {
  industryData: NameValue[]
  jobTitleData: NameValue[]
  positivePatterns: {
    industries: NameValue[]
    jobTitles: NameValue[]
  }
  brandColor: string
}

function generateColors(brandColor: string, count: number): string[] {
  const colors: string[] = []
  const opacities = [1, 0.8, 0.6, 0.4, 0.2]

  for (let i = 0; i < count; i++) {
    if (i < 5) {
      colors.push(hexWithOpacity(brandColor, opacities[i]))
    } else {
      colors.push('#D1D5DB')
    }
  }

  return colors
}

function hexWithOpacity(hex: string, opacity: number): string {
  // Convert hex to RGB and mix with white based on opacity
  const r = parseInt(hex.slice(1, 3), 16)
  const g = parseInt(hex.slice(3, 5), 16)
  const b = parseInt(hex.slice(5, 7), 16)

  const mixedR = Math.round(r * opacity + 255 * (1 - opacity))
  const mixedG = Math.round(g * opacity + 255 * (1 - opacity))
  const mixedB = Math.round(b * opacity + 255 * (1 - opacity))

  return `rgb(${mixedR}, ${mixedG}, ${mixedB})`
}

function DonutChart({ data, colors, height = 300 }: { data: NameValue[]; colors: string[]; height?: number }) {
  return (
    <ResponsiveContainer width="100%" height={height}>
      <PieChart>
        <Pie
          data={data}
          cx="50%"
          cy="50%"
          innerRadius={60}
          outerRadius={100}
          dataKey="value"
          nameKey="name"
        >
          {data.map((_, index) => (
            <Cell key={`cell-${index}`} fill={colors[index % colors.length]} />
          ))}
        </Pie>
        <Tooltip
          formatter={(value) => [value, 'Contacten']}
          contentStyle={{ borderRadius: '0.5rem', border: 'none', boxShadow: '0 1px 3px rgba(0,0,0,0.1)' }}
        />
        <Legend />
      </PieChart>
    </ResponsiveContainer>
  )
}

function EmptyState() {
  return <p className="py-8 text-center text-sm text-gray-500">Geen data beschikbaar</p>
}

export function ICPCharts({ industryData, jobTitleData, positivePatterns, brandColor }: ICPChartsProps) {
  const safeColor = brandColor && brandColor.startsWith('#') ? brandColor : '#3B82F6'

  return (
    <div className="space-y-6">
      {/* STAT-07: Sector verdeling */}
      <div className="rounded-lg bg-white p-6 shadow-sm">
        <h3 className="mb-4 text-base font-semibold text-gray-900">Sector verdeling</h3>
        {industryData.length === 0 ? (
          <EmptyState />
        ) : (
          <DonutChart data={industryData} colors={generateColors(safeColor, industryData.length)} />
        )}
      </div>

      {/* STAT-08: Functie verdeling */}
      <div className="rounded-lg bg-white p-6 shadow-sm">
        <h3 className="mb-4 text-base font-semibold text-gray-900">Functie verdeling</h3>
        {jobTitleData.length === 0 ? (
          <EmptyState />
        ) : (
          <DonutChart data={jobTitleData} colors={generateColors(safeColor, jobTitleData.length)} />
        )}
      </div>

      {/* STAT-09: ICP Vorming */}
      <div className="rounded-lg bg-white p-6 shadow-sm">
        <h3 className="mb-4 text-base font-semibold text-gray-900">ICP Vorming</h3>
        <div className="grid grid-cols-1 gap-6 md:grid-cols-2">
          <div>
            <h4 className="mb-2 text-sm font-medium text-gray-700">Sectoren bij positieve leads</h4>
            {positivePatterns.industries.length === 0 ? (
              <EmptyState />
            ) : (
              <DonutChart
                data={positivePatterns.industries}
                colors={generateColors(safeColor, positivePatterns.industries.length)}
                height={250}
              />
            )}
          </div>
          <div>
            <h4 className="mb-2 text-sm font-medium text-gray-700">Functies bij positieve leads</h4>
            {positivePatterns.jobTitles.length === 0 ? (
              <EmptyState />
            ) : (
              <DonutChart
                data={positivePatterns.jobTitles}
                colors={generateColors(safeColor, positivePatterns.jobTitles.length)}
                height={250}
              />
            )}
          </div>
        </div>
      </div>
    </div>
  )
}
