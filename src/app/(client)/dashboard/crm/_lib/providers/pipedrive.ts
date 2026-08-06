import {
  emptyOutcome,
  mapWithConcurrency,
  type CrmCredentials,
  type ExportContact,
  type ExportOutcome,
  type ProviderCheck,
} from './types'

/** Pipedrive staat ~10 requests per seconde toe; 4 parallel blijft daar ruim onder. */
const CONCURRENCY = 4

function baseUrl(creds: CrmCredentials): string {
  const domain = creds.domain?.trim().replace(/^https?:\/\//, '').replace(/\.pipedrive\.com.*$/, '')
  return domain ? `https://${domain}.pipedrive.com/api/v1` : 'https://api.pipedrive.com/v1'
}

type PipedriveBody = {
  success?: boolean
  error?: string
  error_info?: string
  data?: unknown
}

async function request(
  creds: CrmCredentials,
  path: string,
  init?: RequestInit
): Promise<{ ok: boolean; status: number; body: PipedriveBody; raw: string }> {
  const response = await fetch(`${baseUrl(creds)}${path}`, {
    ...init,
    headers: {
      // Token in een header, niet in de query string — anders belandt hij in
      // logs en proxy-geschiedenis.
      'x-api-token': creds.token.trim(),
      'Content-Type': 'application/json',
      ...(init?.headers ?? {}),
    },
    cache: 'no-store',
  })
  const raw = await response.text()
  let body: PipedriveBody = {}
  try {
    body = raw ? (JSON.parse(raw) as PipedriveBody) : {}
  } catch {
    body = {}
  }
  return { ok: response.ok && body.success !== false, status: response.status, body, raw }
}

function describeStatus(status: number, body: PipedriveBody, raw: string): string {
  if (status === 401) return 'API-token ongeldig (401).'
  if (status === 403) return 'Token mist rechten voor personen of organisaties (403).'
  if (status === 429) return 'Pipedrive rate limit bereikt (429). Probeer het straks opnieuw.'
  const message = body.error ?? body.error_info ?? raw.slice(0, 200)
  return `Pipedrive gaf ${status}${message ? `: ${message}` : ''}`
}

type SearchItem = { item?: { id?: number } }
type SearchData = { items?: SearchItem[] }

function firstSearchId(data: unknown): number | null {
  const items = (data as SearchData | undefined)?.items
  const id = items?.[0]?.item?.id
  return typeof id === 'number' ? id : null
}

async function findPersonIdByEmail(
  creds: CrmCredentials,
  email: string
): Promise<number | null> {
  const res = await request(
    creds,
    `/persons/search?term=${encodeURIComponent(email)}&fields=email&exact_match=true&limit=1`
  )
  if (!res.ok) return null
  return firstSearchId(res.body.data)
}

async function ensureOrganizationId(
  creds: CrmCredentials,
  name: string,
  cache: Map<string, number | null>
): Promise<number | null> {
  const key = name.toLowerCase()
  const cached = cache.get(key)
  if (cached !== undefined) return cached

  const search = await request(
    creds,
    `/organizations/search?term=${encodeURIComponent(name)}&exact_match=true&limit=1`
  )
  const existing = search.ok ? firstSearchId(search.body.data) : null
  if (existing !== null) {
    cache.set(key, existing)
    return existing
  }

  const created = await request(creds, '/organizations', {
    method: 'POST',
    body: JSON.stringify({ name }),
  })
  const id = created.ok ? ((created.body.data as { id?: number } | undefined)?.id ?? null) : null
  cache.set(key, id)
  return id
}

export async function checkPipedrive(creds: CrmCredentials): Promise<ProviderCheck> {
  if (!creds.token.trim()) return { ok: false, error: 'Vul een API-token in.' }
  try {
    const res = await request(creds, '/users/me')
    if (!res.ok) return { ok: false, error: describeStatus(res.status, res.body, res.raw) }
    const data = res.body.data as { name?: string; company_name?: string } | undefined
    const account = data?.company_name ?? data?.name ?? 'Pipedrive'
    return { ok: true, account }
  } catch (err) {
    const message = err instanceof Error ? err.message : 'onbekende fout'
    return { ok: false, error: `Pipedrive onbereikbaar: ${message}` }
  }
}

type PersonOutcome = 'created' | 'updated' | 'failed'

/**
 * Personen worden opgezocht op e-mailadres en bijgewerkt als ze al bestaan.
 * Een gekoppelde organisatie wordt hergebruikt of eenmalig aangemaakt.
 *
 * Pipedrive heeft geen standaardvelden voor functie, website of LinkedIn —
 * die velden gaan dus niet mee. Naam, e-mail, telefoon en organisatie wel.
 */
export async function exportToPipedrive(
  creds: CrmCredentials,
  contacts: ExportContact[]
): Promise<ExportOutcome> {
  const outcome = emptyOutcome()
  if (!creds.token.trim()) {
    outcome.errors.push('Geen token ingesteld.')
    return outcome
  }

  const usable = contacts.filter((c) => c.email.includes('@'))
  outcome.skipped = contacts.length - usable.length

  const orgCache = new Map<string, number | null>()
  const errors: string[] = []

  const results = await mapWithConcurrency<ExportContact, PersonOutcome>(
    usable,
    CONCURRENCY,
    async (contact) => {
      try {
        const orgId = contact.company
          ? await ensureOrganizationId(creds, contact.company, orgCache)
          : null

        const payload: Record<string, unknown> = {
          name: contact.fullName || contact.email,
          email: [{ value: contact.email, primary: true, label: 'work' }],
        }
        if (contact.phone) {
          payload.phone = [{ value: contact.phone, primary: true, label: 'work' }]
        }
        if (orgId !== null) payload.org_id = orgId

        const existingId = await findPersonIdByEmail(creds, contact.email)
        const res = existingId
          ? await request(creds, `/persons/${existingId}`, {
              method: 'PUT',
              body: JSON.stringify(payload),
            })
          : await request(creds, '/persons', {
              method: 'POST',
              body: JSON.stringify(payload),
            })

        if (!res.ok) {
          if (errors.length < 5) {
            errors.push(`${contact.email}: ${describeStatus(res.status, res.body, res.raw)}`)
          }
          return 'failed'
        }
        return existingId ? 'updated' : 'created'
      } catch (err) {
        const message = err instanceof Error ? err.message : 'onbekende fout'
        if (errors.length < 5) errors.push(`${contact.email}: ${message}`)
        return 'failed'
      }
    }
  )

  const created = results.filter((r) => r === 'created').length
  const updated = results.filter((r) => r === 'updated').length
  outcome.processed = created + updated
  outcome.failed = results.filter((r) => r === 'failed').length
  outcome.errors = errors
  outcome.detail =
    outcome.processed > 0 ? `${created} nieuw, ${updated} bijgewerkt` : null
  return outcome
}
