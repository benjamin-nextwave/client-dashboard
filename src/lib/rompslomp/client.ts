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

/**
 * Cachelabel op alle Rompslomp-verzoeken. Met `revalidateTag` hierop gooit de
 * verversknop in het financieel overzicht de opgeslagen antwoorden weg, zodat
 * een net geboekte uitgave meteen zichtbaar wordt in plaats van na vijf minuten.
 */
export const ROMPSLOMP_CACHE_TAG = 'rompslomp'

export type RompslompResult<T> = { ok: true; value: T } | { ok: false; error: string }

/**
 * Welk token er gebruikt wordt.
 *
 *   default   ROMPSLOMP_API_TOKEN — het token voor uitgaven
 *   invoices  ROMPSLOMP_INVOICES_API_TOKEN — apart token met leesrecht op
 *             uitgaande facturen, zodat het uitgaven-token niet opgerekt hoeft
 *             te worden. Ontbreekt hij, dan valt hij terug op het andere.
 */
export type TokenKind = 'default' | 'invoices'

export function getRompslompToken(kind: TokenKind = 'default'): string | null {
  const eigen =
    kind === 'invoices' ? process.env.ROMPSLOMP_INVOICES_API_TOKEN?.trim() : undefined
  if (eigen && eigen.length > 0) return eigen

  const token = process.env.ROMPSLOMP_API_TOKEN?.trim()
  return token && token.length > 0 ? token : null
}

/**
 * Welk token er feitelijk gepakt is. Staat in de foutmelding, zodat een 403 over
 * ontbrekende rechten meteen laat zien of het aan de sleutel ligt of aan de
 * rechten van die sleutel — anders zoek je dat op de tast.
 */
export function describeTokenSource(kind: TokenKind = 'default'): string {
  if (kind === 'invoices') {
    const eigen = process.env.ROMPSLOMP_INVOICES_API_TOKEN?.trim()
    if (eigen && eigen.length > 0) return 'ROMPSLOMP_INVOICES_API_TOKEN'
    return 'ROMPSLOMP_API_TOKEN (ROMPSLOMP_INVOICES_API_TOKEN is niet ingesteld)'
  }
  return 'ROMPSLOMP_API_TOKEN'
}

export function getConfiguredCompanyId(): string | null {
  const id = process.env.ROMPSLOMP_COMPANY_ID?.trim()
  return id && id.length > 0 ? id : null
}

export function isRompslompConfigured(kind: TokenKind = 'default'): boolean {
  return getRompslompToken(kind) !== null
}

/**
 * Haalt één pad op onder de Rompslomp-basis-URL. `path` is relatief, begint
 * met een slash en mag geen eigen host bevatten — dat laatste wordt hier
 * afgedwongen zodat een samengesteld pad nooit naar een andere server kan
 * wijzen.
 */
export async function rompslompGet<T>(
  path: string,
  query?: Record<string, string | number | undefined>,
  kind: TokenKind = 'default'
): Promise<RompslompResult<T>> {
  const token = getRompslompToken(kind)
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
      // Facturen halen we altijd vers op. De cachesleutel van Next bevat de
      // Authorization-header niet, dus een antwoord dat met het ene token is
      // opgehaald zou aan het andere token worden teruggegeven — en die cache
      // overleeft een deploy. Een 403 van een verkeerd token bleef daardoor
      // terugkomen nadat het goede token er allang stond.
      ...(kind === 'invoices'
        ? { cache: 'no-store' as const }
        : { next: { revalidate: CACHE_SECONDS, tags: [ROMPSLOMP_CACHE_TAG] } }),
    })

    if (!response.ok) {
      const detail = await response.text().catch(() => '')
      console.log(
        `[rompslomp:get] path=${path} status=${response.status} result=error`
      )
      return {
        ok: false,
        error:
          `Rompslomp gaf ${response.status}${detail ? `: ${detail.slice(0, 200)}` : ''}` +
          ` — gebruikt token: ${describeTokenSource(kind)}`,
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

interface CompaniesResponse {
  companies?: Array<{
    id?: number | string
    name?: string
    access_control?: { api_accessible?: boolean; allowed_scopes?: string[] }
  }>
}

export interface RompslompCompany {
  id: string
  name: string
  /** Rechten die dít token op deze administratie heeft. */
  scopes: string[]
}

/**
 * De administraties waar dit token bij mag, plus de rechten per administratie.
 *
 * Bewust `/companies` en niet `/me`: die tweede vereist de aparte scope
 * `read:me`, die een token met alleen uitgaven-rechten niet heeft. `/companies`
 * valt onder de basisscope `public` en werkt dus altijd.
 */
export async function getCompanies(): Promise<RompslompResult<RompslompCompany[]>> {
  const result = await rompslompGet<CompaniesResponse>('/companies')
  if (!result.ok) return result

  const companies: RompslompCompany[] = []
  for (const c of result.value.companies ?? []) {
    if (c.id === undefined) continue
    companies.push({
      id: String(c.id),
      name: c.name ?? `Administratie ${c.id}`,
      scopes: c.access_control?.allowed_scopes ?? [],
    })
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
