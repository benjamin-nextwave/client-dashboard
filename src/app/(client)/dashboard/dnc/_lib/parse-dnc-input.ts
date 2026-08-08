import { z } from 'zod'

/**
 * Parser voor het gecombineerde invoerveld. Vervangt de twee losse formulieren
 * (e-mail én domein): één tekstvak waarin de klant meerdere regels plakt.
 * Een regel die met @ begint — of die alleen een domein is — wordt een
 * domeinvermelding, de rest een adresvermelding.
 *
 * Geeft bewust alleen getallen en waarden terug, geen labels: die komen uit de
 * vertaalbestanden zodat de pagina in alle drie de talen klopt.
 */

export type ParsedKind = 'email' | 'domain' | 'invalid' | 'duplicate'

export interface ParsedLine {
  raw: string
  value: string
  kind: ParsedKind
}

export interface ParseResult {
  lines: ParsedLine[]
  emails: string[]
  domains: string[]
  duplicates: string[]
  invalid: string[]
  /** Wat er daadwerkelijk bij komt — voedt het label op de knop. */
  addCount: number
}

const EMAIL = z.string().email()
const DOMAIN = /^[a-z0-9]([a-z0-9-]*[a-z0-9])?(\.[a-z0-9]([a-z0-9-]*[a-z0-9])?)+$/

export function parseDncInput(input: string, existing: Set<string>): ParseResult {
  const seen = new Set<string>()
  const lines: ParsedLine[] = []

  for (const raw of input.split(/[\n,;]+/)) {
    const trimmed = raw.trim()
    if (!trimmed) continue

    const lower = trimmed.toLowerCase()
    const isDomainSyntax = lower.startsWith('@') || (!lower.includes('@') && DOMAIN.test(lower))
    const value = isDomainSyntax ? lower.replace(/^@/, '') : lower

    let kind: ParsedKind
    if (isDomainSyntax) kind = DOMAIN.test(value) ? 'domain' : 'invalid'
    else kind = EMAIL.safeParse(value).success ? 'email' : 'invalid'

    // Al op de lijst, of twee keer in dezelfde plakactie
    if (kind !== 'invalid' && (existing.has(value) || seen.has(value))) kind = 'duplicate'
    if (kind === 'email' || kind === 'domain') seen.add(value)

    lines.push({ raw: trimmed, value, kind })
  }

  const valuesOf = (k: ParsedKind) => lines.filter((l) => l.kind === k).map((l) => l.value)
  const emails = valuesOf('email')
  const domains = valuesOf('domain')

  return {
    lines,
    emails,
    domains,
    duplicates: valuesOf('duplicate'),
    invalid: lines.filter((l) => l.kind === 'invalid').map((l) => l.raw),
    addCount: emails.length + domains.length,
  }
}
