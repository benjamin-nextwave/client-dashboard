import { createAdminClient } from '@/lib/supabase/admin'
import { getClientList } from './admin-stats'
import { getClientsWithLastCheck } from './controle'
import { DAILY_COST_CENTS, isWeekday, type CommissionCategory } from '@/lib/commissions-shared'

// Herexporteer de gedeelde, client-veilige helpers/constanten/types zodat
// bestaande server-side imports vanuit deze module blijven werken.
export {
  DAILY_COST_CENTS,
  STANDARD_COMMISSION_CATEGORIES,
  amsterdamDateString,
  formatEuroCents,
  parseEuroToCents,
  isWeekday,
  type CommissionCategory,
} from '@/lib/commissions-shared'

export interface CommissionEntryRow {
  date: string
  campaignName: string
  categoryName: string
  count: number
  unitPriceCents: number
  subtotalCents: number
}

export interface CommissionDaySummary {
  date: string
  commissionCents: number
  costCents: number
  netCents: number
  byCategory: Array<{ categoryName: string; count: number; subtotalCents: number }>
}

export interface ClientCommissionOverview {
  from: string
  to: string
  entries: CommissionEntryRow[]
  days: CommissionDaySummary[]
  totalCommissionCents: number
  recordedDays: number
  totalCostCents: number
  netCents: number
}

export interface CompanyClientRow {
  clientId: string
  companyName: string
  commissionCents: number
  recordedDays: number
  costCents: number
  netCents: number
}

export interface CompanyCommissionOverview {
  from: string
  to: string
  clients: CompanyClientRow[]
  totalCommissionCents: number
  totalCostCents: number
  totalNetCents: number
}

// ---------------------------------------------------------------------------
// Categorieën
// ---------------------------------------------------------------------------

export async function getClientCommissionCategories(
  clientId: string
): Promise<CommissionCategory[]> {
  const supabase = createAdminClient()
  const { data, error } = await supabase
    .from('operator_client_commission_categories')
    .select('id, client_id, name, price_cents, position')
    .eq('client_id', clientId)
    .order('position', { ascending: true })
    .order('name', { ascending: true })

  if (error || !data) return []
  return data.map((r) => ({
    id: r.id,
    clientId: r.client_id,
    name: r.name,
    priceCents: r.price_cents ?? 0,
    position: r.position ?? 0,
  }))
}

/**
 * Categorieën voor meerdere klanten in één query, gegroepeerd per clientId.
 * Gebruikt door de commissiecontrole voor de klant-afhankelijke categorie-
 * dropdown zonder per klant een aparte round-trip.
 */
export async function getCategoriesForClients(
  clientIds: string[]
): Promise<Record<string, CommissionCategory[]>> {
  const result: Record<string, CommissionCategory[]> = {}
  if (clientIds.length === 0) return result

  const supabase = createAdminClient()
  const { data, error } = await supabase
    .from('operator_client_commission_categories')
    .select('id, client_id, name, price_cents, position')
    .in('client_id', clientIds)
    .order('position', { ascending: true })
    .order('name', { ascending: true })

  if (error || !data) return result
  for (const r of data) {
    const list = result[r.client_id] ?? []
    list.push({
      id: r.id,
      clientId: r.client_id,
      name: r.name,
      priceCents: r.price_cents ?? 0,
      position: r.position ?? 0,
    })
    result[r.client_id] = list
  }
  return result
}

export interface CommissionControlClient {
  id: string
  companyName: string
}

/**
 * Klanten die in de commissiecontrole (voorheen avondcontrole) geïncludeerd
 * zijn: Benjamins niet-verborgen, niet-geëxcludeerde klanten. Hergebruikt de
 * exacte filter van de klantselectie zodat beide altijd gelijk lopen.
 */
export async function getCommissionControlClients(): Promise<CommissionControlClient[]> {
  const clients = await getClientsWithLastCheck('benjamin', 'avond')
  return clients
    .map((c) => ({ id: c.id, companyName: c.companyName }))
    .sort((a, b) => a.companyName.localeCompare(b.companyName))
}

/**
 * Klanten die minstens één commissie-lead hebben. Gebruikt als filteropties
 * voor de grafiek in het financieel overzicht.
 */
export async function getClientsWithCommissionData(): Promise<CommissionControlClient[]> {
  const supabase = createAdminClient()
  const [{ data }, clients] = await Promise.all([
    supabase.from('operator_commission_leads').select('client_id'),
    getClientList(),
  ])
  const nameById = new Map(clients.map((c) => [c.id, c.companyName]))
  const ids = new Set((data ?? []).map((r) => r.client_id as string))
  return Array.from(ids)
    .map((id) => ({ id, companyName: nameById.get(id) ?? 'Onbekende klant' }))
    .sort((a, b) => a.companyName.localeCompare(b.companyName))
}

// ---------------------------------------------------------------------------
// Overzicht per klant
// ---------------------------------------------------------------------------

interface RawEntry {
  campaign_name: string
  entry_date: string
  category_name: string
  unit_price_cents: number
  lead_count: number
}

function buildClientOverview(from: string, to: string, raw: RawEntry[]): ClientCommissionOverview {
  const entries: CommissionEntryRow[] = raw.map((r) => ({
    date: r.entry_date,
    campaignName: r.campaign_name,
    categoryName: r.category_name,
    count: r.lead_count ?? 0,
    unitPriceCents: r.unit_price_cents ?? 0,
    subtotalCents: (r.lead_count ?? 0) * (r.unit_price_cents ?? 0),
  }))

  // Groepeer per dag.
  const byDate = new Map<string, CommissionEntryRow[]>()
  for (const e of entries) {
    const list = byDate.get(e.date) ?? []
    list.push(e)
    byDate.set(e.date, list)
  }

  const days: CommissionDaySummary[] = Array.from(byDate.entries())
    .sort((a, b) => (a[0] < b[0] ? 1 : -1)) // nieuwste dag eerst
    .map(([date, list]) => {
      const commissionCents = list.reduce((s, e) => s + e.subtotalCents, 0)
      // Tel per categorie op (over campagnes heen).
      const catMap = new Map<string, { count: number; subtotalCents: number }>()
      for (const e of list) {
        const cur = catMap.get(e.categoryName) ?? { count: 0, subtotalCents: 0 }
        cur.count += e.count
        cur.subtotalCents += e.subtotalCents
        catMap.set(e.categoryName, cur)
      }
      // Weekenddagen tellen geen dagkosten (alleen ma–vr).
      const dayCostCents = isWeekday(date) ? DAILY_COST_CENTS : 0
      return {
        date,
        commissionCents,
        costCents: dayCostCents,
        netCents: commissionCents - dayCostCents,
        byCategory: Array.from(catMap.entries()).map(([categoryName, v]) => ({
          categoryName,
          count: v.count,
          subtotalCents: v.subtotalCents,
        })),
      }
    })

  const totalCommissionCents = days.reduce((s, d) => s + d.commissionCents, 0)
  const recordedDays = days.length
  const totalCostCents = days.reduce((s, d) => s + d.costCents, 0)

  return {
    from,
    to,
    entries: entries.sort((a, b) => (a.date < b.date ? 1 : a.date > b.date ? -1 : a.campaignName.localeCompare(b.campaignName))),
    days,
    totalCommissionCents,
    recordedDays,
    totalCostCents,
    netCents: totalCommissionCents - totalCostCents,
  }
}

interface LeadRow {
  campaign_name: string
  entry_date: string
  category_name: string
  unit_price_cents: number
}

/**
 * Groepeert losse lead-rijen tot geaggregeerde entries (één per campagne +
 * categorie + dag), zodat de bestaande overzicht-opbouw ongewijzigd blijft
 * werken. Elke lead telt als 1.
 */
function leadsToRawEntries(leads: LeadRow[]): RawEntry[] {
  const byKey = new Map<string, RawEntry>()
  for (const l of leads) {
    const key = `${l.entry_date}|${l.campaign_name}|${l.category_name}|${l.unit_price_cents ?? 0}`
    const existing = byKey.get(key)
    if (existing) {
      existing.lead_count += 1
    } else {
      byKey.set(key, {
        campaign_name: l.campaign_name,
        entry_date: l.entry_date,
        category_name: l.category_name,
        unit_price_cents: l.unit_price_cents ?? 0,
        lead_count: 1,
      })
    }
  }
  return Array.from(byKey.values())
}

export async function getClientCommissionOverview(
  clientId: string,
  from: string,
  to: string
): Promise<ClientCommissionOverview> {
  const supabase = createAdminClient()
  const { data } = await supabase
    .from('operator_commission_leads')
    .select('campaign_name, entry_date, category_name, unit_price_cents')
    .eq('client_id', clientId)
    .gte('entry_date', from)
    .lte('entry_date', to)

  return buildClientOverview(from, to, leadsToRawEntries((data ?? []) as LeadRow[]))
}

// ---------------------------------------------------------------------------
// Bedrijfsbreed overzicht
// ---------------------------------------------------------------------------

export async function getCompanyCommissionOverview(
  from: string,
  to: string
): Promise<CompanyCommissionOverview> {
  const supabase = createAdminClient()
  const [{ data }, clients] = await Promise.all([
    supabase
      .from('operator_commission_leads')
      .select('client_id, entry_date, unit_price_cents')
      .gte('entry_date', from)
      .lte('entry_date', to),
    getClientList(),
  ])

  const nameById = new Map(clients.map((c) => [c.id, c.companyName]))

  // Per klant: commissie-som + set van dagen met leads.
  const commissionByClient = new Map<string, number>()
  const daysByClient = new Map<string, Set<string>>()
  for (const r of (data ?? []) as Array<{ client_id: string; entry_date: string; unit_price_cents: number }>) {
    const sub = r.unit_price_cents ?? 0
    commissionByClient.set(r.client_id, (commissionByClient.get(r.client_id) ?? 0) + sub)
    const set = daysByClient.get(r.client_id) ?? new Set<string>()
    set.add(r.entry_date)
    daysByClient.set(r.client_id, set)
  }

  const rows: CompanyClientRow[] = Array.from(daysByClient.keys()).map((clientId) => {
    const commissionCents = commissionByClient.get(clientId) ?? 0
    const days = daysByClient.get(clientId) ?? new Set<string>()
    const recordedDays = days.size
    // Dagkosten alleen op werkdagen (weekend telt niet mee).
    const workdays = Array.from(days).filter((d) => isWeekday(d)).length
    const costCents = workdays * DAILY_COST_CENTS
    return {
      clientId,
      companyName: nameById.get(clientId) ?? 'Onbekende klant',
      commissionCents,
      recordedDays,
      costCents,
      netCents: commissionCents - costCents,
    }
  })

  rows.sort((a, b) => b.netCents - a.netCents)

  const totalCommissionCents = rows.reduce((s, r) => s + r.commissionCents, 0)
  const totalCostCents = rows.reduce((s, r) => s + r.costCents, 0)

  return {
    from,
    to,
    clients: rows,
    totalCommissionCents,
    totalCostCents,
    totalNetCents: totalCommissionCents - totalCostCents,
  }
}

// ---------------------------------------------------------------------------
// Lead geschiedenis
// ---------------------------------------------------------------------------

export interface CommissionLeadHistoryRow {
  id: string
  clientId: string
  companyName: string
  leadEmail: string
  campaignName: string
  categoryName: string
  entryDate: string
  isChecked: boolean
  isRejected: boolean
}

/** Alle commissie-leads (nieuwste eerst), verrijkt met de klantnaam. */
export async function getAllCommissionLeads(): Promise<CommissionLeadHistoryRow[]> {
  const supabase = createAdminClient()
  const [{ data }, clients] = await Promise.all([
    supabase
      .from('operator_commission_leads')
      .select('id, client_id, lead_email, campaign_name, category_name, entry_date, is_checked, is_rejected')
      .order('entry_date', { ascending: false })
      .order('created_at', { ascending: false })
      .limit(5000),
    getClientList(),
  ])
  const nameById = new Map(clients.map((c) => [c.id, c.companyName]))
  return (
    (data ?? []) as Array<{
      id: string
      client_id: string
      lead_email: string
      campaign_name: string
      category_name: string
      entry_date: string
      is_checked: boolean
      is_rejected: boolean
    }>
  ).map((r) => ({
    id: r.id,
    clientId: r.client_id,
    companyName: nameById.get(r.client_id) ?? 'Onbekende klant',
    leadEmail: r.lead_email,
    campaignName: r.campaign_name,
    categoryName: r.category_name,
    entryDate: r.entry_date,
    isChecked: r.is_checked,
    isRejected: r.is_rejected,
  }))
}

// ---------------------------------------------------------------------------
// Grafiek: netto per dag
// ---------------------------------------------------------------------------

export interface CommissionChartPoint {
  date: string
  commissionCents: number
  costCents: number
  netCents: number
}

export interface CommissionChartSeries {
  from: string
  to: string
  points: CommissionChartPoint[]
  totalNetCents: number
}

/**
 * Tijdreeks van het netto commissiebedrag per dag over [from, to], optioneel
 * gefilterd op één of meerdere klanten. Netto = commissie van die dag minus
 * €20 dagkosten per actieve klant, maar alleen op werkdagen (weekend telt
 * geen dagkosten). Alleen dagen met leads verschijnen in de reeks.
 */
export async function getCommissionChartSeries(
  from: string,
  to: string,
  clientIds?: string[]
): Promise<CommissionChartSeries> {
  const supabase = createAdminClient()
  let query = supabase
    .from('operator_commission_leads')
    .select('client_id, entry_date, unit_price_cents')
    .gte('entry_date', from)
    .lte('entry_date', to)

  if (clientIds && clientIds.length > 0) {
    query = query.in('client_id', clientIds)
  }

  const { data } = await query

  // Per dag: commissie-som + set van actieve klanten (voor dagkosten).
  const commissionByDate = new Map<string, number>()
  const clientsByDate = new Map<string, Set<string>>()
  for (const r of (data ?? []) as Array<{ client_id: string; entry_date: string; unit_price_cents: number }>) {
    commissionByDate.set(r.entry_date, (commissionByDate.get(r.entry_date) ?? 0) + (r.unit_price_cents ?? 0))
    const set = clientsByDate.get(r.entry_date) ?? new Set<string>()
    set.add(r.client_id)
    clientsByDate.set(r.entry_date, set)
  }

  const points: CommissionChartPoint[] = Array.from(commissionByDate.keys())
    .sort((a, b) => (a < b ? -1 : 1)) // oplopend op datum
    .map((date) => {
      const commissionCents = commissionByDate.get(date) ?? 0
      const activeClients = clientsByDate.get(date)?.size ?? 0
      const costCents = isWeekday(date) ? activeClients * DAILY_COST_CENTS : 0
      return { date, commissionCents, costCents, netCents: commissionCents - costCents }
    })

  const totalNetCents = points.reduce((s, p) => s + p.netCents, 0)
  return { from, to, points, totalNetCents }
}
