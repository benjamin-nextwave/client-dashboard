import { redirect } from 'next/navigation'
import { createClient } from '@/lib/supabase/server'
import { getCampaignState, getMailVariants, deriveTasks } from '@/lib/data/campaign'
import { StatusTracker } from './_components/status-tracker'
import { CampaignBody } from './_components/campaign-body'
import { MailVariantsApprovalBlock } from './_components/mail-variants-approval-block'
import { ProposalApprovalBlock } from './_components/proposal-approval-block'
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

  const tasks = deriveTasks(state)

  // Onboarding is done as soon as *every* task is completed — regardless
  // of the order the client handled them. The tracker + action blocks
  // disappear and a "Onboarding voltooid" banner takes their place.
  const onboardingDone = tasks.every((t) => t.status === 'completed')

  // The DNC block (step 6) only becomes visible when it is the active step —
  // i.e. all previous tasks (form, drafts, variants, preview) are done.
  const dncIsCurrent = tasks.find((t) => t.status === 'current')?.id === 'dnc'

  // Do the published variants / PDF need (re-)approval? Computed once so
  // both the approval block and the archive section can use the same answer.
  const variantTimes = variants.map((v) => new Date(v.updatedAt).getTime())
  const pdfTime = state.variantsPdfUploadedAt
    ? new Date(state.variantsPdfUploadedAt).getTime()
    : 0
  const latestVariantUpdate = Math.max(0, ...variantTimes, pdfTime)
  const ackTime = state.mailVariantsLastAcknowledgedAt
    ? new Date(state.mailVariantsLastAcknowledgedAt).getTime()
    : 0
  const variantsNeedApproval =
    (variants.length > 0 || !!state.variantsPdfUrl) &&
    (!state.mailVariantsLastAcknowledgedAt || latestVariantUpdate > ackTime)

  // Campaign proposal approval check
  const hasProposal = !!state.proposalTitle && !!state.proposalPublishedAt
  const proposalNeedsApproval =
    hasProposal &&
    (!state.proposalAcknowledgedAt ||
      new Date(state.proposalPublishedAt!).getTime() > new Date(state.proposalAcknowledgedAt).getTime())

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

      {onboardingDone && !variantsNeedApproval && !proposalNeedsApproval ? (
        <OnboardingCompleteBanner />
      ) : onboardingDone ? (
        <>
          <OnboardingCompleteBanner />
          {proposalNeedsApproval && (
            <ProposalApprovalBlock
              title={state.proposalTitle!}
              body={state.proposalBody!}
              publishedAt={state.proposalPublishedAt!}
              acknowledgedAt={state.proposalAcknowledgedAt}
              isPostOnboarding
            />
          )}
          <MailVariantsApprovalBlock
            variants={variants}
            pdfUrl={state.variantsPdfUrl}
            pdfUploadedAt={state.variantsPdfUploadedAt}
            lastAcknowledgedAt={state.mailVariantsLastAcknowledgedAt}
            isPostOnboarding={onboardingDone}
          />
        </>
      ) : (
        <>
          {/* ─── Action zone ─── */}
          <StatusTracker tasks={tasks} />

          {proposalNeedsApproval && (
            <ProposalApprovalBlock
              title={state.proposalTitle!}
              body={state.proposalBody!}
              publishedAt={state.proposalPublishedAt!}
              acknowledgedAt={state.proposalAcknowledgedAt}
            />
          )}

          <MailVariantsApprovalBlock
            variants={variants}
            pdfUrl={state.variantsPdfUrl}
            pdfUploadedAt={state.variantsPdfUploadedAt}
            lastAcknowledgedAt={state.mailVariantsLastAcknowledgedAt}
            isPostOnboarding={onboardingDone}
          />

          <CampaignBody state={state} />

          {dncIsCurrent && <DncBlock dncConfirmedAt={state.dncConfirmedAt} />}
        </>
      )}

      <ContactBlock isOnboardingComplete={onboardingDone && !variantsNeedApproval} />

      {/* ─── Archive zone ─── */}
      <ArchiveSection
        formSubmissionCount={state.formSubmissionCount}
        variantsPdfUrl={state.variantsPdfUrl}
        mailVariants={variants}
        variantsAcknowledged={!variantsNeedApproval && !!state.mailVariantsLastAcknowledgedAt}
        proposalTitle={state.proposalTitle}
        proposalAcknowledged={!proposalNeedsApproval && !!state.proposalAcknowledgedAt}
      />
    </div>
  )
}

function OnboardingCompleteBanner() {
  return (
    <section className="relative overflow-hidden rounded-xl border border-emerald-200 bg-gradient-to-br from-emerald-50 via-white to-teal-50 p-5 shadow-sm">
      <div className="pointer-events-none absolute -right-10 -top-10 h-32 w-32 rounded-full bg-gradient-to-br from-emerald-400/25 to-transparent blur-3xl" />
      <div className="relative flex items-center gap-4">
        <div className="flex h-10 w-10 flex-shrink-0 items-center justify-center rounded-xl bg-gradient-to-br from-emerald-500 to-teal-500 text-white shadow-sm shadow-emerald-500/30">
          <svg className="h-5 w-5" fill="none" viewBox="0 0 24 24" strokeWidth={3} stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" d="m4.5 12.75 6 6 9-13.5" />
          </svg>
        </div>
        <div className="min-w-0 flex-1">
          <h2 className="text-base font-bold text-gray-900">Onboarding voltooid</h2>
          <p className="mt-0.5 text-xs leading-relaxed text-gray-600">
            Bedankt! Alle stappen zijn afgerond. Ons team gaat verder met de laatste voorbereidingen.
          </p>
        </div>
      </div>
    </section>
  )
}
