import Link from 'next/link'
import { getMonthlyDataForAllClients } from '@/lib/data/controle'
import { MonthlyDataTable } from './_components/monthly-data-table'

export const dynamic = 'force-dynamic'

interface PageProps {
  searchParams: Promise<{ year?: string; month?: string }>
}

function currentYearMonth(): { year: number; month: number } {
  const now = new Date()
  return { year: now.getFullYear(), month: now.getMonth() + 1 }
}

export default async function MaandDataPage({ searchParams }: PageProps) {
  const { year: y, month: m } = await searchParams
  const fallback = currentYearMonth()
  const parsedYear = y ? parseInt(y, 10) : NaN
  const parsedMonth = m ? parseInt(m, 10) : NaN

  const year = Number.isFinite(parsedYear) && parsedYear >= 2024 && parsedYear <= 2100
    ? parsedYear
    : fallback.year
  const month = Number.isFinite(parsedMonth) && parsedMonth >= 1 && parsedMonth <= 12
    ? parsedMonth
    : fallback.month

  const rows = await getMonthlyDataForAllClients(year, month)

  return (
    <div className="space-y-6">
      <div>
        <Link
          href="/admin/controle"
          className="inline-flex items-center gap-1.5 text-xs font-semibold text-gray-500 transition-colors hover:text-gray-900"
        >
          <svg className="h-3.5 w-3.5" fill="none" viewBox="0 0 24 24" strokeWidth={2.5} stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" d="M10.5 19.5 3 12m0 0 7.5-7.5M3 12h18" />
          </svg>
          Terug naar Controle
        </Link>
        <h1 className="mt-2 text-3xl font-semibold tracking-tight text-gray-900">
          Statische maanddata
        </h1>
        <p className="mt-1 text-sm text-gray-500">
          Vul per klant per maand de vaste velden in die elke dagelijkse controle hergebruikt.
          Bij <span className="font-semibold text-gray-700">mailboxen</span> vul je het aantal in;
          contacten te benaderen wordt automatisch <span className="font-semibold text-gray-700">mailboxen × 8 × 5</span>.
        </p>
      </div>

      <MonthlyDataTable rows={rows} year={year} month={month} />
    </div>
  )
}
