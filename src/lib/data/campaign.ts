import { createAdminClient } from '@/lib/supabase/admin'
import type { CampaignFormValues } from '@/lib/validations/campaign-form'

export type TaskStatus = 'completed' | 'current' | 'upcoming'
export type TaskAssignee = 'client' | 'nextwave'

export interface CampaignTask {
  id: string
  label: string
  assignee: TaskAssignee
  status: TaskStatus
  note?: string
}

export interface CampaignState {
  clientId: string
  // Task 1 is always done (dashboard delivered on account creation)
  formSubmittedAt: string | null
  formAllowedCount: number
  formSubmissionCount: number
  mailDraftsReady: boolean
  previewFilled: boolean
  approvalDeadline: string | null
  previewApprovalRequestedAt: string | null
  previewApprovedAt: string | null
  variantsApprovalRequestedAt: string | null
  variantsApprovedAt: string | null
  completedAt: string | null
  variantsPdfUrl: string | null
  variantsPdfUploadedAt: string | null
  dncConfirmedAt: string | null
  mailVariantsLastAcknowledgedAt: string | null
  proposalTitle: string | null
  proposalBody: string | null
  proposalPublishedAt: string | null
  proposalAcknowledgedAt: string | null
}

export interface CampaignFormSubmission {
  id: string
  clientId: string
  data: CampaignFormValues
  submittedAt: string
}

export interface MailVariant {
  id: string
  clientId: string
  mailNumber: 1 | 2 | 3
  variantLabel: string
  subject: string
  body: string
  exampleBody: string
  explanation: string
  position: number
  isPublished: boolean
  updatedAt: string
}

function mapCampaignRow(row: Record<string, unknown>, submissionCount: number): CampaignState {
  return {
    clientId: row.id as string,
    formSubmittedAt: (row.campaign_form_submitted_at as string) ?? null,
    formAllowedCount: (row.campaign_form_allowed_count as number) ?? 1,
    formSubmissionCount: submissionCount,
    mailDraftsReady: Boolean(row.campaign_mail_drafts_ready),
    previewFilled: Boolean(row.campaign_preview_filled),
    approvalDeadline: (row.campaign_approval_deadline as string) ?? null,
    previewApprovalRequestedAt: (row.campaign_preview_approval_requested_at as string) ?? null,
    previewApprovedAt: (row.campaign_preview_approved_at as string) ?? null,
    variantsApprovalRequestedAt: (row.campaign_variants_approval_requested_at as string) ?? null,
    variantsApprovedAt: (row.campaign_variants_approved_at as string) ?? null,
    completedAt: (row.campaign_completed_at as string) ?? null,
    variantsPdfUrl: (row.campaign_variants_pdf_url as string) ?? null,
    variantsPdfUploadedAt: (row.campaign_variants_pdf_uploaded_at as string) ?? null,
    dncConfirmedAt: (row.campaign_dnc_confirmed_at as string) ?? null,
    mailVariantsLastAcknowledgedAt: (row.mail_variants_last_acknowledged_at as string) ?? null,
    proposalTitle: (row.campaign_proposal_title as string) ?? null,
    proposalBody: (row.campaign_proposal_body as string) ?? null,
    proposalPublishedAt: (row.campaign_proposal_published_at as string) ?? null,
    proposalAcknowledgedAt: (row.campaign_proposal_acknowledged_at as string) ?? null,
  }
}

export function canSubmitCampaignForm(state: CampaignState): boolean {
  return state.formSubmissionCount < state.formAllowedCount
}

export async function getCampaignState(clientId: string): Promise<CampaignState | null> {
  const supabase = createAdminClient()
  const [{ data, error }, { count }] = await Promise.all([
    supabase
      .from('clients')
      .select(
        'id, campaign_form_submitted_at, campaign_form_allowed_count, campaign_mail_drafts_ready, campaign_preview_filled, campaign_approval_deadline, campaign_preview_approval_requested_at, campaign_preview_approved_at, campaign_variants_approval_requested_at, campaign_variants_approved_at, campaign_completed_at, campaign_variants_pdf_url, campaign_variants_pdf_uploaded_at, campaign_dnc_confirmed_at, mail_variants_last_acknowledged_at, campaign_proposal_title, campaign_proposal_body, campaign_proposal_published_at, campaign_proposal_acknowledged_at'
      )
      .eq('id', clientId)
      .single(),
    supabase
      .from('campaign_form_submissions')
      .select('id', { count: 'exact', head: true })
      .eq('client_id', clientId),
  ])

  if (error || !data) return null
  return mapCampaignRow(data as unknown as Record<string, unknown>, count ?? 0)
}

export async function getCampaignFormSubmissions(
  clientId: string
): Promise<CampaignFormSubmission[]> {
  const supabase = createAdminClient()
  const { data, error } = await supabase
    .from('campaign_form_submissions')
    .select('id, client_id, data, submitted_at')
    .eq('client_id', clientId)
    .order('submitted_at', { ascending: true })

  if (error || !data) return []

  return data.map((row) => ({
    id: row.id,
    clientId: row.client_id,
    data: row.data as CampaignFormValues,
    submittedAt: row.submitted_at,
  }))
}

export async function getCampaignFormData(clientId: string): Promise<CampaignFormValues | null> {
  const supabase = createAdminClient()
  const { data, error } = await supabase
    .from('clients')
    .select('campaign_form_data')
    .eq('id', clientId)
    .single()

  if (error || !data || !data.campaign_form_data) return null
  return data.campaign_form_data as CampaignFormValues
}

export async function getMailVariants(clientId: string): Promise<MailVariant[]> {
  const supabase = createAdminClient()
  const { data, error } = await supabase
    .from('mail_variants')
    .select('*')
    .eq('client_id', clientId)
    .order('mail_number', { ascending: true })
    .order('position', { ascending: true })

  if (error || !data) return []

  return data.map((row) => ({
    id: row.id,
    clientId: row.client_id,
    mailNumber: row.mail_number as 1 | 2 | 3,
    variantLabel: row.variant_label,
    subject: row.subject,
    body: row.body,
    exampleBody: row.example_body ?? '',
    explanation: row.explanation,
    position: row.position,
    isPublished: Boolean(row.is_published),
    updatedAt: row.updated_at,
  }))
}

/**
 * Derive the current task list from the campaign state.
 * Task order:
 *  1. Dashboard opgeleverd (NextWave, auto-complete)
 *  2. Invulformulier invullen (Klant)
 *  3. Mailopzetjes & voorvertoning aanvullen (NextWave)
 *  4. Mailvarianten goedkeuren (Klant)
 *  5. Voorvertoning goedkeuren (Klant)
 *  6. DNC invullen (Klant, optioneel)
 */
export function deriveTasks(state: CampaignState): CampaignTask[] {
  const task1Done = true // dashboard always delivered
  const task2Done = !!state.formSubmittedAt
  const task3Done = state.mailDraftsReady && state.previewFilled
  const task4Done = !!state.variantsApprovedAt
  const task5Done = !!state.previewApprovedAt
  const task6Done = !!state.dncConfirmedAt

  const doneFlags = [task1Done, task2Done, task3Done, task4Done, task5Done, task6Done]
  // First not-done index is "current". -1 means everything is done.
  const currentIndex = doneFlags.findIndex((d) => !d)

  const statusFor = (i: number, done: boolean): TaskStatus => {
    if (done) return 'completed'
    if (i === currentIndex) return 'current'
    return 'upcoming'
  }

  return [
    {
      id: 'dashboard',
      label: 'Dashboard opgeleverd',
      assignee: 'nextwave',
      status: statusFor(0, task1Done),
    },
    {
      id: 'form',
      label: 'Invulformulier invullen',
      assignee: 'client',
      status: statusFor(1, task2Done),
    },
    {
      id: 'drafts',
      label: 'Mailopzetjes & voorvertoning aanvullen',
      assignee: 'nextwave',
      status: statusFor(2, task3Done),
      note: 'Vaak ~48u, bij drukte langer',
    },
    {
      id: 'variants',
      label: 'Mailvarianten goedkeuren',
      assignee: 'client',
      status: statusFor(3, task4Done),
    },
    {
      id: 'preview',
      label: 'Voorvertoning goedkeuren',
      assignee: 'client',
      status: statusFor(4, task5Done),
    },
    {
      id: 'dnc',
      label: 'DNC-lijst aanvullen (optioneel)',
      assignee: 'client',
      status: statusFor(5, task6Done),
    },
  ]
}

export function isCampaignReadyForCompletion(state: CampaignState): boolean {
  return !!state.previewApprovedAt && !!state.variantsApprovedAt && !state.completedAt
}
