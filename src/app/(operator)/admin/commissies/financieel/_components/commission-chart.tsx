'use client'

import { useEffect, useState, useTransition } from 'react'
import {
  BarChart,
  Bar,
  Cell,
  XAxis,
  YAxis,
  Tooltip,
  CartesianGrid,
  ResponsiveContainer,
  ReferenceLine,
} from 'recharts'
import { format } from 'date-fns'
import { nl } from 'date-fns/locale'
import { formatEuroCents } from '@/lib/commissions-shared'
import type { CommissionChartSeries } from '@/lib/data/commissions'
import { fetchCommissionChartSeries } from '@/app/(operator)/admin/commissies/actions'

interface ChartClient {
  id: string
  companyName: string
}

interface CommissionChartProps {
  clients: ChartClient[]
  from: string
  to: string
  initialSeries: CommissionChartSeries
}

const POSITIVE_COLOR = '#10B981' // emerald-500
const NEGATIVE_COLOR = '#EF4444' // red-500

function formatDay(dateStr: string): string {
  return format(new Date(dateStr + 'T00:00:00'), 'd MMM', { locale: nl })
}

export function CommissionChart({ clients, from, to, initialSeries }: CommissionChartProps) {
  const [selected, setSelected] = useState<Set<string>>(new Set())
  const [series, setSeries] = useState<CommissionChartSeries>(initialSeries)
  const [isPending, startTransition] = useTransition()

  // De grafiek volgt de periode (from/to) die bovenaan met de kalender gekozen
  // wordt. Zonder klantfilter is de server-geleverde initialSeries al correct
  // voor die periode; met een filter halen we de gefilterde reeks client-side op.
  useEffect(() => {
    if (selected.size === 0) {
      setSeries(initialSeries)
      return
    }
    startTransition(async () => {
      const next = await fetchCommissionChartSeries(from, to, Array.from(selected))
      setSeries(next)
    })
  }, [from, to, selected, initialSeries])

  const toggleClient = (id: string) => {
    setSelected((prev) => {
      const next = new Set(prev)
      if (next.has(id)) next.delete(id)
      else next.add(id)
      return next
    })
  }

  const chartData = series.points.map((p) => ({
    ...p,
    label: format(new Date(p.date + 'T00:00:00'), 'd MMM', { locale: nl }),
  }))

  return (
    <section className="rounded-2xl border border-gray-200 bg-white p-5 shadow-sm">
      <div>
        <h2 className="text-sm font-semibold text-gray-900">
          Netto per dag <span className="font-normal text-gray-400">· {formatDay(from)} – {formatDay(to)}</span>
        </h2>
        <p className="mt-0.5 text-xs text-gray-500">
          Commissie minus €20 dagkosten per klant, elke werkdag vanaf zijn eerste lead. De totalen staan in de
          blokken hieronder.
        </p>
      </div>

      {/* Klantfilter */}
      {clients.length > 0 && (
        <div className="mt-4 flex flex-wrap items-center gap-2">
          <button
            type="button"
            onClick={() => setSelected(new Set())}
            className={`rounded-full px-3 py-1 text-xs font-semibold transition-all ${
              selected.size === 0
                ? 'bg-gray-900 text-white'
                : 'border border-gray-200 bg-white text-gray-600 hover:border-gray-300'
            }`}
          >
            Iedereen
          </button>
          {clients.map((c) => {
            const active = selected.has(c.id)
            return (
              <button
                key={c.id}
                type="button"
                onClick={() => toggleClient(c.id)}
                className={`rounded-full px-3 py-1 text-xs font-semibold transition-all ${
                  active
                    ? 'bg-indigo-100 text-indigo-700 ring-1 ring-indigo-300'
                    : 'border border-gray-200 bg-white text-gray-600 hover:border-indigo-300 hover:text-indigo-700'
                }`}
              >
                {c.companyName}
              </button>
            )
          })}
          {isPending && <span className="text-xs text-gray-400">Laden…</span>}
        </div>
      )}

      <div className="mt-4">
        {chartData.length === 0 ? (
          <div className="rounded-xl border border-dashed border-gray-200 px-4 py-12 text-center text-sm text-gray-400">
            Geen commissies in deze periode.
          </div>
        ) : (
          <ResponsiveContainer width="100%" height={320}>
            <BarChart data={chartData} margin={{ left: 8, right: 12, top: 8, bottom: 0 }}>
              <CartesianGrid strokeDasharray="3 3" stroke="#f0f0f0" vertical={false} />
              <XAxis
                dataKey="label"
                tick={{ fontSize: 12 }}
                tickLine={false}
                axisLine={{ stroke: '#e5e7eb' }}
              />
              <YAxis
                tick={{ fontSize: 12 }}
                tickLine={false}
                axisLine={{ stroke: '#e5e7eb' }}
                tickFormatter={(value: number) => formatEuroCents(value)}
                width={70}
              />
              <Tooltip
                formatter={(value) => [formatEuroCents(Number(value)), 'Netto']}
                labelFormatter={(label) => label}
                contentStyle={{
                  borderRadius: '0.5rem',
                  border: 'none',
                  boxShadow: '0 1px 3px rgba(0,0,0,0.1)',
                }}
              />
              <ReferenceLine y={0} stroke="#9ca3af" strokeWidth={1} />
              <Bar dataKey="netCents" radius={[4, 4, 0, 0]}>
                {chartData.map((d) => (
                  <Cell key={d.date} fill={d.netCents >= 0 ? POSITIVE_COLOR : NEGATIVE_COLOR} />
                ))}
              </Bar>
            </BarChart>
          </ResponsiveContainer>
        )}
      </div>
    </section>
  )
}
