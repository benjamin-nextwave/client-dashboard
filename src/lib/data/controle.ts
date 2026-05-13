import { createAdminClient } from '@/lib/supabase/admin'
import { getClientList, type ClientListItem } from './admin-stats'

export interface ControleClientListItem extends ClientListItem {
  lastCheckedAt: string | null
}

/**
 * Client list for the ochtend selection page, augmented with the
 * last check timestamp per client (most recent operator_client_checks row).
 * Sorted by lastCheckedAt ascending (NULL first → never-checked at the top).
 */
export async function getClientsWithLastCheck(): Promise<ControleClientListItem[]> {
  const [clients, lastCheckMap] = await Promise.all([
    getClientList(),
    fetchLastCheckMap(),
  ])

  return clients
    .filter((c) => !c.isHidden)
    .map((c) => ({ ...c, lastCheckedAt: lastCheckMap.get(c.id) ?? null }))
    .sort((a, b) => {
      // Never-checked clients (null) bubble to the top.
      if (a.lastCheckedAt === null && b.lastCheckedAt === null) {
        return a.companyName.localeCompare(b.companyName)
      }
      if (a.lastCheckedAt === null) return -1
      if (b.lastCheckedAt === null) return 1
      // Oldest first (ascending date).
      return new Date(a.lastCheckedAt).getTime() - new Date(b.lastCheckedAt).getTime()
    })
}

async function fetchLastCheckMap(): Promise<Map<string, string>> {
  const supabase = createAdminClient()
  const { data, error } = await supabase
    .from('operator_client_checks')
    .select('client_id, created_at')
    .order('created_at', { ascending: false })

  if (error || !data) return new Map()

  // First seen wins because rows are sorted desc, so we capture the most recent.
  const map = new Map<string, string>()
  for (const row of data) {
    if (!map.has(row.client_id)) map.set(row.client_id, row.created_at)
  }
  return map
}

export interface ControleTaskRow {
  id: string
  clientId: string
  companyName: string
  description: string
  campaignNames: string[]
  isCompleted: boolean
  completedAt: string | null
  createdAt: string
}

/**
 * All tasks created today (server timezone). Used by the middag page.
 * If `includeAllOpen` is true, includes earlier-day open tasks too — useful
 * when the operator returns the next morning and still has yesterday's
 * unfinished items.
 */
export async function getTodayTasks(includeAllOpen = false): Promise<ControleTaskRow[]> {
  const supabase = createAdminClient()

  // Start of "today" in the server's local time.
  const startOfToday = new Date()
  startOfToday.setHours(0, 0, 0, 0)

  let query = supabase
    .from('operator_check_tasks')
    .select('id, client_id, description, campaign_names, is_completed, completed_at, created_at')
    .order('created_at', { ascending: false })

  if (includeAllOpen) {
    query = query.or(`created_at.gte.${startOfToday.toISOString()},is_completed.eq.false`)
  } else {
    query = query.gte('created_at', startOfToday.toISOString())
  }

  const { data: tasks, error } = await query
  if (error || !tasks || tasks.length === 0) return []

  const clientIds = Array.from(new Set(tasks.map((t) => t.client_id)))
  const { data: clients } = await supabase
    .from('clients')
    .select('id, company_name')
    .in('id', clientIds)

  const nameById = new Map<string, string>()
  for (const c of clients ?? []) nameById.set(c.id, c.company_name)

  return tasks.map((t) => ({
    id: t.id,
    clientId: t.client_id,
    companyName: nameById.get(t.client_id) ?? 'Onbekende klant',
    description: t.description,
    campaignNames: t.campaign_names ?? [],
    isCompleted: t.is_completed,
    completedAt: t.completed_at,
    createdAt: t.created_at,
  }))
}
