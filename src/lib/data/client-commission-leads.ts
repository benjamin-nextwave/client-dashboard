import { createAdminClient } from '@/lib/supabase/admin'
import { effectiveLeadPriceCents } from '@/lib/commissions-shared'

/**
 * De leadpagina van de klant, gebouwd op wat er daadwerkelijk in rekening wordt
 * gebracht: de regels die de operator handmatig invoert bij Commissies.
 *
 * Waarom die bron en niet campaign_leads of de lead-inbox: dit is de enige lijst
 * waar een bedrag aan hangt. De lead-inbox bevat ook leads waar niets voor wordt
 * betaald (bij Bluebrd 216 tegen 149 gefactureerde), en campaign_leads is leeg.
 * Wil de klant bezwaar maken tegen een bedrag, dan moet hij precies de regels
 * zien die dat bedrag opleveren.
 *
 * De reactie van de lead komt er wél bij, opgezocht in de lead-inbox op
 * e-mailadres. Dat lukt voor 90 tot 96 procent; lukt het niet, dan blijft het
 * veld leeg. Zonder die tekst moet de klant uit zijn hoofd bedenken waar een
 * regel over ging, en dat maakt bezwaar maken onnodig moeilijk.
 *
 * Het totaal gaat uitsluitend over de lopende loopgang-periode. Een totaal van
 * alles ooit zegt niets over de factuur die eraan komt.
 */

export interface ClientCommissionLead {
  id: string
  entryDate: string
  leadEmail: string
  campaignName: string | null
  categoryName: string
  /** Wat deze regel werkelijk oplevert: halve prijs telt half, afgewezen telt nul. */
  amountCents: number
  isHalfPrice: boolean
  isRejected: boolean
  /** De laatste inhoudelijke reactie van de lead, als we die konden vinden. */
  replySubject: string | null
  replyBody: string | null
  replyAt: string | null
  objection: CommissionLeadObjection | null
}

export interface CommissionLeadObjection {
  id: string
  proposedCategoryName: string
  wantsUnbilled: boolean
  reason: string
  status: 'pending' | 'approved' | 'rejected'
  response: string | null
  submittedAt: string
  resolvedAt: string | null
}

export interface CommissionCategoryOption {
  id: string
  name: string
  priceCents: number
}

export interface ClientLeadsOverzicht {
  /** Eerste dag van de lopende periode; null als er geen startpunt bekend is. */
  periodStart: string | null
  periodLabel: string
  /** Alleen de leads binnen de lopende periode. */
  currentLeads: ClientCommissionLead[]
  /** Alles daarvoor, nieuwste eerst. Geen totaal — dat is al gefactureerd. */
  earlierLeads: ClientCommissionLead[]
  /** Som over de lopende periode, afgewezen regels tellen niet mee. */
  currentTotalCents: number
  currentLeadCount: number
  categories: CommissionCategoryOption[]
}

type LeadRow = {
  id: string
  entry_date: string
  lead_email: string
  campaign_name: string | null
  category_name: string
  unit_price_cents: number
  is_half_price: boolean
  is_rejected: boolean
}

type ObjectionRow = {
  id: string
  commission_lead_id: string
  proposed_category_name: string
  wants_unbilled: boolean
  reason: string
  status: string
  response: string | null
  submitted_at: string
  resolved_at: string | null
}

type RawReply = {
  direction?: string
  subject?: string
  body?: string
  received_at?: string
}

function isStatus(v: unknown): v is CommissionLeadObjection['status'] {
  return v === 'pending' || v === 'approved' || v === 'rejected'
}

function nlDatum(iso: string): string {
  const [y, m, d] = iso.split('-').map(Number)
  if (!y || !m || !d) return iso
  return new Intl.DateTimeFormat('nl-NL', { day: 'numeric', month: 'long', year: 'numeric' }).format(
    new Date(Date.UTC(y, m - 1, d))
  )
}

/**
 * De laatste binnenkomende reactie per e-mailadres, uit de lead-inbox van deze
 * klant. Eén query voor alle leads; per lead opzoeken zou bij honderd regels
 * honderd queries betekenen.
 */
async function replyByEmail(
  leadInboxCustomerId: string | null
): Promise<Map<string, { subject: string | null; body: string | null; at: string | null }>> {
  const map = new Map<string, { subject: string | null; body: string | null; at: string | null }>()
  if (!leadInboxCustomerId) return map

  const supabase = createAdminClient()
  const { data } = await supabase
    .from('leads')
    .select('email, replies, first_reply_at')
    .eq('customer_id', leadInboxCustomerId)

  for (const row of data ?? []) {
    const email = String(row.email ?? '').toLowerCase()
    if (!email) continue

    const replies: RawReply[] = Array.isArray(row.replies) ? (row.replies as RawReply[]) : []
    const inbound = replies
      .filter((r) => r.direction !== 'outbound')
      .sort((a, b) => new Date(b.received_at ?? 0).getTime() - new Date(a.received_at ?? 0).getTime())

    const laatste = inbound[0]
    map.set(email, {
      subject: laatste?.subject ?? null,
      // Een reply zonder tekst komt voor: replies via Make kunnen een lege body
      // hebben. Leeg laten is beter dan een lege string tonen.
      body: laatste?.body?.trim() ? laatste.body : null,
      at: laatste?.received_at ?? (row.first_reply_at as string | null) ?? null,
    })
  }

  return map
}

export async function getClientLeadsOverzicht(clientId: string): Promise<ClientLeadsOverzicht> {
  const supabase = createAdminClient()

  const { data: client } = await supabase
    .from('clients')
    .select('cycle_start_date, go_live_date, lead_inbox_customer_id')
    .eq('id', clientId)
    .maybeSingle()

  // Het anker van de lopende periode volgt de loopgang: de handmatig gezette
  // startdatum wint, anders de laatste factuur, anders de livegang.
  const { data: laatsteFactuur } = await supabase
    .from('client_invoice_marks')
    .select('invoice_date')
    .eq('client_id', clientId)
    .order('invoice_date', { ascending: false })
    .limit(1)
    .maybeSingle()

  const periodStart =
    (client?.cycle_start_date as string | null) ??
    (laatsteFactuur?.invoice_date as string | null) ??
    (client?.go_live_date as string | null) ??
    null

  const [{ data: leadRows }, { data: objectionRows }, { data: categoryRows }] = await Promise.all([
    supabase
      .from('operator_commission_leads')
      .select(
        'id, entry_date, lead_email, campaign_name, category_name, unit_price_cents, is_half_price, is_rejected'
      )
      .eq('client_id', clientId)
      .order('entry_date', { ascending: false }),
    supabase
      .from('commission_lead_objections')
      .select(
        'id, commission_lead_id, proposed_category_name, wants_unbilled, reason, status, response, submitted_at, resolved_at'
      )
      .eq('client_id', clientId),
    supabase
      .from('operator_client_commission_categories')
      .select('id, name, price_cents')
      .eq('client_id', clientId)
      .order('position', { ascending: true }),
  ])

  const objections = new Map<string, CommissionLeadObjection>()
  for (const row of (objectionRows ?? []) as ObjectionRow[]) {
    objections.set(row.commission_lead_id, {
      id: row.id,
      proposedCategoryName: row.proposed_category_name,
      wantsUnbilled: row.wants_unbilled,
      reason: row.reason,
      status: isStatus(row.status) ? row.status : 'pending',
      response: row.response,
      submittedAt: row.submitted_at,
      resolvedAt: row.resolved_at,
    })
  }

  const replies = await replyByEmail((client?.lead_inbox_customer_id as string | null) ?? null)

  const leads: ClientCommissionLead[] = ((leadRows ?? []) as LeadRow[]).map((row) => {
    const reply = replies.get(String(row.lead_email).toLowerCase())
    return {
      id: row.id,
      entryDate: String(row.entry_date).slice(0, 10),
      leadEmail: row.lead_email,
      campaignName: row.campaign_name?.trim() ? row.campaign_name : null,
      categoryName: row.category_name,
      amountCents: row.is_rejected
        ? 0
        : effectiveLeadPriceCents(Number(row.unit_price_cents) || 0, row.is_half_price === true),
      isHalfPrice: row.is_half_price === true,
      isRejected: row.is_rejected === true,
      replySubject: reply?.subject ?? null,
      replyBody: reply?.body ?? null,
      replyAt: reply?.at ?? null,
      objection: objections.get(row.id) ?? null,
    }
  })

  const currentLeads = periodStart ? leads.filter((l) => l.entryDate >= periodStart) : leads
  const earlierLeads = periodStart ? leads.filter((l) => l.entryDate < periodStart) : []

  return {
    periodStart,
    periodLabel: periodStart ? `sinds ${nlDatum(periodStart)}` : 'hele looptijd',
    currentLeads,
    earlierLeads,
    currentTotalCents: currentLeads.reduce((sum, l) => sum + l.amountCents, 0),
    currentLeadCount: currentLeads.filter((l) => !l.isRejected).length,
    categories: (categoryRows ?? []).map((c) => ({
      id: String(c.id),
      name: String(c.name),
      priceCents: Number(c.price_cents) || 0,
    })),
  }
}
