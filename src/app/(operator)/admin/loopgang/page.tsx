import { getLoopgangOverview } from '@/lib/data/loopgang-overview'
import { AiAnalyse } from './_components/ai-analyse'
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
      <CalendarView overview={overview} />

      <AiAnalyse month={overview.month} />
    </div>
  )
}
