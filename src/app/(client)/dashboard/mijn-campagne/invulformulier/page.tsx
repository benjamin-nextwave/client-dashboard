import { redirect } from 'next/navigation'
import Link from 'next/link'
import { createClient } from '@/lib/supabase/server'
import { canSubmitCampaignForm, getCampaignState } from '@/lib/data/campaign'
import { CampaignForm } from './_components/campaign-form'
import { submitCampaignForm } from '../actions'
import { getTranslator } from '@/lib/i18n/server'

export const dynamic = 'force-dynamic'
export const metadata = { title: 'Invulformulier' }

export default async function InvulformulierPage() {
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

  const state = await getCampaignState(profile.client_id)
  if (!state) redirect('/dashboard')

  // Submission slot guard — if no slots remaining, send them to the history view
  if (!canSubmitCampaignForm(state)) {
    redirect('/dashboard/mijn-campagne/antwoorden')
  }

  const t = await getTranslator()

  return (
    <div className="mx-auto max-w-3xl space-y-8">
      <Link
        href="/dashboard/mijn-campagne"
        className="group inline-flex items-center gap-1.5 text-xs font-semibold text-gray-500 transition-colors hover:text-indigo-600"
      >
        <svg className="h-3.5 w-3.5 transition-transform group-hover:-translate-x-0.5" fill="none" viewBox="0 0 24 24" strokeWidth={2.5} stroke="currentColor">
          <path strokeLinecap="round" strokeLinejoin="round" d="M10.5 19.5 3 12m0 0 7.5-7.5M3 12h18" />
        </svg>
        {t('campaignSubPages.backToCampaign')}
      </Link>

      <header className="relative overflow-hidden rounded-2xl border border-indigo-200 bg-gradient-to-br from-indigo-50 via-white to-violet-50 p-8 shadow-sm">
        <div className="pointer-events-none absolute -right-20 -top-20 h-56 w-56 rounded-full bg-gradient-to-br from-violet-400/30 to-transparent blur-3xl" />
        <div className="relative">
          <div className="inline-flex items-center gap-1.5 rounded-full border border-indigo-200/60 bg-white/80 px-3 py-1 text-[11px] font-semibold text-indigo-700 backdrop-blur">
            <span className="h-1.5 w-1.5 rounded-full bg-indigo-500 shadow-[0_0_8px_rgba(99,102,241,0.8)]" />
            Eenmalig invullen
          </div>
          <h1 className="mt-3 text-3xl font-semibold tracking-tight text-gray-900">
            {t('campaignSubPages.formTitle')}
          </h1>
          <p className="mt-2 max-w-xl text-sm leading-relaxed text-gray-600">
            {t('campaignSubPages.formDescription')}
          </p>
        </div>
      </header>

      <CampaignForm
        action={submitCampaignForm}
        companyName={client?.company_name ?? ''}
      />
    </div>
  )
}
