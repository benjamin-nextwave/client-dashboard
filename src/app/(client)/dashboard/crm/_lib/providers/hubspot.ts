import type { CrmStageId } from '../types'
import {
  chunk,
  emptyOutcome,
  splitName,
  type CrmCredentials,
  type ExportContact,
  type ExportOutcome,
  type ProviderCheck,
} from './types'

const API = 'https://api.hubapi.com'

/** HubSpot verwerkt maximaal 100 records per batch-call. */
const BATCH_SIZE = 100

// Onze fases naar de standaard HubSpot-eigenschappen. Beide eigenschappen
// bestaan out-of-the-box, dus de klant hoeft niets in te richten.
const LEAD_STATUS: Record<CrmStageId, string> = {
  nieuw: 'NEW',
  contact: 'IN_PROGRESS',
  gekwalificeerd: 'CONNECTED',
  voorstel: 'OPEN_DEAL',
  gewonnen: 'CONNECTED',
  verloren: 'UNQUALIFIED',
}

const LIFECYCLE_STAGE: Record<CrmStageId, string> = {
  nieuw: 'lead',
  contact: 'lead',
  gekwalificeerd: 'salesqualifiedlead',
  voorstel: 'opportunity',
  gewonnen: 'customer',
  verloren: 'other',
}

type BatchError = {
  message?: string
  context?: Record<string, unknown>
}

type BatchResponse = {
  status?: string
  results?: unknown[]
  errors?: BatchError[]
  message?: string
}

function propertiesFor(contact: ExportContact): Record<string, string> {
  const { firstName, lastName } = splitName(contact.fullName)
  const props: Record<string, string> = {
    email: contact.email,
    hs_lead_status: LEAD_STATUS[contact.stage],
    lifecyclestage: LIFECYCLE_STAGE[contact.stage],
  }
  if (contact.firstName ?? firstName) props.firstname = (contact.firstName ?? firstName) as string
  if (contact.lastName ?? lastName) props.lastname = (contact.lastName ?? lastName) as string
  if (contact.company) props.company = contact.company
  if (contact.jobTitle) props.jobtitle = contact.jobTitle
  if (contact.phone) props.phone = contact.phone
  if (contact.website) props.website = contact.website
  return props
}

async function request(
  token: string,
  path: string,
  init?: RequestInit
): Promise<{ ok: boolean; status: number; body: BatchResponse; raw: string }> {
  const response = await fetch(`${API}${path}`, {
    ...init,
    headers: {
      Authorization: `Bearer ${token}`,
      'Content-Type': 'application/json',
      ...(init?.headers ?? {}),
    },
    cache: 'no-store',
  })
  const raw = await response.text()
  let body: BatchResponse = {}
  try {
    body = raw ? (JSON.parse(raw) as BatchResponse) : {}
  } catch {
    body = {}
  }
  return { ok: response.ok, status: response.status, body, raw }
}

function describeStatus(status: number, body: BatchResponse, raw: string): string {
  if (status === 401) return 'Token ongeldig of verlopen (401).'
  if (status === 403) {
    return 'Token mist rechten. Geef de Private App de scopes crm.objects.contacts.read en crm.objects.contacts.write (403).'
  }
  if (status === 429) return 'HubSpot rate limit bereikt (429). Probeer het over een minuut opnieuw.'
  const message = body.message ?? raw.slice(0, 200)
  return `HubSpot gaf ${status}${message ? `: ${message}` : ''}`
}

export async function checkHubspot(creds: CrmCredentials): Promise<ProviderCheck> {
  if (!creds.token.trim()) return { ok: false, error: 'Vul een Private App-token in.' }
  try {
    const res = await request(creds.token.trim(), '/crm/v3/objects/contacts?limit=1')
    if (!res.ok) return { ok: false, error: describeStatus(res.status, res.body, res.raw) }
    return { ok: true, account: 'HubSpot' }
  } catch (err) {
    const message = err instanceof Error ? err.message : 'onbekende fout'
    return { ok: false, error: `HubSpot onbereikbaar: ${message}` }
  }
}

/**
 * Upsert op e-mailadres: bestaat het contact al, dan wordt het bijgewerkt.
 * Er ontstaan dus nooit dubbele contacten.
 */
export async function exportToHubspot(
  creds: CrmCredentials,
  contacts: ExportContact[]
): Promise<ExportOutcome> {
  const outcome = emptyOutcome()
  const token = creds.token.trim()
  if (!token) {
    outcome.errors.push('Geen token ingesteld.')
    return outcome
  }

  const usable = contacts.filter((c) => c.email.includes('@'))
  outcome.skipped = contacts.length - usable.length

  for (const batch of chunk(usable, BATCH_SIZE)) {
    const inputs = batch.map((contact) => ({
      idProperty: 'email',
      id: contact.email,
      properties: propertiesFor(contact),
    }))

    try {
      const res = await request(token, '/crm/v3/objects/contacts/batch/upsert', {
        method: 'POST',
        body: JSON.stringify({ inputs }),
      })

      if (!res.ok && res.status !== 207) {
        outcome.failed += batch.length
        outcome.errors.push(describeStatus(res.status, res.body, res.raw))
        continue
      }

      const failedInBatch = res.body.errors?.length ?? 0
      outcome.processed += batch.length - failedInBatch
      outcome.failed += failedInBatch
      for (const error of res.body.errors ?? []) {
        if (error.message) outcome.errors.push(error.message)
      }
    } catch (err) {
      const message = err instanceof Error ? err.message : 'onbekende fout'
      outcome.failed += batch.length
      outcome.errors.push(`HubSpot onbereikbaar: ${message}`)
    }
  }

  outcome.detail =
    outcome.processed > 0 ? `${outcome.processed} contact(en) aangemaakt of bijgewerkt` : null
  return outcome
}
