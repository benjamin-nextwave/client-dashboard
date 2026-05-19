'use server'

import { revalidatePath } from 'next/cache'
import { createAdminClient } from '@/lib/supabase/admin'
import { createClient } from '@/lib/supabase/server'
import type { ControlePersona } from '@/lib/data/controle'

const ISO_DATE_RE = /^\d{4}-\d{2}-\d{2}$/

// ---------------------------------------------------------------------------
// Kalender-notities (vrije events)
// ---------------------------------------------------------------------------

export interface CreateCalendarNoteInput {
  clientId: string
  eventDate: string // YYYY-MM-DD
  title: string
  description: string | null
}

export async function createCalendarNote(
  input: CreateCalendarNoteInput
): Promise<{ error?: string }> {
  const title = input.title.trim()
  if (title.length === 0) return { error: 'Geef de notitie een titel.' }
  if (!ISO_DATE_RE.test(input.eventDate)) return { error: 'Ongeldige datum.' }

  const userClient = await createClient()
  const { data: userResult } = await userClient.auth.getUser()
  const userId = userResult.user?.id ?? null

  const description = input.description?.trim() ?? null
  const admin = createAdminClient()
  const { error } = await admin.from('operator_calendar_notes').insert({
    client_id: input.clientId,
    event_date: input.eventDate,
    title,
    description: description && description.length > 0 ? description : null,
    created_by: userId,
  })

  if (error) return { error: error.message }
  revalidatePath('/admin/controle/kalender')
  return {}
}

export async function deleteCalendarNote(noteId: string): Promise<{ error?: string }> {
  const admin = createAdminClient()
  const { error } = await admin.from('operator_calendar_notes').delete().eq('id', noteId)
  if (error) return { error: error.message }
  revalidatePath('/admin/controle/kalender')
  return {}
}

// ---------------------------------------------------------------------------
// Taak inplannen op specifieke datum vanuit de kalender
// ---------------------------------------------------------------------------

export interface ScheduleCalendarTaskInput {
  clientId: string
  eventDate: string // YYYY-MM-DD — wordt gebruikt als created_at
  description: string
  assignee: ControlePersona
  campaignName: string | null
}

/**
 * Taak aanmaken met een door de operator gekozen datum. Slaat de datum
 * op in created_at (op het midden van de UTC-dag) — de bestaande kalender-
 * en takenlijstweergave indexeert op created_at, dus zo verschijnt de
 * taak meteen op de juiste plek.
 */
export async function scheduleCalendarTask(
  input: ScheduleCalendarTaskInput
): Promise<{ error?: string }> {
  const description = input.description.trim()
  if (description.length === 0) return { error: 'Beschrijf de taak.' }
  if (!ISO_DATE_RE.test(input.eventDate)) return { error: 'Ongeldige datum.' }

  const campaignNames = input.campaignName && input.campaignName.trim().length > 0
    ? [input.campaignName.trim()]
    : []

  const createdAt = `${input.eventDate}T12:00:00Z`
  const admin = createAdminClient()
  const { error } = await admin.from('operator_check_tasks').insert({
    check_id: null,
    client_id: input.clientId,
    description,
    campaign_names: campaignNames,
    assignee: input.assignee,
    created_at: createdAt,
  })

  if (error) return { error: error.message }
  revalidatePath('/admin/controle/kalender')
  revalidatePath('/admin/controle/middag')
  revalidatePath('/admin/controle/middag/benjamin')
  revalidatePath('/admin/controle/middag/merlijn')
  return {}
}

