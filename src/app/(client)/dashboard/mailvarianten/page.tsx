import type { Metadata } from 'next'
import { redirect } from 'next/navigation'
import { createClient } from '@/lib/supabase/server'
import {
  getCampaignState,
  getMailVariants,
  getAllMailVariantFeedback,
  deriveVariantStatus,
  type MailVariant,
} from '@/lib/data/campaign'
import { getPublishedFlowsByClient } from '@/lib/data/campaign-flow'
import { getLinkedInFlowsByClient } from '@/lib/data/linkedin-flow'
import { LinkedInFlowBlock } from '../mijn-campagne/_components/linkedin-flow-block'
import { EmptyState } from '@/components/client/ui/empty-state'
import { getTranslator } from '@/lib/i18n/server'
import { buildMailGroups, countRevisedSince } from './_lib/variant-groups'
import { TabBar, isMailVariantsTab, type MailVariantsTab } from './_components/tab-bar'
import { VariantsTab } from './_components/variants-tab'
import { VariantHistory } from './_components/variant-history'
import { CampaignFlowDiagram } from './_components/campaign-flow-diagram'

export const metadata: Metadata = { title: 'Mailvarianten' }
export const dynamic = 'force-dynamic'

interface PageProps {
  searchParams: Promise<{ tab?: string }>
}

export default async function MailvariantenPage({ searchParams }: PageProps) {
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

  const [state, allVariants, allFeedbackByVariant, flows, linkedInByFlow] = await Promise.all([
    getCampaignState(profile.client_id),
    getMailVariants(profile.client_id),
    getAllMailVariantFeedback(profile.client_id),
    getPublishedFlowsByClient(profile.client_id),
    getLinkedInFlowsByClient(profile.client_id),
  ])

  if (!state) redirect('/dashboard')

  // De klant ziet alleen varianten die de operator heeft gepubliceerd.
  const variants = allVariants.filter((v) => v.isPublished)
  const groups = buildMailGroups(variants, allFeedbackByVariant)
  const openCount = variants.filter((v) => deriveVariantStatus(v) === 'open').length

  const params = await searchParams
  const tab: MailVariantsTab = isMailVariantsTab(params.tab) ? params.tab : 'varianten'

  const t = await getTranslator()

  // Alleen flows met minimaal één stap; een lege flow zegt de klant niets.
  const visibleFlows = flows.filter((f) => f.steps.length > 0)
  const linkedInFlows = Object.values(linkedInByFlow)

  // Statusstipje op de flow-varianten. Er is geen relatie tussen campaign_flow_
  // variants en mail_variants in de database, dus we matchen op onderwerp.
  const variantsBySubject = new Map<string, MailVariant>(variants.map((v) => [v.subject, v]))

  const pdfTime = state.variantsPdfUploadedAt
    ? new Date(state.variantsPdfUploadedAt).getTime()
    : 0
  const ackTime = state.mailVariantsLastAcknowledgedAt
    ? new Date(state.mailVariantsLastAcknowledgedAt).getTime()
    : 0

  return (
    <div className="flex min-h-[calc(100vh-5rem)] flex-col">
      <div className="shrink-0">
        <h1 className="text-[25px] font-semibold tracking-[-0.03em]">
          {t('mailVariantsPage.title')}
        </h1>
        <p className="mt-[7px] max-w-[640px] text-[15px] leading-[1.5] text-muted">
          {t('mailVariantsPage.intro')}
        </p>

        <div className="mt-5">
          <TabBar
            active={tab}
            tabs={[
              { key: 'varianten', label: t('mailVariantsPage.tabVariants'), count: openCount },
              { key: 'flow', label: t('mailVariantsPage.tabFlow') },
              { key: 'geschiedenis', label: t('mailVariantsPage.tabHistory') },
            ]}
          />
        </div>
      </div>

      {/* Vaste hoogte omdat lijst, detail en geschiedenis intern scrollen —
          dezelfde vorm als de DNC-pagina en de contactenlijst. */}
      <div className="mt-4 flex h-[calc(100vh-17rem)] min-h-[520px] flex-col">
        {tab === 'varianten' &&
          (variants.length === 0 ? (
            <EmptyState
              icon={<MailIcon />}
              title={t('mailVariantsPage.emptyTitle')}
              description={t('mailVariantsPage.emptyBody')}
            />
          ) : (
            <VariantsTab
              groups={groups}
              allFeedbackByVariant={allFeedbackByVariant}
              newSince={state.mailVariantsLastAcknowledgedAt}
              newCount={countRevisedSince(variants, state.mailVariantsLastAcknowledgedAt)}
              pdfUrl={state.variantsPdfUrl}
              pdfNeedsAcknowledge={
                !!state.variantsPdfUrl && pdfTime > ackTime && openCount === 0
              }
            />
          ))}

        {tab === 'flow' &&
          (visibleFlows.length === 0 && linkedInFlows.length === 0 ? (
            <EmptyState
              icon={<FlowIcon />}
              title={t('mailVariantsPage.flowEmptyTitle')}
              description={t('mailVariantsPage.flowEmptyBody')}
            />
          ) : (
            <div className="flex min-h-0 flex-1 flex-col gap-4 overflow-y-auto">
              {visibleFlows.map((flow) => (
                <CampaignFlowDiagram
                  key={flow.id}
                  flow={flow}
                  variantsBySubject={variantsBySubject}
                />
              ))}
              {linkedInFlows.map((flow) => (
                <LinkedInFlowBlock key={flow.flowId} state={flow} />
              ))}
            </div>
          ))}

        {tab === 'geschiedenis' &&
          (variants.length === 0 ? (
            <EmptyState
              icon={<ClockIcon />}
              title={t('mailVariantsPage.historyEmptyTitle')}
              description={t('mailVariantsPage.historyEmptyBody')}
            />
          ) : (
            <VariantHistory variants={variants} allFeedbackByVariant={allFeedbackByVariant} />
          ))}
      </div>
    </div>
  )
}

function MailIcon() {
  return (
    <svg
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth={1.6}
      strokeLinecap="round"
      strokeLinejoin="round"
      className="h-5 w-5"
    >
      <path d="M21.75 6.75v10.5a2.25 2.25 0 0 1-2.25 2.25h-15a2.25 2.25 0 0 1-2.25-2.25V6.75m19.5 0A2.25 2.25 0 0 0 19.5 4.5h-15a2.25 2.25 0 0 0-2.25 2.25m19.5 0v.243a2.25 2.25 0 0 1-1.07 1.916l-7.5 4.615a2.25 2.25 0 0 1-2.36 0L3.32 8.91a2.25 2.25 0 0 1-1.07-1.916V6.75" />
    </svg>
  )
}

function FlowIcon() {
  return (
    <svg
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth={1.6}
      strokeLinecap="round"
      strokeLinejoin="round"
      className="h-5 w-5"
    >
      <path d="M9 5H7a2 2 0 0 0-2 2v12a2 2 0 0 0 2 2h10a2 2 0 0 0 2-2V7a2 2 0 0 0-2-2h-2M9 5a2 2 0 0 0 2 2h2a2 2 0 0 0 2-2M9 5a2 2 0 0 1 2-2h2a2 2 0 0 1 2 2m-6 9 2 2 4-4" />
    </svg>
  )
}

function ClockIcon() {
  return (
    <svg
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth={1.6}
      strokeLinecap="round"
      strokeLinejoin="round"
      className="h-5 w-5"
    >
      <path d="M12 6v6h4.5m4.5 0a9 9 0 1 1-18 0 9 9 0 0 1 18 0Z" />
    </svg>
  )
}
