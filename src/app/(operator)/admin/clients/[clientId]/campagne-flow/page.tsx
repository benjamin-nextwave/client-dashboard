import Link from 'next/link'
import { notFound } from 'next/navigation'
import { createAdminClient } from '@/lib/supabase/admin'
import { getCampaignFlowsByClient } from '@/lib/data/campaign-flow'
import { FlowsManager } from './_components/flows-manager'

export const dynamic = 'force-dynamic'

interface Props {
  params: Promise<{ clientId: string }>
  searchParams: Promise<{ flow?: string }>
}

export default async function OperatorCampaignFlowPage({ params, searchParams }: Props) {
  const { clientId } = await params
  const { flow: selectedFlowParam } = await searchParams

  const supabase = createAdminClient()
  const { data: client } = await supabase
    .from('clients')
    .select('id, company_name, primary_color, logo_url')
    .eq('id', clientId)
    .single()

  if (!client) notFound()

  const flows = await getCampaignFlowsByClient(clientId)

  // Bepaal welke flow standaard geselecteerd is. Volgorde:
  // 1. ?flow=<id> uit URL als die geldig is
  // 2. eerste flow in de lijst
  let selectedFlowId: string | null = null
  if (selectedFlowParam && flows.some((f) => f.id === selectedFlowParam)) {
    selectedFlowId = selectedFlowParam
  } else if (flows.length > 0) {
    selectedFlowId = flows[0].id
  }

  return (
    <div className="mx-auto max-w-5xl space-y-8">
      <div>
        <Link
          href={`/admin/clients/${clientId}/edit`}
          className="group inline-flex items-center gap-1.5 text-xs font-semibold text-gray-500 transition-colors hover:text-indigo-600"
        >
          <svg
            className="h-3.5 w-3.5 transition-transform group-hover:-translate-x-0.5"
            fill="none"
            viewBox="0 0 24 24"
            strokeWidth={2.5}
            stroke="currentColor"
          >
            <path strokeLinecap="round" strokeLinejoin="round" d="M10.5 19.5 3 12m0 0 7.5-7.5M3 12h18" />
          </svg>
          Terug naar klant
        </Link>

        <div className="mt-5">
          <div className="text-[11px] font-semibold uppercase tracking-wide text-gray-400">
            Campagne-flows
          </div>
          <h1 className="mt-1 text-3xl font-semibold tracking-tight text-gray-900">
            {client.company_name}
          </h1>
          <p className="mt-1 text-sm text-gray-500">
            Beheer de visuele campagne-flows voor deze klant. Voeg meerdere campagnes toe als de
            klant er meer dan één heeft — de klant kiest in zijn dashboard welke flow hij wil zien.
          </p>
        </div>
      </div>

      <FlowsManager clientId={clientId} flows={flows} selectedFlowId={selectedFlowId} />
    </div>
  )
}
