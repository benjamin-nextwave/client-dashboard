import { generateText } from 'ai'
import { anthropic } from '@ai-sdk/anthropic'
import { createClient } from '@/lib/supabase/server'
import { getClientBranding } from '@/lib/client/get-client-branding'
import { getAssistantSettings } from '@/app/(client)/dashboard/lead-inbox/_lib/assistant'
import {
  buildThreadItems,
  getLeadById,
  getOutboundRepliesForLead,
} from '@/app/(client)/dashboard/lead-inbox/_lib/queries'
import { unescapeLiteralNewlines } from '@/app/(client)/dashboard/lead-inbox/_lib/text'
import { traitInstructions } from '@/lib/lead-inbox/assistant-traits'
import { sliderInstructions } from '@/lib/lead-inbox/assistant-sliders'
import { CLASSIFICATION_LABEL } from '@/app/(client)/dashboard/lead-inbox/_lib/labels'

/**
 * De assistent stelt alléén een antwoord voor. Verzenden gebeurt op een
 * andere plek (sendReply) en pas nadat de gebruiker daarop klikt. Deze route
 * raakt geen enkele mailkoppeling aan.
 */

// Sonnet is hier de keuze boven Haiku: de eigenschappenlijst is lang en moet
// nauwkeurig gevolgd worden. Via een env-variabele te overrulen zonder
// codewijziging, mocht de model-id veranderen.
const MODEL = process.env.ASSISTANT_MODEL || 'claude-sonnet-5'

/** Hoeveel berichten uit de thread meegaan. Genoeg context, geen halve roman. */
const MAX_THREAD_ITEMS = 8
const MAX_BODY_CHARS = 4000

const BASE_PROMPT = `Je schrijft namens een bedrijf een antwoord op een e-mail van een lead uit een koude B2B-mailcampagne.

De lead heeft gereageerd op een wervingsmail. Jouw taak is één concreet antwoord op die reactie te schrijven — niets meer.

Vaste regels:
- Lever alleen de tekst van de e-mail. Geen onderwerpregel, geen uitleg vooraf, geen aanhalingstekens om het geheel.
- Gebruik platte tekst. Geen markdown, geen sterretjes, geen kopjes.
- Verzin nooit feiten, cijfers, prijzen, namen of afspraken. Wat je niet uit de gegevens hieronder kunt halen, laat je weg.
- Schrijf als de afzender zelf. Vermeld nooit dat dit bericht met hulp van een assistent is opgesteld.
- Schrijf standaard in het Nederlands, tenzij hieronder anders staat.`

const rateLimit = new Map<string, { count: number; resetAt: number }>()

function allowRequest(clientId: string): boolean {
  const now = Date.now()
  const entry = rateLimit.get(clientId)
  if (!entry || now > entry.resetAt) {
    rateLimit.set(clientId, { count: 1, resetAt: now + 60_000 })
    return true
  }
  if (entry.count >= 20) return false
  entry.count++
  return true
}

function clip(text: string, max: number): string {
  const cleaned = unescapeLiteralNewlines(text).trim()
  return cleaned.length > max ? `${cleaned.slice(0, max)}\n[…ingekort…]` : cleaned
}

function jsonError(message: string, status: number) {
  return new Response(JSON.stringify({ error: message }), {
    status,
    headers: { 'Content-Type': 'application/json' },
  })
}

export async function POST(req: Request) {
  try {
    const supabase = await createClient()
    const {
      data: { user },
    } = await supabase.auth.getUser()
    if (!user) return jsonError('Niet ingelogd.', 401)

    const branding = await getClientBranding()
    if (!branding?.lead_inbox_visible || !branding.lead_inbox_customer_id) {
      return jsonError('Geen toegang tot de lead-inbox.', 403)
    }

    if (!allowRequest(branding.id)) {
      return jsonError('Te veel verzoeken. Probeer het over een minuut opnieuw.', 429)
    }

    if (!process.env.ANTHROPIC_API_KEY) {
      return jsonError(
        'De antwoord-assistent is nog niet geconfigureerd: ANTHROPIC_API_KEY ontbreekt op de server.',
        503
      )
    }

    const body = (await req.json()) as { leadId?: unknown }
    const leadId = typeof body.leadId === 'string' ? body.leadId : null
    if (!leadId) return jsonError('Geen lead opgegeven.', 400)

    const settings = await getAssistantSettings(branding.id)
    if (!settings.enabled) {
      return jsonError('De antwoord-assistent staat uit.', 400)
    }

    const lead = await getLeadById(branding.lead_inbox_customer_id, leadId)
    if (!lead) return jsonError('Lead niet gevonden.', 404)

    const outbounds = await getOutboundRepliesForLead(
      branding.lead_inbox_customer_id,
      leadId
    )
    const thread = buildThreadItems(lead, outbounds).slice(-MAX_THREAD_ITEMS)

    const lastInbound = [...lead.replies]
      .filter((r) => r.direction !== 'outbound')
      .sort(
        (a, b) =>
          new Date(b.received_at).getTime() - new Date(a.received_at).getTime()
      )[0]

    if (!lastInbound) {
      return jsonError('Er is geen bericht van deze lead om op te antwoorden.', 400)
    }

    // Eerst de schuifregelaars, dan de losse eigenschappen: een eigenschap is
    // specifieker en mag de stand van een regelaar bijsturen.
    const instructions = [
      ...sliderInstructions(settings.sliders),
      ...traitInstructions(settings.traits, settings.customTraits),
    ]

    const context = [
      `Bedrijf van de afzender: ${branding.company_name ?? 'onbekend'}`,
      lead.name ? `Naam van de lead: ${lead.name}` : null,
      `E-mailadres van de lead: ${lead.email}`,
      `Hoe deze reactie is ingedeeld: ${CLASSIFICATION_LABEL[lead.classification]}`,
      branding.meeting_url ? `Agendalink: ${branding.meeting_url}` : null,
    ]
      .filter(Boolean)
      .join('\n')

    const signatureBlock = branding.email_signature?.trim()
      ? `\n\nHandtekening van de afzender, letterlijk over te nemen wanneer daarom gevraagd wordt:\n---\n${branding.email_signature.trim()}\n---`
      : '\n\nEr is geen handtekening ingesteld. Onderteken dan met de naam van het bedrijf.'

    const knowledgeBlock = settings.knowledge.trim()
      ? `\n\nKennisbank van het bedrijf. Dit is de enige bron voor inhoudelijke feiten:\n---\n${settings.knowledge.trim()}\n---`
      : '\n\nEr is geen kennisbank ingevuld. Doe daarom geen inhoudelijke beweringen over prijzen, voorwaarden of resultaten.'

    // Altijd gevuld: de schuifregelaars leveren sowieso vier regels.
    const styleBlock = `\n\nZo wil de afzender dat je schrijft:\n${instructions
      .map((line) => `- ${line}`)
      .join('\n')}`

    const system = `${BASE_PROMPT}\n\nGegevens:\n${context}${signatureBlock}${knowledgeBlock}${styleBlock}`

    const conversation = thread
      .map((item) => {
        const who = item.kind === 'outbound' ? 'De afzender schreef' : 'De lead schreef'
        return `${who} (${new Date(item.occurred_at).toLocaleDateString('nl-NL')}):\n${clip(item.body, MAX_BODY_CHARS)}`
      })
      .join('\n\n---\n\n')

    const prompt = `Dit is het gesprek tot nu toe, oudste bericht eerst:\n\n${conversation}\n\nSchrijf nu het antwoord op het laatste bericht van de lead. Geef alleen de tekst van de e-mail.`

    // Geen temperature meegeven: Sonnet 5 weigert het verzoek met een 400.
    const result = await generateText({
      model: anthropic(MODEL),
      system,
      prompt,
      maxOutputTokens: 1200,
    })

    const draft = result.text.trim()
    if (!draft) return jsonError('De assistent gaf geen antwoord terug.', 502)

    return new Response(JSON.stringify({ body: draft }), {
      status: 200,
      headers: { 'Content-Type': 'application/json' },
    })
  } catch (error) {
    console.error('[lead-inbox assistant] mislukt:', error)

    // Een drukke of tijdelijk onbereikbare API is iets anders dan een verzoek
    // dat nooit gaat lukken. Zonder dat onderscheid blijft een gebruiker op
    // "opnieuw proberen" drukken bij een fout die zichzelf niet oplost.
    const retryable =
      typeof error === 'object' &&
      error !== null &&
      'isRetryable' in error &&
      (error as { isRetryable?: unknown }).isRetryable === true

    return jsonError(
      retryable
        ? 'Het is even te druk. Probeer het zo nog eens.'
        : 'Het opstellen is niet gelukt. Blijft dit gebeuren, laat het ons dan weten.',
      500
    )
  }
}
