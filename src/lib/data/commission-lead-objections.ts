import { createAdminClient } from '@/lib/supabase/admin'
import { effectiveLeadPriceCents } from '@/lib/commissions-shared'

/**
 * De bezwaren die klanten indienen op een commissielead, voor het admin
 * dashboard. Open bezwaren eerst — dat is waar iets van je gevraagd wordt.
 */

export interface CommissionObjectionRow {
  id: string
  clientId: string
  clientName: string
  leadId: string
  leadEmail: string
  entryDate: string
  currentCategoryName: string
  currentAmountCents: number
  proposedCategoryName: string
  /** Prijs van de voorgestelde categorie; null als die categorie niet meer bestaat. */
  proposedPriceCents: number | null
  wantsUnbilled: boolean
  reason: string
  status: 'pending' | 'approved' | 'rejected'
  response: string | null
  submittedAt: string
  resolvedAt: string | null
}

function isStatus(v: unknown): v is CommissionObjectionRow['status'] {
  return v === 'pending' || v === 'approved' || v === 'rejected'
}

export async function getCommissionLeadObjections(): Promise<CommissionObjectionRow[]> {
  const supabase = createAdminClient()

  const { data: objections } = await supabase
    .from('commission_lead_objections')
    .select(
      'id, commission_lead_id, client_id, proposed_category_id, proposed_category_name, wants_unbilled, reason, status, response, submitted_at, resolved_at'
    )
    .order('submitted_at', { ascending: false })

  if (!objections || objections.length === 0) return []

  const leadIds = [...new Set(objections.map((o) => String(o.commission_lead_id)))]
  const clientIds = [...new Set(objections.map((o) => String(o.client_id)))]
  const categoryIds = [
    ...new Set(objections.map((o) => o.proposed_category_id).filter((x): x is string => !!x)),
  ]

  const [{ data: leads }, { data: clients }, { data: categories }] = await Promise.all([
    supabase
      .from('operator_commission_leads')
      .select('id, lead_email, entry_date, category_name, unit_price_cents, is_half_price, is_rejected')
      .in('id', leadIds),
    supabase.from('clients').select('id, company_name').in('id', clientIds),
    categoryIds.length > 0
      ? supabase
          .from('operator_client_commission_categories')
          .select('id, price_cents')
          .in('id', categoryIds)
      : Promise.resolve({ data: [] as { id: string; price_cents: number }[] }),
  ])

  const leadMap = new Map((leads ?? []).map((l) => [String(l.id), l]))
  const clientMap = new Map((clients ?? []).map((c) => [String(c.id), String(c.company_name)]))
  const priceMap = new Map(
    (categories ?? []).map((c) => [String(c.id), Number(c.price_cents) || 0])
  )

  const rows: CommissionObjectionRow[] = []
  for (const o of objections) {
    const lead = leadMap.get(String(o.commission_lead_id))
    // De lead is weg (verwijderd uit commissies): het bezwaar gaat dan nergens
    // meer over en tonen zou alleen verwarring geven.
    if (!lead) continue

    rows.push({
      id: String(o.id),
      clientId: String(o.client_id),
      clientName: clientMap.get(String(o.client_id)) ?? 'Onbekend',
      leadId: String(lead.id),
      leadEmail: String(lead.lead_email),
      entryDate: String(lead.entry_date).slice(0, 10),
      currentCategoryName: String(lead.category_name),
      currentAmountCents: lead.is_rejected
        ? 0
        : effectiveLeadPriceCents(Number(lead.unit_price_cents) || 0, lead.is_half_price === true),
      proposedCategoryName: String(o.proposed_category_name),
      proposedPriceCents: o.wants_unbilled
        ? 0
        : o.proposed_category_id
          ? (priceMap.get(String(o.proposed_category_id)) ?? null)
          : null,
      wantsUnbilled: o.wants_unbilled === true,
      reason: String(o.reason),
      status: isStatus(o.status) ? o.status : 'pending',
      response: (o.response as string | null) ?? null,
      submittedAt: String(o.submitted_at),
      resolvedAt: (o.resolved_at as string | null) ?? null,
    })
  }

  // Open bezwaren bovenaan; daarbinnen nieuwste eerst.
  return rows.sort((a, b) => {
    if (a.status !== b.status) {
      if (a.status === 'pending') return -1
      if (b.status === 'pending') return 1
    }
    return a.submittedAt < b.submittedAt ? 1 : -1
  })
}
