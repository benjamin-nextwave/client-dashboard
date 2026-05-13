import Link from 'next/link'
import { notFound } from 'next/navigation'
import { createAdminClient } from '@/lib/supabase/admin'
import {
  getCampaignState,
  getMailVariants,
  getLatestMailVariantFeedback,
  getAllMailVariantFeedback,
} from '@/lib/data/campaign'
import { getLinkedInFlowState } from '@/lib/data/linkedin-flow'
import { CampaignControls } from './_components/campaign-controls'
import { ProposalEditor } from './_components/proposal-editor'
import { MailVariantsEditor } from './_components/mail-variants-editor'
import { LinkedInFlowEditor } from './_components/linkedin-flow-editor'
import { PdfUpload } from './_components/pdf-upload'

export const dynamic = 'force-dynamic'

interface Props {
  params: Promise<{ clientId: string }>
}

export default async function OperatorCampaignPage({ params }: Props) {
  const { clientId } = await params

  const supabase = createAdminClient()
  const { data: client } = await supabase
    .from('clients')
    .select('id, company_name, primary_color, logo_url')
    .eq('id', clientId)
    .single()

  if (!client) notFound()

  const [state, variants, feedbackByVariant, allFeedbackByVariant, linkedInFlow] =
    await Promise.all([
      getCampaignState(clientId),
      getMailVariants(clientId),
      getLatestMailVariantFeedback(clientId),
      getAllMailVariantFeedback(clientId),
      getLinkedInFlowState(clientId),
    ])

  if (!state || !linkedInFlow) notFound()

  return (
    <div className="mx-auto max-w-5xl space-y-8">
      <div>
        <Link
          href={`/admin/clients/${clientId}/edit`}
          className="group inline-flex items-center gap-1.5 text-xs font-semibold text-gray-500 transition-colors hover:text-indigo-600"
        >
          <svg className="h-3.5 w-3.5 transition-transform group-hover:-translate-x-0.5" fill="none" viewBox="0 0 24 24" strokeWidth={2.5} stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" d="M10.5 19.5 3 12m0 0 7.5-7.5M3 12h18" />
          </svg>
          Terug naar klant
        </Link>

        <div className="mt-5 flex items-center justify-between">
          <div>
            <div className="text-[11px] font-semibold uppercase tracking-wide text-gray-400">Campagne-onboarding</div>
            <h1 className="mt-1 text-3xl font-semibold tracking-tight text-gray-900">{client.company_name}</h1>
            <p className="mt-1 text-sm text-gray-500">Beheer de onboarding-flow en mailvarianten voor deze klant.</p>
          </div>
        </div>
      </div>

      <CampaignControls clientId={clientId} state={state} />
      <ProposalEditor
        clientId={clientId}
        currentTitle={state.proposalTitle}
        currentBody={state.proposalBody}
        publishedAt={state.proposalPublishedAt}
        acknowledgedAt={state.proposalAcknowledgedAt}
      />
      <PdfUpload clientId={clientId} currentUrl={state.variantsPdfUrl} />
      <MailVariantsEditor
        clientId={clientId}
        variants={variants}
        variantsApprovalRequestedAt={state.variantsApprovalRequestedAt}
        feedbackByVariant={feedbackByVariant}
        allFeedbackByVariant={allFeedbackByVariant}
      />
      <LinkedInFlowEditor clientId={clientId} state={linkedInFlow} />
    </div>
  )
}
