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
  createdAt: string
  updatedAt: string
  clientApprovedAt: string | null
  clientApprovedVersion: string | null
  clientFeedbackSubmittedAt: string | null
  clientFeedbackSubmittedVersion: string | null
}

export type MailVariantStatus = 'open' | 'approved' | 'feedback_pending'

export function deriveVariantStatus(variant: MailVariant): MailVariantStatus {
  const updatedAt = new Date(variant.updatedAt).getTime()
  const approvedAt = variant.clientApprovedVersion
    ? new Date(variant.clientApprovedVersion).getTime()
    : 0
  const feedbackAt = variant.clientFeedbackSubmittedVersion
    ? new Date(variant.clientFeedbackSubmittedVersion).getTime()
    : 0

  if (approvedAt >= updatedAt && variant.clientApprovedAt) return 'approved'
  if (feedbackAt >= updatedAt && variant.clientFeedbackSubmittedAt) return 'feedback_pending'
  return 'open'
}

export type MailVariantFeedbackActionType = 'replace_with' | 'remove' | 'other'

export interface MailVariantFeedbackItem {
  id: string
  submissionId: string
  selectionText: string
  selectionStart: number
  selectionEnd: number
  actionType: MailVariantFeedbackActionType
  feedbackText: string | null
  position: number
}

export interface MailVariantFeedbackSubmission {
  id: string
  mailVariantId: string
  clientId: string
  generalFeedback: string | null
  variantVersion: string
  submittedAt: string
  items: MailVariantFeedbackItem[]
  // Snapshot of the variant as it was at the moment of feedback. Null on
  // rows submitted before the snapshot migration where we couldn't safely
  // backfill (i.e. the operator had already changed the variant since).
  variantSubjectSnapshot: string | null
  variantBodySnapshot: string | null
  variantExampleBodySnapshot: string | null
  variantLabelSnapshot: string | null
  variantExplanationSnapshot: string | null
}

export type MailVariantTimelineEvent =
  | { kind: 'created'; at: string }
  | { kind: 'approved'; at: string }
  | { kind: 'feedback'; at: string; submission: MailVariantFeedbackSubmission }

/**
 * Builds a descending-by-time event list for a single variant:
 *   - feedback submissions (newest first)
 *   - approval (if approved at any point)
 *   - creation (always last in the list)
 */
export function buildMailVariantTimeline(
  variant: MailVariant,
  submissions: MailVariantFeedbackSubmission[]
): MailVariantTimelineEvent[] {
  const events: MailVariantTimelineEvent[] = []
  for (const s of submissions) {
    events.push({ kind: 'feedback', at: s.submittedAt, submission: s })
  }
  if (variant.clientApprovedAt) {
    events.push({ kind: 'approved', at: variant.clientApprovedAt })
  }
  events.push({ kind: 'created', at: variant.createdAt })
  return events.sort((a, b) => new Date(b.at).getTime() - new Date(a.at).getTime())
}

export interface MailVariantsTimelineEntry {
  variant: MailVariant
  event: MailVariantTimelineEvent
}

/**
 * Flat, time-sorted timeline across every variant for a client. Used by the
 * "Tijdlijn mailvarianten" section on the campaign page so the client/operator
 * sees one chronological feed instead of one timeline per variant.
 */
export function buildAllMailVariantsTimeline(
  variants: MailVariant[],
  submissionsByVariant: Record<string, MailVariantFeedbackSubmission[]>
): MailVariantsTimelineEntry[] {
  const entries: MailVariantsTimelineEntry[] = []
  for (const v of variants) {
    for (const e of buildMailVariantTimeline(v, submissionsByVariant[v.id] ?? [])) {
      entries.push({ variant: v, event: e })
    }
  }
  return entries.sort(
    (a, b) => new Date(b.event.at).getTime() - new Date(a.event.at).getTime()
  )
}

/**
 * Derives a stable "Mail X" or "Mail X, variant Y" label for a variant
 * inside a given list — used in the combined timeline so each event shows
 * which variant it belongs to.
 */
export function deriveVariantHeaderLabel(
  variant: MailVariant,
  allVariants: MailVariant[]
): string {
  const inSameMail = allVariants.filter((v) => v.mailNumber === variant.mailNumber)
  if (inSameMail.length <= 1) return `Mail ${variant.mailNumber}`
  // Order by position to match the wizard's variant numbering
  const sorted = [...inSameMail].sort((a, b) => a.position - b.position)
  const idx = sorted.findIndex((v) => v.id === variant.id) + 1
  return `Mail ${variant.mailNumber}, variant ${idx}`
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
    createdAt: row.created_at,
    updatedAt: row.updated_at,
    clientApprovedAt: row.client_approved_at ?? null,
    clientApprovedVersion: row.client_approved_version ?? null,
    clientFeedbackSubmittedAt: row.client_feedback_submitted_at ?? null,
    clientFeedbackSubmittedVersion: row.client_feedback_submitted_version ?? null,
  }))
}

/**
 * Returns the latest feedback submission per mail variant for a client,
 * including its items. Used by both the client (read its own feedback in
 * read-only mode after submission) and the operator (inline feedback view
 * in the campagne editor).
 */
export async function getLatestMailVariantFeedback(
  clientId: string
): Promise<Record<string, MailVariantFeedbackSubmission>> {
  const supabase = createAdminClient()
  const { data: submissions, error } = await supabase
    .from('mail_variant_feedback_submissions')
    .select(SUBMISSION_SELECT)
    .eq('client_id', clientId)
    .order('submitted_at', { ascending: false })

  if (error || !submissions || submissions.length === 0) return {}

  const latestByVariant = new Map<string, (typeof submissions)[number]>()
  for (const s of submissions) {
    if (!latestByVariant.has(s.mail_variant_id)) latestByVariant.set(s.mail_variant_id, s)
  }

  const submissionIds = Array.from(latestByVariant.values()).map((s) => s.id)
  const itemsBySubmission = await fetchItemsBySubmission(submissionIds)

  const result: Record<string, MailVariantFeedbackSubmission> = {}
  for (const [variantId, s] of latestByVariant) {
    result[variantId] = mapSubmissionRow(s, itemsBySubmission.get(s.id) ?? [])
  }
  return result
}

/**
 * Returns every feedback submission per variant (newest first), including
 * items + body snapshots. Used by the timeline view.
 */
export async function getAllMailVariantFeedback(
  clientId: string
): Promise<Record<string, MailVariantFeedbackSubmission[]>> {
  const supabase = createAdminClient()
  const { data: submissions, error } = await supabase
    .from('mail_variant_feedback_submissions')
    .select(SUBMISSION_SELECT)
    .eq('client_id', clientId)
    .order('submitted_at', { ascending: false })

  if (error || !submissions || submissions.length === 0) return {}

  const submissionIds = submissions.map((s) => s.id)
  const itemsBySubmission = await fetchItemsBySubmission(submissionIds)

  const result: Record<string, MailVariantFeedbackSubmission[]> = {}
  for (const s of submissions) {
    const list = result[s.mail_variant_id] ?? []
    list.push(mapSubmissionRow(s, itemsBySubmission.get(s.id) ?? []))
    result[s.mail_variant_id] = list
  }
  return result
}

const SUBMISSION_SELECT =
  'id, mail_variant_id, client_id, general_feedback, variant_version, submitted_at, variant_subject_snapshot, variant_body_snapshot, variant_example_body_snapshot, variant_label_snapshot, variant_explanation_snapshot'

type SubmissionRow = {
  id: string
  mail_variant_id: string
  client_id: string
  general_feedback: string | null
  variant_version: string
  submitted_at: string
  variant_subject_snapshot: string | null
  variant_body_snapshot: string | null
  variant_example_body_snapshot: string | null
  variant_label_snapshot: string | null
  variant_explanation_snapshot: string | null
}

function mapSubmissionRow(
  s: SubmissionRow,
  items: MailVariantFeedbackItem[]
): MailVariantFeedbackSubmission {
  return {
    id: s.id,
    mailVariantId: s.mail_variant_id,
    clientId: s.client_id,
    generalFeedback: s.general_feedback ?? null,
    variantVersion: s.variant_version,
    submittedAt: s.submitted_at,
    items,
    variantSubjectSnapshot: s.variant_subject_snapshot ?? null,
    variantBodySnapshot: s.variant_body_snapshot ?? null,
    variantExampleBodySnapshot: s.variant_example_body_snapshot ?? null,
    variantLabelSnapshot: s.variant_label_snapshot ?? null,
    variantExplanationSnapshot: s.variant_explanation_snapshot ?? null,
  }
}

async function fetchItemsBySubmission(
  submissionIds: string[]
): Promise<Map<string, MailVariantFeedbackItem[]>> {
  const map = new Map<string, MailVariantFeedbackItem[]>()
  if (submissionIds.length === 0) return map

  const supabase = createAdminClient()
  const { data: items } = await supabase
    .from('mail_variant_feedback_items')
    .select(
      'id, submission_id, selection_text, selection_start, selection_end, action_type, feedback_text, position'
    )
    .in('submission_id', submissionIds)
    .order('position', { ascending: true })

  for (const it of items ?? []) {
    const list = map.get(it.submission_id) ?? []
    list.push({
      id: it.id,
      submissionId: it.submission_id,
      selectionText: it.selection_text,
      selectionStart: it.selection_start,
      selectionEnd: it.selection_end,
      actionType: it.action_type as MailVariantFeedbackActionType,
      feedbackText: it.feedback_text ?? null,
      position: it.position,
    })
    map.set(it.submission_id, list)
  }
  return map
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
