import {
  getCompanyCommissionOverview,
  amsterdamDateString,
} from '@/lib/data/commissions'
import { PeriodSelector } from '@/components/commissions/period-selector'
import { CompanyOverview } from './_components/company-overview'

export const dynamic = 'force-dynamic'

interface PageProps {
  searchParams: Promise<{ from?: string; to?: string }>
}

const DATE_RE = /^\d{4}-\d{2}-\d{2}$/

export default async function CommissiesPage({ searchParams }: PageProps) {
  const { from: fromParam, to: toParam } = await searchParams

  const today = amsterdamDateString()
  const defaultFrom = today.slice(0, 8) + '01'
  const from = fromParam && DATE_RE.test(fromParam) ? fromParam : defaultFrom
  const to = toParam && DATE_RE.test(toParam) ? toParam : today

  const overview = await getCompanyCommissionOverview(from, to)

  return (
    <div className="mx-auto max-w-5xl space-y-6">
      <header>
        <div className="text-[11px] font-semibold uppercase tracking-wide text-gray-400">Bedrijfsbreed</div>
        <h1 className="mt-1 text-2xl font-semibold tracking-tight text-gray-900">Commissies &amp; winst</h1>
        <p className="mt-1 text-sm text-gray-500">
          Opgetelde commissies per klant over de gekozen periode, minus de vaste dagkosten. Klik op een klant voor het detail.
        </p>
      </header>

      <PeriodSelector from={from} to={to} />
      <CompanyOverview overview={overview} />
    </div>
  )
}
