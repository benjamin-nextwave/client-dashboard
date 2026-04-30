'use client'

import {
  LineChart,
  Line,
  XAxis,
  YAxis,
  ResponsiveContainer,
  Tooltip,
  CartesianGrid,
  Legend,
} from 'recharts'
import { format } from 'date-fns'
import { nl, enUS, hi } from 'date-fns/locale'
import { useT, useLocale } from '@/lib/i18n/client'

const DATE_LOCALES = { nl, en: enUS, hi }

interface DailyChartProps {
  data: { date: string; emailsSent: number; replies: number }[]
  brandColor: string
}

const REPLIES_COLOR = '#10B981' // green-500

export function DailyChart({ data, brandColor }: DailyChartProps) {
  const t = useT()
  const locale = useLocale()
  const dateLocale = DATE_LOCALES[locale] ?? nl

  if (data.length === 0) {
    return (
      <div className="rounded-lg bg-white p-6 shadow-sm">
        <h3 className="text-base font-semibold text-gray-900">{t('overview.dailyOverview')}</h3>
        <p className="mt-4 text-sm text-gray-500">{t('overview.dailyNoData')}</p>
      </div>
    )
  }

  const chartData = data.map((d) => ({
    ...d,
    label: format(new Date(d.date), 'd MMM', { locale: dateLocale }),
  }))

  return (
    <div className="rounded-lg bg-white p-6 shadow-sm">
      <h3 className="mb-4 text-base font-semibold text-gray-900">{t('overview.dailyOverview')}</h3>
      <ResponsiveContainer width="100%" height={320}>
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
            formatter={(value, name) => [
              Number(value).toLocaleString('nl-NL'),
              name === 'emailsSent' ? t('overview.legendSent') : t('overview.legendReplies'),
            ]}
            labelFormatter={(label) => label}
            contentStyle={{
              borderRadius: '0.5rem',
              border: 'none',
              boxShadow: '0 1px 3px rgba(0,0,0,0.1)',
            }}
          />
          <Legend
            formatter={(value: string) =>
              value === 'emailsSent' ? t('overview.statEmailsSent') : t('overview.legendReplies')
            }
            iconType="line"
          />
          <Line
            type="monotone"
            dataKey="emailsSent"
            stroke={brandColor}
            strokeWidth={2}
            dot={{ r: 2, fill: brandColor }}
            activeDot={{ r: 5 }}
          />
          <Line
            type="monotone"
            dataKey="replies"
            stroke={REPLIES_COLOR}
            strokeWidth={2}
            dot={{ r: 2, fill: REPLIES_COLOR }}
            activeDot={{ r: 5 }}
          />
        </LineChart>
      </ResponsiveContainer>
    </div>
  )
}
