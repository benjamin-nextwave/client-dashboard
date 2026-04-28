'use server'

import { revalidatePath } from 'next/cache'
import { createAdminClient } from '@/lib/supabase/admin'
import {
  ensureCampaignFlow,
  DEFAULT_DROPOFF_REASONS,
  type FlowDropoffReason,
  type FlowOutcomeKind,
  type FlowResponsibility,
} from '@/lib/data/campaign-flow'

function adminPaths(clientId: string) {
  return [
    `/admin/clients/${clientId}/campagne-flow`,
    `/dashboard/mijn-campagne`,
  ]
}

function revalidateFor(clientId: string) {
  for (const p of adminPaths(clientId)) revalidatePath(p)
}

async function getFlowIdForClient(clientId: string): Promise<string | null> {
  const supabase = createAdminClient()
  const { data } = await supabase
    .from('campaign_flows')
    .select('id')
    .eq('client_id', clientId)
    .maybeSingle()
  return data?.id ?? null
}

async function getClientIdForStep(stepId: string): Promise<string | null> {
  const supabase = createAdminClient()
  const { data: step } = await supabase
    .from('campaign_flow_steps')
    .select('flow_id')
    .eq('id', stepId)
    .maybeSingle()
  if (!step) return null

  const { data: flow } = await supabase
    .from('campaign_flows')
    .select('client_id')
    .eq('id', step.flow_id)
    .maybeSingle()
  return flow?.client_id ?? null
}

async function getClientIdForOutcome(outcomeId: string): Promise<string | null> {
  const supabase = createAdminClient()
  const { data } = await supabase
    .from('campaign_flow_step_outcomes')
    .select('step_id')
    .eq('id', outcomeId)
    .maybeSingle()
  if (!data) return null
  return getClientIdForStep(data.step_id)
}

async function getClientIdForVariant(variantId: string): Promise<string | null> {
  const supabase = createAdminClient()
  const { data } = await supabase
    .from('campaign_flow_step_variants')
    .select('step_id')
    .eq('id', variantId)
    .maybeSingle()
  if (!data) return null
  return getClientIdForStep(data.step_id)
}

// =============================================================================
// FLOW
// =============================================================================

export async function ensureFlowAction(clientId: string): Promise<{ error?: string }> {
  try {
    await ensureCampaignFlow(clientId)
  } catch (err) {
    return { error: err instanceof Error ? err.message : 'Onbekende fout' }
  }
  revalidateFor(clientId)
  return {}
}

export async function setFlowPublished(
  clientId: string,
  published: boolean
): Promise<{ error?: string }> {
  const supabase = createAdminClient()
  const { error } = await supabase
    .from('campaign_flows')
    .update({
      is_published: published,
      published_at: published ? new Date().toISOString() : null,
    })
    .eq('client_id', clientId)

  if (error) return { error: error.message }
  revalidateFor(clientId)
  return {}
}

// =============================================================================
// STEPS
// =============================================================================

export async function addStep(clientId: string): Promise<{ error?: string }> {
  const supabase = createAdminClient()

  let flow
  try {
    flow = await ensureCampaignFlow(clientId)
  } catch (err) {
    return { error: err instanceof Error ? err.message : 'Onbekende fout' }
  }

  const nextStepNumber =
    flow.steps.length > 0 ? Math.max(...flow.steps.map((s) => s.stepNumber)) + 1 : 1
  const nextPosition =
    flow.steps.length > 0 ? Math.max(...flow.steps.map((s) => s.position)) + 1 : 0

  const { data: stepRow, error: stepError } = await supabase
    .from('campaign_flow_steps')
    .insert({
      flow_id: flow.id,
      step_number: nextStepNumber,
      title: nextStepNumber === 1 ? 'Eerste contact' : `Mail ${nextStepNumber}`,
      position: nextPosition,
    })
    .select('id')
    .single()

  if (stepError || !stepRow) return { error: stepError?.message ?? 'Stap aanmaken mislukt' }

  // Seed met 1 default variant
  const { error: variantError } = await supabase.from('campaign_flow_step_variants').insert({
    step_id: stepRow.id,
    label: 'Variant A',
    subject: '',
    body: '',
    example_body: '',
    position: 0,
  })
  if (variantError) return { error: variantError.message }

  // Seed met 3 default outcomes (continue/success/dropoff)
  const outcomes = [
    {
      step_id: stepRow.id,
      kind: 'continue',
      label: 'Geen reactie',
      responsibility: null,
      dropoff_reasons: [],
      position: 0,
    },
    {
      step_id: stepRow.id,
      kind: 'success',
      label: 'Lead reageerde positief',
      responsibility: 'client',
      dropoff_reasons: [],
      position: 1,
    },
    {
      step_id: stepRow.id,
      kind: 'dropoff',
      label: 'Lead is afgehaakt',
      responsibility: 'nextwave',
      dropoff_reasons: DEFAULT_DROPOFF_REASONS,
      position: 2,
    },
  ]

  const { error: outcomesError } = await supabase
    .from('campaign_flow_step_outcomes')
    .insert(outcomes)
  if (outcomesError) return { error: outcomesError.message }

  revalidateFor(clientId)
  return {}
}

export async function updateStepTitle(
  stepId: string,
  title: string
): Promise<{ error?: string }> {
  const clientId = await getClientIdForStep(stepId)
  if (!clientId) return { error: 'Stap niet gevonden' }

  const supabase = createAdminClient()
  const { error } = await supabase
    .from('campaign_flow_steps')
    .update({ title, updated_at: new Date().toISOString() })
    .eq('id', stepId)

  if (error) return { error: error.message }
  revalidateFor(clientId)
  return {}
}

export async function deleteStep(stepId: string): Promise<{ error?: string }> {
  const clientId = await getClientIdForStep(stepId)
  if (!clientId) return { error: 'Stap niet gevonden' }

  const flowId = await getFlowIdForClient(clientId)
  if (!flowId) return { error: 'Flow niet gevonden' }

  const supabase = createAdminClient()
  const { error } = await supabase.from('campaign_flow_steps').delete().eq('id', stepId)
  if (error) return { error: error.message }

  // Renummer step_numbers + posities
  const { data: remaining } = await supabase
    .from('campaign_flow_steps')
    .select('id')
    .eq('flow_id', flowId)
    .order('position', { ascending: true })

  if (remaining) {
    for (let i = 0; i < remaining.length; i++) {
      await supabase
        .from('campaign_flow_steps')
        .update({ step_number: i + 1, position: i })
        .eq('id', remaining[i].id)
    }
  }

  revalidateFor(clientId)
  return {}
}

export async function moveStep(
  stepId: string,
  direction: 'up' | 'down'
): Promise<{ error?: string }> {
  const clientId = await getClientIdForStep(stepId)
  if (!clientId) return { error: 'Stap niet gevonden' }

  const flowId = await getFlowIdForClient(clientId)
  if (!flowId) return { error: 'Flow niet gevonden' }

  const supabase = createAdminClient()
  const { data: steps } = await supabase
    .from('campaign_flow_steps')
    .select('id, position')
    .eq('flow_id', flowId)
    .order('position', { ascending: true })

  if (!steps || steps.length < 2) return {}

  const idx = steps.findIndex((s) => s.id === stepId)
  if (idx === -1) return { error: 'Stap niet gevonden' }

  const swapIdx = direction === 'up' ? idx - 1 : idx + 1
  if (swapIdx < 0 || swapIdx >= steps.length) return {}

  // Wissel posities + step_numbers
  const a = steps[idx]
  const b = steps[swapIdx]

  // Stap 1: zet a tijdelijk op een onmogelijk hoge step_number om constraint te omzeilen
  await supabase
    .from('campaign_flow_steps')
    .update({ step_number: 9999, position: 9999 })
    .eq('id', a.id)
  await supabase
    .from('campaign_flow_steps')
    .update({ step_number: idx + 1, position: idx })
    .eq('id', b.id)
  await supabase
    .from('campaign_flow_steps')
    .update({ step_number: swapIdx + 1, position: swapIdx })
    .eq('id', a.id)

  revalidateFor(clientId)
  return {}
}

// =============================================================================
// VARIANTS
// =============================================================================

export async function addVariant(stepId: string): Promise<{ error?: string }> {
  const clientId = await getClientIdForStep(stepId)
  if (!clientId) return { error: 'Stap niet gevonden' }

  const supabase = createAdminClient()
  const { data: existing } = await supabase
    .from('campaign_flow_step_variants')
    .select('position')
    .eq('step_id', stepId)
    .order('position', { ascending: false })
    .limit(1)

  const nextPosition = existing && existing.length > 0 ? existing[0].position + 1 : 0
  const nextLetter = String.fromCharCode(65 + nextPosition)

  const { error } = await supabase.from('campaign_flow_step_variants').insert({
    step_id: stepId,
    label: `Variant ${nextLetter}`,
    subject: '',
    body: '',
    example_body: '',
    position: nextPosition,
  })

  if (error) return { error: error.message }
  revalidateFor(clientId)
  return {}
}

export async function updateVariant(
  variantId: string,
  fields: { label?: string; subject?: string; body?: string; exampleBody?: string }
): Promise<{ error?: string }> {
  const clientId = await getClientIdForVariant(variantId)
  if (!clientId) return { error: 'Variant niet gevonden' }

  const patch: Record<string, unknown> = { updated_at: new Date().toISOString() }
  if (fields.label !== undefined) patch.label = fields.label
  if (fields.subject !== undefined) patch.subject = fields.subject
  if (fields.body !== undefined) patch.body = fields.body
  if (fields.exampleBody !== undefined) patch.example_body = fields.exampleBody

  const supabase = createAdminClient()
  const { error } = await supabase
    .from('campaign_flow_step_variants')
    .update(patch)
    .eq('id', variantId)

  if (error) return { error: error.message }
  revalidateFor(clientId)
  return {}
}

export async function deleteVariant(variantId: string): Promise<{ error?: string }> {
  const clientId = await getClientIdForVariant(variantId)
  if (!clientId) return { error: 'Variant niet gevonden' }

  const supabase = createAdminClient()
  const { error } = await supabase
    .from('campaign_flow_step_variants')
    .delete()
    .eq('id', variantId)

  if (error) return { error: error.message }
  revalidateFor(clientId)
  return {}
}

// =============================================================================
// OUTCOMES
// =============================================================================

export async function updateOutcome(
  outcomeId: string,
  fields: {
    label?: string
    responsibility?: FlowResponsibility | null
    dropoffReasons?: FlowDropoffReason[]
  }
): Promise<{ error?: string }> {
  const clientId = await getClientIdForOutcome(outcomeId)
  if (!clientId) return { error: 'Uitkomst niet gevonden' }

  const patch: Record<string, unknown> = { updated_at: new Date().toISOString() }
  if (fields.label !== undefined) patch.label = fields.label
  if (fields.responsibility !== undefined) patch.responsibility = fields.responsibility
  if (fields.dropoffReasons !== undefined) {
    patch.dropoff_reasons = fields.dropoffReasons.map((r, i) => ({
      label: r.label,
      position: i,
    }))
  }

  const supabase = createAdminClient()
  const { error } = await supabase
    .from('campaign_flow_step_outcomes')
    .update(patch)
    .eq('id', outcomeId)

  if (error) return { error: error.message }
  revalidateFor(clientId)
  return {}
}

// Helper: check of een stap de laatste is (voor het tonen van 'continue')
export async function getStepIsLast(
  stepId: string
): Promise<{ isLast: boolean; error?: string }> {
  const clientId = await getClientIdForStep(stepId)
  if (!clientId) return { isLast: false, error: 'Stap niet gevonden' }

  const flowId = await getFlowIdForClient(clientId)
  if (!flowId) return { isLast: false, error: 'Flow niet gevonden' }

  const supabase = createAdminClient()
  const { data: steps } = await supabase
    .from('campaign_flow_steps')
    .select('id, position')
    .eq('flow_id', flowId)
    .order('position', { ascending: false })
    .limit(1)

  return { isLast: steps?.[0]?.id === stepId }
}

// Marker re-export voor het aanvinken van outcome.kind === 'continue' in de UI
export type { FlowOutcomeKind }
