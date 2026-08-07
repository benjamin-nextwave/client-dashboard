'use server'

import { createClient } from '@/lib/supabase/server'
import { rowToRecord, toActivityType, toPriority, toStage } from './queries'
import { STAGE_META } from './constants'
import type {
  ActionResult,
  CrmActivity,
  CrmActivityType,
  CrmLabel,
  CrmRecord,
  CrmRecordPatch,
  CrmStageId,
} from './types'

const RECORD_COLUMNS = `
  id, lead_key, stage, priority, owner_name, contact_name, company_name,
  job_title, phone, website, linkedin_url,
  next_action, next_action_at, notes, created_at, updated_at
`

type Db = Awaited<ReturnType<typeof createClient>>

async function requireClientId(): Promise<
  { ok: true; clientId: string; supabase: Db } | { ok: false; error: string }
> {
  const supabase = await createClient()
  const {
    data: { user },
  } = await supabase.auth.getUser()
  if (!user) return { ok: false, error: 'Niet ingelogd.' }

  const clientId = user.app_metadata?.client_id as string | undefined
  if (!clientId) return { ok: false, error: 'Geen klantaccount gekoppeld.' }

  return { ok: true, clientId, supabase }
}

/**
 * lead_key is het e-mailadres van een bron-lead. We valideren op vorm, niet
 * tegen de leads-tabel: de rij is hoe dan ook hard gescoped op de eigen
 * client_id (kolom + RLS), dus het ergste geval is dat een klant een record
 * aanmaakt in zijn eigen CRM dat nergens aan hangt.
 */
function normalizeLeadKey(raw: string): string | null {
  const key = raw.trim().toLowerCase()
  if (!key || key.length > 320 || !key.includes('@')) return null
  return key
}

function emptyToNull(value: string | null | undefined): string | null {
  if (value === null || value === undefined) return null
  const trimmed = value.trim()
  return trimmed === '' ? null : trimmed
}

/** Volledig record (incl. labels en activiteiten) — client vervangt zijn state hiermee. */
async function loadRecord(
  supabase: Db,
  clientId: string,
  recordId: string
): Promise<CrmRecord | null> {
  const [recordRes, labelRes, activityRes] = await Promise.all([
    supabase
      .from('crm_records')
      .select(RECORD_COLUMNS)
      .eq('id', recordId)
      .eq('client_id', clientId)
      .maybeSingle(),
    supabase.from('crm_record_labels').select('label_id').eq('record_id', recordId),
    supabase
      .from('crm_activities')
      .select('id, record_id, type, body, occurred_at, created_at')
      .eq('record_id', recordId)
      .order('occurred_at', { ascending: false }),
  ])

  if (recordRes.error || !recordRes.data) return null

  const labelIds = ((labelRes.data ?? []) as { label_id: string }[]).map(
    (r) => r.label_id
  )
  const activities: CrmActivity[] = (
    (activityRes.data ?? []) as {
      id: string
      record_id: string
      type: string
      body: string
      occurred_at: string
      created_at: string
    }[]
  ).map((a) => ({
    id: a.id,
    recordId: a.record_id,
    type: toActivityType(a.type),
    body: a.body,
    occurredAt: a.occurred_at,
    createdAt: a.created_at,
  }))

  return rowToRecord(
    recordRes.data as Parameters<typeof rowToRecord>[0],
    labelIds,
    activities
  )
}

/** Maakt het record aan als het nog niet bestaat en geeft het id terug. */
async function ensureRecordId(
  supabase: Db,
  clientId: string,
  leadKey: string
): Promise<{ ok: true; id: string } | { ok: false; error: string }> {
  const existing = await supabase
    .from('crm_records')
    .select('id')
    .eq('client_id', clientId)
    .eq('lead_key', leadKey)
    .maybeSingle()

  if (existing.data) return { ok: true, id: (existing.data as { id: string }).id }
  if (existing.error) return { ok: false, error: existing.error.message }

  const inserted = await supabase
    .from('crm_records')
    .insert({ client_id: clientId, lead_key: leadKey })
    .select('id')
    .single()

  if (inserted.error) return { ok: false, error: inserted.error.message }
  return { ok: true, id: (inserted.data as { id: string }).id }
}

// ─── Records ───────────────────────────────────────────────────────────────

export async function saveRecord(
  leadKeyRaw: string,
  patch: CrmRecordPatch
): Promise<ActionResult<CrmRecord>> {
  const auth = await requireClientId()
  if (!auth.ok) return auth

  const leadKey = normalizeLeadKey(leadKeyRaw)
  if (!leadKey) return { ok: false, error: 'Ongeldige lead.' }

  const payload: Record<string, unknown> = {}
  if (patch.stage !== undefined) payload.stage = toStage(patch.stage)
  if (patch.priority !== undefined) payload.priority = toPriority(patch.priority)
  if (patch.ownerName !== undefined) payload.owner_name = emptyToNull(patch.ownerName)
  if (patch.contactName !== undefined) payload.contact_name = emptyToNull(patch.contactName)
  if (patch.companyName !== undefined) payload.company_name = emptyToNull(patch.companyName)
  if (patch.jobTitle !== undefined) payload.job_title = emptyToNull(patch.jobTitle)
  if (patch.phone !== undefined) payload.phone = emptyToNull(patch.phone)
  if (patch.website !== undefined) payload.website = emptyToNull(patch.website)
  if (patch.linkedinUrl !== undefined) payload.linkedin_url = emptyToNull(patch.linkedinUrl)
  if (patch.notes !== undefined) payload.notes = emptyToNull(patch.notes)
  if (patch.nextAction !== undefined) payload.next_action = emptyToNull(patch.nextAction)
  if (patch.nextActionAt !== undefined) {
    payload.next_action_at = emptyToNull(patch.nextActionAt)
  }

  const ensured = await ensureRecordId(auth.supabase, auth.clientId, leadKey)
  if (!ensured.ok) return ensured

  if (Object.keys(payload).length > 0) {
    const { error } = await auth.supabase
      .from('crm_records')
      .update(payload)
      .eq('id', ensured.id)
      .eq('client_id', auth.clientId)
    if (error) return { ok: false, error: error.message }
  }

  const record = await loadRecord(auth.supabase, auth.clientId, ensured.id)
  if (!record) return { ok: false, error: 'Opslaan gelukt, herladen mislukt.' }
  return { ok: true, value: record }
}

/** Fasewijziging + automatische regel in de tijdlijn. */
export async function setStage(
  leadKeyRaw: string,
  stage: CrmStageId,
  fromStage: CrmStageId
): Promise<ActionResult<CrmRecord>> {
  const auth = await requireClientId()
  if (!auth.ok) return auth

  const leadKey = normalizeLeadKey(leadKeyRaw)
  if (!leadKey) return { ok: false, error: 'Ongeldige lead.' }

  const nextStage = toStage(stage)
  const prevStage = toStage(fromStage)

  const ensured = await ensureRecordId(auth.supabase, auth.clientId, leadKey)
  if (!ensured.ok) return ensured

  const { error } = await auth.supabase
    .from('crm_records')
    .update({ stage: nextStage })
    .eq('id', ensured.id)
    .eq('client_id', auth.clientId)
  if (error) return { ok: false, error: error.message }

  if (nextStage !== prevStage) {
    await auth.supabase.from('crm_activities').insert({
      record_id: ensured.id,
      type: 'fase',
      body: `Fase gewijzigd: ${STAGE_META[prevStage].name} → ${STAGE_META[nextStage].name}`,
    })
  }

  const record = await loadRecord(auth.supabase, auth.clientId, ensured.id)
  if (!record) return { ok: false, error: 'Opslaan gelukt, herladen mislukt.' }
  return { ok: true, value: record }
}

export async function bulkSetStage(
  leadKeysRaw: string[],
  stage: CrmStageId
): Promise<ActionResult<CrmRecord[]>> {
  const auth = await requireClientId()
  if (!auth.ok) return auth

  const keys = leadKeysRaw
    .map(normalizeLeadKey)
    .filter((k): k is string => k !== null)
  if (keys.length === 0) return { ok: false, error: 'Geen leads geselecteerd.' }

  const nextStage = toStage(stage)
  const updated: CrmRecord[] = []

  for (const key of keys) {
    const ensured = await ensureRecordId(auth.supabase, auth.clientId, key)
    if (!ensured.ok) return ensured
    const { error } = await auth.supabase
      .from('crm_records')
      .update({ stage: nextStage })
      .eq('id', ensured.id)
      .eq('client_id', auth.clientId)
    if (error) return { ok: false, error: error.message }
    const record = await loadRecord(auth.supabase, auth.clientId, ensured.id)
    if (record) updated.push(record)
  }

  return { ok: true, value: updated }
}

/** Verwijdert alleen de CRM-laag. De bron-lead in de inbox blijft ongemoeid. */
export async function resetRecord(
  leadKeyRaw: string
): Promise<ActionResult<undefined>> {
  const auth = await requireClientId()
  if (!auth.ok) return auth

  const leadKey = normalizeLeadKey(leadKeyRaw)
  if (!leadKey) return { ok: false, error: 'Ongeldige lead.' }

  const { error } = await auth.supabase
    .from('crm_records')
    .delete()
    .eq('client_id', auth.clientId)
    .eq('lead_key', leadKey)
  if (error) return { ok: false, error: error.message }
  return { ok: true, value: undefined }
}

/**
 * Meervoudige variant van `resetRecord` voor het kaartmenu en de bulkbalk.
 * Verwijdert uitsluitend de CRM-laag: het record plus de activiteiten en
 * labelkoppelingen die eraan hangen. De bron-lead blijft in de Lead inbox en
 * bij Campagne leads staan; geeft de klant hem opnieuw een fase, dan ontstaat
 * er een nieuw leeg record.
 */
export async function deleteCrmRecords(
  leadKeysRaw: string[]
): Promise<ActionResult<string[]>> {
  const auth = await requireClientId()
  if (!auth.ok) return auth

  const keys = [
    ...new Set(leadKeysRaw.map(normalizeLeadKey).filter((k): k is string => k !== null)),
  ]
  if (keys.length === 0) return { ok: false, error: 'Geen leads geselecteerd.' }

  const { data, error } = await auth.supabase
    .from('crm_records')
    .delete()
    .eq('client_id', auth.clientId)
    .in('lead_key', keys)
    .select('lead_key')

  if (error) {
    console.error('[crm:delete] error:', error.message)
    return { ok: false, error: 'Verwijderen is niet gelukt. Probeer het opnieuw.' }
  }

  return {
    ok: true,
    value: ((data ?? []) as { lead_key: string }[]).map((r) => r.lead_key),
  }
}

// ─── Labels ────────────────────────────────────────────────────────────────

export async function createCrmLabel(
  name: string,
  color: string
): Promise<ActionResult<CrmLabel>> {
  const auth = await requireClientId()
  if (!auth.ok) return auth

  const trimmed = name.trim()
  if (!trimmed) return { ok: false, error: 'Naam mag niet leeg zijn.' }
  if (trimmed.length > 40) return { ok: false, error: 'Naam is te lang (max 40 tekens).' }
  if (!color.trim()) return { ok: false, error: 'Kies een kleur.' }

  const { data, error } = await auth.supabase
    .from('crm_labels')
    .insert({ client_id: auth.clientId, name: trimmed, color: color.trim() })
    .select('id, name, color')
    .single()

  if (error) {
    if (error.code === '23505') {
      return { ok: false, error: 'Er bestaat al een label met die naam.' }
    }
    return { ok: false, error: error.message }
  }
  return { ok: true, value: data as CrmLabel }
}

export async function updateCrmLabel(
  labelId: string,
  name: string,
  color: string
): Promise<ActionResult<CrmLabel>> {
  const auth = await requireClientId()
  if (!auth.ok) return auth

  const trimmed = name.trim()
  if (!trimmed) return { ok: false, error: 'Naam mag niet leeg zijn.' }
  if (trimmed.length > 40) return { ok: false, error: 'Naam is te lang (max 40 tekens).' }

  const { data, error } = await auth.supabase
    .from('crm_labels')
    .update({ name: trimmed, color: color.trim() })
    .eq('id', labelId)
    .eq('client_id', auth.clientId)
    .select('id, name, color')
    .single()

  if (error) {
    if (error.code === '23505') {
      return { ok: false, error: 'Er bestaat al een label met die naam.' }
    }
    return { ok: false, error: error.message }
  }
  return { ok: true, value: data as CrmLabel }
}

export async function deleteCrmLabel(
  labelId: string
): Promise<ActionResult<undefined>> {
  const auth = await requireClientId()
  if (!auth.ok) return auth

  const { error } = await auth.supabase
    .from('crm_labels')
    .delete()
    .eq('id', labelId)
    .eq('client_id', auth.clientId)
  if (error) return { ok: false, error: error.message }
  return { ok: true, value: undefined }
}

export async function setRecordLabels(
  leadKeyRaw: string,
  labelIds: string[]
): Promise<ActionResult<CrmRecord>> {
  const auth = await requireClientId()
  if (!auth.ok) return auth

  const leadKey = normalizeLeadKey(leadKeyRaw)
  if (!leadKey) return { ok: false, error: 'Ongeldige lead.' }

  const ensured = await ensureRecordId(auth.supabase, auth.clientId, leadKey)
  if (!ensured.ok) return ensured

  // Alleen labels van deze klant — voorkomt dat een gemanipuleerde id een
  // vreemd label koppelt.
  const { data: ownLabels, error: labelError } = await auth.supabase
    .from('crm_labels')
    .select('id')
    .eq('client_id', auth.clientId)
  if (labelError) return { ok: false, error: labelError.message }

  const allowed = new Set(((ownLabels ?? []) as { id: string }[]).map((l) => l.id))
  const valid = [...new Set(labelIds)].filter((id) => allowed.has(id))

  const del = await auth.supabase
    .from('crm_record_labels')
    .delete()
    .eq('record_id', ensured.id)
  if (del.error) return { ok: false, error: del.error.message }

  if (valid.length > 0) {
    const ins = await auth.supabase
      .from('crm_record_labels')
      .insert(valid.map((labelId) => ({ record_id: ensured.id, label_id: labelId })))
    if (ins.error) return { ok: false, error: ins.error.message }
  }

  const record = await loadRecord(auth.supabase, auth.clientId, ensured.id)
  if (!record) return { ok: false, error: 'Opslaan gelukt, herladen mislukt.' }
  return { ok: true, value: record }
}

export async function bulkAddLabel(
  leadKeysRaw: string[],
  labelId: string
): Promise<ActionResult<CrmRecord[]>> {
  const auth = await requireClientId()
  if (!auth.ok) return auth

  const keys = leadKeysRaw
    .map(normalizeLeadKey)
    .filter((k): k is string => k !== null)
  if (keys.length === 0) return { ok: false, error: 'Geen leads geselecteerd.' }

  const { data: label } = await auth.supabase
    .from('crm_labels')
    .select('id')
    .eq('id', labelId)
    .eq('client_id', auth.clientId)
    .maybeSingle()
  if (!label) return { ok: false, error: 'Label niet gevonden.' }

  const updated: CrmRecord[] = []
  for (const key of keys) {
    const ensured = await ensureRecordId(auth.supabase, auth.clientId, key)
    if (!ensured.ok) return ensured
    const { error } = await auth.supabase
      .from('crm_record_labels')
      .insert({ record_id: ensured.id, label_id: labelId })
    if (error && error.code !== '23505') return { ok: false, error: error.message }
    const record = await loadRecord(auth.supabase, auth.clientId, ensured.id)
    if (record) updated.push(record)
  }

  return { ok: true, value: updated }
}

// ─── Activiteiten ──────────────────────────────────────────────────────────

export async function addActivity(
  leadKeyRaw: string,
  type: CrmActivityType,
  body: string,
  occurredAt: string | null
): Promise<ActionResult<CrmRecord>> {
  const auth = await requireClientId()
  if (!auth.ok) return auth

  const leadKey = normalizeLeadKey(leadKeyRaw)
  if (!leadKey) return { ok: false, error: 'Ongeldige lead.' }

  const trimmed = body.trim()
  if (!trimmed) return { ok: false, error: 'Tekst mag niet leeg zijn.' }

  const ensured = await ensureRecordId(auth.supabase, auth.clientId, leadKey)
  if (!ensured.ok) return ensured

  const insert: Record<string, unknown> = {
    record_id: ensured.id,
    type: toActivityType(type),
    body: trimmed,
  }
  const when = emptyToNull(occurredAt)
  if (when) insert.occurred_at = when

  const { error } = await auth.supabase.from('crm_activities').insert(insert)
  if (error) return { ok: false, error: error.message }

  const record = await loadRecord(auth.supabase, auth.clientId, ensured.id)
  if (!record) return { ok: false, error: 'Opslaan gelukt, herladen mislukt.' }
  return { ok: true, value: record }
}

export async function updateActivity(
  leadKeyRaw: string,
  activityId: string,
  type: CrmActivityType,
  body: string,
  occurredAt: string | null
): Promise<ActionResult<CrmRecord>> {
  const auth = await requireClientId()
  if (!auth.ok) return auth

  const leadKey = normalizeLeadKey(leadKeyRaw)
  if (!leadKey) return { ok: false, error: 'Ongeldige lead.' }

  const trimmed = body.trim()
  if (!trimmed) return { ok: false, error: 'Tekst mag niet leeg zijn.' }

  const { data: recordRow } = await auth.supabase
    .from('crm_records')
    .select('id')
    .eq('client_id', auth.clientId)
    .eq('lead_key', leadKey)
    .maybeSingle()
  if (!recordRow) return { ok: false, error: 'Lead niet gevonden in het CRM.' }
  const recordId = (recordRow as { id: string }).id

  const update: Record<string, unknown> = {
    type: toActivityType(type),
    body: trimmed,
  }
  const when = emptyToNull(occurredAt)
  if (when) update.occurred_at = when

  const { error } = await auth.supabase
    .from('crm_activities')
    .update(update)
    .eq('id', activityId)
    .eq('record_id', recordId)
  if (error) return { ok: false, error: error.message }

  const record = await loadRecord(auth.supabase, auth.clientId, recordId)
  if (!record) return { ok: false, error: 'Opslaan gelukt, herladen mislukt.' }
  return { ok: true, value: record }
}

export async function deleteActivity(
  leadKeyRaw: string,
  activityId: string
): Promise<ActionResult<CrmRecord>> {
  const auth = await requireClientId()
  if (!auth.ok) return auth

  const leadKey = normalizeLeadKey(leadKeyRaw)
  if (!leadKey) return { ok: false, error: 'Ongeldige lead.' }

  const { data: recordRow } = await auth.supabase
    .from('crm_records')
    .select('id')
    .eq('client_id', auth.clientId)
    .eq('lead_key', leadKey)
    .maybeSingle()
  if (!recordRow) return { ok: false, error: 'Lead niet gevonden in het CRM.' }
  const recordId = (recordRow as { id: string }).id

  const { error } = await auth.supabase
    .from('crm_activities')
    .delete()
    .eq('id', activityId)
    .eq('record_id', recordId)
  if (error) return { ok: false, error: error.message }

  const record = await loadRecord(auth.supabase, auth.clientId, recordId)
  if (!record) return { ok: false, error: 'Verwijderd, herladen mislukt.' }
  return { ok: true, value: record }
}
