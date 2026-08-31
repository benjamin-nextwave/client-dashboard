import { generateObject } from 'ai'
import { anthropic } from '@ai-sdk/anthropic'
import { z } from 'zod'

/**
 * Zet een vrij ingetypte toelichting om in een taakbeschrijving met twee delen.
 *
 * Aanleiding: taken worden soms geformuleerd met een oordeel erin verweven
 * ("hij is boos", "dit moet snel snel"). Wie de taak later oppakt heeft aan dat
 * oordeel niets.
 *
 * Het onderscheid dat er echt toe doet: een taak wordt hier altijd voor een
 * ánder genoteerd. Schrijft de aanvrager "ik lever de teksten aan", dan is dat
 * geen taak maar een mededeling — hij doet het zelf. Zou dat als taak in de
 * lijst belanden, dan gaat de ontvanger wachten op werk dat hij niet heeft, of
 * werk doen dat al gedaan wordt. Daarom twee gescheiden secties.
 *
 * Alleen wat hier uitkomt wordt opgeslagen. De ingetypte tekst gaat nergens
 * heen: niet naar de database, niet naar de logs.
 */

// De opdracht is een lange lijst regels streng volgen en een subtiel
// onderscheid maken; daar is instructie-opvolging belangrijker dan snelheid.
// Via een env-variabele te overrulen zonder codewijziging.
const MODEL = process.env.TASK_CLEANUP_MODEL || 'claude-opus-5'

export const MAX_INPUT_CHARS = 4000

const MAX_PER_SECTION = 5

const schema = z.object({
  taken: z
    .array(z.string())
    .describe(
      'Wat de ONTVANGER moet doen. Begint met een werkwoord in de infinitief. Leeg als de toelichting niets van de ontvanger vraagt.'
    ),
  mededelingen: z
    .array(z.string())
    .describe(
      'Wat de ontvanger moet weten maar waar hij niets voor hoeft te doen, inclusief alles wat de aanvrager zélf gaat doen. Leeg als er niets te melden is.'
    ),
})

function buildPrompt(assignee?: string, requestedBy?: string): string {
  const wie =
    assignee && requestedBy
      ? `De taak is voor ${assignee}. De toelichting is geschreven door ${requestedBy}. "Ik" in de toelichting is dus ${requestedBy}; de ontvanger is ${assignee}.`
      : 'De toelichting is geschreven door de aanvrager. "Ik" in de toelichting is die aanvrager, niet de ontvanger.'

  return `Je zet een ingetypte toelichting bij een werktaak om in twee korte, zakelijke lijsten: taken en mededelingen.

${wie}

Het onderscheid dat je moet maken:
- TAKEN zijn dingen die de ONTVANGER moet doen. Alleen daar hoort iets in de takenlijst.
- MEDEDELINGEN is al het andere dat de ontvanger moet weten: wat de aanvrager zelf gaat doen, afspraken die al lopen, en context die van belang is.

Let hier goed op, want dit gaat het vaakst mis: staat er "ik lever dit aan", "ik stuur het door", "ik geef het aan hem door", "ik regel dat", dan is dat GEEN taak. De aanvrager doet dat zelf. Dat hoort bij de mededelingen. Zet het nooit als taak neer, want dan gaat de ontvanger wachten op werk dat hij niet heeft of werk doen dat al gedaan wordt.

Vorm van een taak:
- Begin met het werkwoord in de infinitief: "Mailvarianten maken", "Klant terugbellen", "Campagne pauzeren". Niet "De mailvarianten worden door ${assignee ?? 'de ontvanger'} opgepakt".
- Zo min mogelijk woorden. Geen lijdende vorm, geen omhaal.

Vorm van een mededeling:
- Korte zin, in de woorden van de aanvrager. De ik-vorm mag blijven staan: "Ik geef door dat hij bezwaar kan maken".

Voor allebei geldt:
- Houd het kort. Twee rake punten zijn beter dan vijf halve. Hooguit ${MAX_PER_SECTION} per lijst.
- Neem de woorden uit de invoer over. Staat er "de klant", schrijf dan "de klant" en niet "de betrokkene". Verzin geen abstractere omschrijving dan er staat.
- Nederlands, ook als de invoer een andere taal gebruikt.
- Geen opmaak binnen een punt: geen streepje vooraan, geen sterretjes, geen nummering.

Wat je overal weglaat:
- Elk oordeel, gevoel of stemming, van wie dan ook. Dus niet "hij is boos", "vervelend", "irritant", "gefrustreerd", "balen".
- Elke aandrang of urgentie die niet als afspraak of datum is onderbouwd. Dus niet "snel snel", "asap", "met spoed". Staat er een concrete datum of deadline, dan neem je die wél op.
- Elke kwalificatie van iemands functioneren of persoon, en elk woord dat een aandoening of eigenschap als maatstaf gebruikt. Dus niet "autistisch goed doen", "netjes voor de verandering", "zoals het hoort".
- Beleefdheidsvormen, aanhef, ondertekening en stopwoorden.
- Overdrijving en nadruk: "heel erg", "echt", "absoluut", "gigantisch".

Harde regels:
- Verzin niets. Wat niet in de invoer staat, komt er niet in. Vul geen namen, data of bedragen aan.
- Trek geen conclusies en geef geen advies.
- Een lijst mag leeg zijn. Vul hem niet op om hem te vullen.
- Blijft er na het weglaten van oordelen niets over, laat dan beide lijsten leeg.`
}

export interface CleanupContext {
  /** Naam van degene voor wie de taak is. */
  assignee?: string
  /** Naam van degene namens wie de taak wordt aangemaakt. */
  requestedBy?: string
}

export type CleanupResult =
  | { ok: true; text: string }
  | { ok: false; error: string }

export async function cleanupTaskDescription(
  raw: string,
  ctx: CleanupContext = {}
): Promise<CleanupResult> {
  const input = raw.trim()
  if (input.length === 0) return { ok: true, text: '' }
  if (input.length > MAX_INPUT_CHARS) {
    return { ok: false, error: `De toelichting is te lang (max ${MAX_INPUT_CHARS} tekens).` }
  }
  if (!process.env.ANTHROPIC_API_KEY) {
    return { ok: false, error: 'Er is geen ANTHROPIC_API_KEY ingesteld.' }
  }

  let taken: string[]
  let mededelingen: string[]
  try {
    const result = await generateObject({
      model: anthropic(MODEL),
      schema,
      system: buildPrompt(ctx.assignee, ctx.requestedBy),
      prompt: input,
      maxRetries: 2,
    })
    taken = clean(result.object.taken)
    mededelingen = clean(result.object.mededelingen)
  } catch (err) {
    console.error('[taken:beschrijving] model-aanroep mislukt:', err)
    return { ok: false, error: 'Het opschonen van de beschrijving is mislukt. Probeer het opnieuw.' }
  }

  if (taken.length === 0 && mededelingen.length === 0) {
    return {
      ok: false,
      error:
        'Er staat niets bruikbaars in de toelichting — alleen oordeel of stemming. Beschrijf wat er moet gebeuren.',
    }
  }

  const blokken: string[] = []
  if (taken.length > 0) blokken.push(['Taken', ...taken.map((t) => `- ${t}`)].join('\n'))
  if (mededelingen.length > 0) {
    blokken.push(['Mededelingen', ...mededelingen.map((m) => `- ${m}`)].join('\n'))
  }

  return { ok: true, text: blokken.join('\n\n') }
}

/**
 * Het model levert doorgaans nette regels, maar niet gegarandeerd. Een streepje
 * of nummer vooraan zou hier dubbelop komen met het streepje dat wij zetten.
 */
function clean(items: unknown): string[] {
  if (!Array.isArray(items)) return []
  return items
    .filter((i): i is string => typeof i === 'string')
    .map((i) =>
      i
        .trim()
        .replace(/^[-*••]\s*/, '')
        .replace(/^\d+[.)]\s*/, '')
        .trim()
    )
    .filter((i) => i.length > 0)
    .slice(0, MAX_PER_SECTION)
}
