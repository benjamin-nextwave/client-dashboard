import { getLoopgangOverview } from '@/lib/data/loopgang-overview'
import { LoopgangOverviewView } from './_components/loopgang-overview-view'

export const dynamic = 'force-dynamic'

export default async function LoopgangOverzichtPage() {
  const overview = await getLoopgangOverview()

  return (
    <div className="mx-auto max-w-6xl space-y-6">
      <header>
        <h1 className="text-2xl font-semibold tracking-tight text-gray-900">Loopgang</h1>
        <p className="mt-1 max-w-3xl text-xs leading-relaxed text-gray-500">
          Elke klant met zijn verzendvolume van vandaag, waar hij in de cyclus staat en wat er
          administratief openstaat. Een klant telt als <strong>draaiend</strong> zodra er die dag
          daadwerkelijk mails de deur uit zijn gegaan — een campagne die op actief staat maar niets
          verstuurt geldt hier dus niet als draaiend.
        </p>
      </header>

      <LoopgangOverviewView overview={overview} />
    </div>
  )
}
