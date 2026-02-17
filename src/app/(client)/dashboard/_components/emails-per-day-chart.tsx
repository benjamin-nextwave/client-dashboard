'use client'

import {
  LineChart,
  Line,
  XAxis,
  YAxis,
  ResponsiveContainer,
  Tooltip,
  CartesianGrid,
} from 'recharts'
import { format } from 'date-fns'
import { nl } from 'date-fns/locale'

interface EmailsPerDayChartProps {
  data: { date: string; count: number }[]
  brandColor: string
}

export function EmailsPerDayChart({ data, brandColor }: EmailsPerDayChartProps) {
  if (data.length === 0) {
    return (
      <div className="rounded-lg bg-white p-6 shadow-sm">
        <h3 className="text-base font-semibold text-gray-900">Verzonden e-mails per dag</h3>
        <p className="mt-4 text-sm text-gray-500">Geen data beschikbaar voor deze periode</p>
      </div>
    )
  }

  const chartData = data.map((d) => ({
    ...d,
    label: format(new Date(d.date), 'd MMM', { locale: nl }),
  }))

  return (
    <div className="rounded-lg bg-white p-6 shadow-sm">
      <h3 className="mb-4 text-base font-semibold text-gray-900">Verzonden e-mails per dag</h3>
      <ResponsiveContainer width="100%" height={300}>
        <LineChart data={chartData} margin={{ left: 0, right: 12, top: 8, bottom: 0 }}>
          <CartesianGrid strokeDasharray="3 3" stroke="#f0f0f0" />
          <XAxis
            dataKey="label"
            tick={{ fontSize: 12 }}
            tickLine={false}
            axisLine={{ stroke: '#e5e7eb' }}
          />
          <YAxis
            allowDecimals={false}
            tick={{ fontSize: 12 }}
            tickLine={false}
            axisLine={{ stroke: '#e5e7eb' }}
          />
          <Tooltip
            formatter={(value) => [value, 'Verzonden']}
            labelFormatter={(label) => label}
            contentStyle={{
              borderRadius: '0.5rem',
              border: 'none',
              boxShadow: '0 1px 3px rgba(0,0,0,0.1)',
            }}
          />
          <Line
            type="monotone"
            dataKey="count"
            stroke={brandColor}
            strokeWidth={2}
            dot={{ r: 3, fill: brandColor }}
            activeDot={{ r: 5 }}
          />
        </LineChart>
      </ResponsiveContainer>
    </div>
  )
}
