import { getLoopgangOverview } from '@/lib/data/loopgang-overview'
import { CalendarView } from './_components/calendar-view'

export const dynamic = 'force-dynamic'

interface PageProps {
  searchParams: Promise<Record<string, string | string[] | undefined>>
}

export default async function LoopgangOverzichtPage({ searchParams }: PageProps) {
  const params = await searchParams
  const raw = params.maand
  const month = typeof raw === 'string' && /^\d{4}-\d{2}$/.test(raw) ? raw : undefined

  const overview = await getLoopgangOverview(month)

  return (
    <div className="mx-auto max-w-7xl space-y-6">
      <header>
        <h1 className="text-2xl font-semibold tracking-tight text-gray-900">Loopgang</h1>
      </header>

      <CalendarView overview={overview} />
    </div>
  )
}
