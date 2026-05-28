import Link from 'next/link'
import { notFound } from 'next/navigation'
import { createAdminClient } from '@/lib/supabase/admin'
import { getCampaignFormSubmissions } from '@/lib/data/campaign'
import { SubmissionsViewer } from '@/app/(client)/dashboard/mijn-campagne/antwoorden/_components/submissions-viewer'

export const dynamic = 'force-dynamic'

interface PageProps {
  params: Promise<{ clientId: string }>
}

export default async function ClientInvulformulierPage({ params }: PageProps) {
  const { clientId } = await params

  const supabase = createAdminClient()
  const { data: client } = await supabase
    .from('clients')
    .select('id, company_name')
    .eq('id', clientId)
    .single()

  if (!client) notFound()

  const submissions = await getCampaignFormSubmissions(clientId)

  return (
    <div className="mx-auto max-w-3xl space-y-6">
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
        <div className="text-[11px] font-semibold uppercase tracking-wide text-gray-400">Invulformulier</div>
        <h1 className="mt-1 text-2xl font-semibold tracking-tight text-gray-900">
          {client.company_name}
        </h1>
      </header>

      {submissions.length === 0 ? (
        <div className="flex flex-col items-center rounded-2xl border border-dashed border-gray-200 bg-gradient-to-b from-gray-50/50 to-white px-6 py-16 text-center">
          <svg className="h-9 w-9 text-gray-300" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" d="M19.5 14.25v-2.625a3.375 3.375 0 0 0-3.375-3.375h-1.5A1.125 1.125 0 0 1 13.5 7.125v-1.5a3.375 3.375 0 0 0-3.375-3.375H8.25m0 12.75h7.5m-7.5 3H12M10.5 2.25H5.625c-.621 0-1.125.504-1.125 1.125v17.25c0 .621.504 1.125 1.125 1.125h12.75c.621 0 1.125-.504 1.125-1.125V11.25a9 9 0 0 0-9-9Z" />
          </svg>
          <p className="mt-3 text-sm font-medium text-gray-700">Nog niet ingevuld</p>
          <p className="mt-1 text-xs text-gray-500">Deze klant heeft het invulformulier nog niet ingediend.</p>
        </div>
      ) : (
        <SubmissionsViewer submissions={submissions} fallbackCompanyName={client.company_name} />
      )}
    </div>
  )
}
