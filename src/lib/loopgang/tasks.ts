/**
 * De taken van vandaag: alles uit de loopgang dat nu moet gebeuren of al te
 * laat is. Wat gebeurd is telt niet als taak, en wat pas volgende week aan de
 * beurt is ook niet.
 *
 * Deze lijst is wat er naar Kix gaat. Daarom staat het opmaken van de tekst
 * hier ook: de mail die Make verstuurt en het lijstje op het scherm moeten
 * dezelfde woorden gebruiken, anders klopt de een niet met de ander.
 *
 * Puur: geen database, geen fetch.
 */

import { daysBetween } from './cycle'
import type { EventKind, LoopgangEvent } from './events'

export interface TaskSourceClient {
  id: string
  companyName: string
  cycle: { workday: number; anchor: string | null }
  events: LoopgangEvent[]
}

export interface LoopgangTask {
  clientId: string
  clientName: string
  kind: EventKind
  label: string
  detail: string | null
  /** De dag waarop de taak hoorde te gebeuren. */
  date: string
  status: 'due' | 'overdue'
  /** Kalenderdagen te laat; 0 als het vandaag moet. */
  daysLate: number
  /** Werkdag van de cyclus waarop de klant staat. */
  workday: number
}

/**
 * Hoe zwaar een taak weegt in de volgorde. Facturen en betalingen eerst: daar
 * zit geld aan vast en ze verschuiven de hele cyclus.
 */
const KIND_WEIGHT: Record<EventKind, number> = {
  'invoice-due': 100,
  'payment-due': 90,
  'meeting-call': 70,
  'meeting-mail': 60,
  analysis: 50,
  meeting: 40,
  'meeting-window': 20,
  'cycle-start': 0,
  'invoice-sent': 0,
  'invoice-paid': 0,
  'lead-report': 0,
  'pause-start': 0,
  'pause-resume': 0,
}

/**
 * Alles wat vandaag moet gebeuren of al over tijd is, over alle klanten heen.
 * Te laat staat boven vandaag, en binnen dezelfde urgentie weegt het soort taak.
 */
export function buildTasks(clients: TaskSourceClient[], today: string): LoopgangTask[] {
  const tasks: LoopgangTask[] = []

  for (const client of clients) {
    for (const event of client.events) {
      if (event.status !== 'due' && event.status !== 'overdue') continue

      tasks.push({
        clientId: client.id,
        clientName: client.companyName,
        kind: event.kind,
        label: event.label,
        detail: event.detail,
        date: event.date,
        status: event.status,
        daysLate: event.status === 'overdue' ? daysBetween(event.date, today) : 0,
        workday: client.cycle.workday,
      })
    }
  }

  return tasks.sort((a, b) => {
    if (a.daysLate !== b.daysLate) return b.daysLate - a.daysLate
    if (KIND_WEIGHT[a.kind] !== KIND_WEIGHT[b.kind]) {
      return KIND_WEIGHT[b.kind] - KIND_WEIGHT[a.kind]
    }
    return a.clientName.localeCompare(b.clientName)
  })
}

/** "4 dagen te laat" of "vandaag" — één formulering voor scherm en mail. */
export function describeTiming(task: LoopgangTask): string {
  if (task.status === 'due') return 'vandaag'
  if (task.daysLate === 1) return '1 dag te laat'
  return `${task.daysLate} dagen te laat`
}

/** Eén regel per taak, zoals hij in de mail komt te staan. */
export function formatTaskLine(task: LoopgangTask): string {
  const parts = [`${task.clientName} — ${task.label}`, `(${describeTiming(task)})`]
  if (task.detail) parts.push(`· ${task.detail}`)
  return parts.join(' ')
}

export function formatTasksText(tasks: LoopgangTask[]): string {
  return tasks.map((task) => `• ${formatTaskLine(task)}`).join('\n')
}

/**
 * Dezelfde lijst als HTML, zodat het scenario in Make hem rechtstreeks in een
 * mail kan zetten zonder de array te hoeven doorlopen.
 */
export function formatTasksHtml(tasks: LoopgangTask[]): string {
  if (tasks.length === 0) return '<p>Geen taken.</p>'
  const items = tasks
    .map((task) => {
      const timing = escapeHtml(describeTiming(task))
      const detail = task.detail ? ` &middot; ${escapeHtml(task.detail)}` : ''
      return `<li><strong>${escapeHtml(task.clientName)}</strong> — ${escapeHtml(
        task.label
      )} (${timing})${detail}</li>`
    })
    .join('')
  return `<ul>${items}</ul>`
}

function escapeHtml(value: string): string {
  return value
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
}
