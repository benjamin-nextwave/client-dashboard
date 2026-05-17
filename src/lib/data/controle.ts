import { createAdminClient } from '@/lib/supabase/admin'
import { getClientList, type ClientListItem } from './admin-stats'

export type ControlePersona = 'benjamin' | 'merlijn'

export interface ControleClientListItem extends ClientListItem {
  lastCheckedAt: string | null
}

/**
 * Client list for the ochtend selection page, augmented with the
 * last check timestamp per client (most recent operator_client_checks row).
 * Sorted by lastCheckedAt ascending (NULL first → never-checked at the top).
 *
 * Excluded clients (is_excluded_from_check) are filtered out — they only
 * show up on /admin/controle/excludeer.
 */
export async function getClientsWithLastCheck(): Promise<ControleClientListItem[]> {
  const [clients, lastCheckMap, excludedIds] = await Promise.all([
    getClientList(),
    fetchLastCheckMap(),
    fetchExcludedClientIds(),
  ])

  return clients
    .filter((c) => !c.isHidden && !excludedIds.has(c.id))
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

async function fetchExcludedClientIds(): Promise<Set<string>> {
  const supabase = createAdminClient()
  const { data } = await supabase
    .from('clients')
    .select('id')
    .eq('is_excluded_from_check', true)
  return new Set((data ?? []).map((r) => r.id))
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
  assignee: ControlePersona | null
}

/**
 * All operator check tasks for the middag-takenlijst, newest first.
 *
 * Deliberately no date filter: tasks never disappear automatically. They
 * stay visible (open and completed) until the operator explicitly checks
 * them off and/or deletes them. The previous "today only" behaviour caused
 * yesterday's afternoon tasks to silently drop off the page after midnight
 * and is no longer applied.
 */
export async function getAllTasks(
  persona?: ControlePersona
): Promise<ControleTaskRow[]> {
  const supabase = createAdminClient()

  let query = supabase
    .from('operator_check_tasks')
    .select('id, client_id, description, campaign_names, is_completed, completed_at, created_at, assignee')
    .order('created_at', { ascending: false })

  if (persona) query = query.eq('assignee', persona)

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
    assignee: (t.assignee ?? null) as ControlePersona | null,
  }))
}

// ---------------------------------------------------------------------------
// Exclusion management
// ---------------------------------------------------------------------------

export interface ExclusionSplit {
  excluded: ClientListItem[]
  available: ClientListItem[]
}

/**
 * Split the client list into excluded vs. available for the exclude-pagina.
 * Hidden (is_hidden) klanten worden volledig genegeerd; die staan op de
 * archive/klanten-pagina, niet hier.
 */
export async function getExcludedSplit(): Promise<ExclusionSplit> {
  const [clients, excludedIds] = await Promise.all([
    getClientList(),
    fetchExcludedClientIds(),
  ])

  const visibleClients = clients.filter((c) => !c.isHidden)
  return {
    excluded: visibleClients.filter((c) => excludedIds.has(c.id)),
    available: visibleClients.filter((c) => !excludedIds.has(c.id)),
  }
}

// ---------------------------------------------------------------------------
// Check history
// ---------------------------------------------------------------------------

export interface CheckHistorySummaryItem {
  clientId: string
  companyName: string
  primaryColor: string | null
  logoUrl: string | null
  totalChecksLast5Days: number
  lastCheckedAt: string | null
}

/**
 * Klantenlijst voor de geschiedenispagina: alle (niet-hidden) klanten met
 * een telling van het aantal controles binnen het laatste 5-dagen-venster.
 */
export async function getCheckHistorySummary(): Promise<CheckHistorySummaryItem[]> {
  const [clients, recent] = await Promise.all([
    getClientList(),
    fetchRecentChecks(5),
  ])

  const countByClient = new Map<string, number>()
  const lastByClient = new Map<string, string>()
  for (const row of recent) {
    countByClient.set(row.client_id, (countByClient.get(row.client_id) ?? 0) + 1)
    if (!lastByClient.has(row.client_id)) lastByClient.set(row.client_id, row.created_at)
  }

  return clients
    .filter((c) => !c.isHidden)
    .map((c) => ({
      clientId: c.id,
      companyName: c.companyName,
      primaryColor: c.primaryColor,
      logoUrl: c.logoUrl,
      totalChecksLast5Days: countByClient.get(c.id) ?? 0,
      lastCheckedAt: lastByClient.get(c.id) ?? null,
    }))
    .sort((a, b) => {
      // Meeste controles eerst, daarna alfabetisch.
      if (b.totalChecksLast5Days !== a.totalChecksLast5Days) {
        return b.totalChecksLast5Days - a.totalChecksLast5Days
      }
      return a.companyName.localeCompare(b.companyName)
    })
}

async function fetchRecentChecks(days: number): Promise<Array<{ client_id: string; created_at: string }>> {
  const supabase = createAdminClient()
  const cutoff = new Date()
  cutoff.setDate(cutoff.getDate() - days)
  const { data } = await supabase
    .from('operator_client_checks')
    .select('client_id, created_at')
    .gte('created_at', cutoff.toISOString())
    .order('created_at', { ascending: false })
  return data ?? []
}

export interface CheckHistoryAnswer {
  id: string
  label: string
  answer: string
}

export interface CheckHistoryCampaign {
  index: number
  questions: CheckHistoryAnswer[]
}

export interface CheckHistoryRow {
  id: string
  checkType: 'onboarding' | 'live'
  numCampaigns: number | null
  createdAt: string
  // Onboarding payload
  onboardingQuestions: CheckHistoryAnswer[] | null
  // Live payload
  campaigns: CheckHistoryCampaign[] | null
}

export interface ClientCheckHistory {
  clientId: string
  companyName: string
  primaryColor: string | null
  logoUrl: string | null
  checks: CheckHistoryRow[]
}

/**
 * Volledige geschiedenis (laatste 5 dagen) voor één klant, inclusief
 * vraag/antwoord-data uit de JSONB-payload.
 */
export async function getClientCheckHistory(
  clientId: string
): Promise<ClientCheckHistory | null> {
  const supabase = createAdminClient()
  const cutoff = new Date()
  cutoff.setDate(cutoff.getDate() - 5)

  const [clientResult, checksResult] = await Promise.all([
    supabase
      .from('clients')
      .select('id, company_name, primary_color, logo_url')
      .eq('id', clientId)
      .maybeSingle(),
    supabase
      .from('operator_client_checks')
      .select('id, check_type, num_campaigns, answers, created_at')
      .eq('client_id', clientId)
      .gte('created_at', cutoff.toISOString())
      .order('created_at', { ascending: false }),
  ])

  if (clientResult.error || !clientResult.data) return null

  type AnswersJson = {
    type?: string
    questions?: CheckHistoryAnswer[]
    campaigns?: CheckHistoryCampaign[]
    numCampaigns?: number
  }

  const checks: CheckHistoryRow[] = (checksResult.data ?? []).map((row) => {
    const payload = (row.answers ?? {}) as AnswersJson
    if (row.check_type === 'onboarding') {
      return {
        id: row.id,
        checkType: 'onboarding',
        numCampaigns: null,
        createdAt: row.created_at,
        onboardingQuestions: payload.questions ?? [],
        campaigns: null,
      }
    }
    return {
      id: row.id,
      checkType: 'live',
      numCampaigns: row.num_campaigns ?? payload.numCampaigns ?? null,
      createdAt: row.created_at,
      onboardingQuestions: null,
      campaigns: payload.campaigns ?? [],
    }
  })

  return {
    clientId: clientResult.data.id,
    companyName: clientResult.data.company_name,
    primaryColor: clientResult.data.primary_color,
    logoUrl: clientResult.data.logo_url,
    checks,
  }
}

// ---------------------------------------------------------------------------
// Manual task helpers
// ---------------------------------------------------------------------------

export interface ManualTaskClientOption {
  id: string
  companyName: string
  primaryColor: string | null
  logoUrl: string | null
  campaignNames: string[]
}

/**
 * Klantenlijst voor de "handmatig taak toevoegen"-modal, inclusief de
 * campagnenamen die op dit moment al bekend zijn (uit eerdere taken).
 */
export async function getManualTaskClientOptions(): Promise<ManualTaskClientOption[]> {
  const [clients, tasksResult] = await Promise.all([
    getClientList(),
    createAdminClient()
      .from('operator_check_tasks')
      .select('client_id, campaign_names'),
  ])

  const campaignsByClient = new Map<string, Set<string>>()
  for (const row of tasksResult.data ?? []) {
    const set = campaignsByClient.get(row.client_id) ?? new Set<string>()
    for (const name of row.campaign_names ?? []) {
      if (typeof name === 'string' && name.trim().length > 0) set.add(name.trim())
    }
    campaignsByClient.set(row.client_id, set)
  }

  return clients
    .filter((c) => !c.isHidden)
    .map((c) => ({
      id: c.id,
      companyName: c.companyName,
      primaryColor: c.primaryColor,
      logoUrl: c.logoUrl,
      campaignNames: Array.from(campaignsByClient.get(c.id) ?? []).sort(),
    }))
}

// ---------------------------------------------------------------------------
// Maandelijkse statische klantdata
// ---------------------------------------------------------------------------

export interface ClientMonthlyData {
  id: string
  clientId: string
  year: number
  month: number
  contactsToApproach: number | null
  startDate: string | null
  endDate: string | null
  contractBasis: string | null
}

/**
 * Eén regel (year, month) voor de gegeven klant. Geeft null terug als de
 * operator voor die maand nog niets heeft ingevuld — de check-sessie moet
 * daarop kunnen anticiperen (geen template-substitutie + threshold uit).
 */
export async function getClientMonthlyData(
  clientId: string,
  year: number,
  month: number
): Promise<ClientMonthlyData | null> {
  const supabase = createAdminClient()
  const { data, error } = await supabase
    .from('operator_client_monthly_data')
    .select('id, client_id, year, month, contacts_to_approach, start_date, end_date, contract_basis')
    .eq('client_id', clientId)
    .eq('year', year)
    .eq('month', month)
    .maybeSingle()

  if (error || !data) return null
  return {
    id: data.id,
    clientId: data.client_id,
    year: data.year,
    month: data.month,
    contactsToApproach: data.contacts_to_approach,
    startDate: data.start_date,
    endDate: data.end_date,
    contractBasis: data.contract_basis,
  }
}

export interface ClientMonthlyDataWithMeta extends ClientMonthlyData {
  companyName: string
  primaryColor: string | null
  logoUrl: string | null
}

/**
 * Overzicht van alle klanten voor de gegeven maand, met de eventueel
 * eerder ingevulde maanddata (null als nog niet ingevuld).
 *
 * Gebruikt door /admin/controle/maand-data om per maand één rij per klant
 * te tonen, ongeacht of er al gegevens zijn.
 */
export async function getMonthlyDataForAllClients(
  year: number,
  month: number
): Promise<Array<{
  client: ClientListItem
  data: ClientMonthlyData | null
}>> {
  const supabase = createAdminClient()
  const [clients, { data: rows }] = await Promise.all([
    getClientList(),
    supabase
      .from('operator_client_monthly_data')
      .select('id, client_id, year, month, contacts_to_approach, start_date, end_date, contract_basis')
      .eq('year', year)
      .eq('month', month),
  ])

  const byClient = new Map<string, ClientMonthlyData>()
  for (const row of rows ?? []) {
    byClient.set(row.client_id, {
      id: row.id,
      clientId: row.client_id,
      year: row.year,
      month: row.month,
      contactsToApproach: row.contacts_to_approach,
      startDate: row.start_date,
      endDate: row.end_date,
      contractBasis: row.contract_basis,
    })
  }

  return clients
    .filter((c) => !c.isHidden)
    .sort((a, b) => a.companyName.localeCompare(b.companyName))
    .map((c) => ({ client: c, data: byClient.get(c.id) ?? null }))
}
