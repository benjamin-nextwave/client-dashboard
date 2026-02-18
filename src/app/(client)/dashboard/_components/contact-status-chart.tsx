'use client'

import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  ResponsiveContainer,
  Tooltip,
  Cell,
} from 'recharts'

interface ContactStatusChartProps {
  data: { status: string; count: number }[]
}

const STATUS_COLORS: Record<string, string> = {
  Gemaild: '#3B82F6',
  Geopend: '#F59E0B',
  Beantwoord: '#22C55E',
  Gebounced: '#EF4444',
  'Nog niet gemaild': '#9CA3AF',
}

const DEFAULT_COLOR = '#6B7280'

export function ContactStatusChart({ data }: ContactStatusChartProps) {
  if (data.length === 0) {
    return (
      <div className="rounded-lg bg-white p-6 shadow-sm">
        <h3 className="text-base font-semibold text-gray-900">Contactstatus</h3>
        <p className="mt-4 text-sm text-gray-500">Geen data beschikbaar</p>
      </div>
    )
  }

  return (
    <div className="rounded-lg bg-white p-6 shadow-sm">
      <h3 className="mb-4 text-base font-semibold text-gray-900">Contactstatus</h3>
      <ResponsiveContainer width="100%" height={300}>
        <BarChart data={data} layout="vertical" margin={{ left: 20 }}>
          <XAxis type="number" />
          <YAxis type="category" dataKey="status" width={130} tick={{ fontSize: 13 }} />
          <Tooltip
            formatter={(value) => [value, 'Aantal']}
            contentStyle={{ borderRadius: '0.5rem', border: 'none', boxShadow: '0 1px 3px rgba(0,0,0,0.1)' }}
          />
          <Bar dataKey="count" radius={[0, 4, 4, 0]} barSize={28}>
            {data.map((entry, index) => (
              <Cell
                key={`cell-${index}`}
                fill={STATUS_COLORS[entry.status] ?? DEFAULT_COLOR}
              />
            ))}
          </Bar>
        </BarChart>
      </ResponsiveContainer>
    </div>
  )
}
