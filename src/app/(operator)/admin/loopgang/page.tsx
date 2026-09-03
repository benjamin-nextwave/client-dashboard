import { getLoopgangOverview } from '@/lib/data/loopgang-overview'
import { LoopgangTabs } from './_components/loopgang-tabs'

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
    <div className="mx-auto max-w-7xl">
      <LoopgangTabs overview={overview} />
    </div>
  )
}
