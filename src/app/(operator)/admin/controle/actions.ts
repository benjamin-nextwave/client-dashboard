'use server'

import { revalidatePath } from 'next/cache'
import { createAdminClient } from '@/lib/supabase/admin'
import { createClient } from '@/lib/supabase/server'
import type { ControlePersona } from '@/lib/data/controle'

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

export interface SubmitCheckTask {
  description: string
  campaignNames: string[]
  assignee: ControlePersona
}

export interface SubmitCheckInput {
  clientId: string
  checkType: 'onboarding' | 'live'
  numCampaigns: number | null
  answers: CheckAnswersPayload
  tasks: SubmitCheckTask[]
  /** Persona die de sessie uitvoert. */
  persona: ControlePersona
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
      assignee: input.persona,
    })
    .select('id')
    .single()

  if (insertError || !check) {
    return { error: insertError?.message ?? 'Kon de controle niet opslaan' }
  }

  const taskRows = input.tasks
    .map((t) => ({
      description: t.description.trim(),
      campaignNames: t.campaignNames.map((n) => n.trim()).filter((n) => n.length > 0),
      assignee: t.assignee,
    }))
    .filter((t) => t.description.length > 0)
    .map((t) => ({
      check_id: check.id,
      client_id: input.clientId,
      description: t.description,
      campaign_names: t.campaignNames,
      assignee: t.assignee,
    }))

  if (taskRows.length > 0) {
    const { error: tasksError } = await admin.from('operator_check_tasks').insert(taskRows)
    if (tasksError) return { error: tasksError.message }
  }

  revalidatePath('/admin/controle')
  revalidatePath('/admin/controle/ochtend')
  revalidatePath('/admin/controle/middag')
  revalidatePath('/admin/controle/middag/benjamin')
  revalidatePath('/admin/controle/middag/merlijn')
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
  revalidatePath('/admin/controle/middag/benjamin')
  revalidatePath('/admin/controle/middag/merlijn')
  return {}
}

export async function deleteTask(taskId: string): Promise<{ error?: string }> {
  const admin = createAdminClient()
  const { error } = await admin.from('operator_check_tasks').delete().eq('id', taskId)
  if (error) return { error: error.message }
  revalidatePath('/admin/controle/middag')
  revalidatePath('/admin/controle/middag/benjamin')
  revalidatePath('/admin/controle/middag/merlijn')
  return {}
}

/**
 * Toggle whether a client is excluded from the dagelijkse controle list.
 * Excluded clients still exist (unlike is_hidden) and remain reachable
 * via the exclusion page so the operator can opt them back in.
 */
export async function setClientExcluded(
  clientId: string,
  excluded: boolean
): Promise<{ error?: string }> {
  const admin = createAdminClient()
  const { error } = await admin
    .from('clients')
    .update({ is_excluded_from_check: excluded })
    .eq('id', clientId)

  if (error) return { error: error.message }
  revalidatePath('/admin/controle/ochtend')
  revalidatePath('/admin/controle/excludeer')
  return {}
}

export interface AddManualTaskInput {
  clientId: string
  campaignName: string | null
  description: string
  assignee: ControlePersona
}

/**
 * Manually add a task from the Middag-takenlijst page. No check_id is
 * attached because there is no controle-sessie behind the task.
 */
export async function addManualTask(input: AddManualTaskInput): Promise<{ error?: string }> {
  const description = input.description.trim()
  if (description.length === 0) return { error: 'Beschrijf eerst de taak.' }

  const campaignNames = input.campaignName && input.campaignName.trim().length > 0
    ? [input.campaignName.trim()]
    : []

  const admin = createAdminClient()
  const { error } = await admin.from('operator_check_tasks').insert({
    check_id: null,
    client_id: input.clientId,
    description,
    campaign_names: campaignNames,
    assignee: input.assignee,
  })

  if (error) return { error: error.message }
  revalidatePath('/admin/controle/middag')
  revalidatePath('/admin/controle/middag/benjamin')
  revalidatePath('/admin/controle/middag/merlijn')
  return {}
}

// ---------------------------------------------------------------------------
// Maandelijkse statische klantdata
// ---------------------------------------------------------------------------

export interface UpsertClientMonthlyDataInput {
  clientId: string
  year: number
  month: number
  /** Aantal mailboxen — input van de operator. contacts_to_approach
   *  wordt afgeleid als inboxes * 8. */
  inboxes: number | null
  startDate: string | null
  endDate: string | null
  contractBasis: string | null
}

/**
 * Insert-or-update voor één (client_id, year, month). Lege waarden worden
 * als NULL bewaard zodat een gedeeltelijke invul-staat mogelijk is.
 *
 * contacts_to_approach wordt server-side berekend (inboxes * 8) zodat de
 * vragenlijst en threshold-vergelijkingen het direct kunnen gebruiken
 * zonder client-side maths.
 */
export async function upsertClientMonthlyData(
  input: UpsertClientMonthlyDataInput
): Promise<{ error?: string }> {
  const userClient = await createClient()
  const { data: userResult } = await userClient.auth.getUser()
  const userId = userResult.user?.id ?? null

  if (input.month < 1 || input.month > 12) {
    return { error: 'Ongeldige maand' }
  }

  const inboxes = input.inboxes
  const contactsToApproach =
    inboxes !== null && inboxes >= 0 ? inboxes * 8 : null

  const admin = createAdminClient()
  const { error } = await admin
    .from('operator_client_monthly_data')
    .upsert(
      {
        client_id: input.clientId,
        year: input.year,
        month: input.month,
        inboxes,
        contacts_to_approach: contactsToApproach,
        start_date: input.startDate,
        end_date: input.endDate,
        contract_basis: input.contractBasis,
        created_by: userId,
        updated_at: new Date().toISOString(),
      },
      { onConflict: 'client_id,year,month' }
    )

  if (error) return { error: error.message }
  revalidatePath('/admin/controle/maand-data')
  return {}
}
