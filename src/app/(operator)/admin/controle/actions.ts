'use server'

import { revalidatePath } from 'next/cache'
import { createAdminClient } from '@/lib/supabase/admin'
import { createClient } from '@/lib/supabase/server'

export interface CheckAnswerEntry {
  id: string
  label: string
  answer: string
}

export interface CheckCampaignBlock {
  index: number
  questions: CheckAnswerEntry[]
}

export type CheckAnswersPayload =
  | { type: 'onboarding'; questions: CheckAnswerEntry[] }
  | { type: 'live'; numCampaigns: number; campaigns: CheckCampaignBlock[] }

export interface SubmitCheckInput {
  clientId: string
  checkType: 'onboarding' | 'live'
  numCampaigns: number | null
  answers: CheckAnswersPayload
  tasks: string[]
}

/**
 * Persist a completed check session: one operator_client_checks row +
 * one operator_check_tasks row per non-empty task description.
 */
export async function submitCheck(input: SubmitCheckInput): Promise<{ error?: string }> {
  const userClient = await createClient()
  const { data: userResult } = await userClient.auth.getUser()
  const userId = userResult.user?.id ?? null

  const admin = createAdminClient()

  const { data: check, error: insertError } = await admin
    .from('operator_client_checks')
    .insert({
      client_id: input.clientId,
      check_type: input.checkType,
      num_campaigns: input.numCampaigns,
      answers: input.answers,
      created_by: userId,
    })
    .select('id')
    .single()

  if (insertError || !check) {
    return { error: insertError?.message ?? 'Kon de controle niet opslaan' }
  }

  const taskRows = input.tasks
    .map((t) => t.trim())
    .filter((t) => t.length > 0)
    .map((description) => ({
      check_id: check.id,
      client_id: input.clientId,
      description,
    }))

  if (taskRows.length > 0) {
    const { error: tasksError } = await admin.from('operator_check_tasks').insert(taskRows)
    if (tasksError) return { error: tasksError.message }
  }

  revalidatePath('/admin/controle')
  revalidatePath('/admin/controle/ochtend')
  revalidatePath('/admin/controle/middag')
  return {}
}

export async function toggleTaskCompleted(
  taskId: string,
  completed: boolean
): Promise<{ error?: string }> {
  const admin = createAdminClient()
  const { error } = await admin
    .from('operator_check_tasks')
    .update({
      is_completed: completed,
      completed_at: completed ? new Date().toISOString() : null,
    })
    .eq('id', taskId)

  if (error) return { error: error.message }
  revalidatePath('/admin/controle/middag')
  return {}
}

export async function deleteTask(taskId: string): Promise<{ error?: string }> {
  const admin = createAdminClient()
  const { error } = await admin.from('operator_check_tasks').delete().eq('id', taskId)
  if (error) return { error: error.message }
  revalidatePath('/admin/controle/middag')
  return {}
}
