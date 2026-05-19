import Link from 'next/link'
import { getCalendarData } from '@/lib/data/controle-kalender'
import { CalendarView } from './_components/calendar-view'

export const dynamic = 'force-dynamic'

interface PageProps {
  searchParams: Promise<{ client?: string; year?: string; month?: string }>
}

function currentYearMonth(): { year: number; month: number } {
  const now = new Date()
  return { year: now.getFullYear(), month: now.getMonth() + 1 }
}

export default async function ControleKalenderPage({ searchParams }: PageProps) {
  const params = await searchParams
  const fallback = currentYearMonth()

  const parsedYear = params.year ? parseInt(params.year, 10) : NaN
  const parsedMonth = params.month ? parseInt(params.month, 10) : NaN
  const year = Number.isFinite(parsedYear) && parsedYear >= 2024 && parsedYear <= 2100
    ? parsedYear
    : fallback.year
  const month = Number.isFinite(parsedMonth) && parsedMonth >= 1 && parsedMonth <= 12
    ? parsedMonth
    : fallback.month

  const clientId = params.client && params.client !== 'all' ? params.client : null

  const data = await getCalendarData({ clientId, year, month })

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
          Maandkalender
        </h1>
        <p className="mt-1 text-sm text-gray-500">
          Kies links een klant of bekijk alle bedrijven tegelijk. Klik op een
          bolletje voor de details. Plannen kan met de knop rechtsboven.
        </p>
      </div>

      <CalendarView
        clients={data.clients}
        items={data.items}
        liveWindow={data.liveWindow}
        selectedClientId={clientId}
        year={year}
        month={month}
      />
    </div>
  )
}
