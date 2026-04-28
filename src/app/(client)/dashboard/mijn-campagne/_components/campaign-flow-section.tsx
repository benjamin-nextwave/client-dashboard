import { getPublishedFlowsByClient } from '@/lib/data/campaign-flow'
import { CampaignFlowsViewer } from './campaign-flows-viewer'

interface Props {
  clientId: string
}

export async function CampaignFlowSection({ clientId }: Props) {
  const flows = await getPublishedFlowsByClient(clientId)

  // Alleen flows tonen die ook minimaal 1 stap hebben
  const visibleFlows = flows.filter((f) => f.steps.length > 0)
  if (visibleFlows.length === 0) return null

  return (
    <section className="relative overflow-hidden rounded-2xl border border-gray-200 bg-gradient-to-b from-white via-white to-indigo-50/20 p-6 shadow-sm sm:p-8">
      <div className="pointer-events-none absolute -right-16 -top-16 h-48 w-48 rounded-full bg-gradient-to-br from-indigo-300/20 to-transparent blur-3xl" />
      <div className="pointer-events-none absolute -left-16 -bottom-16 h-48 w-48 rounded-full bg-gradient-to-br from-rose-300/15 to-transparent blur-3xl" />

      <div className="relative mb-8 text-center">
        <div className="inline-flex items-center gap-1.5 rounded-full bg-indigo-100 px-3 py-1 text-[10px] font-bold uppercase tracking-wide text-indigo-700">
          <svg className="h-3 w-3" fill="none" viewBox="0 0 24 24" strokeWidth={2.5} stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" d="M9 5H7a2 2 0 0 0-2 2v12a2 2 0 0 0 2 2h10a2 2 0 0 0 2-2V7a2 2 0 0 0-2-2h-2M9 5a2 2 0 0 0 2 2h2a2 2 0 0 0 2-2M9 5a2 2 0 0 1 2-2h2a2 2 0 0 1 2 2m-6 9 2 2 4-4" />
          </svg>
          Campagne-flow
        </div>
        <h2 className="mt-3 text-2xl font-bold tracking-tight text-gray-900">
          Hoe ziet jouw campagne eruit?
        </h2>
        <p className="mx-auto mt-1.5 max-w-xl text-sm text-gray-500">
          Het complete pad dat een lead doorloopt — klik op een mail om de inhoud te bekijken, of
          op een eindknooppunt voor de afhandeling.
        </p>
      </div>

      <CampaignFlowsViewer flows={visibleFlows} />
    </section>
  )
}
