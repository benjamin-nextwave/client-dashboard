import { createAdminClient } from '@/lib/supabase/admin'
import { getClientList } from './admin-stats'
import { DAILY_COST_CENTS, type CommissionCategory } from '@/lib/commissions-shared'

// Herexporteer de gedeelde, client-veilige helpers/constanten/types zodat
// bestaande server-side imports vanuit deze module blijven werken.
export {
  DAILY_COST_CENTS,
  STANDARD_COMMISSION_CATEGORIES,
  amsterdamDateString,
  formatEuroCents,
  parseEuroToCents,
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
      return {
        date,
        commissionCents,
        costCents: DAILY_COST_CENTS,
        netCents: commissionCents - DAILY_COST_CENTS,
        byCategory: Array.from(catMap.entries()).map(([categoryName, v]) => ({
          categoryName,
          count: v.count,
          subtotalCents: v.subtotalCents,
        })),
      }
    })

  const totalCommissionCents = days.reduce((s, d) => s + d.commissionCents, 0)
  const recordedDays = days.length
  const totalCostCents = recordedDays * DAILY_COST_CENTS

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

export async function getClientCommissionOverview(
  clientId: string,
  from: string,
  to: string
): Promise<ClientCommissionOverview> {
  const supabase = createAdminClient()
  const { data } = await supabase
    .from('operator_commission_entries')
    .select('campaign_name, entry_date, category_name, unit_price_cents, lead_count')
    .eq('client_id', clientId)
    .gte('entry_date', from)
    .lte('entry_date', to)

  return buildClientOverview(from, to, (data ?? []) as RawEntry[])
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
      .from('operator_commission_entries')
      .select('client_id, entry_date, unit_price_cents, lead_count')
      .gte('entry_date', from)
      .lte('entry_date', to),
    getClientList(),
  ])

  const nameById = new Map(clients.map((c) => [c.id, c.companyName]))

  // Per klant: commissie-som + set van dagen met entries.
  const commissionByClient = new Map<string, number>()
  const daysByClient = new Map<string, Set<string>>()
  for (const r of (data ?? []) as Array<{ client_id: string; entry_date: string; unit_price_cents: number; lead_count: number }>) {
    const sub = (r.lead_count ?? 0) * (r.unit_price_cents ?? 0)
    commissionByClient.set(r.client_id, (commissionByClient.get(r.client_id) ?? 0) + sub)
    const set = daysByClient.get(r.client_id) ?? new Set<string>()
    set.add(r.entry_date)
    daysByClient.set(r.client_id, set)
  }

  const rows: CompanyClientRow[] = Array.from(daysByClient.keys()).map((clientId) => {
    const commissionCents = commissionByClient.get(clientId) ?? 0
    const recordedDays = daysByClient.get(clientId)?.size ?? 0
    const costCents = recordedDays * DAILY_COST_CENTS
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
