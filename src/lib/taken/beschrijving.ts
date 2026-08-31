import { generateText } from 'ai'
import { anthropic } from '@ai-sdk/anthropic'

/**
 * Zet een vrij ingetypte toelichting om in een feitelijke opsomming.
 *
 * Aanleiding: taken worden soms geformuleerd met een oordeel erin verweven
 * ("hij is boos", "dit moet snel snel"). Wie de taak later oppakt heeft aan dat
 * oordeel niets — die wil weten wat er moet gebeuren. Het model haalt de feiten
 * eruit en laat de rest vallen.
 *
 * Alleen wat hier uitkomt wordt opgeslagen. De ingetypte tekst gaat nergens
 * heen: niet naar de database, niet naar de logs.
 */

// De opdracht is een lange lijst verboden formuleringen streng volgen; daar
// is instructie-opvolging belangrijker dan snelheid. Via een env-variabele te
// overrulen zonder codewijziging, mocht de model-id veranderen.
const MODEL = process.env.TASK_CLEANUP_MODEL || 'claude-opus-5'

export const MAX_INPUT_CHARS = 4000

const PROMPT = `Je zet een ingetypte toelichting bij een werktaak om in een korte, zakelijke lijst van wat er moet gebeuren.

Lever uitsluitend de opsomming. Geen inleiding, geen afsluiting, geen kopje, geen uitleg over wat je gedaan hebt.

Houd het kort. Twee rake punten zijn beter dan vijf halve. Maximaal 5 punten, en alleen zoveel als er echt te doen valt.

Vorm:
- Elke regel begint met "- " en bevat één punt.
- Is het een actie, begin dan met het werkwoord in de infinitief: "Mailvarianten maken", "Klant terugbellen", "Campagne pauzeren". Niet "De mailvarianten worden door Benjamin opgepakt".
- Zo min mogelijk woorden. Laat lijdende vorm, omhaal en vulwoorden weg.
- Neem de woorden uit de invoer over. Staat er "de klant", schrijf dan "de klant" en niet "de betrokkene". Verzin geen abstractere omschrijving dan er staat.
- Nederlands, ook als de invoer een andere taal gebruikt.
- Geen markdown binnen een punt: geen sterretjes, geen kopjes, geen nummering.

Wat je weglaat:
- Elk oordeel, gevoel of stemming, van wie dan ook. Dus niet "hij is boos", "vervelend", "irritant", "gefrustreerd", "balen".
- Elke aandrang of urgentie die niet als afspraak of datum is onderbouwd. Dus niet "snel snel", "asap", "met spoed", "heeft haast". Staat er een concrete datum of deadline, dan neem je die wél op.
- Elke kwalificatie van iemands functioneren of persoon, en elk woord dat een aandoening of eigenschap als maatstaf gebruikt. Dus niet "autistisch goed doen", "netjes voor de verandering", "zoals het hoort".
- Beleefdheidsvormen, aanhef, ondertekening en stopwoorden.
- Overdrijving en nadruk: "heel erg", "echt", "absoluut", "gigantisch".
- Losse mededelingen, achtergrond en toelichting waar niemand iets voor hoeft te doen. Wie de taak oppakt moet weten wat hij moet doen, niet wat er verder nog speelt. Beschrijft een zin een mogelijkheid, een gewoonte of een situatie in plaats van een handeling of een harde voorwaarde, dan laat je hem weg.

Wat je behoudt:
- Wat er concreet moet gebeuren.
- Namen, bedrijven, bedragen, aantallen, data en deadlines, precies zoals ze er staan.
- Voorwaarden waar de uitvoerder zich aan moet houden.

Harde regels:
- Verzin niets. Wat niet in de invoer staat, komt niet in de opsomming. Vul geen namen, data of bedragen aan.
- Trek geen conclusies en geef geen advies.
- Blijft er na het weglaten van oordelen en mededelingen niets over waar iemand iets voor moet doen, antwoord dan exact met: GEEN_FEITEN`

export type CleanupResult =
  | { ok: true; text: string }
  | { ok: false; error: string }

export async function cleanupTaskDescription(raw: string): Promise<CleanupResult> {
  const input = raw.trim()
  if (input.length === 0) return { ok: true, text: '' }
  if (input.length > MAX_INPUT_CHARS) {
    return { ok: false, error: `De toelichting is te lang (max ${MAX_INPUT_CHARS} tekens).` }
  }
  if (!process.env.ANTHROPIC_API_KEY) {
    return { ok: false, error: 'Er is geen ANTHROPIC_API_KEY ingesteld.' }
  }

  let text: string
  try {
    // Geen temperature: die parameter is op de huidige Claude-modellen
    // verwijderd en levert een 400 op.
    const result = await generateText({
      model: anthropic(MODEL),
      system: PROMPT,
      prompt: input,
      maxRetries: 2,
    })
    text = result.text.trim()
  } catch (err) {
    console.error('[taken:beschrijving] model-aanroep mislukt:', err)
    return { ok: false, error: 'Het opschonen van de beschrijving is mislukt. Probeer het opnieuw.' }
  }

  if (text === 'GEEN_FEITEN' || text.length === 0) {
    return {
      ok: false,
      error:
        'Er staat niets feitelijks in de toelichting — alleen oordeel of stemming. Beschrijf wat er moet gebeuren.',
    }
  }

  return { ok: true, text: normalizeBullets(text) }
}

/**
 * Het model levert doorgaans nette regels, maar niet gegarandeerd. Hier maken we
 * er hoe dan ook een opsomming van: één punt per regel, elk beginnend met "- ".
 */
function normalizeBullets(text: string): string {
  const lines = text
    .split(/\r?\n/)
    .map((l) => l.trim())
    .filter((l) => l.length > 0)
    .map((l) => l.replace(/^[-*••]\s*/, '').replace(/^\d+[.)]\s*/, '').trim())
    .filter((l) => l.length > 0)
    .slice(0, 5)

  return lines.map((l) => `- ${l}`).join('\n')
}
