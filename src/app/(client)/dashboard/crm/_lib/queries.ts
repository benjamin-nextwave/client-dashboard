import { createClient } from '@/lib/supabase/server'
import { getCampaignLeads, type CampaignLead } from '@/lib/data/campaign-leads'
import { hasAdminContact } from '@/lib/data/lead-admin-contacts'
import { DEFAULT_PRIORITY, DEFAULT_STAGE } from './constants'
import type {
  CrmActivity,
  CrmActivityType,
  CrmEntry,
  CrmLabel,
  CrmPriority,
  CrmRecord,
  CrmStageId,
} from './types'

const RECORD_COLUMNS = `
  id, lead_key, stage, priority, owner_name, contact_name, company_name,
  job_title, phone, website, linkedin_url, deal_value, expected_close_date,
  next_action, next_action_at, notes, created_at, updated_at
`

type RecordRow = {
  id: string
  lead_key: string
  stage: string
  priority: string
  owner_name: string | null
  contact_name: string | null
  company_name: string | null
  job_title: string | null
  phone: string | null
  website: string | null
  linkedin_url: string | null
  deal_value: string | number | null
  expected_close_date: string | null
  next_action: string | null
  next_action_at: string | null
  notes: string | null
  created_at: string
  updated_at: string
}

type LabelRow = { id: string; name: string; color: string }
type AssignmentRow = { record_id: string; label_id: string }
type ActivityRow = {
  id: string
  record_id: string
  type: string
  body: string
  occurred_at: string
  created_at: string
}

const STAGE_IDS: readonly string[] = [
  'nieuw',
  'contact',
  'gekwalificeerd',
  'voorstel',
  'gewonnen',
  'verloren',
]

const PRIORITY_IDS: readonly string[] = ['laag', 'normaal', 'hoog']

const ACTIVITY_TYPES: readonly string[] = [
  'notitie',
  'telefoon',
  'email',
  'meeting',
  'taak',
  'fase',
]

export function toStage(value: unknown): CrmStageId {
  return typeof value === 'string' && STAGE_IDS.includes(value)
    ? (value as CrmStageId)
    : DEFAULT_STAGE
}

export function toPriority(value: unknown): CrmPriority {
  return typeof value === 'string' && PRIORITY_IDS.includes(value)
    ? (value as CrmPriority)
    : DEFAULT_PRIORITY
}

export function toActivityType(value: unknown): CrmActivityType {
  return typeof value === 'string' && ACTIVITY_TYPES.includes(value)
    ? (value as CrmActivityType)
    : 'notitie'
}

function toNumber(value: string | number | null): number | null {
  if (value === null) return null
  const n = typeof value === 'number' ? value : Number(value)
  return Number.isFinite(n) ? n : null
}

export function rowToRecord(
  row: RecordRow,
  labelIds: string[],
  activities: CrmActivity[]
): CrmRecord {
  return {
    id: row.id,
    leadKey: row.lead_key,
    stage: toStage(row.stage),
    priority: toPriority(row.priority),
    ownerName: row.owner_name,
    contactName: row.contact_name,
    companyName: row.company_name,
    jobTitle: row.job_title,
    phone: row.phone,
    website: row.website,
    linkedinUrl: row.linkedin_url,
    dealValue: toNumber(row.deal_value),
    expectedCloseDate: row.expected_close_date,
    nextAction: row.next_action,
    nextActionAt: row.next_action_at,
    notes: row.notes,
    labelIds,
    activities,
    createdAt: row.created_at,
    updatedAt: row.updated_at,
  }
}

function rowToActivity(row: ActivityRow): CrmActivity {
  return {
    id: row.id,
    recordId: row.record_id,
    type: toActivityType(row.type),
    body: row.body,
    occurredAt: row.occurred_at,
    createdAt: row.created_at,
  }
}

export async function getCrmLabels(clientId: string): Promise<CrmLabel[]> {
  const supabase = await createClient()
  const { data, error } = await supabase
    .from('crm_labels')
    .select('id, name, color')
    .eq('client_id', clientId)
    .order('name', { ascending: true })

  if (error) {
    console.error('[crm:labels] fetch error:', error.message)
    return []
  }
  return (data ?? []) as LabelRow[]
}

async function getCrmRecords(clientId: string): Promise<Map<string, CrmRecord>> {
  const supabase = await createClient()
  const { data: recordData, error } = await supabase
    .from('crm_records')
    .select(RECORD_COLUMNS)
    .eq('client_id', clientId)

  if (error) {
    console.error('[crm:records] fetch error:', error.message)
    return new Map()
  }

  const rows = (recordData ?? []) as unknown as RecordRow[]
  if (rows.length === 0) return new Map()

  const recordIds = rows.map((r) => r.id)
  const [assignmentsRes, activitiesRes] = await Promise.all([
    supabase
      .from('crm_record_labels')
      .select('record_id, label_id')
      .in('record_id', recordIds),
    supabase
      .from('crm_activities')
      .select('id, record_id, type, body, occurred_at, created_at')
      .in('record_id', recordIds)
      .order('occurred_at', { ascending: false }),
  ])

  const labelsByRecord = new Map<string, string[]>()
  for (const a of (assignmentsRes.data ?? []) as AssignmentRow[]) {
    const list = labelsByRecord.get(a.record_id)
    if (list) list.push(a.label_id)
    else labelsByRecord.set(a.record_id, [a.label_id])
  }

  const activitiesByRecord = new Map<string, CrmActivity[]>()
  for (const raw of (activitiesRes.data ?? []) as ActivityRow[]) {
    const activity = rowToActivity(raw)
    const list = activitiesByRecord.get(raw.record_id)
    if (list) list.push(activity)
    else activitiesByRecord.set(raw.record_id, [activity])
  }

  const map = new Map<string, CrmRecord>()
  for (const row of rows) {
    map.set(
      row.lead_key,
      rowToRecord(
        row,
        labelsByRecord.get(row.id) ?? [],
        activitiesByRecord.get(row.id) ?? []
      )
    )
  }
  return map
}

/**
 * Voegt twee bron-leads met hetzelfde e-mailadres samen tot één CRM-rij. De
 * meest recente reply wint; ontbrekende velden vullen we aan uit de oudere.
 */
function mergeLeads(a: CampaignLead, b: CampaignLead): CampaignLead {
  const [newer, older] =
    new Date(a.receivedAt).getTime() >= new Date(b.receivedAt).getTime()
      ? [a, b]
      : [b, a]
  return {
    ...newer,
    leadName: newer.leadName ?? older.leadName,
    leadCompany: newer.leadCompany ?? older.leadCompany,
    sentSubject: newer.sentSubject ?? older.sentSubject,
    sentBody: newer.sentBody ?? older.sentBody,
    replySubject: newer.replySubject ?? older.replySubject,
    replyBody: newer.replyBody ?? older.replyBody,
    adminContact: newer.adminContact ?? older.adminContact,
  }
}

/**
 * De CRM-lijst. Bron is exact `getCampaignLeads` — dezelfde functie die het
 * leads-tabblad voedt en die voor lead-inbox klanten rechtstreeks uit de
 * `leads`-tabel leest. Er wordt uitsluitend gelezen.
 */
export async function getCrmEntries(clientId: string): Promise<CrmEntry[]> {
  const [leads, records] = await Promise.all([
    getCampaignLeads(clientId),
    getCrmRecords(clientId),
  ])

  const byKey = new Map<string, CampaignLead>()
  for (const lead of leads) {
    const key = lead.leadEmail.trim().toLowerCase()
    if (!key) continue
    const existing = byKey.get(key)
    byKey.set(key, existing ? mergeLeads(existing, lead) : lead)
  }

  const entries: CrmEntry[] = []
  for (const [key, lead] of byKey) {
    entries.push({
      key,
      email: lead.leadEmail,
      leadName: lead.leadName,
      leadCompany: lead.leadCompany,
      leadLabel: lead.label,
      source: lead.source,
      receivedAt: lead.receivedAt,
      sentSubject: lead.sentSubject,
      sentBody: lead.sentBody,
      replySubject: lead.replySubject,
      replyBody: lead.replyBody,
      hasReferral: hasAdminContact(lead.adminContact),
      record: records.get(key) ?? null,
    })
  }

  entries.sort(
    (a, b) => new Date(b.receivedAt).getTime() - new Date(a.receivedAt).getTime()
  )
  return entries
}
