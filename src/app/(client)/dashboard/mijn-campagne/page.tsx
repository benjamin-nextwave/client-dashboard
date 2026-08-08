import { redirect } from 'next/navigation'
import { createClient } from '@/lib/supabase/server'
import {
  getCampaignState,
  getMailVariants,
  getLatestMailVariantFeedback,
  deriveTasks,
  deriveVariantStatus,
  canSubmitCampaignForm,
} from '@/lib/data/campaign'
import { StatusTracker } from './_components/status-tracker'
import { CampaignBody } from './_components/campaign-body'
import { AvailableFormCard } from './_components/available-form-card'
import { MailVariantsApprovalBlock } from './_components/mail-variants-approval-block'
import { ProposalApprovalBlock } from './_components/proposal-approval-block'
import { DncBlock } from './_components/dnc-block'
import { ArchiveSection } from './_components/archive-section'
import { getTranslator } from '@/lib/i18n/server'

export const dynamic = 'force-dynamic'
export const metadata = { title: 'Onboarding' }

/**
 * De onboardingpagina. De mailvarianten-tijdlijn, de campagne-flow en de
 * LinkedIn-flow staan sinds de herindeling op /dashboard/mailvarianten; de
 * week- en maandrapporten op /dashboard/rapporten. Wat hier overblijft is wat
 * de klant zelf moet doen om de onboarding af te ronden.
 *
 * De route heet nog mijn-campagne omdat de subpagina's (invulformulier,
 * antwoorden) en de revalidatePath-aanroepen in de serveracties eraan hangen.
 */
export default async function OnboardingPage() {
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

  const [state, allVariants, feedbackByVariant] = await Promise.all([
    getCampaignState(profile.client_id),
    getMailVariants(profile.client_id),
    getLatestMailVariantFeedback(profile.client_id),
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
  const onboardingDone = tasks.every((task) => task.status === 'completed')

  // The DNC block (step 6) only becomes visible when it is the active step —
  // i.e. all previous tasks (form, drafts, variants, preview) are done.
  const dncIsCurrent = tasks.find((task) => task.status === 'current')?.id === 'dnc'

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
      new Date(state.proposalPublishedAt!).getTime() >
        new Date(state.proposalAcknowledgedAt).getTime())

  return (
    <div className="space-y-8">
      <div>
        <h1 className="text-[25px] font-semibold tracking-[-0.03em]">{t('nav.onboarding')}</h1>
        <p className="mt-[7px] max-w-[640px] text-[15px] leading-[1.5] text-muted">
          {onboardingDone ? t('campaign.introOnboardingDone') : t('campaign.introInProgress')}
        </p>
      </div>

      {onboardingDone ? (
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

          {/* Stap 4 van de onboarding. Na de onboarding staat dit blok op
              /dashboard/mailvarianten. */}
          <MailVariantsApprovalBlock
            variants={variants}
            pdfUrl={state.variantsPdfUrl}
            pdfUploadedAt={state.variantsPdfUploadedAt}
            lastAcknowledgedAt={state.mailVariantsLastAcknowledgedAt}
            isPostOnboarding={false}
            feedbackByVariant={feedbackByVariant}
          />

          <CampaignBody state={state} />

          {dncIsCurrent && <DncBlock dncConfirmedAt={state.dncConfirmedAt} />}
        </>
      )}

      {/* Invulformulier los van de onboarding: zodra NextWave een (extra)
          formulier klaarzet, blijft de knop bereikbaar — ook tijdens een
          lopende campagne. Binnen de onboarding-flow toont CampaignBody de
          knop al, dus daar niet nogmaals. */}
      {onboardingDone && canSubmitCampaignForm(state) && (
        <AvailableFormCard isFirst={state.formSubmissionCount === 0} />
      )}

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
    </div>
  )
}

function OnboardingCompleteBanner({ title, body }: { title: string; body: string }) {
  return (
    <section className="rounded-panel border border-[color-mix(in_oklab,var(--color-pos)_30%,transparent)] bg-[color-mix(in_oklab,var(--color-pos)_8%,transparent)] p-5">
      <div className="flex items-center gap-4">
        <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-[10px] bg-pos text-white">
          <svg className="h-5 w-5" fill="none" viewBox="0 0 24 24" strokeWidth={3} stroke="currentColor" aria-hidden>
            <path strokeLinecap="round" strokeLinejoin="round" d="m4.5 12.75 6 6 9-13.5" />
          </svg>
        </div>
        <div className="min-w-0 flex-1">
          <h2 className="text-[15px] font-semibold tracking-[-0.02em]">{title}</h2>
          <p className="mt-0.5 text-[12.5px] leading-[1.6] text-muted">{body}</p>
        </div>
      </div>
    </section>
  )
}
