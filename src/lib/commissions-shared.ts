// Client-veilige commissie-helpers, constanten en types. Bevat GEEN server-
// only imports (geen supabase), zodat zowel client- als servercomponenten
// hieruit kunnen importeren. De server-datalaag (lib/data/commissions.ts)
// herexporteert deze waarden voor het gemak.

// De vaste dagkosten van €20 en de losse kantoorpost van €1.200 zijn vervallen:
// kosten komen sinds de Rompslomp-koppeling uit de boekhouding zelf, zodat er
// maar één plek is waar ze vandaan komen.

// Salaris: een vast maandbedrag per persoon, dat na de uitgaven van het
// resultaat af gaat. Bewust hier als constante en niet in de boekhouding
// opgezocht — het is een afspraak over wat er maximaal uitgekeerd wordt, geen
// geboekte kostenpost.
export const MONTHLY_SALARY_CENTS = 100000

/** Aantal personen dat salaris krijgt; het bedrijfsaccount telt niet mee. */
export const SALARY_HEADCOUNT = 3

/**
 * Aantal kalendermaanden dat een periode aanraakt, grenzen inclusief. Een
 * periode van 1 t/m 12 augustus raakt één maand; 15 juli t/m 3 augustus raakt
 * er twee. Elke aangeraakte maand telt voor een vol maandsalaris.
 */
export function countTouchedMonths(from: string, to: string): number {
  const [fy, fm] = from.split('-').map(Number)
  const [ty, tm] = to.split('-').map(Number)
  if (!fy || !fm || !ty || !tm) return 0
  const months = (ty - fy) * 12 + (tm - fm) + 1
  return months > 0 ? months : 0
}

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

/**
 * Is de gegeven datum (YYYY-MM-DD) een werkdag (ma–vr)? Weekenddagen (za/zo)
 * tellen geen dagkosten. Parse't de datum als kalenderdatum (UTC-middernacht)
 * zodat er geen tijdzone-verschuiving optreedt bij het bepalen van de weekdag.
 */
export function isWeekday(dateStr: string): boolean {
  const [y, m, d] = dateStr.split('-').map(Number)
  if (!y || !m || !d) return true
  const day = new Date(Date.UTC(y, m - 1, d)).getUTCDay() // 0 = zo, 6 = za
  return day !== 0 && day !== 6
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
