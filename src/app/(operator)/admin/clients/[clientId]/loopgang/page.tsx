import Link from 'next/link'
import { notFound } from 'next/navigation'
import { createAdminClient } from '@/lib/supabase/admin'
import { getLoopgangData } from '@/lib/data/loopgang'
import { LoopgangView } from './_components/loopgang-view'

export const dynamic = 'force-dynamic'

interface PageProps {
  params: Promise<{ clientId: string }>
}

export default async function ClientLoopgangPage({ params }: PageProps) {
  const { clientId } = await params

  const supabase = createAdminClient()
  const { data: client } = await supabase
    .from('clients')
    .select('id, company_name, primary_color, go_live_date')
    .eq('id', clientId)
    .single()

  if (!client) notFound()

  const accent = (client.primary_color as string | null) ?? '#6366f1'
  const data = await getLoopgangData(clientId)

  return (
    <div className="mx-auto max-w-5xl space-y-6">
      <Link
        href={`/admin/clients/${clientId}`}
        className="group inline-flex items-center gap-1.5 text-xs font-semibold text-gray-500 transition-colors hover:text-indigo-600"
      >
        <svg className="h-3.5 w-3.5 transition-transform group-hover:-translate-x-0.5" fill="none" viewBox="0 0 24 24" strokeWidth={2.5} stroke="currentColor">
          <path strokeLinecap="round" strokeLinejoin="round" d="M10.5 19.5 3 12m0 0 7.5-7.5M3 12h18" />
        </svg>
        Terug naar klantoverzicht
      </Link>

      <header>
        <div className="text-[11px] font-semibold uppercase tracking-wide text-gray-400">
          {client.company_name}
        </div>
        <h1 className="mt-0.5 text-2xl font-semibold tracking-tight text-gray-900">
          Loopgang
        </h1>
        <p className="mt-1 max-w-2xl text-xs leading-relaxed text-gray-500">
          Een dag telt als <strong>live</strong> zodra minstens één gekoppelde campagne
          er mails heeft verstuurd. Instantly bewaart geen pauzegeschiedenis, dus
          een oranje dag komt uit onze eigen pauzeknop — niet uit Instantly zelf.
        </p>
      </header>

      <LoopgangView
        clientId={clientId}
        accent={accent}
        data={data}
        goLiveDate={(client.go_live_date as string | null) ?? null}
      />
    </div>
  )
}
