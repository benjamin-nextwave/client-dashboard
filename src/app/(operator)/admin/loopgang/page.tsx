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
        <p className="mt-1 max-w-3xl text-xs leading-relaxed text-gray-500">
          De cyclus van elke klant op de kalender: wanneer er gefactureerd moet worden, wanneer de
          evaluatiemeeting geregeld moet zijn, en wat er al is gebeurd. Het cijfer rechtsboven in
          een dag is het aantal klanten dat die dag daadwerkelijk mails heeft verstuurd — een
          campagne die op actief staat maar niets verstuurt telt hier dus niet mee.
        </p>
      </header>

      <CalendarView overview={overview} />
    </div>
  )
}
