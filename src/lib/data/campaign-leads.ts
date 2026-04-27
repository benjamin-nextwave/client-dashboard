import { cache } from 'react'
import { createAdminClient } from '@/lib/supabase/admin'

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

export type CampaignLead = {
  id: string
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
  createdAt: string
  updatedAt: string
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
  created_at: string
  updated_at: string
}

function isObjectionStatus(value: unknown): value is ObjectionStatus {
  return value === 'pending' || value === 'approved' || value === 'rejected'
}

function rowToLead(row: DbRow): CampaignLead {
  return {
    id: row.id,
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
    createdAt: row.created_at,
    updatedAt: row.updated_at,
  }
}

export const getCampaignLeads = cache(
  async (clientId: string): Promise<CampaignLead[]> => {
    const admin = createAdminClient()
    const { data, error } = await admin
      .from('campaign_leads')
      .select('*')
      .eq('client_id', clientId)
      .order('received_at', { ascending: false })

    if (error) {
      console.error('Campaign leads fetch error:', error)
      return []
    }

    return (data as DbRow[]).map(rowToLead)
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
