'use server'

import { revalidatePath } from 'next/cache'
import { createAdminClient } from '@/lib/supabase/admin'
import { getCommissionChartSeries, type CommissionChartSeries } from '@/lib/data/commissions'

export interface CommissionLeadInput {
  leadEmail: string
  clientId: string
  categoryId: string
  campaignName: string
  date: string
  note: string
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

  const categoryIds = Array.from(new Set(valid.map((r) => r.categoryId)))
  const { data: cats, error: catErr } = await supabase
    .from('operator_client_commission_categories')
    .select('id, name, price_cents')
    .in('id', categoryIds)
  if (catErr) return { error: catErr.message }
  const catById = new Map((cats ?? []).map((c) => [c.id, c]))

  const insertRows = []
  for (const r of valid) {
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

  const [{ data: cat, error: catErr }, { data: existing }] = await Promise.all([
    supabase
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
  if (!cat) return { error: 'Onbekende categorie geselecteerd.' }

  const unitPriceCents =
    existing && existing.category_id === patch.categoryId
      ? existing.unit_price_cents ?? 0
      : cat.price_cents ?? 0

  const { error } = await supabase
    .from('operator_commission_leads')
    .update({
      lead_email: email,
      client_id: patch.clientId,
      campaign_name: patch.campaignName.trim(),
      entry_date: patch.date,
      category_id: cat.id,
      category_name: cat.name,
      unit_price_cents: unitPriceCents,
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
    return { from, to, points: [], totalNetCents: 0 }
  }
  return getCommissionChartSeries(from, to, clientIds.length > 0 ? clientIds : undefined)
}
