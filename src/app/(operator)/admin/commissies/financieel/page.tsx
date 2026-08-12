import Link from 'next/link'
import {
  getCompanyCommissionOverview,
  getCommissionChartSeries,
  getClientsWithCommissionData,
  amsterdamDateString,
} from '@/lib/data/commissions'
import { PeriodSelector } from '@/components/commissions/period-selector'
import { CompanyOverview } from '../_components/company-overview'
import { CommissionChart } from './_components/commission-chart'

export const dynamic = 'force-dynamic'

interface PageProps {
  searchParams: Promise<{ from?: string; to?: string }>
}

const DATE_RE = /^\d{4}-\d{2}-\d{2}$/

export default async function FinancieelOverzichtPage({ searchParams }: PageProps) {
  const { from: fromParam, to: toParam } = await searchParams

  const today = amsterdamDateString()
  const defaultFrom = today.slice(0, 8) + '01'
  const from = fromParam && DATE_RE.test(fromParam) ? fromParam : defaultFrom
  const to = toParam && DATE_RE.test(toParam) ? toParam : today

  // Grafiek én overzicht volgen dezelfde gekozen periode (from/to).
  const [overview, chartSeries, chartClients] = await Promise.all([
    getCompanyCommissionOverview(from, to),
    getCommissionChartSeries(from, to),
    getClientsWithCommissionData(),
  ])

  return (
    <div className="mx-auto max-w-5xl space-y-6">
      <header>
        <Link
          href="/admin/commissies"
          className="inline-flex items-center gap-1.5 text-xs font-semibold text-gray-500 transition-colors hover:text-gray-900"
        >
          <svg className="h-3.5 w-3.5" fill="none" viewBox="0 0 24 24" strokeWidth={2.5} stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" d="M10.5 19.5 3 12m0 0 7.5-7.5M3 12h18" />
          </svg>
          Terug
        </Link>
        <h1 className="mt-2 text-2xl font-semibold tracking-tight text-gray-900">Financieel overzicht</h1>
        <p className="mt-1 text-sm text-gray-500">
          Opgetelde commissies per klant over de gekozen periode, minus de werkelijke uitgaven uit Rompslomp. Klik op
          een klant voor het detail, of{' '}
          <Link href="/admin/commissies/rompslomp" className="font-semibold text-gray-700 underline">
            controleer de boekhoudkoppeling
          </Link>
          .
        </p>
      </header>

      <PeriodSelector from={from} to={to} />
      <CommissionChart clients={chartClients} from={from} to={to} initialSeries={chartSeries} />
      <CompanyOverview overview={overview} />
    </div>
  )
}
