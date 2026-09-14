'use server'

import { revalidatePath } from 'next/cache'
import { createAdminClient } from '@/lib/supabase/admin'
import {
  isTaskKind,
  isTaskPerson,
  TASK_PERSON_LABEL,
  type TaskKind,
  type TaskPerson,
} from '@/lib/data/controle'
import { cleanupTaskDescription } from '@/lib/taken/beschrijving'

// Auth volgt het bestaande admin-patroon: middleware (src/middleware.ts) gate't
// /admin op user_role='operator'. Acties draaien met service_role (RLS bypass).

export interface AddTaskInput {
  clientId: string
  /** Taak of vraag. Bepaalt of de toelichting door het model gaat. */
  kind: TaskKind
  /** Voor wie de taak is. */
  assignee: TaskPerson
  /** Namens wie de taak wordt aangemaakt. */
  requestedBy: TaskPerson
  /** De taakregel zelf — dit is wat externe dashboards als taak tonen. */
  task: string
  /** Vrije toelichting. Wordt opgeschoond; de ruwe tekst wordt niet bewaard. */
  rawDescription: string
  /** De ontvanger meldt zich na afronding bij de aanvrager. */
  notifyOnComplete?: boolean
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
  if (!isTaskKind(input.kind)) return { error: 'Kies of dit een taak of een vraag is.' }
  if (!isTaskPerson(input.assignee)) return { error: 'Kies voor wie de taak is.' }
  if (!isTaskPerson(input.requestedBy)) return { error: 'Kies namens wie de taak is.' }

  let details: string | null = null
  const raw = input.rawDescription.trim()
  if (raw.length > 0) {
    // Alleen bij een taak gaat de toelichting door het model. Dat model splitst
    // de tekst in taken en mededelingen, en dat onderscheid slaat bij een vraag
    // nergens op: daar is de toelichting context bij de vraag. Die wordt dus
    // bewaard zoals hij is getypt.
    if (input.kind === 'vraag') {
      details = raw
    } else {
      const cleaned = await cleanupTaskDescription(raw, {
        assignee: TASK_PERSON_LABEL[input.assignee],
        requestedBy: TASK_PERSON_LABEL[input.requestedBy],
      })
      if (!cleaned.ok) return { error: cleaned.error }
      details = cleaned.text.length > 0 ? cleaned.text : null
    }
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
    // Een vraag is beantwoord of niet; een los berichtje erbij zou dubbelop zijn.
    notify_on_complete: input.kind === 'vraag' ? false : input.notifyOnComplete === true,
    kind: input.kind,
  })

  if (error) return { error: error.message }

  revalidatePath('/admin/taken')
  return { details }
}

export interface UpdateTaskInput {
  taskId: string
  clientId: string
  kind: TaskKind
  assignee: TaskPerson
  requestedBy: TaskPerson
  task: string
  /**
   * De toelichting zoals hij op de taak moet komen te staan. Anders dan bij
   * het aanmaken gaat deze tekst *niet* door het model: bij het bewerken zie
   * je de al opgeschoonde versie, en die nog een keer laten herschrijven
   * verandert wat je net met de hand hebt rechtgezet.
   */
  details: string
  notifyOnComplete: boolean
  /**
   * Het antwoord zoals het op de vraag moet komen te staan. Leeg maken wist het
   * antwoord; of de vraag afgerond blijft bepaalt het vinkje in de lijst, niet
   * dit veld.
   */
  answer: string
}

/** Past een bestaande taak aan vanaf de takenpagina. */
export async function updateTask(input: UpdateTaskInput): Promise<{ error?: string }> {
  const task = input.task.trim()
  if (!input.taskId) return { error: 'Onbekende taak.' }
  if (task.length === 0) return { error: 'Beschrijf eerst de taak.' }
  if (!input.clientId) return { error: 'Kies eerst een klant.' }
  if (!isTaskKind(input.kind)) return { error: 'Kies of dit een taak of een vraag is.' }
  if (!isTaskPerson(input.assignee)) return { error: 'Kies voor wie de taak is.' }
  if (!isTaskPerson(input.requestedBy)) return { error: 'Kies namens wie de taak is.' }

  const details = input.details.trim()
  const answer = input.kind === 'vraag' ? input.answer.trim() : ''

  const admin = createAdminClient()
  const { error } = await admin
    .from('operator_check_tasks')
    .update({
      client_id: input.clientId,
      description: task,
      assignee: input.assignee,
      requested_by: input.requestedBy,
      details: details.length > 0 ? details : null,
      notify_on_complete: input.kind === 'vraag' ? false : input.notifyOnComplete === true,
      kind: input.kind,
      answer: answer.length > 0 ? answer : null,
      // Een gewiste of nooit gegeven antwoordtekst laat geen antwoordmoment na.
      answered_at: answer.length > 0 ? new Date().toISOString() : null,
    })
    .eq('id', input.taskId)

  if (error) return { error: error.message }

  revalidatePath('/admin/taken')
  revalidatePath('/admin/controle/middag')
  return {}
}

/**
 * Slaat het antwoord van de ontvanger op en zet de vraag in één keer op
 * afgerond.
 *
 * Bewust samen in één update: een beantwoorde vraag die nog open staat zou bij
 * de aanvrager blijven hangen als werk dat nog moet gebeuren. Wie het antwoord
 * later wil bijstellen doet dat via Bewerken.
 */
export async function answerQuestion(
  taskId: string,
  answer: string
): Promise<{ error?: string }> {
  const text = answer.trim()
  if (!taskId) return { error: 'Onbekende vraag.' }
  if (text.length === 0) return { error: 'Typ eerst een antwoord.' }

  const now = new Date().toISOString()

  const admin = createAdminClient()
  const { error } = await admin
    .from('operator_check_tasks')
    .update({
      answer: text,
      answered_at: now,
      is_completed: true,
      completed_at: now,
    })
    .eq('id', taskId)

  if (error) return { error: error.message }

  revalidatePath('/admin/taken')
  revalidatePath('/admin/controle/middag')
  return {}
}
