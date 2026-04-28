import Link from 'next/link'
import { notFound } from 'next/navigation'
import { createAdminClient } from '@/lib/supabase/admin'
import { ensureCampaignFlow, type CampaignFlow } from '@/lib/data/campaign-flow'
import { FlowEditor } from './_components/flow-editor'

export const dynamic = 'force-dynamic'

interface Props {
  params: Promise<{ clientId: string }>
}

export default async function OperatorCampaignFlowPage({ params }: Props) {
  const { clientId } = await params

  const supabase = createAdminClient()
  const { data: client } = await supabase
    .from('clients')
    .select('id, company_name, primary_color, logo_url')
    .eq('id', clientId)
    .single()

  if (!client) notFound()

  let flow: CampaignFlow | null = null
  let flowError: string | null = null
  try {
    flow = await ensureCampaignFlow(clientId)
  } catch (err) {
    flowError = err instanceof Error ? err.message : String(err)
    console.error('[campagne-flow] ensureCampaignFlow failed:', flowError, err)
  }

  if (flowError || !flow) {
    return (
      <div className="mx-auto max-w-3xl space-y-6">
        <Link
          href={`/admin/clients/${clientId}/edit`}
          className="inline-flex items-center gap-1.5 text-xs font-semibold text-gray-500 hover:text-indigo-600"
        >
          ← Terug naar klant
        </Link>
        <div className="rounded-2xl border border-red-200 bg-red-50 p-6">
          <h2 className="text-base font-bold text-red-900">Campagne-flow kon niet worden geladen</h2>
          <p className="mt-2 text-sm text-red-800">
            Er ging iets mis bij het opzetten van de campagne-flow. Hieronder staat de exacte
            foutmelding zodat de oorzaak achterhaald kan worden.
          </p>
          <pre className="mt-3 whitespace-pre-wrap rounded-lg bg-white p-3 text-xs text-red-900 ring-1 ring-red-200">
            {flowError ?? 'Onbekende fout — geen flow geretourneerd.'}
          </pre>
          <p className="mt-3 text-[11px] text-red-700">
            Meest waarschijnlijke oorzaak: de migratietabellen (<code>campaign_flows</code>,{' '}
            <code>campaign_flow_steps</code>, <code>campaign_flow_step_variants</code>,{' '}
            <code>campaign_flow_step_outcomes</code>) ontbreken of hebben verouderde schema-cache.
          </p>
        </div>
      </div>
    )
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
            Campagne-flow
          </div>
          <h1 className="mt-1 text-3xl font-semibold tracking-tight text-gray-900">
            {client.company_name}
          </h1>
          <p className="mt-1 text-sm text-gray-500">
            Bouw het visuele mailpad dat de klant op &ldquo;Mijn campagne&rdquo; ziet. Per stap
            configureer je varianten en de drie uitkomsten (geen reactie / positief / afgehaakt).
          </p>
        </div>
      </div>

      <FlowEditor clientId={clientId} initialFlow={flow} />
    </div>
  )
}
