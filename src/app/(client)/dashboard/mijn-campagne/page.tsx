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
import { buildOnboardingModel } from './_lib/onboarding-model'
import { stepActionKey } from './_lib/step-keys'
import {
  ActiveStepCard,
  CompletedList,
  QuietStepCard,
  SectionHead,
} from './_components/onboarding-steps'
import { DeadlineCard, HelpCard, ProgressCard, WhatHappensNext } from './_components/onboarding-aside'
import { VariantPreviewGrid } from './_components/variant-preview-grid'
import { AvailableFormCard } from './_components/available-form-card'
import { MailVariantsApprovalBlock } from './_components/mail-variants-approval-block'
import { ProposalApprovalBlock } from './_components/proposal-approval-block'
import { ArchiveSection } from './_components/archive-section'
import { getTranslator } from '@/lib/i18n/server'

export const dynamic = 'force-dynamic'
export const metadata = { title: 'Onboarding' }

/**
 * De onboardingpagina: wat er nog van de klant nodig is staat bovenaan, wat bij
 * ons ligt eronder, en wat af is ingeklapt. Als de actieve stap wisselt,
 * verschuift de kaart mee — de pagina hoeft niet te weten welke stap het is.
 *
 * De mailvarianten-tijdlijn, de campagne-flow en de LinkedIn-flow staan op
 * /dashboard/mailvarianten; de rapporten op /dashboard/rapporten.
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

  const t = await getTranslator()

  // De klant ziet alleen varianten die de operator heeft gepubliceerd.
  const variants = allVariants.filter((v) => v.isPublished)
  const variantsRoundComplete =
    variants.length > 0 && variants.every((v) => deriveVariantStatus(v) !== 'open')

  const tasks = deriveTasks(state)
  const model = buildOnboardingModel(tasks)
  const onboardingDone = tasks.every((task) => task.status === 'completed')

  const pdfTime = state.variantsPdfUploadedAt
    ? new Date(state.variantsPdfUploadedAt).getTime()
    : 0
  const ackTime = state.mailVariantsLastAcknowledgedAt
    ? new Date(state.mailVariantsLastAcknowledgedAt).getTime()
    : 0
  const pdfNeedsApproval = !!state.variantsPdfUrl && pdfTime > ackTime
  const variantsNeedApproval =
    (variants.length > 0 && !variantsRoundComplete) || pdfNeedsApproval

  const hasProposal = !!state.proposalTitle && !!state.proposalPublishedAt
  const proposalNeedsApproval =
    hasProposal &&
    (!state.proposalAcknowledgedAt ||
      new Date(state.proposalPublishedAt!).getTime() >
        new Date(state.proposalAcknowledgedAt).getTime())

  const [active, ...restClient] = model.clientTodo
  const approvedCount = variants.filter((v) => v.clientApprovedAt !== null).length

  const deadline = state.approvalDeadline ? new Date(state.approvalDeadline) : null
  const daysLeft = deadline
    ? Math.max(0, Math.ceil((deadline.getTime() - Date.now()) / 86_400_000))
    : null

  const headline =
    model.requiredLeft === 0
      ? t('onboardingPage.headlineDone')
      : model.requiredLeft === 1
        ? t('onboardingPage.headlineOne')
        : t('onboardingPage.headlineMany', { count: model.requiredLeft })

  const actionKey = active ? stepActionKey(active.id) : undefined

  return (
    <div>
      <header className="flex flex-col items-start justify-between gap-6 rounded-panel border border-line bg-[linear-gradient(135deg,var(--brand-07),var(--color-panel)_58%)] px-6 py-6 lg:flex-row lg:items-center">
        <div className="min-w-0 max-w-[620px]">
          <div className="text-[10.5px] font-semibold uppercase tracking-[0.16em] text-faint">
            {t('onboardingPage.eyebrow')}
          </div>
          <h1 className="mt-[11px] text-[29px] font-semibold leading-[1.15] tracking-[-0.035em]">
            {headline}
          </h1>
          <p className="mt-[11px] text-[13.5px] leading-[1.6] text-muted">
            {t('onboardingPage.intro')}
          </p>
        </div>
        <ProgressCard model={model} />
      </header>

      <div className="mt-5 flex flex-col items-start gap-5 lg:flex-row">
        <div className="flex w-full min-w-0 flex-1 flex-col gap-5">
          {model.clientTodo.length > 0 && (
            <section>
              <SectionHead title={t('onboardingPage.sectionYours')} />
              {active && (
                <ActiveStepCard
                  step={active}
                  primaryLabel={actionKey ? t(actionKey) : undefined}
                  primaryHref={active.href}
                  secondaryLabel={
                    active.id === 'variants' && state.variantsPdfUrl
                      ? t('onboardingPage.variantsPdf')
                      : undefined
                  }
                  secondaryHref={
                    active.id === 'variants' ? (state.variantsPdfUrl ?? undefined) : undefined
                  }
                  footerNote={
                    active.id === 'variants' && variants.length > 0
                      ? t('onboardingPage.variantsReviewed', {
                          approved: approvedCount,
                          total: variants.length,
                        })
                      : undefined
                  }
                >
                  {active.id === 'variants' && <VariantPreviewGrid variants={variants} />}
                </ActiveStepCard>
              )}
              {restClient.map((step) => (
                <div key={step.id} className="mt-3">
                  <QuietStepCard step={step} />
                </div>
              ))}
            </section>
          )}

          {model.nextwaveTodo.length > 0 && (
            <section>
              <SectionHead title={t('onboardingPage.sectionOurs')} />
              <div className="flex flex-col gap-3">
                {model.nextwaveTodo.map((step) => (
                  <QuietStepCard key={step.id} step={step} />
                ))}
              </div>
            </section>
          )}

          {model.done.length > 0 && (
            <section>
              <SectionHead title={t('onboardingPage.sectionDone')} />
              <CompletedList steps={model.done} />
            </section>
          )}

          {/* Blokken die om een handeling vragen, los van de stappenlijst. */}
          {proposalNeedsApproval && (
            <ProposalApprovalBlock
              title={state.proposalTitle!}
              body={state.proposalBody!}
              publishedAt={state.proposalPublishedAt!}
              acknowledgedAt={state.proposalAcknowledgedAt}
              isPostOnboarding={onboardingDone}
            />
          )}

          {!onboardingDone && (
            <MailVariantsApprovalBlock
              variants={variants}
              pdfUrl={state.variantsPdfUrl}
              pdfUploadedAt={state.variantsPdfUploadedAt}
              lastAcknowledgedAt={state.mailVariantsLastAcknowledgedAt}
              isPostOnboarding={false}
              feedbackByVariant={feedbackByVariant}
            />
          )}

          {/* Een vrijgegeven invulformulier moet zichtbaar zijn zodra het er is,
              ook als de onboarding nog loopt. Zodra de klant één keer heeft
              ingediend telt stap 2 als afgerond en verdwijnt de knop uit de
              stappenlijst; zonder deze kaart heeft hij dan geen enkele ingang
              meer naar een extra formulier. Vóór de eerste inzending staat die
              stap nog wél actief in de lijst, dus dan zou de kaart dubbelop zijn. */}
          {canSubmitCampaignForm(state) && (state.formSubmissionCount > 0 || onboardingDone) && (
            <AvailableFormCard isFirst={state.formSubmissionCount === 0} />
          )}

          <ArchiveSection
            formSubmissionCount={state.formSubmissionCount}
            variantsPdfUrl={state.variantsPdfUrl}
            mailVariants={variants}
            variantsAcknowledged={
              !variantsNeedApproval && !!state.mailVariantsLastAcknowledgedAt
            }
            proposalTitle={state.proposalTitle}
            proposalAcknowledged={!proposalNeedsApproval && !!state.proposalAcknowledgedAt}
            feedbackByVariant={feedbackByVariant}
          />
        </div>

        <aside className="flex w-full shrink-0 flex-col gap-4 lg:w-[314px]">
          {deadline && daysLeft != null && !onboardingDone && (
            <DeadlineCard
              date={deadline.toLocaleDateString('nl-NL', {
                day: 'numeric',
                month: 'long',
                year: 'numeric',
              })}
              daysLeft={daysLeft}
            />
          )}
          <WhatHappensNext />
          <HelpCard />
        </aside>
      </div>
    </div>
  )
}
