import { createAdminClient } from '@/lib/supabase/admin'
import { getClientList } from './admin-stats'
import { getExpenseTotals, type RompslompExpense } from '@/lib/rompslomp/expenses'
import {
  MONTHLY_SALARY_CENTS,
  SALARY_HEADCOUNT,
  countTouchedMonths,
} from '@/lib/commissions-shared'

// Verzamelt in één keer alle commissie-data van een periode, klaar om naar
// Excel geschreven te worden. Bewust één module: de export moet altijd dezelfde
// cijfers geven als het financieel overzicht, en dat lukt alleen als de
// rekenregels op één plek staan.
//
// Wat wél en niet per klant bekend is:
//
//   * Omzet is exact per lead bekend (klant, dag, categorie, campagne, prijs).
//   * Uitgaven komen uit Rompslomp en hangen aan een boekingsdatum, niet aan
//     een klant. Salaris is een afspraak per kalendermaand.
//
// Kosten en salaris per klant zijn daarom een verdeling naar rato van omzet,
// geen geboekt feit. Alles wat zo berekend is heet in de uitvoer expliciet een
// schatting, en er staat een tabblad "Toelichting" bij dat het uitlegt.

export interface ExportLead {
  id: string
  entryDate: string
  clientId: string
  companyName: string
  leadEmail: string
  campaignName: string
  categoryName: string
  /** Prijs van de categorie op het moment van invoeren. */
  unitPriceCents: number
  /**
   * Wat deze lead bijdraagt aan de omzet: gelijk aan de prijs, of nul als het
   * een afgekeurde lead is en die niet meetellen. Zonder deze splitsing zou de
   * kolom in het lead-tabblad niet optellen tot de omzet op de andere
   * tabbladen, en dat is precies het soort verschil waar je uren naar zoekt.
   */
  revenueCents: number
  isChecked: boolean
  isRejected: boolean
  note: string
  createdAt: string
}

export interface ExportDayRow {
  date: string
  leadCount: number
  revenueCents: number
  /** Uitgaven die op deze dag geboekt zijn; niet per se van deze dag werk. */
  bookedExpensesCents: number
  /** Omzet minus de op die dag geboekte uitgaven. */
  resultCents: number
}

export interface ExportClientDayRow {
  date: string
  clientId: string
  companyName: string
  leadCount: number
  revenueCents: number
  /** Naar rato van omzet toegerekend — zie de toelichting in dit bestand. */
  estimatedCostCents: number
  estimatedProfitCents: number
  estimatedSalaryCents: number
  estimatedProfitAfterSalaryCents: number
}

export interface ExportCategoryRow {
  date: string
  clientId: string
  companyName: string
  categoryName: string
  campaignName: string
  leadCount: number
  unitPriceCents: number
  revenueCents: number
}

export interface ExportClientTotalRow {
  clientId: string
  companyName: string
  leadCount: number
  rejectedCount: number
  activeDays: number
  revenueCents: number
  estimatedCostCents: number
  estimatedProfitCents: number
  estimatedSalaryCents: number
  estimatedProfitAfterSalaryCents: number
  firstLeadDate: string | null
  lastLeadDate: string | null
}

export interface ExportData {
  from: string
  to: string
  /** Namen van de geselecteerde klanten; leeg betekent: alle klanten. */
  selectedClientNames: string[]
  includeRejected: boolean
  leads: ExportLead[]
  days: ExportDayRow[]
  clientDays: ExportClientDayRow[]
  categories: ExportCategoryRow[]
  clientTotals: ExportClientTotalRow[]
  expenses: RompslompExpense[]
  totals: {
    leadCount: number
    rejectedCount: number
    rejectedRevenueCents: number
    revenueCents: number
    /** null zolang Rompslomp niets kon leveren; nul zou winst voorwenden. */
    expensesCents: number | null
    netCents: number | null
    salaryMonths: number
    salaryCents: number
    afterSalaryCents: number | null
    activeDays: number
    clientCount: number
  }
  /** Reden waarom de uitgaven ontbreken, te tonen in plaats van een nul. */
  expensesError: string | null
  expensesSkipped: number
}

export interface ExportOptions {
  from: string
  to: string
  /** Lege lijst = alle klanten. */
  clientIds: string[]
  /** Tellen afgekeurde leads mee in de omzet? Het dashboard telt ze mee. */
  includeRejected: boolean
}

interface LeadRecord {
  id: string
  client_id: string
  lead_email: string | null
  campaign_name: string | null
  category_name: string | null
  entry_date: string
  unit_price_cents: number | null
  is_checked: boolean | null
  is_rejected: boolean | null
  note: string | null
  created_at: string | null
}

const PAGE_SIZE = 1000
const MAX_PAGES = 100

/**
 * Alle commissie-leads binnen de periode. Gepagineerd omdat PostgREST per
 * verzoek een rijlimiet hanteert: zonder paginatie zou een export over meerdere
 * maanden stilzwijgend afgekapt worden, en een te laag totaal is erger dan een
 * trage download.
 */
async function fetchLeads(options: ExportOptions): Promise<LeadRecord[]> {
  const supabase = createAdminClient()
  const collected: LeadRecord[] = []

  for (let page = 0; page < MAX_PAGES; page++) {
    let query = supabase
      .from('operator_commission_leads')
      .select(
        'id, client_id, lead_email, campaign_name, category_name, entry_date, unit_price_cents, is_checked, is_rejected, note, created_at'
      )
      .gte('entry_date', options.from)
      .lte('entry_date', options.to)
      .order('entry_date', { ascending: true })
      .order('id', { ascending: true })
      .range(page * PAGE_SIZE, page * PAGE_SIZE + PAGE_SIZE - 1)

    if (options.clientIds.length > 0) {
      query = query.in('client_id', options.clientIds)
    }

    const { data, error } = await query
    if (error || !data) break

    collected.push(...(data as LeadRecord[]))
    if (data.length < PAGE_SIZE) break
  }

  return collected
}

/**
 * Verdeelt een totaalbedrag over rijen naar rato van hun aandeel, zonder dat er
 * centen verdwijnen: de laatste rij krijgt wat er na afronding overblijft. Zo
 * telt de kolom in Excel exact op tot het totaal en gaat niemand zoeken naar
 * een verschil van drie cent.
 */
function distributeByShare(totalCents: number, weights: number[]): number[] {
  const weightSum = weights.reduce((s, w) => s + w, 0)
  if (weightSum <= 0 || totalCents === 0) return weights.map(() => 0)

  const result: number[] = []
  let assigned = 0
  for (let i = 0; i < weights.length; i++) {
    if (i === weights.length - 1) {
      result.push(totalCents - assigned)
      break
    }
    const share = Math.round((totalCents * weights[i]) / weightSum)
    result.push(share)
    assigned += share
  }
  return result
}

/**
 * Datum van de allereerste commissie-lead, of null als er nog geen is. Voedt de
 * knop "Alles" in de periodekeuze: die moet niet gokken met een vast jaartal.
 */
export async function getEarliestLeadDate(): Promise<string | null> {
  const supabase = createAdminClient()
  const { data } = await supabase
    .from('operator_commission_leads')
    .select('entry_date')
    .order('entry_date', { ascending: true })
    .limit(1)
    .maybeSingle()

  return (data as { entry_date: string } | null)?.entry_date ?? null
}

export async function getExportData(options: ExportOptions): Promise<ExportData> {
  const [leadRecords, clients, expenseResult] = await Promise.all([
    fetchLeads(options),
    getClientList(),
    getExpenseTotals(options.from, options.to),
  ])

  const nameById = new Map(clients.map((c) => [c.id, c.companyName]))

  // Afgekeurde leads staan altijd in het lead-tabblad, maar tellen alleen mee in
  // de omzet als de operator daarvoor kiest. Standaard tellen ze mee, want zo
  // rekent het financieel overzicht ook.
  const leads: ExportLead[] = leadRecords.map((r) => {
    const isRejected = r.is_rejected ?? false
    const unitPriceCents = r.unit_price_cents ?? 0
    return {
      id: r.id,
      entryDate: r.entry_date,
      clientId: r.client_id,
      companyName: nameById.get(r.client_id) ?? 'Onbekende klant',
      leadEmail: r.lead_email ?? '',
      campaignName: r.campaign_name ?? '',
      categoryName: r.category_name ?? '',
      unitPriceCents,
      revenueCents: !isRejected || options.includeRejected ? unitPriceCents : 0,
      isChecked: r.is_checked ?? false,
      isRejected,
      note: r.note ?? '',
      createdAt: r.created_at ?? '',
    }
  })

  const totalRevenueCents = leads.reduce((s, l) => s + l.revenueCents, 0)
  const rejected = leads.filter((l) => l.isRejected)

  const expensesCents = expenseResult.ok ? expenseResult.value.totalCents : null
  const expenses = expenseResult.ok ? expenseResult.value.expenses : []
  const netCents = expensesCents === null ? null : totalRevenueCents - expensesCents

  const salaryMonths = countTouchedMonths(options.from, options.to)
  const salaryCents = salaryMonths * SALARY_HEADCOUNT * MONTHLY_SALARY_CENTS
  const afterSalaryCents = netCents === null ? null : netCents - salaryCents

  // --- Per dag -----------------------------------------------------------
  const revenueByDate = new Map<string, number>()
  const leadCountByDate = new Map<string, number>()
  for (const lead of leads) {
    revenueByDate.set(lead.entryDate, (revenueByDate.get(lead.entryDate) ?? 0) + lead.revenueCents)
    leadCountByDate.set(lead.entryDate, (leadCountByDate.get(lead.entryDate) ?? 0) + 1)
  }

  const expensesByDate = new Map<string, number>()
  for (const e of expenses) {
    expensesByDate.set(e.date, (expensesByDate.get(e.date) ?? 0) + e.amountCents)
  }

  // Elke dag waarop iets gebeurde: omzet of een boeking. Dagen zonder beide
  // worden weggelaten — een rij vol nullen zegt niets.
  const allDates = Array.from(new Set([...revenueByDate.keys(), ...expensesByDate.keys()])).sort()

  const days: ExportDayRow[] = allDates.map((date) => {
    const revenueCents = revenueByDate.get(date) ?? 0
    const bookedExpensesCents = expensesByDate.get(date) ?? 0
    return {
      date,
      leadCount: leadCountByDate.get(date) ?? 0,
      revenueCents,
      bookedExpensesCents,
      resultCents: revenueCents - bookedExpensesCents,
    }
  })

  // --- Per klant per dag -------------------------------------------------
  const clientDayMap = new Map<string, { date: string; clientId: string; leadCount: number; revenueCents: number }>()
  for (const lead of leads) {
    const key = `${lead.entryDate}|${lead.clientId}`
    const current = clientDayMap.get(key) ?? {
      date: lead.entryDate,
      clientId: lead.clientId,
      leadCount: 0,
      revenueCents: 0,
    }
    current.leadCount += 1
    current.revenueCents += lead.revenueCents
    clientDayMap.set(key, current)
  }

  const clientDayBase = Array.from(clientDayMap.values()).sort((a, b) =>
    a.date === b.date
      ? (nameById.get(a.clientId) ?? '').localeCompare(nameById.get(b.clientId) ?? '')
      : a.date.localeCompare(b.date)
  )

  // Kosten en salaris worden over de héle periode naar rato van omzet verdeeld,
  // niet per dag. Per dag zou het scheef lopen: op een dag met een boeking maar
  // zonder omzet is er niets om over te verdelen, en die kosten zouden dan
  // stilletjes uit de klantregels verdwijnen.
  const weights = clientDayBase.map((r) => r.revenueCents)
  const costShares = distributeByShare(expensesCents ?? 0, weights)
  const salaryShares = distributeByShare(salaryCents, weights)

  const clientDays: ExportClientDayRow[] = clientDayBase.map((row, i) => {
    const estimatedCostCents = costShares[i] ?? 0
    const estimatedSalaryCents = salaryShares[i] ?? 0
    const estimatedProfitCents = row.revenueCents - estimatedCostCents
    return {
      date: row.date,
      clientId: row.clientId,
      companyName: nameById.get(row.clientId) ?? 'Onbekende klant',
      leadCount: row.leadCount,
      revenueCents: row.revenueCents,
      estimatedCostCents,
      estimatedProfitCents,
      estimatedSalaryCents,
      estimatedProfitAfterSalaryCents: estimatedProfitCents - estimatedSalaryCents,
    }
  })

  // --- Per klant, categorie en campagne ----------------------------------
  const categoryMap = new Map<string, ExportCategoryRow>()
  for (const lead of leads) {
    const key = `${lead.entryDate}|${lead.clientId}|${lead.categoryName}|${lead.campaignName}|${lead.unitPriceCents}`
    const current = categoryMap.get(key)
    if (current) {
      current.leadCount += 1
      current.revenueCents += lead.revenueCents
      continue
    }
    categoryMap.set(key, {
      date: lead.entryDate,
      clientId: lead.clientId,
      companyName: lead.companyName,
      categoryName: lead.categoryName,
      campaignName: lead.campaignName,
      leadCount: 1,
      unitPriceCents: lead.unitPriceCents,
      revenueCents: lead.revenueCents,
    })
  }

  const categories = Array.from(categoryMap.values()).sort((a, b) => {
    if (a.date !== b.date) return a.date.localeCompare(b.date)
    if (a.companyName !== b.companyName) return a.companyName.localeCompare(b.companyName)
    return a.categoryName.localeCompare(b.categoryName)
  })

  // --- Totalen per klant -------------------------------------------------
  interface ClientAccumulator {
    leadCount: number
    rejectedCount: number
    revenueCents: number
    estimatedCostCents: number
    estimatedSalaryCents: number
    dates: Set<string>
    firstLeadDate: string | null
    lastLeadDate: string | null
  }

  const perClient = new Map<string, ClientAccumulator>()
  const accumulatorFor = (clientId: string): ClientAccumulator => {
    const existing = perClient.get(clientId)
    if (existing) return existing
    const created: ClientAccumulator = {
      leadCount: 0,
      rejectedCount: 0,
      revenueCents: 0,
      estimatedCostCents: 0,
      estimatedSalaryCents: 0,
      dates: new Set<string>(),
      firstLeadDate: null,
      lastLeadDate: null,
    }
    perClient.set(clientId, created)
    return created
  }

  for (const lead of leads) {
    const acc = accumulatorFor(lead.clientId)
    acc.leadCount += 1
    if (lead.isRejected) acc.rejectedCount += 1
    acc.revenueCents += lead.revenueCents
    acc.dates.add(lead.entryDate)
    if (acc.firstLeadDate === null || lead.entryDate < acc.firstLeadDate) acc.firstLeadDate = lead.entryDate
    if (acc.lastLeadDate === null || lead.entryDate > acc.lastLeadDate) acc.lastLeadDate = lead.entryDate
  }

  // Tel de al verdeelde bedragen op, zodat klanttotaal en klant-per-dag exact
  // hetzelfde zeggen.
  for (const row of clientDays) {
    const acc = accumulatorFor(row.clientId)
    acc.estimatedCostCents += row.estimatedCostCents
    acc.estimatedSalaryCents += row.estimatedSalaryCents
  }

  const clientTotals: ExportClientTotalRow[] = Array.from(perClient.entries())
    .map(([clientId, acc]) => {
      const estimatedProfitCents = acc.revenueCents - acc.estimatedCostCents
      return {
        clientId,
        companyName: nameById.get(clientId) ?? 'Onbekende klant',
        leadCount: acc.leadCount,
        rejectedCount: acc.rejectedCount,
        activeDays: acc.dates.size,
        revenueCents: acc.revenueCents,
        estimatedCostCents: acc.estimatedCostCents,
        estimatedProfitCents,
        estimatedSalaryCents: acc.estimatedSalaryCents,
        estimatedProfitAfterSalaryCents: estimatedProfitCents - acc.estimatedSalaryCents,
        firstLeadDate: acc.firstLeadDate,
        lastLeadDate: acc.lastLeadDate,
      }
    })
    .sort((a, b) => b.revenueCents - a.revenueCents)

  const selectedClientNames =
    options.clientIds.length === 0
      ? []
      : options.clientIds.map((id) => nameById.get(id) ?? 'Onbekende klant').sort((a, b) => a.localeCompare(b))

  return {
    from: options.from,
    to: options.to,
    selectedClientNames,
    includeRejected: options.includeRejected,
    leads: leads.sort((a, b) =>
      a.entryDate === b.entryDate ? a.companyName.localeCompare(b.companyName) : a.entryDate.localeCompare(b.entryDate)
    ),
    days,
    clientDays,
    categories,
    clientTotals,
    expenses,
    totals: {
      leadCount: leads.length,
      rejectedCount: rejected.length,
      rejectedRevenueCents: rejected.reduce((s, l) => s + l.unitPriceCents, 0),
      revenueCents: totalRevenueCents,
      expensesCents,
      netCents,
      salaryMonths,
      salaryCents,
      afterSalaryCents,
      activeDays: revenueByDate.size,
      clientCount: perClient.size,
    },
    expensesError: expenseResult.ok ? null : expenseResult.error,
    expensesSkipped: expenseResult.ok ? expenseResult.value.skipped : 0,
  }
}
