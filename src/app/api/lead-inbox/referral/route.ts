import { generateObject, generateText } from 'ai'
import { anthropic } from '@ai-sdk/anthropic'
import { z } from 'zod'
import { createClient } from '@/lib/supabase/server'
import { getClientBranding } from '@/lib/client/get-client-branding'
import { getAdminContactByEmail } from '@/lib/data/lead-admin-contacts'
import {
  buildThreadItems,
  getLeadById,
  getOutboundRepliesForLead,
} from '@/app/(client)/dashboard/lead-inbox/_lib/queries'
import { unescapeLiteralNewlines } from '@/app/(client)/dashboard/lead-inbox/_lib/text'
import { getAssistantSettings } from '@/app/(client)/dashboard/lead-inbox/_lib/assistant'
import { getMailVariants } from '@/lib/data/campaign'
import { sliderInstructions } from '@/lib/lead-inbox/assistant-sliders'
import { traitInstructions } from '@/lib/lead-inbox/assistant-traits'
import {
  checkReferralEmail,
  mightContainEmail,
  newPartOf,
} from '@/lib/lead-inbox/referral'

/**
 * Bereidt het benaderen van een doorverwezen contactpersoon voor. Verstuurt
 * niets: dat doet de serveractie sendReferralOutreach, en pas nadat de
 * gebruiker in het overlay op Verzenden heeft geklikt.
 *
 * Twee stappen, bewust apart:
 *   1. ontleden — welk adres is de doorverwijzing? Klein en goedkoop, draait
 *      zodra de klant de lead opent.
 *   2. opstellen — de mail zelf. Draait pas als er een bruikbaar adres is.
 */

const MODEL = process.env.ASSISTANT_MODEL || 'claude-sonnet-5'
const MAX_BODY_CHARS = 6000

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

function jsonError(message: string, status: number) {
  return new Response(JSON.stringify({ error: message }), {
    status,
    headers: { 'Content-Type': 'application/json' },
  })
}

function json(payload: unknown) {
  return new Response(JSON.stringify(payload), {
    status: 200,
    headers: { 'Content-Type': 'application/json' },
  })
}

const extractionSchema = z.object({
  email: z
    .string()
    .nullable()
    .describe(
      'Het e-mailadres van de persoon naar wie doorverwezen wordt, of null als dat er niet staat.'
    ),
  naam: z
    .string()
    .nullable()
    .describe('De naam van de persoon naar wie doorverwezen wordt, of null.'),
  functie: z
    .string()
    .nullable()
    .describe('De functie of afdeling van die persoon, of null.'),
  toelichting: z
    .string()
    .describe('Eén korte zin: waarop je dit baseert, of waarom er niets te vinden was.'),
})

const EXTRACTION_PROMPT = `Je krijgt het antwoord van een lead op een koude B2B-mail. De lead verwijst door naar iemand anders.

Bepaal naar welk e-mailadres wij moeten schrijven.

Er is maar één vraag die telt: **stuurt de schrijver ons naar dit adres toe?**

Geef het adres WEL terug wanneer de schrijver ons er in zijn eigen tekst naartoe verwijst. Bijvoorbeeld:
- "neem contact op met mijn collega Jan, jan@bedrijf.nl"
- "je kunt hiervoor het beste mailen naar hr@bedrijf.nl"
- "for all running projects please contact info@bedrijf.nl"
- "stuur het even naar planning@bedrijf.nl, die gaan hierover"
Dat het adres van een afdeling of een algemene postbus is (info@, hr@, sales@, planning@) maakt niet uit. Als de schrijver ons daarheen stuurt, is dat het adres dat we zoeken.

Geef NIETS terug (null) wanneer:
- het adres alleen voorkomt als contactgegeven van de schrijver zelf: in de ondertekening, onder zijn naam, in een voettekst, een disclaimer of een adresblok;
- het adres in de geciteerde mail eronder staat — dat is onze eigen mail;
- er alleen een naam of een functie genoemd wordt zonder adres ("ik heb het doorgestuurd naar Lieke de Groot", "mijn collega van P&O pakt dit op"). Vul dan wel naam of functie in.

Let op het verschil: hetzelfde algemene adres kan in de ene mail een doorverwijzing zijn en in de andere alleen maar de voettekst van het bedrijf. Kijk naar de zin eromheen, niet naar het adres zelf.

Twijfel je écht, geef dan null. Een gemist adres kost ons een dag; een verkeerd adres kost een lead.`

/**
 * Beide namen uit de thread. Nodig omdat leads.name in de praktijk altijd
 * leeg is: van 569 doorverwijzingen had er geen enkele een naam staan. De
 * namen staan wél in de tekst — in de ondertekening en in de kopregels van
 * geciteerde berichten ("Van: ... Aan: ...").
 */
const namesSchema = z.object({
  doorverwijzerNaam: z
    .string()
    .nullable()
    .describe('Volledige naam van degene die de doorverwijzing schreef, of null.'),
  doorverwijzerVoornaam: z.string().nullable(),
  doorverwezenNaam: z
    .string()
    .nullable()
    .describe('Volledige naam van de persoon naar wie wordt doorverwezen, of null.'),
  doorverwezenVoornaam: z.string().nullable(),
})

const NAMES_PROMPT = `Je krijgt het mailverkeer rond een doorverwijzing uit een koude B2B-campagne.

Haal er twee namen uit:
1. de schrijver van de doorverwijzing — de persoon die wij hadden gemaild en die zegt dat iemand anders erover gaat;
2. de persoon naar wie hij doorverwijst.

Waar je mag kijken: de ondertekening van de schrijver, de aanhef, de zin waarin hij doorverwijst, en de kopregels van geciteerde berichten ("Van: ... Aan: ...").

Regels:
- Geef alleen echte persoonsnamen. Een afdeling ("P&O", "HR"), een functie ("de facilitair manager") of een bedrijfsnaam is geen naam; geef dan null.
- Haal de twee niet door elkaar. De schrijver is degene die ons antwoordde.
- Weet je het niet zeker, geef null.
- De voornaam is het eerste woord van de naam, zonder aanhef als "dhr." of "mevr.".`

async function extractNames(thread: string) {
  const result = await generateObject({
    model: anthropic(MODEL),
    schema: namesSchema,
    system: NAMES_PROMPT,
    prompt: `Mailverkeer:\n---\n${thread}\n---`,
    maxOutputTokens: 300,
  })
  return result.object
}

/** Eerste woord van een naam, zonder aanhef. */
function firstNameOf(value: string | null | undefined): string | null {
  if (!value) return null
  const parts = value
    .trim()
    .split(/\s+/)
    // Alleen echte aanhefwoorden weghalen. Bewust niet "de": een losse D.
    // is een initiaal en die hoort te blijven staan.
    .filter((p) => !/^(dhr|dhr\.|mevr|mw|mr|drs|ir|dr|heer|mevrouw)\.?$/i.test(p))
  return parts[0] ?? null
}

/** Slaat de gevonden naam op die van de lead zelf? */
function isSelf(
  found: string | null,
  leadName: string | null,
  leadEmail: string
): boolean {
  if (!found) return false
  const clean = (v: string) => v.toLowerCase().replace(/[^a-z]/g, '')
  const target = clean(found)
  if (!target) return false
  if (leadName && clean(leadName) === target) return true
  return clean(leadEmail.split('@')[0]) === target
}

async function extract(bodyText: string) {
  const result = await generateObject({
    model: anthropic(MODEL),
    schema: extractionSchema,
    system: EXTRACTION_PROMPT,
    prompt: `Antwoord van de lead:\n---\n${bodyText}\n---`,
    maxOutputTokens: 400,
  })
  return result.object
}

const COMPOSE_PROMPT = `Je schrijft namens een bedrijf een eerste mail aan iemand naar wie is doorverwezen.

Iemand anders bij dat bedrijf kreeg onze koude mail en zei: hier moet je bij die persoon zijn. Jij schrijft nu die persoon aan.

Waar de inhoud vandaan komt — dit is het belangrijkste:
- De campagne bestaat uit meerdere mails. De eerste bevat de pitch; de mails daarna zijn korte herinneringen in de trant van "ik wilde nog één keer opvolgen". Reageerde de lead op zo'n herinnering, dan staat in de thread dus géén inhoud.
- Staat hieronder een blok "De pitch uit de campagne", gebruik dan díe tekst als inhoud van je mail. Dat is waar het bedrijf de ontvanger mee wil bereiken.
- Staat dat blok er niet, zoek dan in het mailverkeer het oudste en meest inhoudelijke bericht van ons op — niet de laatste. Een herinnering van twee zinnen is geen pitch.
- Vind je nergens inhoud, schrijf dan een korte mail die alleen de doorverwijzing benoemt en vraagt of dit de juiste persoon is. Verzin de propositie niet.
- Neem tijdelijke aanduidingen als {voornaam}, {bedrijfsnaam} of [naam] nooit letterlijk over. Vul ze in met wat je weet, of schrijf de zin anders.

De opening ligt vast:
- Begin met een aanhef gericht aan de doorverwezen persoon bij zijn voornaam, als die hieronder staat. Welke aanhef past ("Beste", "Hoi", "Goedemiddag") volgt uit de schrijfvoorkeuren verderop.
- Noem in de eerste zin de voornaam van degene die doorverwees en dat hij ons naar deze persoon heeft gestuurd. Dus in de trant van: "Hoi Tim, Sander gaf aan dat ik hierover bij jou moet zijn."
- Is een voornaam onbekend, gebruik dan géén e-mailadres als naam. Schrijf dan "een collega" of laat de aanhef algemeen.

Vaste regels:
- Benoem altijd in de eerste twee zinnen dat de ander is doorverwezen en door wie.
- Verwerk de inhoud daarna in lopende tekst, zodat de lezer meteen begrijpt waar het om gaat. Je mag herschrijven zodat het één geheel wordt — het hoeft geen letterlijk citaat te zijn.
- Sluit altijd af met een groet en de handtekening van de afzender zoals die hieronder staat. Alleen wanneer bij de schrijfvoorkeuren uitdrukkelijk staat dat er geen handtekening onder moet, laat je die weg — maar een groet blijft dan wel staan.
- Lever alleen de tekst van de e-mail. Geen onderwerpregel, geen uitleg vooraf, geen aanhalingstekens om het geheel.
- Platte tekst. Geen markdown, geen sterretjes, geen kopjes.
- Verzin nooit feiten, cijfers, prijzen of afspraken.
- Noem nooit een agendalink, boekingslink of webadres, tenzij dat letterlijk in de kennisbank staat.
- Schrijf als de afzender zelf. Vermeld nooit dat dit met hulp van een assistent is opgesteld.`

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

    const payload = (await req.json()) as { leadId?: unknown; step?: unknown }
    const leadId = typeof payload.leadId === 'string' ? payload.leadId : null
    const step = payload.step === 'compose' ? 'compose' : 'analyse'
    if (!leadId) return jsonError('Geen lead opgegeven.', 400)

    // Eén schakelaar voor alles wat de assistent doet. Staat hij uit, dan ook
    // geen doorverwijzingsmail — het scherm verbergt de knop al, maar wie de
    // route rechtstreeks aanroept komt hier niet langs.
    const settings = await getAssistantSettings(branding.id)
    if (!settings.enabled) {
      return jsonError('De antwoord assistent staat uit.', 400)
    }

    const lead = await getLeadById(branding.lead_inbox_customer_id, leadId)
    if (!lead) return jsonError('Lead niet gevonden.', 404)
    if (lead.classification !== 'referral') {
      return jsonError('Deze lead is geen doorverwijzing.', 400)
    }

    const inbound = [...lead.replies]
      .filter((r) => r.direction !== 'outbound')
      .sort(
        (a, b) =>
          new Date(a.received_at).getTime() - new Date(b.received_at).getTime()
      )
    const first = inbound[0]
    if (!first) return jsonError('Er is geen bericht van deze lead.', 400)

    const fullBody = unescapeLiteralNewlines(first.body ?? '').slice(0, MAX_BODY_CHARS)
    const written = newPartOf(fullBody).trim()

    // Wat NextWave heeft opgezocht telt zwaarder dan wat er uit de tekst komt:
    // een mens heeft daarnaar gekeken.
    const adminRecord = await getAdminContactByEmail(branding.id, lead.email)
    const adminContact = adminRecord?.contacts.find((c) => {
      const check = checkReferralEmail(c.email, {
        leadEmail: lead.email,
        sendingAccount: lead.sending_account,
      })
      return check.ok
    })

    let email: string | null = null
    let naam: string | null = adminContact?.name ?? null
    let functie: string | null = adminContact?.jobTitle ?? null
    let bron: 'nextwave' | 'mail' | null = null
    let afgewezen: string | null = null

    if (adminContact?.email) {
      const check = checkReferralEmail(adminContact.email, {
        leadEmail: lead.email,
        sendingAccount: lead.sending_account,
      })
      if (check.ok) {
        email = check.email
        bron = 'nextwave'
      }
    }

    // Alleen ontleden wanneer er iets te ontleden valt. Ruim de helft van de
    // doorverwijzingen bevat geen enkel apenstaartje in het eigen deel.
    if (!email && mightContainEmail(fullBody)) {
      if (!allowRequest(branding.id)) {
        return jsonError('Te veel verzoeken. Probeer het over een minuut opnieuw.', 429)
      }
      if (!process.env.ANTHROPIC_API_KEY) {
        return jsonError(
          'De assistent is nog niet geconfigureerd: ANTHROPIC_API_KEY ontbreekt op de server.',
          503
        )
      }

      const found = await extract(written || fullBody)
      // Bij een vage doorverwijzing ("ik weet niet wie hierover gaat") komt
      // soms de naam van de lead zelf terug. Dan zou het scherm melden dat er
      // naar hem is doorverwezen, wat nergens op slaat.
      naam = naam ?? (isSelf(found.naam, lead.name, lead.email) ? null : found.naam)
      functie = functie ?? found.functie

      const check = checkReferralEmail(found.email, {
        leadEmail: lead.email,
        sendingAccount: lead.sending_account,
      })
      if (check.ok) {
        email = check.email
        bron = 'mail'
      } else if (found.email) {
        afgewezen = found.email
      }
    }

    if (!email) {
      return json({
        status: 'awaiting_contact',
        referredName: naam,
        referredRole: functie,
        rejected: afgewezen,
      })
    }

    if (step === 'analyse') {
      return json({
        status: 'ready',
        toEmail: email,
        source: bron,
        referredName: naam,
        referredRole: functie,
      })
    }

    // ── Opstellen ────────────────────────────────────────────────────────
    if (!allowRequest(branding.id)) {
      return jsonError('Te veel verzoeken. Probeer het over een minuut opnieuw.', 429)
    }
    if (!process.env.ANTHROPIC_API_KEY) {
      return jsonError(
        'De assistent is nog niet geconfigureerd: ANTHROPIC_API_KEY ontbreekt op de server.',
        503
      )
    }

    // De pitch staat in mail 1 van de campagne. De thread bevat alleen de mail
    // waarop deze lead toevallig reageerde, en dat is vaak een herinnering
    // zonder inhoud — vandaar dat we mail 1 er apart bij geven.
    const [variants, outbounds] = await Promise.all([
      getMailVariants(branding.id),
      getOutboundRepliesForLead(branding.lead_inbox_customer_id, leadId),
    ])

    // Heeft de operator een variant aangewezen, dan die. Anders de eerste
    // gepubliceerde mail 1, zodat het ook werkt als niemand iets instelt.
    const usable = variants.filter((v) => v.isPublished && v.body.trim())
    const pitch =
      usable.find((v) => v.useForReferral) ??
      usable
        .filter((v) => v.mailNumber === 1)
        .sort((a, b) => a.position - b.position)[0] ??
      null
    const thread = buildThreadItems(lead, outbounds)
      .map(
        (item) =>
          `${item.kind === 'outbound' ? 'Wij schreven' : 'De lead schreef'}:\n${unescapeLiteralNewlines(
            item.body
          ).slice(0, MAX_BODY_CHARS)}`
      )
      .join('\n\n---\n\n')

    // Namen eerst: de mail opent ermee, dus die moeten er zijn voordat er
    // geschreven wordt.
    const names = await extractNames(thread)

    const referrerName = lead.name?.trim() || names.doorverwijzerNaam
    const referrerFirst = firstNameOf(lead.name) ?? names.doorverwijzerVoornaam

    // Wat NextWave opzocht gaat voor; anders wat er uit de tekst komt. Nooit
    // de doorverwijzer zelf als doorverwezen persoon opvoeren.
    const sameAsReferrer =
      !!names.doorverwezenNaam &&
      !!referrerName &&
      names.doorverwezenNaam.toLowerCase() === referrerName.toLowerCase()

    const referredName = naam ?? (sameAsReferrer ? null : names.doorverwezenNaam)
    const referredFirst =
      firstNameOf(naam) ?? (sameAsReferrer ? null : names.doorverwezenVoornaam)

    const instructions = [
      ...sliderInstructions(settings.sliders),
      ...traitInstructions(settings.traits, settings.customTraits),
    ]

    const signatureBlock = branding.email_signature?.trim()
      ? `\n\nHandtekening van de afzender, letterlijk over te nemen wanneer daarom gevraagd wordt:\n---\n${branding.email_signature.trim()}\n---`
      : '\n\nEr is geen handtekening ingesteld. Onderteken dan met de naam van het bedrijf.'

    const knowledgeBlock = settings.knowledge.trim()
      ? `\n\nKennisbank van het bedrijf. Dit is de enige bron voor inhoudelijke feiten:\n---\n${settings.knowledge.trim()}\n---`
      : '\n\nEr is geen kennisbank ingevuld. Doe daarom geen inhoudelijke beweringen over prijzen, voorwaarden of resultaten.'

    const pitchBlock = pitch
      ? `\n\nDe pitch uit de campagne (mail ${pitch.mailNumber}, "${pitch.variantLabel}"). Dit is de inhoud waar het om gaat:\n---\nOnderwerp: ${pitch.subject}\n\n${pitch.body.trim()}\n---`
      : ''

    const system =
      `${COMPOSE_PROMPT}\n\nGegevens:\n` +
      [
        `Bedrijf van de afzender: ${branding.company_name ?? 'onbekend'}`,
        `Degene die doorverwees: ${referrerName ?? 'naam onbekend'}${
          referrerFirst ? ` — voornaam: ${referrerFirst}` : ''
        }`,
        `Naar wie wordt doorverwezen: ${referredName ?? 'naam onbekend'}${
          referredFirst ? ` — voornaam: ${referredFirst}` : ''
        }${functie ? ` — functie of afdeling: ${functie}` : ''}`,
        `E-mailadres van die persoon: ${email}`,
      ].join('\n') +
      pitchBlock +
      signatureBlock +
      knowledgeBlock +
      `\n\nZo wil de afzender dat je schrijft:\n${instructions.map((l) => `- ${l}`).join('\n')}`

    const [mail, subject] = await Promise.all([
      generateText({
        model: anthropic(MODEL),
        system,
        prompt: `Hieronder staat het hele mailverkeer met degene die doorverwees, zodat je ziet wat er speelde. Let op: dit kan een herinnering zijn in plaats van de pitch.\n\n${thread}\n\nSchrijf nu de mail aan ${referredFirst ?? referredName ?? 'de doorverwezen persoon'}. Geef alleen de tekst van de e-mail.`,
        maxOutputTokens: 1200,
      }),
      generateText({
        model: anthropic(MODEL),
        system:
          'Je bedenkt een onderwerpregel voor een zakelijke e-mail. Lever alleen de onderwerpregel, zonder aanhalingstekens, zonder "Onderwerp:", maximaal acht woorden, in het Nederlands.',
        prompt: `De mail gaat over dit onderwerp: "${first.subject}". Het is een eerste mail aan iemand naar wie is doorverwezen door ${referrerName ?? 'een collega'}. Bedenk de onderwerpregel.`,
        maxOutputTokens: 60,
      }),
    ])

    const bodyText = mail.text.trim()
    if (!bodyText) return jsonError('De assistent gaf geen tekst terug.', 502)

    return json({
      status: 'ready',
      toEmail: email,
      source: bron,
      referredName: referredName,
      referredRole: functie,
      referrerName,
      pitchSource: pitch ? 'mail1' : 'thread',
      pitchLabel: pitch ? `mail ${pitch.mailNumber}, ${pitch.variantLabel}: ${pitch.subject}` : null,
      fromEmail: lead.sending_account,
      subject: subject.text.trim().replace(/^["']|["']$/g, '') || `Doorverwezen door ${lead.name || lead.email}`,
      body: bodyText,
    })
  } catch (error) {
    console.error('[lead-inbox doorverwijzing] mislukt:', error)
    const retryable =
      typeof error === 'object' &&
      error !== null &&
      'isRetryable' in error &&
      (error as { isRetryable?: unknown }).isRetryable === true
    return jsonError(
      retryable
        ? 'Het is even te druk. Probeer het zo nog eens.'
        : 'Het voorbereiden is niet gelukt. Blijft dit gebeuren, laat het ons dan weten.',
      500
    )
  }
}
