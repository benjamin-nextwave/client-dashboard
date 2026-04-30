import { createAdminClient } from '@/lib/supabase/admin'

export type FlowOutcomeKind = 'continue' | 'success' | 'dropoff'
export type FlowResponsibility = 'client' | 'nextwave'

export interface FlowDropoffReason {
  label: string
  position: number
}

export interface CampaignFlowVariant {
  id: string
  stepId: string
  label: string
  subject: string
  body: string
  exampleBody: string
  position: number
  updatedAt: string
}

export interface CampaignFlowOutcome {
  id: string
  stepId: string
  kind: FlowOutcomeKind
  label: string
  responsibility: FlowResponsibility | null
  dropoffReasons: FlowDropoffReason[]
  position: number
}

export interface CampaignFlowStep {
  id: string
  flowId: string
  stepNumber: number
  title: string
  position: number
  variants: CampaignFlowVariant[]
  outcomes: CampaignFlowOutcome[]
}

export interface CampaignFlow {
  id: string
  clientId: string
  name: string
  isPublished: boolean
  publishedAt: string | null
  createdAt: string
  updatedAt: string
  steps: CampaignFlowStep[]
}

export const OUTCOME_META: Record<
  FlowOutcomeKind,
  {
    label: string
    description: string
    accent: string
    badge: string
    dot: string
    ring: string
    softBg: string
    softBorder: string
    softText: string
  }
> = {
  continue: {
    label: 'Geen reactie',
    description: 'Pad gaat door naar de volgende mail.',
    accent: 'indigo',
    badge: 'bg-indigo-100 text-indigo-700',
    dot: 'bg-indigo-500',
    ring: 'ring-indigo-200',
    softBg: 'bg-indigo-50',
    softBorder: 'border-indigo-200',
    softText: 'text-indigo-700',
  },
  success: {
    label: 'Positief afgehandeld',
    description: 'Lead reageerde positief — pad eindigt hier.',
    accent: 'emerald',
    badge: 'bg-emerald-100 text-emerald-700',
    dot: 'bg-emerald-500',
    ring: 'ring-emerald-200',
    softBg: 'bg-emerald-50',
    softBorder: 'border-emerald-200',
    softText: 'text-emerald-700',
  },
  dropoff: {
    label: 'Lead is afgehaakt',
    description: 'Lead is uit de campagne — bekijk de redenen.',
    accent: 'rose',
    badge: 'bg-rose-100 text-rose-700',
    dot: 'bg-rose-500',
    ring: 'ring-rose-200',
    softBg: 'bg-rose-50',
    softBorder: 'border-rose-200',
    softText: 'text-rose-700',
  },
}

export const RESPONSIBILITY_LABEL: Record<FlowResponsibility, string> = {
  client: 'Door klant',
  nextwave: 'Door Nextwave',
}

// Client-side: spreek de klant rechtstreeks aan
export const CLIENT_RESPONSIBILITY_LABEL: Record<FlowResponsibility, string> = {
  client: 'Door jou',
  nextwave: 'Door Nextwave',
}

export const DEFAULT_DROPOFF_REASONS: FlowDropoffReason[] = [
  { label: 'Negatieve reactie', position: 0 },
  { label: 'Geen interesse', position: 1 },
  { label: 'Out-of-office reactie', position: 2 },
  { label: 'Andere reden', position: 3 },
]

interface VariantRow {
  id: string
  step_id: string
  label: string
  subject: string
  body: string
  example_body: string
  position: number
  updated_at: string
}

interface OutcomeRow {
  id: string
  step_id: string
  kind: FlowOutcomeKind
  label: string
  responsibility: FlowResponsibility | null
  dropoff_reasons: FlowDropoffReason[] | null
  position: number
}

interface StepRow {
  id: string
  flow_id: string
  step_number: number
  title: string
  position: number
  campaign_flow_step_variants?: VariantRow[]
  campaign_flow_step_outcomes?: OutcomeRow[]
}

interface FlowRow {
  id: string
  client_id: string
  name: string
  is_published: boolean
  published_at: string | null
  created_at: string
  updated_at: string
  campaign_flow_steps?: StepRow[]
}

function mapVariant(row: VariantRow): CampaignFlowVariant {
  return {
    id: row.id,
    stepId: row.step_id,
    label: row.label,
    subject: row.subject,
    body: row.body,
    exampleBody: row.example_body,
    position: row.position,
    updatedAt: row.updated_at,
  }
}

function mapOutcome(row: OutcomeRow): CampaignFlowOutcome {
  const reasons = Array.isArray(row.dropoff_reasons) ? row.dropoff_reasons : []
  return {
    id: row.id,
    stepId: row.step_id,
    kind: row.kind,
    label: row.label,
    responsibility: row.responsibility,
    dropoffReasons: [...reasons].sort((a, b) => a.position - b.position),
    position: row.position,
  }
}

function mapStep(row: StepRow): CampaignFlowStep {
  return {
    id: row.id,
    flowId: row.flow_id,
    stepNumber: row.step_number,
    title: row.title,
    position: row.position,
    variants: (row.campaign_flow_step_variants ?? [])
      .map(mapVariant)
      .sort((a, b) => a.position - b.position),
    outcomes: (row.campaign_flow_step_outcomes ?? [])
      .map(mapOutcome)
      .sort((a, b) => a.position - b.position),
  }
}

function mapFlow(row: FlowRow): CampaignFlow {
  return {
    id: row.id,
    clientId: row.client_id,
    name: row.name,
    isPublished: row.is_published,
    publishedAt: row.published_at,
    createdAt: row.created_at,
    updatedAt: row.updated_at,
    steps: (row.campaign_flow_steps ?? [])
      .map(mapStep)
      .sort((a, b) => a.position - b.position),
  }
}

const FLOW_SELECT = `
  id,
  client_id,
  name,
  is_published,
  published_at,
  created_at,
  updated_at,
  campaign_flow_steps (
    id,
    flow_id,
    step_number,
    title,
    position,
    campaign_flow_step_variants (
      id,
      step_id,
      label,
      subject,
      body,
      example_body,
      position,
      updated_at
    ),
    campaign_flow_step_outcomes (
      id,
      step_id,
      kind,
      label,
      responsibility,
      dropoff_reasons,
      position
    )
  )
`

export async function getCampaignFlowsByClient(
  clientId: string
): Promise<CampaignFlow[]> {
  const supabase = createAdminClient()
  const { data, error } = await supabase
    .from('campaign_flows')
    .select(FLOW_SELECT)
    .eq('client_id', clientId)
    .order('created_at', { ascending: true })

  if (error || !data) return []
  return (data as unknown as FlowRow[]).map(mapFlow)
}

export async function getCampaignFlowById(flowId: string): Promise<CampaignFlow | null> {
  const supabase = createAdminClient()
  const { data, error } = await supabase
    .from('campaign_flows')
    .select(FLOW_SELECT)
    .eq('id', flowId)
    .maybeSingle()

  if (error || !data) return null
  return mapFlow(data as unknown as FlowRow)
}

export async function getPublishedFlowsByClient(
  clientId: string
): Promise<CampaignFlow[]> {
  const flows = await getCampaignFlowsByClient(clientId)
  return flows.filter((f) => f.isPublished)
}

export async function createCampaignFlow(
  clientId: string,
  name: string
): Promise<CampaignFlow> {
  const supabase = createAdminClient()
  const { data, error } = await supabase
    .from('campaign_flows')
    .insert({ client_id: clientId, is_published: false, name: name.trim() || 'Naamloze campagne' })
    .select('id')
    .single()

  if (error || !data) throw new Error(`Kon campagne-flow niet aanmaken: ${error?.message}`)

  const created = await getCampaignFlowById(data.id)
  if (!created) throw new Error('Campagne-flow niet gevonden na aanmaken')
  return created
}
