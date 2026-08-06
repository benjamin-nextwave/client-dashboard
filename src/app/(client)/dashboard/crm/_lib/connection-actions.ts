'use server'

import { createClient } from '@/lib/supabase/server'
import {
  CONNECTION_COLUMNS,
  credentialsOf,
  isProvider,
  toSummary,
  type ConnectionRow,
} from './connections'
import { getCrmEntries } from './queries'
import { checkHubspot, exportToHubspot } from './providers/hubspot'
import { checkPipedrive, exportToPipedrive } from './providers/pipedrive'
import { maxContactsFor } from './providers/limits'
import type {
  CrmConnectionSummary,
  CrmCredentials,
  CrmProvider,
  ExportContact,
  ExportOutcome,
} from './providers/types'
import type { ActionResult, CrmEntry } from './types'
import { displayCompany, displayName, stageOf } from './view'

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

async function loadRow(
  supabase: Db,
  clientId: string,
  connectionId: string
): Promise<ConnectionRow | null> {
  const { data } = await supabase
    .from('crm_connections')
    .select(CONNECTION_COLUMNS)
    .eq('id', connectionId)
    .eq('client_id', clientId)
    .maybeSingle()
  return (data as unknown as ConnectionRow | null) ?? null
}

export type SaveConnectionInput = {
  /** Leeg bij een nieuwe koppeling. */
  id?: string
  provider: CrmProvider
  name: string
  /** Leeg laten bij bewerken betekent: bestaand token behouden. */
  token: string
  domain?: string
}

export async function saveConnection(
  input: SaveConnectionInput
): Promise<ActionResult<CrmConnectionSummary>> {
  const auth = await requireClientId()
  if (!auth.ok) return auth

  if (!isProvider(input.provider)) return { ok: false, error: 'Onbekende koppeling.' }

  const name = input.name.trim()
  if (!name) return { ok: false, error: 'Geef de koppeling een naam.' }
  if (name.length > 60) return { ok: false, error: 'Naam is te lang (max 60 tekens).' }

  const token = input.token.trim()
  const domain = input.domain?.trim() ?? ''

  let credentials: CrmCredentials
  if (input.id) {
    const existing = await loadRow(auth.supabase, auth.clientId, input.id)
    if (!existing) return { ok: false, error: 'Koppeling niet gevonden.' }
    const current = credentialsOf(existing.credentials)
    credentials = { token: token || current.token }
    if (domain) credentials.domain = domain
  } else {
    if (!token) return { ok: false, error: 'Vul het API-token in.' }

    // Eén HubSpot-koppeling per klant. Voor Pipedrive geldt die grens niet —
    // daar kan een klant meerdere accounts hebben.
    if (input.provider === 'hubspot') {
      const { data: existingHubspot } = await auth.supabase
        .from('crm_connections')
        .select('id')
        .eq('client_id', auth.clientId)
        .eq('provider', 'hubspot')
        .maybeSingle()
      if (existingHubspot) {
        return {
          ok: false,
          error:
            'Er is al een HubSpot-koppeling. Vervang het token van de bestaande koppeling of verwijder hem eerst.',
        }
      }
    }

    credentials = { token }
    if (domain) credentials.domain = domain
  }

  if (!credentials.token) return { ok: false, error: 'Vul het API-token in.' }

  const payload = {
    client_id: auth.clientId,
    provider: input.provider,
    name,
    credentials,
  }

  const query = input.id
    ? auth.supabase
        .from('crm_connections')
        .update(payload)
        .eq('id', input.id)
        .eq('client_id', auth.clientId)
        .select(CONNECTION_COLUMNS)
        .single()
    : auth.supabase
        .from('crm_connections')
        .insert(payload)
        .select(CONNECTION_COLUMNS)
        .single()

  const { data, error } = await query
  if (error) {
    if (error.code === '23505') {
      return { ok: false, error: 'Er bestaat al een koppeling met die naam.' }
    }
    return { ok: false, error: error.message }
  }
  return { ok: true, value: toSummary(data as unknown as ConnectionRow) }
}

export async function deleteConnection(
  connectionId: string
): Promise<ActionResult<undefined>> {
  const auth = await requireClientId()
  if (!auth.ok) return auth

  const { error } = await auth.supabase
    .from('crm_connections')
    .delete()
    .eq('id', connectionId)
    .eq('client_id', auth.clientId)
  if (error) return { ok: false, error: error.message }
  return { ok: true, value: undefined }
}

export async function testConnection(
  connectionId: string
): Promise<ActionResult<string>> {
  const auth = await requireClientId()
  if (!auth.ok) return auth

  const row = await loadRow(auth.supabase, auth.clientId, connectionId)
  if (!row) return { ok: false, error: 'Koppeling niet gevonden.' }

  const creds = credentialsOf(row.credentials)
  const check =
    row.provider === 'pipedrive'
      ? await checkPipedrive(creds)
      : await checkHubspot(creds)

  if (!check.ok) return { ok: false, error: check.error }
  return { ok: true, value: check.account }
}

// ─── Export ────────────────────────────────────────────────────────────────

export type ExportResult = {
  outcome: ExportOutcome
  requested: number
  sent: number
  connection: CrmConnectionSummary
}

function toExportContact(entry: CrmEntry): ExportContact {
  const record = entry.record
  return {
    email: entry.email,
    fullName: displayName(entry),
    firstName: null,
    lastName: null,
    company: displayCompany(entry),
    jobTitle: record?.jobTitle ?? null,
    phone: record?.phone ?? null,
    website: record?.website ?? null,
    linkedinUrl: record?.linkedinUrl ?? null,
    stage: stageOf(entry),
    ownerName: record?.ownerName ?? null,
    nextAction: record?.nextAction ?? null,
    notes: record?.notes ?? null,
  }
}

/**
 * Verstuurt de opgegeven leads naar het externe CRM. Wordt alleen aangeroepen
 * nadat de gebruiker in de UI expliciet heeft bevestigd hoeveel leads er naar
 * welke koppeling gaan.
 */
export async function exportToConnection(
  connectionId: string,
  leadKeys: string[]
): Promise<ActionResult<ExportResult>> {
  const auth = await requireClientId()
  if (!auth.ok) return auth

  const row = await loadRow(auth.supabase, auth.clientId, connectionId)
  if (!row) return { ok: false, error: 'Koppeling niet gevonden.' }
  if (!isProvider(row.provider)) return { ok: false, error: 'Onbekende koppeling.' }

  const wanted = new Set(leadKeys.map((k) => k.trim().toLowerCase()).filter(Boolean))
  if (wanted.size === 0) return { ok: false, error: 'Geen leads geselecteerd.' }

  const entries = (await getCrmEntries(auth.clientId)).filter((e) => wanted.has(e.key))
  if (entries.length === 0) return { ok: false, error: 'Geen leads gevonden om te versturen.' }

  const limit = maxContactsFor(row.provider)
  const selected = entries.slice(0, limit)
  const contacts = selected.map(toExportContact)
  const creds = credentialsOf(row.credentials)

  const outcome =
    row.provider === 'pipedrive'
      ? await exportToPipedrive(creds, contacts)
      : await exportToHubspot(creds, contacts)

  if (entries.length > limit) {
    outcome.errors.push(
      `Alleen de eerste ${limit} leads zijn verstuurd; ${entries.length - limit} leden nog. Verfijn je filters en exporteer opnieuw.`
    )
  }

  const status: 'success' | 'partial' | 'error' =
    outcome.failed === 0 && outcome.processed > 0
      ? 'success'
      : outcome.processed > 0
        ? 'partial'
        : 'error'

  const message =
    outcome.errors[0] ??
    outcome.detail ??
    (status === 'error' ? 'Er is niets verstuurd.' : `${outcome.processed} verstuurd`)

  const { data } = await auth.supabase
    .from('crm_connections')
    .update({
      last_export_at: new Date().toISOString(),
      last_export_status: status,
      last_export_message: message.slice(0, 300),
    })
    .eq('id', connectionId)
    .eq('client_id', auth.clientId)
    .select(CONNECTION_COLUMNS)
    .single()

  const connection = data
    ? toSummary(data as unknown as ConnectionRow)
    : toSummary(row)

  console.log(
    `[crm:export] provider=${row.provider} connection=${connectionId} sent=${selected.length} processed=${outcome.processed} failed=${outcome.failed}`
  )

  return {
    ok: true,
    value: {
      outcome,
      requested: entries.length,
      sent: selected.length,
      connection,
    },
  }
}
