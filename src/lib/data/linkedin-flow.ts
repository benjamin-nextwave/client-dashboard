import { createAdminClient } from '@/lib/supabase/admin'

/**
 * Fixed-structure LinkedIn outreach flow that runs after the email flow.
 * Leads only enter this flow if they didn't reply to any of the 3 mails.
 *
 * The structure is hard-coded — only 4 message bodies are editable. Each
 * step in {@link LINKEDIN_FLOW_STEPS} carries:
 *   - `key`: a stable identifier (also the column name suffix for editable
 *     steps, e.g. "day_plus_1" → `linkedin_message_day_plus_1`)
 *   - `dayLabel`: the timing badge (e.g. "Dag 1", "Dag +4")
 *   - `title`, `description`: copy shown in both the operator editor and
 *     the read-only client block
 *   - `editable`: whether this step has an editable message body
 *   - `charLimit`: optional soft limit (400 for the first message after
 *     accept). The UI surfaces a counter so the operator stays inside
 *     LinkedIn limits.
 *
 * Since 2026-05-14 the LinkedIn flow lives on `campaign_flows` (per
 * mail-flow) instead of on `clients` (per-client). A client with multiple
 * campaigns can run a different LinkedIn sequence per campaign.
 */
export type LinkedInStepKey =
  | 'day_1_profile_visit'
  | 'day_2_3_like_comment'
  | 'day_5_connection_request'
  | 'day_plus_1'
  | 'day_plus_4'
  | 'day_plus_9'
  | 'day_plus_14'

export type LinkedInEditableStepKey =
  | 'day_plus_1'
  | 'day_plus_4'
  | 'day_plus_9'
  | 'day_plus_14'

export interface LinkedInFlowStep {
  key: LinkedInStepKey
  dayLabel: string
  title: string
  description: string
  editable: boolean
  charLimit?: number
  phase: 'pre_accept' | 'post_accept'
}

export const LINKEDIN_FLOW_STEPS: LinkedInFlowStep[] = [
  {
    key: 'day_1_profile_visit',
    dayLabel: 'Dag 1',
    title: 'Profielbezoek',
    description: 'Bezoek het profiel van de lead zodat ze je naam later herkennen.',
    editable: false,
    phase: 'pre_accept',
  },
  {
    key: 'day_2_3_like_comment',
    dayLabel: 'Dag 2–3',
    title: 'Like + comment op recente post',
    description:
      'Like een recente post en plaats een korte, inhoudelijke comment. Voeg waarde toe — geen pitch.',
    editable: false,
    phase: 'pre_accept',
  },
  {
    key: 'day_5_connection_request',
    dayLabel: 'Dag 5',
    title: 'Connectieverzoek (zonder notitie)',
    description: 'Stuur een puur connectieverzoek zonder begeleidende notitie.',
    editable: false,
    phase: 'pre_accept',
  },
  {
    key: 'day_plus_1',
    dayLabel: 'Dag +1',
    title: 'Bericht 1 · open vraag',
    description: 'Open vraag, geen pitch. Korte, gepersonaliseerde boodschap (<400 tekens).',
    editable: true,
    charLimit: 400,
    phase: 'post_accept',
  },
  {
    key: 'day_plus_4',
    dayLabel: 'Dag +4',
    title: 'Follow-up 1 · waarde + zachte CTA',
    description: 'Bied concrete waarde en sluit af met een zachte CTA.',
    editable: true,
    phase: 'post_accept',
  },
  {
    key: 'day_plus_9',
    dayLabel: 'Dag +9',
    title: 'Follow-up 2 · case study + binaire keuze',
    description: 'Verwijs naar een relevante case en bied een binaire keuze (ja / nee, optie A / optie B).',
    editable: true,
    phase: 'post_accept',
  },
  {
    key: 'day_plus_14',
    dayLabel: 'Dag +14',
    title: 'Break-up · deur openlaten',
    description: 'Sluit de sequence vriendelijk af, laat de deur open voor later.',
    editable: true,
    phase: 'post_accept',
  },
]

export type LinkedInMessages = Record<LinkedInEditableStepKey, string>

export interface LinkedInFlowState {
  flowId: string
  clientId: string
  enabled: boolean
  messages: LinkedInMessages
  publishedAt: string | null
  approvedAt: string | null
}

const COLUMN_BY_STEP: Record<LinkedInEditableStepKey, string> = {
  day_plus_1: 'linkedin_message_day_plus_1',
  day_plus_4: 'linkedin_message_day_plus_4',
  day_plus_9: 'linkedin_message_day_plus_9',
  day_plus_14: 'linkedin_message_day_plus_14',
}

export function linkedInColumnForStep(step: LinkedInEditableStepKey): string {
  return COLUMN_BY_STEP[step]
}

const SELECT_COLS =
  'id, client_id, linkedin_flow_enabled, linkedin_message_day_plus_1, linkedin_message_day_plus_4, linkedin_message_day_plus_9, linkedin_message_day_plus_14, linkedin_flow_published_at, linkedin_flow_approved_at'

type LinkedInRow = {
  id: string
  client_id: string
  linkedin_flow_enabled: boolean | null
  linkedin_message_day_plus_1: string | null
  linkedin_message_day_plus_4: string | null
  linkedin_message_day_plus_9: string | null
  linkedin_message_day_plus_14: string | null
  linkedin_flow_published_at: string | null
  linkedin_flow_approved_at: string | null
}

function mapRow(row: LinkedInRow): LinkedInFlowState {
  return {
    flowId: row.id,
    clientId: row.client_id,
    enabled: Boolean(row.linkedin_flow_enabled),
    messages: {
      day_plus_1: row.linkedin_message_day_plus_1 ?? '',
      day_plus_4: row.linkedin_message_day_plus_4 ?? '',
      day_plus_9: row.linkedin_message_day_plus_9 ?? '',
      day_plus_14: row.linkedin_message_day_plus_14 ?? '',
    },
    publishedAt: row.linkedin_flow_published_at ?? null,
    approvedAt: row.linkedin_flow_approved_at ?? null,
  }
}

/**
 * Read the LinkedIn flow state for a single mail flow. Returns `null` when
 * the flow itself doesn't exist; otherwise returns the (possibly disabled)
 * state.
 */
export async function getLinkedInFlowStateByFlow(
  flowId: string
): Promise<LinkedInFlowState | null> {
  const supabase = createAdminClient()
  const { data, error } = await supabase
    .from('campaign_flows')
    .select(SELECT_COLS)
    .eq('id', flowId)
    .single()

  if (error || !data) return null
  return mapRow(data as unknown as LinkedInRow)
}

/**
 * Read every flow's LinkedIn state for a client, keyed by flow_id. Used by
 * pages that render multiple campaigns side-by-side (the campagne-flow
 * admin, the client's mijn-campagne page) so they only round-trip once.
 */
export async function getLinkedInFlowsByClient(
  clientId: string
): Promise<Record<string, LinkedInFlowState>> {
  const supabase = createAdminClient()
  const { data, error } = await supabase
    .from('campaign_flows')
    .select(SELECT_COLS)
    .eq('client_id', clientId)

  if (error || !data) return {}

  const out: Record<string, LinkedInFlowState> = {}
  for (const row of data as unknown as LinkedInRow[]) {
    out[row.id] = mapRow(row)
  }
  return out
}

/**
 * Has the operator published a version of the flow that the client still
 * needs to (re)approve? Mirrors the same staleness logic as the mail
 * variants: every operator publish bumps `published_at`, every client
 * approve bumps `approved_at`, and the block is "needs approval" when
 * the flow is enabled, published, and the published version is newer
 * than the latest approval.
 */
export function linkedInFlowNeedsApproval(state: LinkedInFlowState): boolean {
  if (!state.enabled || !state.publishedAt) return false
  if (!state.approvedAt) return true
  return new Date(state.publishedAt).getTime() > new Date(state.approvedAt).getTime()
}
