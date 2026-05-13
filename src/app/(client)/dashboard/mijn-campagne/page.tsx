import { redirect } from 'next/navigation'
import { createClient } from '@/lib/supabase/server'
import {
  getCampaignState,
  getMailVariants,
  getLatestMailVariantFeedback,
  getAllMailVariantFeedback,
  deriveTasks,
  deriveVariantStatus,
} from '@/lib/data/campaign'
import { getLinkedInFlowState } from '@/lib/data/linkedin-flow'
import { StatusTracker } from './_components/status-tracker'
import { CampaignBody } from './_components/campaign-body'
import { MailVariantsApprovalBlock } from './_components/mail-variants-approval-block'
import { LinkedInFlowBlock } from './_components/linkedin-flow-block'
import { ProposalApprovalBlock } from './_components/proposal-approval-block'
import { DncBlock } from './_components/dnc-block'
import { ArchiveSection } from './_components/archive-section'
import { ContactBlock } from './_components/contact-block'
import { CampaignFlowSection } from './_components/campaign-flow-section'
import { MailVariantsTimelineSection } from './_components/mail-variants-timeline-section'
import { getTranslator } from '@/lib/i18n/server'

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

  const [state, allVariants, feedbackByVariant, allFeedbackByVariant, linkedInFlow] =
    await Promise.all([
      getCampaignState(profile.client_id),
      getMailVariants(profile.client_id),
      getLatestMailVariantFeedback(profile.client_id),
      getAllMailVariantFeedback(profile.client_id),
      getLinkedInFlowState(profile.client_id),
    ])

  if (!state) redirect('/dashboard')

  // Clients only see variants that are explicitly published by the operator
  const variants = allVariants.filter((v) => v.isPublished)
  // Round is complete when every published variant is approved-or-feedback
  // at its current version (no 'open' variants remain).
  const variantsRoundComplete =
    variants.length > 0 && variants.every((v) => deriveVariantStatus(v) !== 'open')

  const t = await getTranslator()
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
  // For text variants the per-variant status is the source of truth (the
  // round is "open" as long as at least one variant has status 'open').
  // The PDF still uses the legacy ack timestamp.
  const pdfTime = state.variantsPdfUploadedAt
    ? new Date(state.variantsPdfUploadedAt).getTime()
    : 0
  const ackTime = state.mailVariantsLastAcknowledgedAt
    ? new Date(state.mailVariantsLastAcknowledgedAt).getTime()
    : 0
  const pdfNeedsApproval = !!state.variantsPdfUrl && pdfTime > ackTime
  const variantsNeedApproval =
    (variants.length > 0 && !variantsRoundComplete) || pdfNeedsApproval

  // Campaign proposal approval check
  const hasProposal = !!state.proposalTitle && !!state.proposalPublishedAt
  const proposalNeedsApproval =
    hasProposal &&
    (!state.proposalAcknowledgedAt ||
      new Date(state.proposalPublishedAt!).getTime() > new Date(state.proposalAcknowledgedAt).getTime())

  return (
    <div className="space-y-8">
      <div>
        <h1 className="text-2xl font-semibold tracking-tight text-gray-900">{t('campaign.title')}</h1>
        <p className="mt-1 text-sm text-gray-500">
          {onboardingDone
            ? t('campaign.introOnboardingDone')
            : t('campaign.introInProgress')}
        </p>
      </div>

      {onboardingDone && !variantsNeedApproval && !proposalNeedsApproval ? (
        <OnboardingCompleteBanner
          title={t('campaign.onboardingCompleteTitle')}
          body={t('campaign.onboardingCompleteBody')}
        />
      ) : onboardingDone ? (
        <>
          <OnboardingCompleteBanner
            title={t('campaign.onboardingCompleteTitle')}
            body={t('campaign.onboardingCompleteBody')}
          />
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
            feedbackByVariant={feedbackByVariant}
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
            feedbackByVariant={feedbackByVariant}
          />

          <CampaignBody state={state} />

          {dncIsCurrent && <DncBlock dncConfirmedAt={state.dncConfirmedAt} />}
        </>
      )}

      <ContactBlock isOnboardingComplete={onboardingDone} />

      {/* ─── Mailvarianten tijdlijn ─── */}
      <MailVariantsTimelineSection
        variants={variants}
        allFeedbackByVariant={allFeedbackByVariant}
      />

      {/* ─── LinkedIn flow (optioneel, na de mailflow) ─── */}
      {linkedInFlow && <LinkedInFlowBlock state={linkedInFlow} />}

      {/* ─── Archive zone ─── */}
      <ArchiveSection
        formSubmissionCount={state.formSubmissionCount}
        variantsPdfUrl={state.variantsPdfUrl}
        mailVariants={variants}
        variantsAcknowledged={!variantsNeedApproval && !!state.mailVariantsLastAcknowledgedAt}
        proposalTitle={state.proposalTitle}
        proposalAcknowledged={!proposalNeedsApproval && !!state.proposalAcknowledgedAt}
        feedbackByVariant={feedbackByVariant}
      />

      {/* ─── Campaign flow visualisatie ─── */}
      <CampaignFlowSection clientId={profile.client_id} />
    </div>
  )
}

function OnboardingCompleteBanner({ title, body }: { title: string; body: string }) {
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
          <h2 className="text-base font-bold text-gray-900">{title}</h2>
          <p className="mt-0.5 text-xs leading-relaxed text-gray-600">{body}</p>
        </div>
      </div>
    </section>
  )
}
