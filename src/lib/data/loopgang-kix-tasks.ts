import { createAdminClient } from '@/lib/supabase/admin'
import type { EventKind } from '@/lib/loopgang/events'

/**
 * De taken die naar Kix zijn gestuurd.
 *
 * Eén rij per taak, niet per verzending. Stuur je dezelfde taak nog eens, dan
 * telt `reminderCount` op en schuift `lastSentAt` mee — dat is precies wat je
 * moet weten voordat je iemand voor de derde dag op rij aan dezelfde factuur
 * herinnert.
 */

export interface KixTask {
  id: string
  clientId: string
  /** Bedrijfsnaam; ingevuld vanuit het overzicht, want de tabel kent hem niet. */
  clientName: string
  kind: EventKind | string
  label: string
  detail: string | null
  /** De dag waarop de taak hoorde te gebeuren, als die bekend was. */
  dueDate: string | null
  firstSentAt: string
  lastSentAt: string
  /** Hoe vaak de taak is verstuurd; 1 bij de eerste keer. */
  reminderCount: number
  /** De dagen waarop de taak naar Kix ging, oplopend. */
  sentDates: string[]
  status: 'open' | 'done'
  kixNote: string | null
  meetingDate: string | null
  completedAt: string | null
}

interface TaskRow {
  id: string
  client_id: string
  kind: string
  label: string
  detail: string | null
  due_date: string | null
  first_sent_at: string
  last_sent_at: string
  reminder_count: number
  sent_dates: unknown
  status: string
  kix_note: string | null
  meeting_date: string | null
  completed_at: string | null
}

function toTask(row: TaskRow, clientName: string): KixTask {
  return {
    id: row.id,
    clientId: row.client_id,
    clientName,
    kind: row.kind,
    label: row.label,
    detail: row.detail,
    dueDate: row.due_date,
    firstSentAt: row.first_sent_at,
    lastSentAt: row.last_sent_at,
    reminderCount: row.reminder_count,
    sentDates: Array.isArray(row.sent_dates)
      ? row.sent_dates.filter((d): d is string => typeof d === 'string')
      : [],
    status: row.status === 'done' ? 'done' : 'open',
    kixNote: row.kix_note,
    meetingDate: row.meeting_date,
    completedAt: row.completed_at,
  }
}

const COLUMNS =
  'id, client_id, kind, label, detail, due_date, first_sent_at, last_sent_at, reminder_count, sent_dates, status, kix_note, meeting_date, completed_at'

/**
 * Alle Kix-taken, nieuwste verzending eerst. Afgeronde taken blijven staan: het
 * hele punt is dat je terug kunt kijken.
 *
 * De namen komen mee als parameter en niet uit een join. Het overzicht kent ze
 * al, en een klant die uit de loopgang is gehaald heeft nog steeds taken die je
 * hoort te zien.
 */
export async function getKixTasks(names: Map<string, string>): Promise<KixTask[]> {
  const supabase = createAdminClient()

  const { data, error } = await supabase
    .from('loopgang_kix_tasks')
    .select(COLUMNS)
    .order('last_sent_at', { ascending: false })
    .limit(500)

  if (error) {
    console.error(`[loopgang:kix-taken] ophalen mislukt: ${error.message}`)
    return []
  }

  return ((data ?? []) as TaskRow[]).map((row) =>
    toTask(row, names.get(row.client_id) ?? 'Onbekende klant')
  )
}

export interface KixTaskInput {
  clientId: string
  kind: string
  label: string
  detail: string | null
  dueDate: string | null
}

/**
 * Legt vast dat een taak naar Kix is gegaan.
 *
 * Bestaat er al een openstaande taak van dezelfde soort voor dezelfde klant, dan
 * is dit een herinnering: de teller gaat omhoog en de tekst wordt bijgewerkt,
 * want "3 werkdagen te laat" van vorige week klopt vandaag niet meer. Bestaat
 * hij niet, dan komt er een nieuwe rij.
 *
 * Geeft het aantal rijen terug dat niet weggeschreven kon worden; nul is goed.
 */
export async function recordKixTasks(tasks: KixTaskInput[]): Promise<number> {
  if (tasks.length === 0) return 0

  const supabase = createAdminClient()
  const nu = new Date().toISOString()
  let mislukt = 0

  for (const task of tasks) {
    const { data: bestaand, error: leesFout } = await supabase
      .from('loopgang_kix_tasks')
      .select('id, reminder_count, sent_dates')
      .eq('client_id', task.clientId)
      .eq('kind', task.kind)
      .eq('status', 'open')
      .maybeSingle()

    if (leesFout) {
      console.error(`[loopgang:kix-taken] lezen mislukt kind=${task.kind}: ${leesFout.message}`)
      mislukt += 1
      continue
    }

    // De verzenddag komt erbij, maar één keer per dag: twee keer op dezelfde
    // ochtend versturen is geen tweede dag in de kalender.
    const vandaag = nu.slice(0, 10)
    const eerder = Array.isArray(bestaand?.sent_dates)
      ? (bestaand.sent_dates as unknown[]).filter((d): d is string => typeof d === 'string')
      : []
    const dagen = eerder.includes(vandaag) ? eerder : [...eerder, vandaag].sort()

    const { error: schrijfFout } = bestaand
      ? await supabase
          .from('loopgang_kix_tasks')
          .update({
            label: task.label,
            detail: task.detail,
            due_date: task.dueDate,
            last_sent_at: nu,
            reminder_count: (bestaand.reminder_count as number) + 1,
            sent_dates: dagen,
            updated_at: nu,
          })
          .eq('id', bestaand.id as string)
      : await supabase.from('loopgang_kix_tasks').insert({
          client_id: task.clientId,
          kind: task.kind,
          label: task.label,
          detail: task.detail,
          due_date: task.dueDate,
          first_sent_at: nu,
          last_sent_at: nu,
          reminder_count: 1,
          sent_dates: [vandaag],
          status: 'open',
        })

    if (schrijfFout) {
      console.error(
        `[loopgang:kix-taken] wegschrijven mislukt kind=${task.kind}: ${schrijfFout.message}`
      )
      mislukt += 1
    }
  }

  return mislukt
}

/**
 * Sluit de openstaande Kix-taken van een bepaalde soort voor één klant.
 *
 * Nodig omdat een taak twee levens leidt: als gebeurtenis in de kalender, die
 * vanzelf verdwijnt zodra de onderliggende zaak geregeld is, en als rij in deze
 * tabel, die blijft staan tot iemand hem afvinkt. Legde Kix een meeting vast als
 * "niet nodig", dan verdween de belronde uit de kalender terwijl "Bellen voor
 * een meeting" gewoon in zijn lijst bleef staan.
 *
 * De reden komt in kix_note te staan, maar alleen als daar nog niets stond: wat
 * Kix zelf heeft ingevuld is belangrijker dan onze aantekening.
 */
export async function closeKixTasks(
  clientId: string,
  kinds: string[],
  reason: string
): Promise<number> {
  if (kinds.length === 0) return 0

  const supabase = createAdminClient()
  const nu = new Date().toISOString()

  const { data, error } = await supabase
    .from('loopgang_kix_tasks')
    .select('id, kix_note')
    .eq('client_id', clientId)
    .eq('status', 'open')
    .in('kind', kinds)

  if (error) {
    console.error(`[loopgang:kix-taken] afsluiten mislukt client=${clientId}: ${error.message}`)
    return 0
  }

  const rijen = (data ?? []) as { id: string; kix_note: string | null }[]
  let gesloten = 0

  for (const rij of rijen) {
    const { error: schrijfFout } = await supabase
      .from('loopgang_kix_tasks')
      .update({
        status: 'done',
        completed_at: nu,
        kix_note: rij.kix_note?.trim() ? rij.kix_note : reason,
        updated_at: nu,
      })
      .eq('id', rij.id)

    if (!schrijfFout) gesloten += 1
  }

  if (gesloten > 0) {
    console.log(`[loopgang:kix-taken] ${gesloten} taken afgesloten client=${clientId}: ${reason}`)
  }
  return gesloten
}

/**
 * Het regelen van de evaluatiemeeting is één taak, geen reeks.
 *
 * In de kalender zijn het losse gebeurtenissen — mailen op poging 1, bellen op
 * 2 tot en met 5 — maar voor Kix is het één ding dat af moet. Werden ze los
 * opgeslagen, dan kreeg hij er drie naast elkaar in zijn lijst, elk met een
 * eigen teller, terwijl het steeds dezelfde vraag is: is die meeting al
 * geregeld?
 *
 * Alles uit die reeks landt daarom op één soort. De teller telt dan alle
 * pogingen bij elkaar op, wat precies is wat je wil weten.
 */
export const MEETING_TASK_KIND = 'meeting-arrange'

const MEETING_EVENT_KINDS = ['meeting-mail', 'meeting-call', 'meeting-window']

/** Onder welke soort een gebeurtenis wordt bewaard. */
export function storageKindFor(eventKind: string): string {
  return MEETING_EVENT_KINDS.includes(eventKind) ? MEETING_TASK_KIND : eventKind
}

/**
 * De soorten die bij het regelen van de meeting horen. De losse gebeurtenis-
 * soorten staan er nog bij voor rijen van vóór het samenvoegen.
 */
export const MEETING_TASK_KINDS = [MEETING_TASK_KIND, ...MEETING_EVENT_KINDS]

/** De taaksoorten die vervallen zodra de factuur van deze periode is vastgelegd. */
export const INVOICE_TASK_KINDS = ['invoice-due']

/** De taaksoorten die vervallen zodra de leadrapportage is vastgelegd. */
export const REPORT_TASK_KINDS = ['lead-report', 'lead-report-due']
