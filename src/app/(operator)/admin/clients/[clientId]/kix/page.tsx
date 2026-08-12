import Link from 'next/link'
import { notFound } from 'next/navigation'
import { createAdminClient } from '@/lib/supabase/admin'
import { getKixPages } from '@/lib/data/kix'
import { KixPageList } from './_components/kix-page-list'

export const dynamic = 'force-dynamic'

interface PageProps {
  params: Promise<{ clientId: string }>
}

export default async function KixOverviewPage({ params }: PageProps) {
  const { clientId } = await params

  const supabase = createAdminClient()
  const { data: client } = await supabase
    .from('clients')
    .select('id, company_name')
    .eq('id', clientId)
    .single()

  if (!client) notFound()

  const pages = await getKixPages(clientId)

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
        <div className="text-[11px] font-semibold uppercase tracking-wide text-gray-400">KIX</div>
        <h1 className="mt-1 text-2xl font-semibold tracking-tight text-gray-900">
          {(client as { company_name: string }).company_name}
        </h1>
        <p className="mt-1 text-sm text-gray-500">
          Vrije werkpagina&apos;s voor deze klant: aantekeningen, checklists, tabellen, schema&apos;s en
          tekeningen. Alleen zichtbaar in het admin dashboard.
        </p>
      </header>

      <KixPageList clientId={clientId} pages={pages} />
    </div>
  )
}
