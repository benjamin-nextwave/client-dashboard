import { createAdminClient } from '@/lib/supabase/admin'
import { getActivityTimeline, type TimelineEvent } from './activity-timeline'
import { getClientList, type ClientListItem } from './admin-stats'
import { getClientMonthlyData, type ControlePersona } from './controle'

/** Eén item op de kalender. Op één dag kunnen er meerdere zijn. */
export interface CalendarItem {
  id: string
  /** Bepaalt de kleur en het iconenpaneel. */
  kind: 'task-open' | 'task-done' | 'note' | 'timeline'
  /** ISO date YYYY-MM-DD in lokale interpretatie. */
  date: string
  clientId: string
  clientName: string
  clientColor: string | null
  title: string
  description: string
  /** task-only */
  taskId?: string
  taskAssignee?: ControlePersona | null
  taskCompletedAt?: string | null
  /** note-only */
  noteId?: string
  /** timeline-only */
  timelineType?: string
  timelineTimestamp?: string
  /** Wanneer beschikbaar — voor sortering op tijdstip binnen dag. */
  sortKey: string
}

export interface CalendarLiveWindow {
  /** Geplande startdatum (eerste dag in livegang). */
  startDate: string | null
  /** Effectieve einddatum = end_date + sum(pauses[].days). */
  endDate: string | null
}

export interface CalendarData {
  clients: ClientListItem[]
  items: CalendarItem[]
  /** Alleen ingevuld wanneer een specifieke klant is geselecteerd. */
  liveWindow: CalendarLiveWindow | null
}

interface GetCalendarDataInput {
  /** null = alle bedrijven. */
  clientId: string | null
  year: number
  month: number
}

/**
 * Levert alle kalender-items + (optioneel) het livegang-window voor één
 * maand. Wanneer clientId null is komt alles van alle niet-hidden,
 * niet-excluded klanten samen.
 */
export async function getCalendarData(input: GetCalendarDataInput): Promise<CalendarData> {
  const supabase = createAdminClient()

  const allClientsPromise = getClientList()
  const excludedPromise = fetchExcludedClientIds()
  const timelinePromise = getActivityTimeline()

  const monthStart = formatIsoDate(new Date(Date.UTC(input.year, input.month - 1, 1)))
  const monthEndExclusive = formatIsoDate(new Date(Date.UTC(input.year, input.month, 1)))

  let taskQuery = supabase
    .from('operator_check_tasks')
    .select('id, client_id, description, is_completed, completed_at, created_at, assignee, campaign_names')
    .gte('created_at', monthStart + 'T00:00:00Z')
    .lt('created_at', monthEndExclusive + 'T00:00:00Z')

  let notesQuery = supabase
    .from('operator_calendar_notes')
    .select('id, client_id, event_date, title, description, created_at')
    .gte('event_date', monthStart)
    .lt('event_date', monthEndExclusive)

  if (input.clientId) {
    taskQuery = taskQuery.eq('client_id', input.clientId)
    notesQuery = notesQuery.eq('client_id', input.clientId)
  }

  const [clients, excludedIds, timelineEvents, tasksRes, notesRes, monthlyData] = await Promise.all([
    allClientsPromise,
    excludedPromise,
    timelinePromise,
    taskQuery,
    notesQuery,
    input.clientId ? getClientMonthlyData(input.clientId, input.year, input.month) : Promise.resolve(null),
  ])

  const visibleClients = clients
    .filter((c) => !c.isHidden && !excludedIds.has(c.id))
    .sort((a, b) => a.companyName.localeCompare(b.companyName))

  const clientById = new Map(visibleClients.map((c) => [c.id, c]))

  // ---- Tasks ----------------------------------------------------------------
  const taskItems: CalendarItem[] = []
  for (const t of tasksRes.data ?? []) {
    const client = clientById.get(t.client_id)
    if (!client) continue
    const date = isoDateFromTimestamp(t.created_at)
    const completed = Boolean(t.is_completed)
    taskItems.push({
      id: `task-${t.id}`,
      kind: completed ? 'task-done' : 'task-open',
      date,
      clientId: client.id,
      clientName: client.companyName,
      clientColor: client.primaryColor,
      title: t.description,
      description: Array.isArray(t.campaign_names) && t.campaign_names.length > 0
        ? `Campagnes: ${(t.campaign_names as string[]).join(', ')}`
        : '',
      taskId: t.id,
      taskAssignee: (t.assignee ?? null) as ControlePersona | null,
      taskCompletedAt: t.completed_at,
      sortKey: t.created_at,
    })
  }

  // ---- Notes ----------------------------------------------------------------
  const noteItems: CalendarItem[] = []
  for (const n of notesRes.data ?? []) {
    const client = clientById.get(n.client_id)
    if (!client) continue
    noteItems.push({
      id: `note-${n.id}`,
      kind: 'note',
      date: n.event_date,
      clientId: client.id,
      clientName: client.companyName,
      clientColor: client.primaryColor,
      title: n.title,
      description: n.description ?? '',
      noteId: n.id,
      sortKey: n.created_at,
    })
  }

  // ---- Timeline events ------------------------------------------------------
  const timelineItems: CalendarItem[] = []
  for (const ev of timelineEvents) {
    const client = clientById.get(ev.clientId)
    if (!client) continue
    if (input.clientId && ev.clientId !== input.clientId) continue
    const date = isoDateFromTimestamp(ev.timestamp)
    if (date < monthStart || date >= monthEndExclusive) continue
    timelineItems.push(timelineEventToItem(ev, client, date))
  }

  // ---- Live window ----------------------------------------------------------
  let liveWindow: CalendarLiveWindow | null = null
  if (input.clientId && monthlyData) {
    const totalPauseDays = (monthlyData.pauses ?? []).reduce((sum, p) => {
      return Number.isFinite(p.days) && p.days > 0 ? sum + Math.floor(p.days) : sum
    }, 0)
    const effectiveEnd = monthlyData.endDate
      ? addDays(monthlyData.endDate, totalPauseDays)
      : null
    liveWindow = {
      startDate: monthlyData.startDate,
      endDate: effectiveEnd,
    }
  }

  const items = [...taskItems, ...noteItems, ...timelineItems].sort(
    (a, b) => a.sortKey.localeCompare(b.sortKey)
  )

  return { clients: visibleClients, items, liveWindow }
}

function timelineEventToItem(
  ev: TimelineEvent,
  client: ClientListItem,
  date: string
): CalendarItem {
  return {
    id: `tl-${ev.key}`,
    kind: 'timeline',
    date,
    clientId: client.id,
    clientName: client.companyName,
    clientColor: client.primaryColor,
    title: ev.label,
    description: ev.description,
    timelineType: ev.type,
    timelineTimestamp: ev.timestamp,
    sortKey: ev.timestamp,
  }
}

async function fetchExcludedClientIds(): Promise<Set<string>> {
  const supabase = createAdminClient()
  const { data } = await supabase
    .from('clients')
    .select('id')
    .eq('is_excluded_from_check', true)
  return new Set((data ?? []).map((r) => r.id))
}

function formatIsoDate(d: Date): string {
  const y = d.getUTCFullYear()
  const m = String(d.getUTCMonth() + 1).padStart(2, '0')
  const day = String(d.getUTCDate()).padStart(2, '0')
  return `${y}-${m}-${day}`
}

function isoDateFromTimestamp(ts: string): string {
  // Slice is veilig voor zowel '2026-05-20T...' als '2026-05-20'.
  return ts.slice(0, 10)
}

function addDays(isoDate: string, days: number): string {
  const d = new Date(isoDate + 'T00:00:00Z')
  if (Number.isNaN(d.getTime())) return isoDate
  d.setUTCDate(d.getUTCDate() + days)
  return formatIsoDate(d)
}
