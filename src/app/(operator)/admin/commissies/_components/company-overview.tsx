'use client'

import Link from 'next/link'
import { formatEuroCents, OFFICE_COST_CENTS_PER_MONTH } from '@/lib/commissions-shared'
import type { CompanyCommissionOverview } from '@/lib/data/commissions'
import { downloadCsv, centsToCsvAmount } from '@/lib/csv-client'

interface CompanyOverviewProps {
  overview: CompanyCommissionOverview
}

export function CompanyOverview({ overview }: CompanyOverviewProps) {
  const {
    clients,
    totalCommissionCents,
    totalCostCents,
    totalNetCents,
    officeMonths,
    officeCostCents,
    netAfterOfficeCents,
    quarterShareCents,
    from,
    to,
  } = overview

  const handleDownload = () => {
    const header = ['Klant', 'Eerste lead', 'Leaddagen', 'Werkdagen', 'Commissie (€)', 'Dagkosten (€)', 'Netto (€)']
    const rows: Array<Array<string | number>> = clients.map((c) => [
      c.companyName,
      c.firstLeadDate ?? '',
      c.recordedDays,
      c.costDays,
      centsToCsvAmount(c.commissionCents),
      '-' + centsToCsvAmount(c.costCents),
      centsToCsvAmount(c.netCents),
    ])
    rows.push([])
    rows.push([
      'Totaal',
      '',
      '',
      '',
      centsToCsvAmount(totalCommissionCents),
      '-' + centsToCsvAmount(totalCostCents),
      centsToCsvAmount(totalNetCents),
    ])
    rows.push([
      `Kantoor (${officeMonths} × ${centsToCsvAmount(OFFICE_COST_CENTS_PER_MONTH)})`,
      '',
      '',
      '',
      '',
      '-' + centsToCsvAmount(officeCostCents),
      '',
    ])
    rows.push(['Netto na kantoor', '', '', '', '', '', centsToCsvAmount(netAfterOfficeCents)])
    rows.push(['Ieder een kwart (Merlijn / KIX / jij / bedrijfsaccount)', '', '', '', '', '', centsToCsvAmount(quarterShareCents)])
    downloadCsv(`commissies-totaal-${from}_tot_${to}.csv`, header, rows)
  }

  return (
    <section className="space-y-4">
      <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
        <SummaryCard label="Commissies" value={formatEuroCents(totalCommissionCents)} tone="neutral" />
        <SummaryCard label="Dagkosten" value={'−' + formatEuroCents(totalCostCents)} tone="cost" />
        <SummaryCard label="Netto winst" value={formatEuroCents(totalNetCents)} tone={totalNetCents >= 0 ? 'positive' : 'negative'} />
        <SummaryCard
          label="Kantoor"
          value={'−' + formatEuroCents(officeCostCents)}
          tone="cost"
          note={`${officeMonths} ${officeMonths === 1 ? 'maand' : 'maanden'} × ${formatEuroCents(OFFICE_COST_CENTS_PER_MONTH)}`}
        />
        <SummaryCard
          label="Netto na kantoor"
          value={formatEuroCents(netAfterOfficeCents)}
          tone={netAfterOfficeCents >= 0 ? 'positive' : 'negative'}
          emphasis
        />
        <SummaryCard
          label="Ieder een kwart"
          value={formatEuroCents(quarterShareCents)}
          tone={quarterShareCents >= 0 ? 'positive' : 'negative'}
          note="Merlijn · KIX · jij · bedrijfsaccount"
          emphasis
        />
      </div>

      <div className="flex items-center justify-between">
        <h2 className="text-sm font-semibold text-gray-900">Per klant</h2>
        <button
          type="button"
          onClick={handleDownload}
          disabled={clients.length === 0}
          className="inline-flex items-center gap-1.5 rounded-lg border border-gray-200 bg-white px-3 py-1.5 text-xs font-semibold text-gray-700 shadow-sm transition-all hover:border-gray-300 hover:bg-gray-50 disabled:cursor-not-allowed disabled:opacity-40"
        >
          <svg className="h-3.5 w-3.5" fill="none" viewBox="0 0 24 24" strokeWidth={2} stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" d="M3 16.5v2.25A2.25 2.25 0 0 0 5.25 21h13.5A2.25 2.25 0 0 0 21 18.75V16.5M16.5 12 12 16.5m0 0L7.5 12m4.5 4.5V3" />
          </svg>
          Download CSV
        </button>
      </div>

      {clients.length === 0 ? (
        <div className="rounded-2xl border border-dashed border-gray-200 px-4 py-12 text-center text-sm text-gray-400">
          Geen commissies in deze periode.
        </div>
      ) : (
        <div className="overflow-hidden rounded-2xl border border-gray-200 bg-white shadow-sm">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-gray-200 bg-gray-50 text-left text-[11px] font-semibold uppercase tracking-wide text-gray-500">
                <th className="px-4 py-2.5">Klant</th>
                <th className="px-4 py-2.5 text-center">Leaddagen</th>
                <th className="px-4 py-2.5 text-right">Commissie</th>
                <th className="px-4 py-2.5 text-right">Dagkosten</th>
                <th className="px-4 py-2.5 text-right">Netto</th>
              </tr>
            </thead>
            <tbody>
              {clients.map((c) => (
                <tr key={c.clientId} className="border-b border-gray-100 last:border-0 hover:bg-gray-50/60">
                  <td className="px-4 py-2.5">
                    <Link
                      href={`/admin/clients/${c.clientId}/commissies`}
                      className="font-medium text-gray-900 hover:text-indigo-600 hover:underline"
                    >
                      {c.companyName}
                    </Link>
                    {c.firstLeadDate && (
                      <div className="text-[11px] text-gray-400">vanaf {formatShortDate(c.firstLeadDate)}</div>
                    )}
                  </td>
                  <td className="px-4 py-2.5 text-center text-gray-600">{c.recordedDays}</td>
                  <td className="px-4 py-2.5 text-right text-gray-900">{formatEuroCents(c.commissionCents)}</td>
                  <td className="px-4 py-2.5 text-right text-rose-600">
                    −{formatEuroCents(c.costCents)}
                    <div className="text-[11px] font-normal text-gray-400">
                      {c.costDays} {c.costDays === 1 ? 'werkdag' : 'werkdagen'}
                    </div>
                  </td>
                  <td className={`px-4 py-2.5 text-right font-semibold ${c.netCents >= 0 ? 'text-emerald-700' : 'text-rose-700'}`}>
                    {formatEuroCents(c.netCents)}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </section>
  )
}

function formatShortDate(date: string): string {
  return new Intl.DateTimeFormat('nl-NL', { day: 'numeric', month: 'short', year: 'numeric' }).format(
    new Date(date + 'T00:00:00')
  )
}

function SummaryCard({
  label,
  value,
  tone,
  note,
  emphasis = false,
}: {
  label: string
  value: string
  tone: 'neutral' | 'cost' | 'positive' | 'negative'
  note?: string
  emphasis?: boolean
}) {
  const valueClass = {
    neutral: 'text-gray-900',
    cost: 'text-rose-600',
    positive: 'text-emerald-700',
    negative: 'text-rose-700',
  }[tone]
  return (
    <div
      className={`rounded-2xl border bg-white p-4 shadow-sm ${
        emphasis ? 'border-gray-900 ring-1 ring-gray-900' : 'border-gray-200'
      }`}
    >
      <div className="text-[11px] font-semibold uppercase tracking-wide text-gray-500">{label}</div>
      <div className={`mt-1 text-2xl font-semibold ${valueClass}`}>{value}</div>
      {note && <div className="mt-0.5 text-[11px] text-gray-400">{note}</div>}
    </div>
  )
}
