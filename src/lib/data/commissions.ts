import { createAdminClient } from '@/lib/supabase/admin'
import { getClientList } from './admin-stats'
import { getClientsWithLastCheck } from './controle'
import { getExpenseTotals } from '@/lib/rompslomp/expenses'
import type { CommissionCategory } from '@/lib/commissions-shared'

// Herexporteer de gedeelde, client-veilige helpers/types zodat bestaande
// server-side imports vanuit deze module blijven werken.
export {
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
  byCategory: Array<{ categoryName: string; count: number; subtotalCents: number }>
}

export interface ClientCommissionOverview {
  from: string
  to: string
  entries: CommissionEntryRow[]
  days: CommissionDaySummary[]
  totalCommissionCents: number
  recordedDays: number
  /** Datum van de eerste lead ooit. */
  firstLeadDate: string | null
}

export interface CompanyClientRow {
  clientId: string
  companyName: string
  commissionCents: number
  recordedDays: number
  firstLeadDate: string | null
}

export interface CompanyCommissionOverview {
  from: string
  to: string
  clients: CompanyClientRow[]
  totalCommissionCents: number
  /** Uitgaven uit de boekhouding; null als de koppeling niets kon leveren. */
  expensesCents: number | null
  expensesCount: number
  /** Waarom de uitgaven ontbreken — te tonen in plaats van een nul. */
  expensesError: string | null
  /** Rijen in de boekhouding waarvan bedrag of datum onleesbaar was. */
  expensesSkipped: number
  /** Commissies minus uitgaven; null zolang de uitgaven onbekend zijn. */
  netCents: number | null
  /** Eén vierde deel: per deelnemer en voor het bedrijfsaccount. */
  quarterShareCents: number | null
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
 * Klanten die wél in de commissiecontrole thuishoren, maar buiten Benjamins
 * dagelijkse controle-lijst vallen (controleOwnerForName wijst ze aan Merlijn
 * toe). Namen worden hoofdletter-ongevoelig en getrimd vergeleken, net als in
 * de persona-toewijzing. Bewust een aparte lijst: zo verandert er niets aan
 * wie de ochtend-/avondcontrole voor deze klant doet.
 */
const EXTRA_COMMISSION_CONTROL_CLIENT_NAMES = new Set<string>(['recruitportal'])

/**
 * Klanten die in de commissiecontrole (voorheen avondcontrole) geïncludeerd
 * zijn: Benjamins niet-verborgen, niet-geëxcludeerde klanten, aangevuld met de
 * expliciete extra's hierboven. Hergebruikt de exacte filter van de
 * klantselectie zodat beide altijd gelijk lopen.
 */
export async function getCommissionControlClients(): Promise<CommissionControlClient[]> {
  const [clients, allClients] = await Promise.all([
    getClientsWithLastCheck('benjamin', 'avond'),
    getClientList(),
  ])

  const byId = new Map<string, CommissionControlClient>(
    clients.map((c) => [c.id, { id: c.id, companyName: c.companyName }])
  )
  for (const c of allClients) {
    if (c.isHidden) continue
    if (!EXTRA_COMMISSION_CONTROL_CLIENT_NAMES.has(c.companyName.trim().toLowerCase())) continue
    byId.set(c.id, { id: c.id, companyName: c.companyName })
  }

  return Array.from(byId.values()).sort((a, b) => a.companyName.localeCompare(b.companyName))
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
// Startdatum per klant
// ---------------------------------------------------------------------------

/**
 * Datum van de eerste commissie-lead per klant, over alle tijd heen. Gepagineerd
 * omdat PostgREST een rijlimiet hanteert: zonder paginatie zou een klant die pas
 * laat begon buiten de eerste pagina vallen en helemaal geen startdatum krijgen.
 */
async function getFirstLeadDateByClient(): Promise<Map<string, string>> {
  const supabase = createAdminClient()
  const first = new Map<string, string>()
  const PAGE_SIZE = 1000

  for (let page = 0; page < 100; page++) {
    const { data, error } = await supabase
      .from('operator_commission_leads')
      .select('client_id, entry_date')
      .order('entry_date', { ascending: true })
      .order('id', { ascending: true })
      .range(page * PAGE_SIZE, page * PAGE_SIZE + PAGE_SIZE - 1)

    if (error || !data || data.length === 0) break
    for (const r of data as Array<{ client_id: string; entry_date: string }>) {
      const current = first.get(r.client_id)
      if (!current || r.entry_date < current) first.set(r.client_id, r.entry_date)
    }
    if (data.length < PAGE_SIZE) break
  }

  return first
}

/** Datum van de eerste commissie-lead van één klant, of null als die er niet is. */
async function getFirstLeadDate(clientId: string): Promise<string | null> {
  const supabase = createAdminClient()
  const { data } = await supabase
    .from('operator_commission_leads')
    .select('entry_date')
    .eq('client_id', clientId)
    .order('entry_date', { ascending: true })
    .limit(1)
    .maybeSingle()

  return (data as { entry_date: string } | null)?.entry_date ?? null
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

function buildClientOverview(
  from: string,
  to: string,
  raw: RawEntry[],
  firstLeadDate: string | null
): ClientCommissionOverview {
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
  const daysWithLeads = byDate.size

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
      return {
        date,
        commissionCents,
        byCategory: Array.from(catMap.entries()).map(([categoryName, v]) => ({
          categoryName,
          count: v.count,
          subtotalCents: v.subtotalCents,
        })),
      }
    })

  const totalCommissionCents = days.reduce((s, d) => s + d.commissionCents, 0)

  return {
    from,
    to,
    entries: entries.sort((a, b) => (a.date < b.date ? 1 : a.date > b.date ? -1 : a.campaignName.localeCompare(b.campaignName))),
    days,
    totalCommissionCents,
    recordedDays: daysWithLeads,
    firstLeadDate,
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
  const [{ data }, firstLeadDate] = await Promise.all([
    supabase
      .from('operator_commission_leads')
      .select('campaign_name, entry_date, category_name, unit_price_cents')
      .eq('client_id', clientId)
      .gte('entry_date', from)
      .lte('entry_date', to),
    getFirstLeadDate(clientId),
  ])

  return buildClientOverview(from, to, leadsToRawEntries((data ?? []) as LeadRow[]), firstLeadDate)
}

// ---------------------------------------------------------------------------
// Bedrijfsbreed overzicht
// ---------------------------------------------------------------------------

export async function getCompanyCommissionOverview(
  from: string,
  to: string
): Promise<CompanyCommissionOverview> {
  const supabase = createAdminClient()
  const [{ data }, clients, firstLeadByClient] = await Promise.all([
    supabase
      .from('operator_commission_leads')
      .select('client_id, entry_date, unit_price_cents')
      .gte('entry_date', from)
      .lte('entry_date', to),
    getClientList(),
    getFirstLeadDateByClient(),
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

  // Alleen klanten met commissie in deze periode; kosten hangen niet meer aan
  // een klant, dus een klant zonder leads heeft hier niets te melden.
  const rows: CompanyClientRow[] = Array.from(commissionByClient.keys()).map((clientId) => ({
    clientId,
    companyName: nameById.get(clientId) ?? 'Onbekende klant',
    commissionCents: commissionByClient.get(clientId) ?? 0,
    recordedDays: daysByClient.get(clientId)?.size ?? 0,
    firstLeadDate: firstLeadByClient.get(clientId) ?? null,
  }))

  rows.sort((a, b) => b.commissionCents - a.commissionCents)

  const totalCommissionCents = rows.reduce((s, r) => s + r.commissionCents, 0)

  // Uitgaven komen uit de boekhouding. Lukt dat niet, dan blijft het bewust
  // leeg: nul tonen zou een winst suggereren die er niet is.
  const expenses = await getExpenseTotals(from, to)
  const expensesCents = expenses.ok ? expenses.value.totalCents : null
  const netCents = expensesCents === null ? null : totalCommissionCents - expensesCents

  return {
    from,
    to,
    clients: rows,
    totalCommissionCents,
    expensesCents,
    expensesCount: expenses.ok ? expenses.value.expenses.length : 0,
    expensesError: expenses.ok ? null : expenses.error,
    expensesSkipped: expenses.ok ? expenses.value.skipped : 0,
    netCents,
    // Vier gelijke delen; afkappen zodat de delen samen nooit méér zijn dan er is.
    quarterShareCents: netCents === null ? null : Math.trunc(netCents / 4),
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
  categoryId: string
  categoryName: string
  entryDate: string
  isChecked: boolean
  isRejected: boolean
  note: string
}

/** Alle commissie-leads (nieuwste eerst), verrijkt met de klantnaam. */
export async function getAllCommissionLeads(): Promise<CommissionLeadHistoryRow[]> {
  const supabase = createAdminClient()
  const [{ data }, clients] = await Promise.all([
    supabase
      .from('operator_commission_leads')
      .select('id, client_id, lead_email, campaign_name, category_id, category_name, entry_date, is_checked, is_rejected, note')
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
      category_id: string | null
      category_name: string
      entry_date: string
      is_checked: boolean
      is_rejected: boolean
      note: string | null
    }>
  ).map((r) => ({
    id: r.id,
    clientId: r.client_id,
    companyName: nameById.get(r.client_id) ?? 'Onbekende klant',
    leadEmail: r.lead_email,
    campaignName: r.campaign_name,
    categoryId: r.category_id ?? '',
    categoryName: r.category_name,
    entryDate: r.entry_date,
    isChecked: r.is_checked,
    isRejected: r.is_rejected,
    note: r.note ?? '',
  }))
}

// ---------------------------------------------------------------------------
// Grafiek: netto per dag
// ---------------------------------------------------------------------------

export interface CommissionChartPoint {
  date: string
  commissionCents: number
}

export interface CommissionChartSeries {
  from: string
  to: string
  points: CommissionChartPoint[]
}

/**
 * Verdiende commissie per dag over [from, to], optioneel gefilterd op klanten.
 *
 * Bewust zonder kosten: die komen sinds de Rompslomp-koppeling uit de
 * boekhouding, en een boekhoudpost hoort bij de dag waarop hij geboekt is, niet
 * bij de dag waarop het werk gebeurde. Ze per dag aftrekken zou een grafiek vol
 * kunstmatige pieken geven. De kosten staan in de totalen eronder.
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

  const commissionByDate = new Map<string, number>()
  for (const r of (data ?? []) as Array<{ client_id: string; entry_date: string; unit_price_cents: number }>) {
    commissionByDate.set(r.entry_date, (commissionByDate.get(r.entry_date) ?? 0) + (r.unit_price_cents ?? 0))
  }

  const points: CommissionChartPoint[] = Array.from(commissionByDate.keys())
    .sort((a, b) => (a < b ? -1 : 1)) // oplopend op datum
    .map((date) => ({ date, commissionCents: commissionByDate.get(date) ?? 0 }))

  return { from, to, points }
}
