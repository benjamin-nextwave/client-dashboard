// =============================================================================
// Rompslomp-koppeling — UITSLUITEND LEZEN
// =============================================================================
// Deze module is de enige plek waar het dashboard met Rompslomp praat, en hij
// kan per constructie niets anders dan ophalen:
//
//   * `rompslompGet` zet `method: 'GET'` zelf en accepteert geen methode en
//     geen body als parameter. Er is geen route waarlangs een aanroeper een
//     POST, PUT, PATCH of DELETE de deur uit krijgt.
//   * Er wordt geen tweede exportfunctie aangeboden die wel mag schrijven.
//   * Het pad wordt gecontroleerd voordat er iets verstuurd wordt.
//
// Wil je hier ooit een schrijfactie bij, dan is dat een bewuste verbouwing van
// dit bestand — niet iets dat er per ongeluk bij glipt.
//
// De harde grendel zit trouwens niet hier maar in Rompslomp zelf: geef het
// API-token alleen leesrechten. Code kun je veranderen, tokenrechten niet
// vanaf deze kant.
//
// Alleen server-side te gebruiken: het token staat in een omgevingsvariabele
// zonder NEXT_PUBLIC_-prefix en is in de browser dus leeg.
// =============================================================================

const BASE_URL = 'https://api.rompslomp.nl/api/v1'
const TIMEOUT_MS = 12_000

/** Hoe lang een opgehaald antwoord hergebruikt mag worden (seconden). */
const CACHE_SECONDS = 300

export type RompslompResult<T> = { ok: true; value: T } | { ok: false; error: string }

export function getRompslompToken(): string | null {
  const token = process.env.ROMPSLOMP_API_TOKEN?.trim()
  return token && token.length > 0 ? token : null
}

export function getConfiguredCompanyId(): string | null {
  const id = process.env.ROMPSLOMP_COMPANY_ID?.trim()
  return id && id.length > 0 ? id : null
}

export function isRompslompConfigured(): boolean {
  return getRompslompToken() !== null
}

/**
 * Haalt één pad op onder de Rompslomp-basis-URL. `path` is relatief, begint
 * met een slash en mag geen eigen host bevatten — dat laatste wordt hier
 * afgedwongen zodat een samengesteld pad nooit naar een andere server kan
 * wijzen.
 */
export async function rompslompGet<T>(
  path: string,
  query?: Record<string, string | number | undefined>
): Promise<RompslompResult<T>> {
  const token = getRompslompToken()
  if (!token) {
    return { ok: false, error: 'Geen ROMPSLOMP_API_TOKEN ingesteld.' }
  }

  if (!path.startsWith('/') || path.startsWith('//')) {
    return { ok: false, error: `Ongeldig pad: ${path}` }
  }

  const url = new URL(BASE_URL + path)
  if (url.origin !== new URL(BASE_URL).origin) {
    return { ok: false, error: 'Pad wijst buiten de Rompslomp-API.' }
  }
  for (const [key, value] of Object.entries(query ?? {})) {
    if (value !== undefined) url.searchParams.set(key, String(value))
  }

  const controller = new AbortController()
  const timer = setTimeout(() => controller.abort(), TIMEOUT_MS)

  try {
    const response = await fetch(url, {
      method: 'GET',
      headers: {
        Authorization: `Bearer ${token}`,
        Accept: 'application/json',
      },
      signal: controller.signal,
      next: { revalidate: CACHE_SECONDS },
    })

    if (!response.ok) {
      const detail = await response.text().catch(() => '')
      console.log(
        `[rompslomp:get] path=${path} status=${response.status} result=error`
      )
      return {
        ok: false,
        error: `Rompslomp gaf ${response.status}${detail ? `: ${detail.slice(0, 200)}` : ''}`,
      }
    }

    const value = (await response.json()) as T
    console.log(`[rompslomp:get] path=${path} status=${response.status} result=success`)
    return { ok: true, value }
  } catch (error) {
    const message =
      error instanceof Error && error.name === 'AbortError'
        ? `Rompslomp reageerde niet binnen ${TIMEOUT_MS / 1000} seconden.`
        : error instanceof Error
          ? error.message
          : 'Onbekende fout bij het benaderen van Rompslomp.'
    console.log(`[rompslomp:get] path=${path} result=error`)
    return { ok: false, error: message }
  } finally {
    clearTimeout(timer)
  }
}

interface MeResponse {
  companies?: Array<{ id?: number | string; name?: string }>
  company_ids?: Array<number | string>
}

export interface RompslompCompany {
  id: string
  name: string
}

/** De administraties waar dit token bij mag. Ook de bron voor het bedrijfsnummer. */
export async function getCompanies(): Promise<RompslompResult<RompslompCompany[]>> {
  const result = await rompslompGet<MeResponse>('/me')
  if (!result.ok) return result

  const raw = result.value
  const companies: RompslompCompany[] = []

  for (const c of raw.companies ?? []) {
    if (c.id === undefined) continue
    companies.push({ id: String(c.id), name: c.name ?? `Administratie ${c.id}` })
  }
  // Sommige antwoorden geven alleen nummers terug.
  if (companies.length === 0) {
    for (const id of raw.company_ids ?? []) {
      companies.push({ id: String(id), name: `Administratie ${id}` })
    }
  }

  return { ok: true, value: companies }
}

/**
 * Het bedrijfsnummer waarmee gewerkt wordt: uit de omgeving als die gezet is,
 * anders de eerste administratie waar het token bij mag.
 */
export async function resolveCompanyId(): Promise<RompslompResult<string>> {
  const configured = getConfiguredCompanyId()
  if (configured) return { ok: true, value: configured }

  const companies = await getCompanies()
  if (!companies.ok) return companies
  if (companies.value.length === 0) {
    return { ok: false, error: 'Dit token heeft geen toegang tot een administratie.' }
  }
  return { ok: true, value: companies.value[0].id }
}
