import { redirect } from 'next/navigation'
import { createClient } from '@/lib/supabase/server'
import { getCampaignState, getMailVariants, deriveTasks } from '@/lib/data/campaign'
import { StatusTracker } from './_components/status-tracker'
import { CampaignBody } from './_components/campaign-body'
import { MailVariantsApprovalBlock } from './_components/mail-variants-approval-block'
import { DncBlock } from './_components/dnc-block'
import { ArchiveSection } from './_components/archive-section'
import { ContactBlock } from './_components/contact-block'

export const dynamic = 'force-dynamic'
export const metadata = { title: 'Mijn campagne' }

export default async function MijnCampagnePage() {
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

  const [state, allVariants] = await Promise.all([
    getCampaignState(profile.client_id),
    getMailVariants(profile.client_id),
  ])

  if (!state) redirect('/dashboard')

  // Clients only see variants that are explicitly published by the operator
  const variants = allVariants.filter((v) => v.isPublished)

  // DNC confirmation is the final step: once done, the tracker + action
  // blocks disappear and a "Onboarding voltooid" banner takes their place.
  const onboardingDone = !!state.dncConfirmedAt

  const tasks = deriveTasks(state)

  return (
    <div className="space-y-8">
      <div>
        <h1 className="text-2xl font-semibold tracking-tight text-gray-900">Mijn campagne</h1>
        <p className="mt-1 text-sm text-gray-500">
          {onboardingDone
            ? 'Je onboarding is afgerond. Alle documenten vind je hieronder terug.'
            : 'Volg de voortgang van je onboarding en geef waar nodig goedkeuring.'}
        </p>
      </div>

      {onboardingDone ? (
        <OnboardingCompleteBanner />
      ) : (
        <>
          {/* ─── Action zone ─── */}
          <StatusTracker tasks={tasks} />

          <MailVariantsApprovalBlock
            variants={variants}
            lastAcknowledgedAt={state.mailVariantsLastAcknowledgedAt}
          />

          <CampaignBody state={state} />

          <DncBlock dncConfirmedAt={state.dncConfirmedAt} />
        </>
      )}

      <ContactBlock isOnboardingComplete={onboardingDone} />

      {/* ─── Archive zone ─── */}
      <ArchiveSection
        formSubmissionCount={state.formSubmissionCount}
        variantsPdfUrl={state.variantsPdfUrl}
        mailVariants={variants}
      />
    </div>
  )
}

function OnboardingCompleteBanner() {
  return (
    <section className="relative overflow-hidden rounded-2xl border border-emerald-200 bg-gradient-to-br from-emerald-50 via-white to-teal-50 p-8 shadow-sm">
      <div className="pointer-events-none absolute -right-20 -top-20 h-56 w-56 rounded-full bg-gradient-to-br from-emerald-400/30 to-transparent blur-3xl" />
      <div className="pointer-events-none absolute -left-10 bottom-0 h-48 w-48 rounded-full bg-gradient-to-tr from-teal-400/20 to-transparent blur-3xl" />
      <div className="relative flex flex-wrap items-center gap-5">
        <div className="flex h-16 w-16 flex-shrink-0 items-center justify-center rounded-2xl bg-gradient-to-br from-emerald-500 to-teal-500 text-white shadow-lg shadow-emerald-500/40">
          <svg className="h-8 w-8" fill="none" viewBox="0 0 24 24" strokeWidth={3} stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" d="m4.5 12.75 6 6 9-13.5" />
          </svg>
        </div>
        <div className="min-w-0 flex-1">
          <div className="text-[11px] font-semibold uppercase tracking-wide text-emerald-700">
            Klaar voor lancering
          </div>
          <h2 className="mt-1 text-3xl font-bold tracking-tight text-gray-900">
            Onboarding voltooid
          </h2>
          <p className="mt-2 max-w-xl text-sm leading-relaxed text-gray-600">
            Bedankt! Alle stappen zijn afgerond. Ons team gaat verder met de laatste voorbereidingen
            en de campagne wordt binnenkort gelanceerd.
          </p>
        </div>
      </div>
    </section>
  )
}
