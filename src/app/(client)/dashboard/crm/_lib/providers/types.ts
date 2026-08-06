import type { CrmStageId } from '../types'

export type CrmProvider = 'hubspot' | 'pipedrive'

/** Wat de browser van een koppeling te zien krijgt — nooit de credentials. */
export type CrmConnectionSummary = {
  id: string
  provider: CrmProvider
  name: string
  /** Gemaskeerde hint van het token, bijv. "pat-…9f2c". */
  tokenHint: string | null
  domain: string | null
  lastExportAt: string | null
  lastExportStatus: 'success' | 'partial' | 'error' | null
  lastExportMessage: string | null
}

export type CrmCredentials = {
  token: string
  /** Alleen Pipedrive: bedrijfsdomein, bijv. "mijnbedrijf". Optioneel. */
  domain?: string
}

/** Genormaliseerd contact zoals wij het naar een extern CRM sturen. */
export type ExportContact = {
  email: string
  fullName: string
  firstName: string | null
  lastName: string | null
  company: string | null
  jobTitle: string | null
  phone: string | null
  website: string | null
  linkedinUrl: string | null
  stage: CrmStageId
  ownerName: string | null
  nextAction: string | null
  notes: string | null
}

export type ExportOutcome = {
  processed: number
  failed: number
  skipped: number
  /** Vrije samenvatting, bijv. "14 nieuw, 6 bijgewerkt". Null als onbekend. */
  detail: string | null
  errors: string[]
}

export type ProviderCheck = { ok: true; account: string } | { ok: false; error: string }

export function emptyOutcome(): ExportOutcome {
  return { processed: 0, failed: 0, skipped: 0, detail: null, errors: [] }
}

/** Splitst een weergavenaam in voor-/achternaam voor CRM's die dat verwachten. */
export function splitName(fullName: string): {
  firstName: string | null
  lastName: string | null
} {
  const parts = fullName.trim().split(/\s+/).filter(Boolean)
  if (parts.length === 0) return { firstName: null, lastName: null }
  if (parts.length === 1) return { firstName: parts[0], lastName: null }
  return {
    firstName: parts[0],
    lastName: parts.slice(1).join(' '),
  }
}

export function chunk<T>(items: T[], size: number): T[][] {
  const out: T[][] = []
  for (let i = 0; i < items.length; i += size) out.push(items.slice(i, i + size))
  return out
}

/** Voert taken uit met een vaste gelijktijdigheid — beschermt tegen rate limits. */
export async function mapWithConcurrency<T, R>(
  items: T[],
  limit: number,
  fn: (item: T) => Promise<R>
): Promise<R[]> {
  const results: R[] = new Array(items.length)
  let cursor = 0

  async function worker(): Promise<void> {
    while (cursor < items.length) {
      const index = cursor++
      results[index] = await fn(items[index])
    }
  }

  const workers = Array.from({ length: Math.min(limit, items.length) }, worker)
  await Promise.all(workers)
  return results
}
