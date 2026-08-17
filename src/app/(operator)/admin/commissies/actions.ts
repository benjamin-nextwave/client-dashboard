'use server'

import { revalidatePath, revalidateTag } from 'next/cache'
import { createAdminClient } from '@/lib/supabase/admin'
import { getCommissionChartSeries, type CommissionChartSeries } from '@/lib/data/commissions'
import {
  isUnpaidLeadCategoryId,
  UNPAID_LEAD_CATEGORY_NAME,
} from '@/lib/commissions-shared'
import { ROMPSLOMP_CACHE_TAG } from '@/lib/rompslomp/client'
import { getExpenseTotals } from '@/lib/rompslomp/expenses'

export interface CommissionLeadInput {
  leadEmail: string
  clientId: string
  categoryId: string
  campaignName: string
  date: string
  note: string
  /** Twijfelachtig in zijn categorie: commissie telt voor de helft mee. */
  isHalfPrice: boolean
}

type ActionResult = { error?: string; inserted?: number }

const DATE_RE = /^\d{4}-\d{2}-\d{2}$/

/**
 * Slaat de blokken uit de commissiecontrole op als losse lead-rijen. Per rij
 * worden categorienaam en -prijs uit de categorieën-tabel als snapshot
 * meegeschreven, zodat latere prijswijzigingen historische leads niet raken.
 * Blokken zonder mailadres, klant, categorie of geldige datum worden
 * overgeslagen.
 */
export async function addCommissionLeads(rows: CommissionLeadInput[]): Promise<ActionResult> {
  const supabase = createAdminClient()

  const valid = rows.filter(
    (r) =>
      r.leadEmail.trim().length > 0 &&
      r.clientId.length > 0 &&
      r.categoryId.length > 0 &&
      DATE_RE.test(r.date)
  )
  if (valid.length === 0) {
    return { error: 'Vul minstens één volledig blok in (mailadres, klant en categorie).' }
  }

  // De onbetaalde categorie bestaat alleen in code en heeft dus geen rij om op
  // te zoeken; hem meesturen zou een lege resultaatset opleveren.
  const categoryIds = Array.from(
    new Set(valid.map((r) => r.categoryId).filter((id) => !isUnpaidLeadCategoryId(id)))
  )
  const { data: cats, error: catErr } =
    categoryIds.length > 0
      ? await supabase
          .from('operator_client_commission_categories')
          .select('id, name, price_cents')
          .in('id', categoryIds)
      : { data: [], error: null }
  if (catErr) return { error: catErr.message }
  const catById = new Map((cats ?? []).map((c) => [c.id, c]))

  const insertRows = []
  for (const r of valid) {
    if (isUnpaidLeadCategoryId(r.categoryId)) {
      insertRows.push({
        client_id: r.clientId,
        lead_email: r.leadEmail.trim(),
        campaign_name: r.campaignName.trim(),
        entry_date: r.date,
        category_id: null,
        category_name: UNPAID_LEAD_CATEGORY_NAME,
        unit_price_cents: 0,
        is_half_price: false,
        note: r.note.trim(),
      })
      continue
    }
    const cat = catById.get(r.categoryId)
    if (!cat) return { error: 'Onbekende categorie geselecteerd.' }
    insertRows.push({
      client_id: r.clientId,
      lead_email: r.leadEmail.trim(),
      campaign_name: r.campaignName.trim(),
      entry_date: r.date,
      category_id: cat.id,
      category_name: cat.name,
      unit_price_cents: cat.price_cents ?? 0,
      is_half_price: r.isHalfPrice,
      note: r.note.trim(),
    })
  }

  const { error } = await supabase.from('operator_commission_leads').insert(insertRows)
  if (error) return { error: error.message }

  revalidatePath('/admin/commissies')
  revalidatePath('/admin/commissies/financieel')
  revalidatePath('/admin/commissies/leads')
  return { inserted: insertRows.length }
}

export interface CommissionLeadUpdate {
  leadEmail: string
  clientId: string
  categoryId: string
  campaignName: string
  date: string
}

/**
 * Werkt een bestaande commissie-lead bij (mailadres, klant, categorie,
 * campagne en datum). De prijs-snapshot blijft behouden zolang de categorie
 * niet wijzigt, zodat latere prijswijzigingen bestaande leads niet met
 * terugwerkende kracht raken; bij een andere categorie wordt de huidige prijs
 * opnieuw als snapshot vastgelegd.
 */
export async function updateCommissionLead(
  id: string,
  patch: CommissionLeadUpdate
): Promise<ActionResult> {
  const supabase = createAdminClient()

  const email = patch.leadEmail.trim()
  if (!email || !patch.clientId || !patch.categoryId || !DATE_RE.test(patch.date)) {
    return { error: 'Vul mailadres, klant, categorie en een geldige datum in.' }
  }

  const isUnpaid = isUnpaidLeadCategoryId(patch.categoryId)

  const [{ data: cat, error: catErr }, { data: existing }] = await Promise.all([
    isUnpaid
      ? Promise.resolve({ data: null, error: null })
      : supabase
          .from('operator_client_commission_categories')
          .select('id, name, price_cents')
          .eq('id', patch.categoryId)
          .maybeSingle(),
    supabase
      .from('operator_commission_leads')
      .select('category_id, unit_price_cents')
      .eq('id', id)
      .maybeSingle(),
  ])
  if (catErr) return { error: catErr.message }
  if (!isUnpaid && !cat) return { error: 'Onbekende categorie geselecteerd.' }

  // Een onbetaalde lead is per definitie € 0,00 en heeft geen categorierij; de
  // korting gaat mee uit, want de helft van niets zegt niets.
  const unitPriceCents = isUnpaid
    ? 0
    : existing && existing.category_id === patch.categoryId
      ? existing.unit_price_cents ?? 0
      : cat?.price_cents ?? 0

  const { error } = await supabase
    .from('operator_commission_leads')
    .update({
      lead_email: email,
      client_id: patch.clientId,
      campaign_name: patch.campaignName.trim(),
      entry_date: patch.date,
      category_id: isUnpaid ? null : cat?.id,
      category_name: isUnpaid ? UNPAID_LEAD_CATEGORY_NAME : cat?.name,
      unit_price_cents: unitPriceCents,
      ...(isUnpaid ? { is_half_price: false } : {}),
      updated_at: new Date().toISOString(),
    })
    .eq('id', id)
  if (error) return { error: error.message }

  revalidatePath('/admin/commissies')
  revalidatePath('/admin/commissies/financieel')
  revalidatePath('/admin/commissies/leads')
  return {}
}

/** Verwijdert één commissie-lead definitief. */
export async function deleteCommissionLead(id: string): Promise<ActionResult> {
  const supabase = createAdminClient()
  const { error } = await supabase.from('operator_commission_leads').delete().eq('id', id)
  if (error) return { error: error.message }
  revalidatePath('/admin/commissies')
  revalidatePath('/admin/commissies/financieel')
  revalidatePath('/admin/commissies/leads')
  return {}
}

export async function setCommissionLeadChecked(id: string, value: boolean): Promise<ActionResult> {
  const supabase = createAdminClient()
  const { error } = await supabase
    .from('operator_commission_leads')
    .update({ is_checked: value, updated_at: new Date().toISOString() })
    .eq('id', id)
  if (error) return { error: error.message }
  revalidatePath('/admin/commissies/leads')
  return {}
}

/** Markeert meerdere leads in één keer als (niet-)afgerond. */
export async function setCommissionLeadsChecked(ids: string[], value: boolean): Promise<ActionResult> {
  if (ids.length === 0) return {}
  const supabase = createAdminClient()
  const { error } = await supabase
    .from('operator_commission_leads')
    .update({ is_checked: value, updated_at: new Date().toISOString() })
    .in('id', ids)
  if (error) return { error: error.message }
  revalidatePath('/admin/commissies/leads')
  return {}
}

export async function setCommissionLeadRejected(id: string, value: boolean): Promise<ActionResult> {
  const supabase = createAdminClient()
  const { error } = await supabase
    .from('operator_commission_leads')
    .update({ is_rejected: value, updated_at: new Date().toISOString() })
    .eq('id', id)
  if (error) return { error: error.message }
  revalidatePath('/admin/commissies/leads')
  return {}
}

/**
 * Zet de 50%-korting van een lead aan of uit. De bedragen worden nergens
 * herschreven: de volle categorieprijs blijft staan en de halvering wordt in de
 * overzichten afgeleid, zodat dit altijd terug te draaien is.
 *
 * Raakt ook het financieel overzicht en de grafiek, vandaar dat die paden
 * meegenomen worden in de revalidatie.
 */
export async function setCommissionLeadHalfPrice(id: string, value: boolean): Promise<ActionResult> {
  const supabase = createAdminClient()
  const { error } = await supabase
    .from('operator_commission_leads')
    .update({ is_half_price: value, updated_at: new Date().toISOString() })
    .eq('id', id)
  if (error) return { error: error.message }
  revalidatePath('/admin/commissies')
  revalidatePath('/admin/commissies/financieel')
  revalidatePath('/admin/commissies/leads')
  return {}
}

/** Slaat de vrije notitie van een lead op (leeg = notitie wissen). */
export async function setCommissionLeadNote(id: string, note: string): Promise<ActionResult> {
  const supabase = createAdminClient()
  const { error } = await supabase
    .from('operator_commission_leads')
    .update({ note: note.trim(), updated_at: new Date().toISOString() })
    .eq('id', id)
  if (error) return { error: error.message }
  revalidatePath('/admin/commissies/leads')
  return {}
}

const DATE_RE_SERIES = /^\d{4}-\d{2}-\d{2}$/

/** Grafiekdata voor de gekozen periode + klantfilter (lege lijst = iedereen). */
export async function fetchCommissionChartSeries(
  from: string,
  to: string,
  clientIds: string[]
): Promise<CommissionChartSeries> {
  if (!DATE_RE_SERIES.test(from) || !DATE_RE_SERIES.test(to)) {
    return { from, to, points: [] }
  }
  return getCommissionChartSeries(from, to, clientIds.length > 0 ? clientIds : undefined)
}

export interface RefreshExpensesResult {
  error?: string
  totalCents?: number
  count?: number
}

/**
 * Gooit de opgeslagen Rompslomp-antwoorden weg en haalt de uitgaven direct
 * opnieuw op. Bedoeld voor twee gevallen: je hebt zojuist iets geboekt en wilt
 * het meteen zien, of een eerdere poging is mislukt en je wilt opnieuw
 * proberen zonder vijf minuten te wachten.
 *
 * Leest alleen; er gaat niets terug naar de boekhouding.
 */
export async function refreshRompslompExpenses(
  from: string,
  to: string
): Promise<RefreshExpensesResult> {
  if (!DATE_RE_SERIES.test(from) || !DATE_RE_SERIES.test(to)) {
    return { error: 'Ongeldige periode.' }
  }

  revalidateTag(ROMPSLOMP_CACHE_TAG)

  // Meteen opnieuw ophalen, zodat de knop kan melden of het gelukt is in
  // plaats van dat de gebruiker het pas na het herladen ziet.
  const result = await getExpenseTotals(from, to)
  revalidatePath('/admin/commissies/financieel')

  if (!result.ok) return { error: result.error }
  return { totalCents: result.value.totalCents, count: result.value.expenses.length }
}
