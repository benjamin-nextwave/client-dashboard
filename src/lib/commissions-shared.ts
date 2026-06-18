// Client-veilige commissie-helpers, constanten en types. Bevat GEEN server-
// only imports (geen supabase), zodat zowel client- als servercomponenten
// hieruit kunnen importeren. De server-datalaag (lib/data/commissions.ts)
// herexporteert deze waarden voor het gemak.

// Vaste dagkosten per klant per werkdag waarop een avondcontrole is ingevuld.
export const DAILY_COST_CENTS = 2000

/**
 * Standaard commissie-categorieën die als snelkeuze worden aangeboden bij het
 * instellen per klant. Het zijn slechts suggesties: pas wanneer de operator er
 * een toevoegt (met prijs) bestaat de categorie voor die klant.
 */
export const STANDARD_COMMISSION_CATEGORIES: string[] = [
  'Meeting verzoek',
  'Interesse vraag / telefonisch verzoek',
  'Niet nu, misschien later',
  'Bevestigd relevantie zonder actie',
  'Geeft aan dat het mogelijk later relevant is',
  'Interne doorverwijzing',
]

export interface CommissionCategory {
  id: string
  clientId: string
  name: string
  priceCents: number
  position: number
}

/** Huidige datum (YYYY-MM-DD) in de Amsterdamse tijdzone. */
export function amsterdamDateString(date: Date = new Date()): string {
  return new Intl.DateTimeFormat('en-CA', {
    timeZone: 'Europe/Amsterdam',
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
  }).format(date)
}

/** Formatteert centen als euro-bedrag, bv. 1250 → "€ 12,50". */
export function formatEuroCents(cents: number): string {
  return new Intl.NumberFormat('nl-NL', {
    style: 'currency',
    currency: 'EUR',
  }).format(cents / 100)
}

/** Parseert een euro-invoerstring ("12,50" of "12.5") naar centen, of null. */
export function parseEuroToCents(input: string): number | null {
  const trimmed = input.trim().replace(/[€\s]/g, '').replace(',', '.')
  if (trimmed.length === 0) return null
  const value = Number(trimmed)
  if (!Number.isFinite(value) || value < 0) return null
  return Math.round(value * 100)
}
