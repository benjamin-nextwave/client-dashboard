'use server'

import { revalidatePath } from 'next/cache'
import { createAdminClient } from '@/lib/supabase/admin'

export interface OnboardingStep {
  id: string
  client_id: string
  title: string
  assigned_to: 'client' | 'nextwave'
  sort_order: number
  is_completed: boolean
  completed_at: string | null
}

/**
 * Get all onboarding steps for a client, ordered by sort_order.
 */
export async function getOnboardingSteps(clientId: string): Promise<OnboardingStep[]> {
  const supabase = createAdminClient()

  const { data, error } = await supabase
    .from('onboarding_steps')
    .select('*')
    .eq('client_id', clientId)
    .order('sort_order', { ascending: true })

  if (error) {
    console.error('Failed to fetch onboarding steps:', error.message)
    return []
  }

  return data ?? []
}

/**
 * Set a client's onboarding status (onboarding or live).
 * When switching to 'onboarding', inserts default steps if none exist.
 */
export async function setOnboardingStatus(
  clientId: string,
  status: 'onboarding' | 'live'
): Promise<{ error?: string }> {
  const supabase = createAdminClient()

  const { error } = await supabase
    .from('clients')
    .update({ onboarding_status: status })
    .eq('id', clientId)

  if (error) {
    return { error: error.message }
  }

  // If switching to onboarding, create default steps if none exist
  if (status === 'onboarding') {
    const { data: existing } = await supabase
      .from('onboarding_steps')
      .select('id')
      .eq('client_id', clientId)
      .limit(1)

    if (!existing || existing.length === 0) {
      await supabase.rpc('insert_default_onboarding_steps', { p_client_id: clientId })
    }
  }

  revalidatePath('/admin')
  return {}
}

/**
 * Toggle step completion.
 */
export async function toggleStepCompletion(
  stepId: string,
  completed: boolean
): Promise<{ error?: string }> {
  const supabase = createAdminClient()

  const { error } = await supabase
    .from('onboarding_steps')
    .update({
      is_completed: completed,
      completed_at: completed ? new Date().toISOString() : null,
      updated_at: new Date().toISOString(),
    })
    .eq('id', stepId)

  if (error) {
    return { error: error.message }
  }

  revalidatePath('/admin')
  return {}
}

/**
 * Add a new step at a specific position.
 * Shifts all steps at or after that position up by 1.
 */
export async function addOnboardingStep(
  clientId: string,
  title: string,
  assignedTo: 'client' | 'nextwave',
  afterOrder: number // insert after this sort_order (0 = at the beginning)
): Promise<{ error?: string }> {
  const supabase = createAdminClient()

  // Shift existing steps that come after the insertion point
  const { data: stepsToShift } = await supabase
    .from('onboarding_steps')
    .select('id, sort_order')
    .eq('client_id', clientId)
    .gt('sort_order', afterOrder)
    .order('sort_order', { ascending: false })

  if (stepsToShift) {
    for (const step of stepsToShift) {
      await supabase
        .from('onboarding_steps')
        .update({ sort_order: step.sort_order + 1 })
        .eq('id', step.id)
    }
  }

  const { error } = await supabase
    .from('onboarding_steps')
    .insert({
      client_id: clientId,
      title,
      assigned_to: assignedTo,
      sort_order: afterOrder + 1,
    })

  if (error) {
    return { error: error.message }
  }

  revalidatePath('/admin')
  return {}
}

/**
 * Remove an onboarding step and re-order remaining steps.
 */
export async function removeOnboardingStep(stepId: string): Promise<{ error?: string }> {
  const supabase = createAdminClient()

  // Get the step to find client_id and sort_order
  const { data: step } = await supabase
    .from('onboarding_steps')
    .select('client_id, sort_order')
    .eq('id', stepId)
    .single()

  if (!step) {
    return { error: 'Stap niet gevonden' }
  }

  // Delete the step
  const { error } = await supabase
    .from('onboarding_steps')
    .delete()
    .eq('id', stepId)

  if (error) {
    return { error: error.message }
  }

  // Re-order remaining steps
  const { data: remaining } = await supabase
    .from('onboarding_steps')
    .select('id, sort_order')
    .eq('client_id', step.client_id)
    .gt('sort_order', step.sort_order)
    .order('sort_order', { ascending: true })

  if (remaining) {
    for (const s of remaining) {
      await supabase
        .from('onboarding_steps')
        .update({ sort_order: s.sort_order - 1 })
        .eq('id', s.id)
    }
  }

  revalidatePath('/admin')
  return {}
}
