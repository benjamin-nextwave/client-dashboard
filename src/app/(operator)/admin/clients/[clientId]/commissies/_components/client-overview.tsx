'use client'

import { formatEuroCents, DAILY_COST_CENTS } from '@/lib/commissions-shared'
import type { ClientCommissionOverview } from '@/lib/data/commissions'
import { downloadCsv, centsToCsvAmount } from '@/lib/csv-client'

interface ClientOverviewProps {
  companyName: string
  overview: ClientCommissionOverview
}

export function ClientOverview({ companyName, overview }: ClientOverviewProps) {
  const { entries, days, totalCommissionCents, recordedDays, totalCostCents, netCents, from, to } = overview

  const handleDownload = () => {
    const header = ['Datum', 'Campagne', 'Categorie', 'Aantal', 'Prijs per lead (€)', 'Subtotaal (€)']
    const rows: Array<Array<string | number>> = entries.map((e) => [
      e.date,
      e.campaignName,
      e.categoryName,
      e.count,
      centsToCsvAmount(e.unitPriceCents),
      centsToCsvAmount(e.subtotalCents),
    ])
    // Samenvatting onderaan.
    rows.push([])
    rows.push(['Totaal commissies', '', '', '', '', centsToCsvAmount(totalCommissionCents)])
    rows.push([`Dagkosten (${recordedDays} × ${centsToCsvAmount(DAILY_COST_CENTS)})`, '', '', '', '', '-' + centsToCsvAmount(totalCostCents)])
    rows.push(['Netto', '', '', '', '', centsToCsvAmount(netCents)])

    const safeName = companyName.replace(/[^a-z0-9]+/gi, '-').toLowerCase()
    downloadCsv(`commissies-${safeName}-${from}_tot_${to}.csv`, header, rows)
  }

  return (
    <section className="space-y-4">
      {/* Samenvatting */}
      <div className="grid gap-3 sm:grid-cols-3">
        <SummaryCard label="Commissies" value={formatEuroCents(totalCommissionCents)} tone="neutral" />
        <SummaryCard
          label={`Dagkosten (${recordedDays} ${recordedDays === 1 ? 'dag' : 'dagen'})`}
          value={'−' + formatEuroCents(totalCostCents)}
          tone="cost"
        />
        <SummaryCard label="Netto" value={formatEuroCents(netCents)} tone={netCents >= 0 ? 'positive' : 'negative'} />
      </div>

      <div className="flex items-center justify-between">
        <h2 className="text-sm font-semibold text-gray-900">Per dag</h2>
        <button
          type="button"
          onClick={handleDownload}
          disabled={entries.length === 0}
          className="inline-flex items-center gap-1.5 rounded-lg border border-gray-200 bg-white px-3 py-1.5 text-xs font-semibold text-gray-700 shadow-sm transition-all hover:border-gray-300 hover:bg-gray-50 disabled:cursor-not-allowed disabled:opacity-40"
        >
          <svg className="h-3.5 w-3.5" fill="none" viewBox="0 0 24 24" strokeWidth={2} stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" d="M3 16.5v2.25A2.25 2.25 0 0 0 5.25 21h13.5A2.25 2.25 0 0 0 21 18.75V16.5M16.5 12 12 16.5m0 0L7.5 12m4.5 4.5V3" />
          </svg>
          Download CSV
        </button>
      </div>

      {days.length === 0 ? (
        <div className="rounded-2xl border border-dashed border-gray-200 px-4 py-12 text-center text-sm text-gray-400">
          Geen commissies in deze periode.
        </div>
      ) : (
        <div className="space-y-3">
          {days.map((day) => (
            <div key={day.date} className="rounded-2xl border border-gray-200 bg-white p-4 shadow-sm">
              <div className="flex items-center justify-between">
                <div className="text-sm font-semibold text-gray-900">{formatDate(day.date)}</div>
                <div className={`text-sm font-bold ${day.netCents >= 0 ? 'text-emerald-700' : 'text-rose-700'}`}>
                  Netto {formatEuroCents(day.netCents)}
                </div>
              </div>
              <div className="mt-2 space-y-1">
                {day.byCategory.map((c) => (
                  <div key={c.categoryName} className="flex items-center justify-between text-sm">
                    <span className="text-gray-600">
                      {c.categoryName} <span className="text-gray-400">× {c.count}</span>
                    </span>
                    <span className="font-medium text-gray-900">{formatEuroCents(c.subtotalCents)}</span>
                  </div>
                ))}
                <div className="flex items-center justify-between border-t border-gray-100 pt-1 text-sm">
                  <span className="text-gray-500">Commissie</span>
                  <span className="font-semibold text-gray-900">{formatEuroCents(day.commissionCents)}</span>
                </div>
                <div className="flex items-center justify-between text-sm">
                  <span className="text-gray-500">Dagkosten</span>
                  <span className="font-semibold text-rose-600">−{formatEuroCents(day.costCents)}</span>
                </div>
              </div>
            </div>
          ))}
        </div>
      )}
    </section>
  )
}

function SummaryCard({
  label,
  value,
  tone,
}: {
  label: string
  value: string
  tone: 'neutral' | 'cost' | 'positive' | 'negative'
}) {
  const valueClass = {
    neutral: 'text-gray-900',
    cost: 'text-rose-600',
    positive: 'text-emerald-700',
    negative: 'text-rose-700',
  }[tone]
  return (
    <div className="rounded-2xl border border-gray-200 bg-white p-4 shadow-sm">
      <div className="text-[11px] font-semibold uppercase tracking-wide text-gray-500">{label}</div>
      <div className={`mt-1 text-2xl font-semibold ${valueClass}`}>{value}</div>
    </div>
  )
}

function formatDate(date: string): string {
  const d = new Date(date + 'T00:00:00')
  return new Intl.DateTimeFormat('nl-NL', { weekday: 'short', day: 'numeric', month: 'long' }).format(d)
}
