import { createAdminClient } from '@/lib/supabase/admin'

export type OnboardingStep =
  | 'dashboard'
  | 'form'
  | 'drafts'
  | 'variants'
  | 'preview'
  | 'dnc'

export interface ClientTaskOverview {
  id: string
  companyName: string
  primaryColor: string | null
  logoUrl: string | null

  // Onboarding progress
  onboardingComplete: boolean
  currentStep: OnboardingStep | null
  completedSteps: number
  totalSteps: number

  // Individual step states
  formSubmitted: boolean
  formSubmittedAt: string | null
  draftsReady: boolean
  previewFilled: boolean
  variantsApproved: boolean
  variantsApprovedAt: string | null
  previewApproved: boolean
  previewApprovedAt: string | null
  dncConfirmed: boolean
  dncConfirmedAt: string | null

  // Deadline
  approvalDeadline: string | null
  deadlineOverdue: boolean
  deadlineDaysLeft: number | null

  // Post-onboarding approvals
  variantsPublishedCount: number
  variantsAcknowledgedAt: string | null
  variantsNeedApproval: boolean

  proposalTitle: string | null
  proposalPublishedAt: string | null
  proposalAcknowledgedAt: string | null
  proposalNeedsApproval: boolean

  // Feedback
  openFeedbackCount: number

  // Timestamps
  createdAt: string
}

const STEP_ORDER: OnboardingStep[] = ['dashboard', 'form', 'drafts', 'variants', 'preview', 'dnc']

export async function getManagementOverview(): Promise<ClientTaskOverview[]> {
  const supabase = createAdminClient()

  const [clientsRes, variantsRes, feedbackRes] = await Promise.all([
    supabase
      .from('clients')
      .select(
        'id, company_name, primary_color, logo_url, is_hidden, created_at, ' +
        'campaign_form_submitted_at, campaign_mail_drafts_ready, campaign_preview_filled, ' +
        'campaign_approval_deadline, campaign_preview_approved_at, campaign_variants_approved_at, ' +
        'campaign_dnc_confirmed_at, campaign_completed_at, ' +
        'campaign_variants_pdf_url, campaign_variants_pdf_uploaded_at, ' +
        'mail_variants_last_acknowledged_at, ' +
        'campaign_proposal_title, campaign_proposal_published_at, campaign_proposal_acknowledged_at'
      )
      .eq('is_hidden', false)
      .order('company_name', { ascending: true }),
    supabase
      .from('mail_variants')
      .select('client_id, is_published, updated_at'),
    supabase
      .from('feedback_requests')
      .select('client_id, status')
      .in('status', ['new', 'in_progress']),
  ])

  const clients = (clientsRes.data ?? []) as unknown as Record<string, unknown>[]
  const allVariants = (variantsRes.data ?? []) as { client_id: string; is_published: boolean; updated_at: string }[]
  const allFeedback = (feedbackRes.data ?? []) as { client_id: string; status: string }[]

  const now = Date.now()

  return clients.map((c) => {
    const str = (key: string) => (c[key] as string) ?? null
    const bool = (key: string) => Boolean(c[key])

    const step1 = true
    const step2 = !!str('campaign_form_submitted_at')
    const step3 = bool('campaign_mail_drafts_ready') && bool('campaign_preview_filled')
    const step4 = !!str('campaign_variants_approved_at')
    const step5 = !!str('campaign_preview_approved_at')
    const step6 = !!str('campaign_dnc_confirmed_at')

    const steps = [step1, step2, step3, step4, step5, step6]
    const completedSteps = steps.filter(Boolean).length
    const firstIncomplete = steps.findIndex((s) => !s)
    const currentStep: OnboardingStep | null =
      firstIncomplete === -1 ? null : STEP_ORDER[firstIncomplete]
    const onboardingComplete = steps.every(Boolean)

    // Deadline
    const deadline = str('campaign_approval_deadline')
    let deadlineOverdue = false
    let deadlineDaysLeft: number | null = null
    if (deadline) {
      const dl = new Date(deadline).getTime()
      const diff = dl - now
      deadlineDaysLeft = Math.ceil(diff / 86_400_000)
      deadlineOverdue = diff < 0
    }

    // Mail variants needing approval
    const clientId = c.id as string
    const clientVariants = allVariants.filter(
      (v) => v.client_id === clientId && v.is_published
    )
    const latestVariantUpdate = clientVariants.reduce(
      (max, v) => Math.max(max, new Date(v.updated_at).getTime()),
      0
    )
    const pdfUploadedAt = str('campaign_variants_pdf_uploaded_at')
    const pdfTime = pdfUploadedAt ? new Date(pdfUploadedAt).getTime() : 0
    const latestContent = Math.max(latestVariantUpdate, pdfTime)
    const mailAckAt = str('mail_variants_last_acknowledged_at')
    const ackTime = mailAckAt ? new Date(mailAckAt).getTime() : 0
    const variantsNeedApproval =
      (clientVariants.length > 0 || !!str('campaign_variants_pdf_url')) &&
      (!mailAckAt || latestContent > ackTime)

    // Proposal
    const proposalTitle = str('campaign_proposal_title')
    const proposalPub = str('campaign_proposal_published_at')
    const proposalAck = str('campaign_proposal_acknowledged_at')
    const proposalNeedsApproval =
      !!proposalTitle &&
      !!proposalPub &&
      (!proposalAck || new Date(proposalPub).getTime() > new Date(proposalAck).getTime())

    // Open feedback
    const openFeedbackCount = allFeedback.filter((f) => f.client_id === clientId).length

    return {
      id: clientId,
      companyName: c.company_name as string,
      primaryColor: str('primary_color'),
      logoUrl: str('logo_url'),
      onboardingComplete,
      currentStep,
      completedSteps,
      totalSteps: 6,
      formSubmitted: step2,
      formSubmittedAt: str('campaign_form_submitted_at'),
      draftsReady: step3,
      previewFilled: bool('campaign_preview_filled'),
      variantsApproved: step4,
      variantsApprovedAt: str('campaign_variants_approved_at'),
      previewApproved: step5,
      previewApprovedAt: str('campaign_preview_approved_at'),
      dncConfirmed: step6,
      dncConfirmedAt: str('campaign_dnc_confirmed_at'),
      approvalDeadline: deadline,
      deadlineOverdue,
      deadlineDaysLeft,
      variantsPublishedCount: clientVariants.length,
      variantsAcknowledgedAt: mailAckAt,
      variantsNeedApproval,
      proposalTitle,
      proposalPublishedAt: proposalPub,
      proposalAcknowledgedAt: proposalAck,
      proposalNeedsApproval,
      openFeedbackCount,
      createdAt: c.created_at as string,
    }
  })
}
