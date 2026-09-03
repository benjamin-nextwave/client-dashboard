/**
 * Voorstellen voor het koppelen van een Rompslomp-contact aan een klant.
 *
 * Dit is nadrukkelijk een suggestie en geen automatisme. Van de 56 contacten in
 * Rompslomp matcht ongeveer de helft op naam; de rest factureert onder een
 * statutaire naam of is helemaal geen loopgang-klant. De operator bevestigt dus
 * altijd.
 *
 * Passen er twee klanten even goed, dan komt het voorstel er toch — met de
 * andere namen erbij, zodat zichtbaar is dat er iets te kiezen valt.
 *
 * Puur: geen database, geen fetch.
 */

/** Rechtsvormen en ruis die niets zeggen over wie de klant is. */
const RUIS = /\b(b\.?v\.?|v\.?o\.?f\.?|c\.?v\.?|n\.?v\.?|holding|group|nederland|netherlands|nl|com)\b/g

function normalize(value: string): string {
  return value
    .toLowerCase()
    .replace(/[²³]/g, (c) => (c === '²' ? '2' : '3'))
    .replace(RUIS, ' ')
    .replace(/[^a-z0-9]+/g, ' ')
    .trim()
}

function compact(value: string): string {
  return normalize(value).replace(/ /g, '')
}

export interface MatchCandidate {
  id: string
  name: string
}

export interface MatchSuggestion {
  candidate: MatchCandidate
  /** 1 = namen zijn gelijk na opschonen, lager = zwakkere gelijkenis. */
  score: number
  /**
   * Andere klanten die even goed passen. Meestal leeg. Staat er wel iets in, dan
   * is het voorstel een gok tussen namen die na het weghalen van de rechtsvorm
   * niet meer uit elkaar te houden zijn — "Successr" en "Successr BV". Het
   * voorstel blijft staan, maar het scherm zegt erbij dat er een keuze is.
   */
  alternatives: MatchCandidate[]
}

/**
 * De best passende klant bij een contactnaam, of null als niets genoeg lijkt.
 *
 * De drempel ligt bewust hoog. Een zwakke suggestie die naast een verkeerde
 * klant staat is erger dan geen suggestie: dan klikt iemand hem per ongeluk aan.
 */
export function suggestMatch(
  contactName: string,
  candidates: MatchCandidate[],
  /** Klanten die al gekoppeld zijn; die worden niet nog eens voorgesteld. */
  taken: Set<string> = new Set()
): MatchSuggestion | null {
  const doel = compact(contactName)
  if (doel.length < 3) return null

  let beste: { candidate: MatchCandidate; score: number } | null = null
  let gelijk: MatchCandidate[] = []

  for (const candidate of candidates) {
    if (taken.has(candidate.id)) continue

    const kandidaat = compact(candidate.name)
    if (kandidaat.length < 3) continue

    let score = 0
    if (kandidaat === doel) {
      score = 1
    } else if (doel.startsWith(kandidaat) || kandidaat.startsWith(doel)) {
      // "bicinstitute" tegenover "bicinstituut" valt hier niet onder, maar
      // "newworldmonkeys" tegenover "newworldmonkeyscom" wel.
      score = 0.85 * (Math.min(doel.length, kandidaat.length) / Math.max(doel.length, kandidaat.length))
    } else {
      const gedeeld = sharedWords(normalize(contactName), normalize(candidate.name))
      if (gedeeld > 0) score = 0.6 * gedeeld
    }

    if (score <= 0) continue

    if (beste === null || score > beste.score) {
      beste = { candidate, score }
      gelijk = []
    } else if (score === beste.score) {
      gelijk.push(candidate)
    }
  }

  if (beste === null || beste.score < 0.5) return null
  return { ...beste, alternatives: gelijk }
}

/**
 * Welk deel van de woorden beide namen delen. Woorden van één of twee letters
 * tellen niet mee — die zijn te algemeen om iets te bewijzen.
 */
function sharedWords(a: string, b: string): number {
  const links = new Set(a.split(' ').filter((w) => w.length > 2))
  const rechts = new Set(b.split(' ').filter((w) => w.length > 2))
  if (links.size === 0 || rechts.size === 0) return 0

  let raak = 0
  for (const word of links) if (rechts.has(word)) raak += 1

  return raak / Math.max(links.size, rechts.size)
}
