import type { Metadata } from 'next'
import { redirect } from 'next/navigation'
import { createClient } from '@/lib/supabase/server'
import {
  getCampaignState,
  getMailVariants,
  getLatestMailVariantFeedback,
  getAllMailVariantFeedback,
  deriveTasks,
} from '@/lib/data/campaign'
import { getLinkedInFlowsByClient } from '@/lib/data/linkedin-flow'
import { MailVariantsApprovalBlock } from '../mijn-campagne/_components/mail-variants-approval-block'
import { MailVariantsTimelineSection } from '../mijn-campagne/_components/mail-variants-timeline-section'
import { CampaignFlowSection } from '../mijn-campagne/_components/campaign-flow-section'
import { LinkedInFlowBlock } from '../mijn-campagne/_components/linkedin-flow-block'
import { getTranslator } from '@/lib/i18n/server'

export const metadata: Metadata = { title: 'Mailvarianten' }
export const dynamic = 'force-dynamic'

export default async function MailvariantenPage() {
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

  const [state, allVariants, feedbackByVariant, allFeedbackByVariant, linkedInByFlow] =
    await Promise.all([
      getCampaignState(profile.client_id),
      getMailVariants(profile.client_id),
      getLatestMailVariantFeedback(profile.client_id),
      getAllMailVariantFeedback(profile.client_id),
      getLinkedInFlowsByClient(profile.client_id),
    ])

  if (!state) redirect('/dashboard')

  // De klant ziet alleen varianten die de operator heeft gepubliceerd.
  const variants = allVariants.filter((v) => v.isPublished)
  const onboardingDone = deriveTasks(state).every((task) => task.status === 'completed')

  const t = await getTranslator()

  return (
    <div className="space-y-8">
      <div>
        <h1 className="text-[25px] font-semibold tracking-[-0.03em]">
          {t('mailVariantsPage.title')}
        </h1>
        <p className="mt-[7px] max-w-[640px] text-[15px] leading-[1.5] text-muted">
          {t('mailVariantsPage.intro')}
        </p>
      </div>

      {/* Tijdens de onboarding staat het goedkeuringsblok op de onboardingpagina,
          als stap in die flow. Daarna verhuist het hierheen. */}
      {onboardingDone && (
        <MailVariantsApprovalBlock
          variants={variants}
          pdfUrl={state.variantsPdfUrl}
          pdfUploadedAt={state.variantsPdfUploadedAt}
          lastAcknowledgedAt={state.mailVariantsLastAcknowledgedAt}
          isPostOnboarding
          feedbackByVariant={feedbackByVariant}
        />
      )}

      <MailVariantsTimelineSection
        variants={variants}
        allFeedbackByVariant={allFeedbackByVariant}
      />

      {/* Campagne-flow: welke mail wanneer wordt verstuurd. */}
      <CampaignFlowSection clientId={profile.client_id} />

      {Object.values(linkedInByFlow).map((flow) => (
        <LinkedInFlowBlock key={flow.flowId} state={flow} />
      ))}
    </div>
  )
}
