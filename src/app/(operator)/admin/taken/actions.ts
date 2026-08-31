'use server'

import { revalidatePath } from 'next/cache'
import { createAdminClient } from '@/lib/supabase/admin'
import { isTaskPerson, TASK_PERSON_LABEL, type TaskPerson } from '@/lib/data/controle'
import { cleanupTaskDescription } from '@/lib/taken/beschrijving'

// Auth volgt het bestaande admin-patroon: middleware (src/middleware.ts) gate't
// /admin op user_role='operator'. Acties draaien met service_role (RLS bypass).

export interface AddTaskInput {
  clientId: string
  /** Voor wie de taak is. */
  assignee: TaskPerson
  /** Namens wie de taak wordt aangemaakt. */
  requestedBy: TaskPerson
  /** De taakregel zelf — dit is wat externe dashboards als taak tonen. */
  task: string
  /** Vrije toelichting. Wordt opgeschoond; de ruwe tekst wordt niet bewaard. */
  rawDescription: string
}

export interface AddTaskResult {
  error?: string
  /** De opgeslagen, opgeschoonde beschrijving. */
  details?: string | null
}

/**
 * Maakt een taak aan vanaf de takenpagina.
 *
 * De toelichting gaat hier — op de server — door cleanupTaskDescription. Wat
 * de browser meestuurt is uitsluitend de ruwe tekst; de opgeschoonde versie
 * wordt hier vers opgehaald en alleen die belandt in de database.
 */
export async function addTask(input: AddTaskInput): Promise<AddTaskResult> {
  const task = input.task.trim()
  if (task.length === 0) return { error: 'Beschrijf eerst de taak.' }
  if (!input.clientId) return { error: 'Kies eerst een klant.' }
  if (!isTaskPerson(input.assignee)) return { error: 'Kies voor wie de taak is.' }
  if (!isTaskPerson(input.requestedBy)) return { error: 'Kies namens wie de taak is.' }

  let details: string | null = null
  const raw = input.rawDescription.trim()
  if (raw.length > 0) {
    const cleaned = await cleanupTaskDescription(raw, {
      assignee: TASK_PERSON_LABEL[input.assignee],
      requestedBy: TASK_PERSON_LABEL[input.requestedBy],
    })
    if (!cleaned.ok) return { error: cleaned.error }
    details = cleaned.text.length > 0 ? cleaned.text : null
  }

  const admin = createAdminClient()
  const { error } = await admin.from('operator_check_tasks').insert({
    check_id: null,
    client_id: input.clientId,
    description: task,
    campaign_names: [],
    assignee: input.assignee,
    requested_by: input.requestedBy,
    details,
  })

  if (error) return { error: error.message }

  revalidatePath('/admin/taken')
  return { details }
}
