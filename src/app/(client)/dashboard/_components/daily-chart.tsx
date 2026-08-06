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
import { Panel } from '@/components/client/ui/panel'

const DATE_LOCALES = { nl, en: enUS, hi }

interface DailyChartProps {
  data: { date: string; emailsSent: number; replies: number }[]
  brandColor: string
}

// Reacties in een lichtere merk-tint in plaats van een losse groene kleur,
// zodat de grafiek één kleurfamilie houdt.
const REPLIES_COLOR = 'var(--brand-40)'

export function DailyChart({ data, brandColor }: DailyChartProps) {
  const t = useT()
  const locale = useLocale()
  const dateLocale = DATE_LOCALES[locale] ?? nl

  if (data.length === 0) {
    return (
      <Panel title={t('overview.dailyOverview')}>
        <p className="text-[12.5px] text-muted">{t('overview.dailyNoData')}</p>
      </Panel>
    )
  }

  const chartData = data.map((d) => ({
    ...d,
    label: format(new Date(d.date), 'd MMM', { locale: dateLocale }),
  }))

  return (
    <Panel title={t('overview.dailyOverview')} bodyClassName="px-3 pb-3 pt-[18px]">
      <ResponsiveContainer width="100%" height={320}>
        <LineChart data={chartData} margin={{ left: 0, right: 12, top: 8, bottom: 0 }}>
          <CartesianGrid strokeDasharray="3 3" stroke="var(--c-line)" vertical={false} />
          <XAxis
            dataKey="label"
            tick={{ fontSize: 10, fill: 'var(--c-faint)' }}
            tickLine={false}
            axisLine={{ stroke: 'var(--c-line)' }}
          />
          <YAxis
            allowDecimals={false}
            tick={{ fontSize: 10, fill: 'var(--c-faint)' }}
            tickLine={false}
            axisLine={{ stroke: 'var(--c-line)' }}
          />
          <Tooltip
            formatter={(value, name) => [
              Number(value).toLocaleString('nl-NL'),
              name === 'emailsSent' ? t('overview.legendSent') : t('overview.legendReplies'),
            ]}
            labelFormatter={(label) => label}
            contentStyle={{
              borderRadius: '8px',
              border: '1px solid var(--c-line)',
              boxShadow: 'none',
              fontSize: '12.5px',
              background: 'var(--c-panel)',
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
    </Panel>
  )
}
