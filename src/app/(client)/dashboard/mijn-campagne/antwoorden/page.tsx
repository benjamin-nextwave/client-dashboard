import Link from 'next/link'
import { redirect } from 'next/navigation'
import { createClient } from '@/lib/supabase/server'
import { getCampaignFormSubmissions } from '@/lib/data/campaign'
import { SubmissionsViewer } from './_components/submissions-viewer'
import { getTranslator } from '@/lib/i18n/server'

export const dynamic = 'force-dynamic'
export const metadata = { title: 'Jouw antwoorden' }

export default async function AntwoordenPage() {
  const supabase = await createClient()
  const {
    data: { user },
  } = await supabase.auth.getUser()

  if (!user) redirect('/login')

  const { data: profile } = await supabase
    .from('profiles')
    .select('client_id, user_role')
    .eq('id', user.id)
    .single()

  if (!profile || profile.user_role !== 'client' || !profile.client_id) {
    redirect('/dashboard')
  }

  const { data: client } = await supabase
    .from('clients')
    .select('company_name')
    .eq('id', profile.client_id)
    .single()

  const submissions = await getCampaignFormSubmissions(profile.client_id)

  if (submissions.length === 0) {
    redirect('/dashboard/mijn-campagne')
  }

  const t = await getTranslator()

  return (
    <div className="mx-auto max-w-3xl space-y-6">
      <Link
        href="/dashboard/mijn-campagne"
        className="group inline-flex items-center gap-1.5 text-xs font-semibold text-gray-500 transition-colors hover:text-indigo-600"
      >
        <svg className="h-3.5 w-3.5 transition-transform group-hover:-translate-x-0.5" fill="none" viewBox="0 0 24 24" strokeWidth={2.5} stroke="currentColor">
          <path strokeLinecap="round" strokeLinejoin="round" d="M10.5 19.5 3 12m0 0 7.5-7.5M3 12h18" />
        </svg>
        {t('campaignSubPages.backToCampaign')}
      </Link>

      <SubmissionsViewer
        submissions={submissions}
        fallbackCompanyName={client?.company_name ?? ''}
      />
    </div>
  )
}
