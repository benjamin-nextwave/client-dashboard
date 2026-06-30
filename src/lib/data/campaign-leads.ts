import { cache } from 'react'
import { createAdminClient } from '@/lib/supabase/admin'
import { getAdminContactsMap, type AdminContact } from '@/lib/data/lead-admin-contacts'

export const LEAD_LABELS = [
  'meeting_voorstel',
  'geinteresseerd',
  'telefonisch_voorstel',
  'komt_erop_terug',
  'doorverwezen',
  'later_mogelijk',
  'geen_interesse',
] as const

export type LeadLabel = (typeof LEAD_LABELS)[number]

interface LabelMeta {
  name: string
  short: string
  description: string
  // Tailwind klassen — pre-compiled zodat de JIT ze niet verliest.
  badge: string
  dot: string
  ring: string
}

export const LABEL_META: Record<LeadLabel, LabelMeta> = {
  meeting_voorstel: {
    name: 'Meeting / call voorstel',
    short: 'Meeting',
    description: 'Lead stelt een meeting of call voor.',
    badge: 'bg-emerald-50 text-emerald-700 border-emerald-200',
    dot: 'bg-emerald-500',
    ring: 'ring-emerald-200',
  },
  geinteresseerd: {
    name: 'Geïnteresseerd / wil meer info',
    short: 'Geïnteresseerd',
    description: 'Lead is geïnteresseerd en wil meer informatie.',
    badge: 'bg-sky-50 text-sky-700 border-sky-200',
    dot: 'bg-sky-500',
    ring: 'ring-sky-200',
  },
  telefonisch_voorstel: {
    name: 'Telefonisch contact voorstel',
    short: 'Telefonisch',
    description: 'Lead vraagt om telefonisch contact.',
    badge: 'bg-indigo-50 text-indigo-700 border-indigo-200',
    dot: 'bg-indigo-500',
    ring: 'ring-indigo-200',
  },
  komt_erop_terug: {
    name: 'Komt erop terug / intern bespreken',
    short: 'Komt erop terug',
    description: 'Lead bespreekt intern en komt erop terug.',
    badge: 'bg-amber-50 text-amber-700 border-amber-200',
    dot: 'bg-amber-500',
    ring: 'ring-amber-200',
  },
  doorverwezen: {
    name: 'Doorverwezen naar beslisser',
    short: 'Doorverwezen',
    description: 'Lead heeft doorverwezen naar de beslisser.',
    badge: 'bg-violet-50 text-violet-700 border-violet-200',
    dot: 'bg-violet-500',
    ring: 'ring-violet-200',
  },
  later_mogelijk: {
    name: 'Niet nu, later mogelijk geïnteresseerd',
    short: 'Later mogelijk',
    description: 'Niet nu, maar later mogelijk geïnteresseerd.',
    badge: 'bg-slate-50 text-slate-700 border-slate-200',
    dot: 'bg-slate-400',
    ring: 'ring-slate-200',
  },
  geen_interesse: {
    name: 'Geen interesse / out of office',
    short: 'Geen interesse',
    description: 'Geen interesse of out-of-office bericht.',
    badge: 'bg-rose-50 text-rose-700 border-rose-200',
    dot: 'bg-rose-400',
    ring: 'ring-rose-200',
  },
}

export function isLeadLabel(value: unknown): value is LeadLabel {
  return typeof value === 'string' && (LEAD_LABELS as readonly string[]).includes(value)
}

export type ObjectionStatus = 'pending' | 'approved' | 'rejected'

// Welke bron heeft deze CampaignLead opgeleverd: handmatig ingevoerd via de
// operator (campaign_leads tabel) of automatisch afgeleid uit de lead-inbox?
export type LeadSource = 'manual' | 'lead_inbox'

export type CampaignLead = {
  id: string
  source: LeadSource
  clientId: string
  leadEmail: string
  leadName: string | null
  leadCompany: string | null
  sentSubject: string | null
  sentBody: string | null
  sentAt: string | null
  replySubject: string | null
  replyBody: string | null
  receivedAt: string
  label: LeadLabel
  notes: string | null
  labelJustification: string | null
  objectionText: string | null
  objectionSubmittedAt: string | null
  objectionStatus: ObjectionStatus | null
  objectionResponse: string | null
  objectionResolvedAt: string | null
  objectionProposedLabel: LeadLabel | null
  objectionProposedLabelNote: string | null
  adminContact: AdminContact | null
  createdAt: string
  updatedAt: string
}

// Mapping tussen lead-inbox classification (sprint 2 enum) en LeadLabel.
// 1-op-1 want we hebben sprint 2 hier expliciet op afgestemd.
const CLASSIFICATION_TO_LABEL = {
  meeting_request: 'meeting_voorstel',
  phone_request: 'telefonisch_voorstel',
  interested: 'geinteresseerd',
  referral: 'doorverwezen',
  internal_review: 'komt_erop_terug',
  not_now_maybe_later: 'later_mogelijk',
  not_interested: 'geen_interesse',
} as const satisfies Record<string, LeadLabel>

const LABEL_TO_CLASSIFICATION = {
  meeting_voorstel: 'meeting_request',
  telefonisch_voorstel: 'phone_request',
  geinteresseerd: 'interested',
  doorverwezen: 'referral',
  komt_erop_terug: 'internal_review',
  later_mogelijk: 'not_now_maybe_later',
  geen_interesse: 'not_interested',
} as const satisfies Record<LeadLabel, string>

export type LeadClassification = keyof typeof CLASSIFICATION_TO_LABEL

export function classificationToLabel(c: string | null | undefined): LeadLabel {
  if (c && c in CLASSIFICATION_TO_LABEL) {
    return CLASSIFICATION_TO_LABEL[c as LeadClassification]
  }
  // Fallback: alles wat we niet kennen valt terug op 'geinteresseerd'
  return 'geinteresseerd'
}

export function labelToClassification(label: LeadLabel): LeadClassification {
  return LABEL_TO_CLASSIFICATION[label] as LeadClassification
}

type DbRow = {
  id: string
  client_id: string
  lead_email: string
  lead_name: string | null
  lead_company: string | null
  sent_subject: string | null
  sent_body: string | null
  sent_at: string | null
  reply_subject: string | null
  reply_body: string | null
  received_at: string
  label: string
  notes: string | null
  label_justification: string | null
  objection_text: string | null
  objection_submitted_at: string | null
  objection_status: string | null
  objection_response: string | null
  objection_resolved_at: string | null
  objection_proposed_label: string | null
  objection_proposed_label_note: string | null
  created_at: string
  updated_at: string
}

function isObjectionStatus(value: unknown): value is ObjectionStatus {
  return value === 'pending' || value === 'approved' || value === 'rejected'
}

function rowToLead(row: DbRow): CampaignLead {
  return {
    id: row.id,
    source: 'manual',
    clientId: row.client_id,
    leadEmail: row.lead_email,
    leadName: row.lead_name,
    leadCompany: row.lead_company,
    sentSubject: row.sent_subject,
    sentBody: row.sent_body,
    sentAt: row.sent_at,
    replySubject: row.reply_subject,
    replyBody: row.reply_body,
    receivedAt: row.received_at,
    label: isLeadLabel(row.label) ? row.label : 'geinteresseerd',
    notes: row.notes,
    labelJustification: row.label_justification,
    objectionText: row.objection_text,
    objectionSubmittedAt: row.objection_submitted_at,
    objectionStatus: isObjectionStatus(row.objection_status) ? row.objection_status : null,
    objectionResponse: row.objection_response,
    objectionResolvedAt: row.objection_resolved_at,
    objectionProposedLabel: isLeadLabel(row.objection_proposed_label) ? row.objection_proposed_label : null,
    objectionProposedLabelNote: row.objection_proposed_label_note,
    adminContact: null,
    createdAt: row.created_at,
    updatedAt: row.updated_at,
  }
}

// ─────────────────────────────────────────────────────────────────────────
// Lead-inbox bron: voor klanten waarbij operator de toggle aan heeft staan
// EN een lead_inbox_customer_id heeft gekoppeld, lezen we hun "leads-pagina"
// rechtstreeks vanuit de lead-inbox tabellen (leads + lead_inbox_objections)
// in plaats van handmatig ingevoerde campaign_leads.
//
// De UI op /dashboard/campagne-leads ziet er hetzelfde uit; alleen de bron
// verschilt. Operator's "Lead toevoegen"-knop wordt voor deze klanten
// verborgen (zie page.tsx in de operator-folder).
// ─────────────────────────────────────────────────────────────────────────

type LeadInboxRow = {
  id: string
  customer_id: string
  email: string
  name: string | null
  classification: string
  thread_id: string | null
  first_campaign_id: string
  sending_account: string
  first_reply_at: string
  last_reply_at: string
  replies: unknown
  created_at: string
  updated_at: string
}

type LeadInboxObjectionRow = {
  id: string
  lead_id: string
  client_id: string
  text: string
  proposed_label: string
  proposed_label_note: string | null
  submitted_at: string
  status: string
  response: string | null
  resolved_at: string | null
  created_at: string
  updated_at: string
}

type RawReply = {
  direction?: string
  subject?: string
  body?: string
  received_at?: string
}

function leadInboxRowToCampaignLead(
  row: LeadInboxRow,
  clientId: string,
  objection: LeadInboxObjectionRow | undefined
): CampaignLead {
  const replies: RawReply[] = Array.isArray(row.replies) ? (row.replies as RawReply[]) : []
  const sortByDateDesc = (a: RawReply, b: RawReply) =>
    new Date(b.received_at ?? 0).getTime() - new Date(a.received_at ?? 0).getTime()

  const inbound = replies.filter((r) => r.direction !== 'outbound').sort(sortByDateDesc)
  const outbound = replies.filter((r) => r.direction === 'outbound').sort(sortByDateDesc)

  const lastInbound = inbound[0]
  const lastOutbound = outbound[0]

  return {
    id: row.id,
    source: 'lead_inbox',
    clientId,
    leadEmail: row.email,
    leadName: row.name,
    leadCompany: null,
    sentSubject: lastOutbound?.subject ?? null,
    sentBody: lastOutbound?.body ?? null,
    sentAt: lastOutbound?.received_at ?? null,
    replySubject: lastInbound?.subject ?? null,
    replyBody: lastInbound?.body ?? null,
    receivedAt: row.first_reply_at,
    label: classificationToLabel(row.classification),
    notes: null,
    labelJustification: null,
    objectionText: objection?.text ?? null,
    objectionSubmittedAt: objection?.submitted_at ?? null,
    objectionStatus: isObjectionStatus(objection?.status) ? objection!.status : null,
    objectionResponse: objection?.response ?? null,
    objectionResolvedAt: objection?.resolved_at ?? null,
    objectionProposedLabel: objection
      ? classificationToLabel(objection.proposed_label)
      : null,
    objectionProposedLabelNote: objection?.proposed_label_note ?? null,
    adminContact: null,
    createdAt: row.created_at,
    updatedAt: row.updated_at,
  }
}

/** Attach admin "doorverwijzing" contacts (keyed by lead email) to leads. */
async function attachAdminContacts(
  clientId: string,
  leads: CampaignLead[]
): Promise<CampaignLead[]> {
  if (leads.length === 0) return leads
  const contacts = await getAdminContactsMap(clientId)
  if (contacts.size === 0) return leads
  return leads.map((lead) => ({
    ...lead,
    adminContact: contacts.get(lead.leadEmail.toLowerCase()) ?? null,
  }))
}

async function getLeadInboxAsCampaignLeads(
  clientId: string,
  customerId: string
): Promise<CampaignLead[]> {
  const admin = createAdminClient()
  const [leadsRes, objRes] = await Promise.all([
    admin
      .from('leads')
      .select(
        'id, customer_id, email, name, classification, thread_id, first_campaign_id, sending_account, first_reply_at, last_reply_at, replies, created_at, updated_at'
      )
      .eq('customer_id', customerId)
      .order('first_reply_at', { ascending: false }),
    admin.from('lead_inbox_objections').select('*').eq('client_id', clientId),
  ])

  if (leadsRes.error) {
    console.error('Lead-inbox leads fetch error:', leadsRes.error)
    return []
  }

  const leads = (leadsRes.data ?? []) as LeadInboxRow[]
  const objMap = new Map<string, LeadInboxObjectionRow>()
  for (const o of (objRes.data ?? []) as LeadInboxObjectionRow[]) {
    objMap.set(o.lead_id, o)
  }

  return leads.map((l) => leadInboxRowToCampaignLead(l, clientId, objMap.get(l.id)))
}

export const getCampaignLeads = cache(
  async (clientId: string): Promise<CampaignLead[]> => {
    const admin = createAdminClient()

    // Bron-keuze: heeft deze klant lead-inbox aan + customer-id gekoppeld?
    const { data: clientRow } = await admin
      .from('clients')
      .select('lead_inbox_visible, lead_inbox_customer_id')
      .eq('id', clientId)
      .single()

    if (clientRow?.lead_inbox_visible && clientRow.lead_inbox_customer_id) {
      const leads = await getLeadInboxAsCampaignLeads(clientId, clientRow.lead_inbox_customer_id)
      return attachAdminContacts(clientId, leads)
    }

    const { data, error } = await admin
      .from('campaign_leads')
      .select('*')
      .eq('client_id', clientId)
      .order('received_at', { ascending: false })

    if (error) {
      console.error('Campaign leads fetch error:', error)
      return []
    }

    return attachAdminContacts(clientId, (data as DbRow[]).map(rowToLead))
  }
)

export const getCampaignLeadById = cache(
  async (leadId: string): Promise<CampaignLead | null> => {
    const admin = createAdminClient()
    const { data, error } = await admin
      .from('campaign_leads')
      .select('*')
      .eq('id', leadId)
      .single()

    if (error || !data) return null
    return rowToLead(data as DbRow)
  }
)

export type CampaignLeadWithClient = CampaignLead & {
  clientCompanyName: string
}

/** Alle campaign leads die een (resolved of open) bezwaar hebben, mét klantnaam. */
export const getCampaignLeadsWithObjections = cache(
  async (): Promise<CampaignLeadWithClient[]> => {
    const admin = createAdminClient()
    const { data, error } = await admin
      .from('campaign_leads')
      .select('*')
      .not('objection_status', 'is', null)
      .order('objection_submitted_at', { ascending: false })

    if (error || !data) {
      if (error) console.error('Campaign leads with objections fetch error:', error)
      return []
    }

    const rows = data as DbRow[]
    const clientIds = Array.from(new Set(rows.map((r) => r.client_id)))
    if (clientIds.length === 0) return []

    const { data: clients } = await admin
      .from('clients')
      .select('id, company_name')
      .in('id', clientIds)

    const nameMap = new Map<string, string>(
      (clients ?? []).map((c) => [c.id as string, c.company_name as string])
    )

    return rows.map((r) => ({
      ...rowToLead(r),
      clientCompanyName: nameMap.get(r.client_id) ?? 'Onbekend',
    }))
  }
)

/** Bereken de start (maandag 00:00) van de ISO-week voor een datum. */
function startOfIsoWeek(date: Date): Date {
  const d = new Date(date)
  d.setHours(0, 0, 0, 0)
  const day = d.getDay() // 0 = zondag
  const diff = day === 0 ? -6 : 1 - day
  d.setDate(d.getDate() + diff)
  return d
}

/** ISO week-nummer voor groep-key (jaar+week). */
function isoWeekKey(date: Date): { key: string; weekNumber: number; year: number; start: Date } {
  const start = startOfIsoWeek(date)

  // ISO week number berekening
  const tmp = new Date(Date.UTC(start.getFullYear(), start.getMonth(), start.getDate()))
  const dayNum = tmp.getUTCDay() || 7
  tmp.setUTCDate(tmp.getUTCDate() + 4 - dayNum)
  const yearStart = new Date(Date.UTC(tmp.getUTCFullYear(), 0, 1))
  const weekNumber = Math.ceil(((tmp.getTime() - yearStart.getTime()) / 86400000 + 1) / 7)

  return {
    key: `${tmp.getUTCFullYear()}-W${String(weekNumber).padStart(2, '0')}`,
    weekNumber,
    year: tmp.getUTCFullYear(),
    start,
  }
}

export type WeekGroup = {
  key: string
  weekNumber: number
  year: number
  startDate: string
  endDate: string
  leads: CampaignLead[]
}

/**
 * Groepeer leads per ISO-week, in dezelfde sortering als de input
 * (verwacht: meest recent eerst). Resultaat behoudt die volgorde.
 */
export function groupLeadsByWeek(leads: CampaignLead[]): WeekGroup[] {
  const map = new Map<string, WeekGroup>()

  for (const lead of leads) {
    const date = new Date(lead.receivedAt)
    const { key, weekNumber, year, start } = isoWeekKey(date)
    const end = new Date(start)
    end.setDate(end.getDate() + 6)

    const existing = map.get(key)
    if (existing) {
      existing.leads.push(lead)
    } else {
      map.set(key, {
        key,
        weekNumber,
        year,
        startDate: start.toISOString(),
        endDate: end.toISOString(),
        leads: [lead],
      })
    }
  }

  return Array.from(map.values()).sort((a, b) =>
    b.startDate.localeCompare(a.startDate)
  )
}
