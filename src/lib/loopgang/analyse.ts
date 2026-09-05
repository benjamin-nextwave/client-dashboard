import { generateObject } from 'ai'
import { anthropic } from '@ai-sdk/anthropic'
import { z } from 'zod'
import { formatEuroCents } from '@/lib/commissions-shared'
import type { LoopgangOverview, LoopgangOverviewClient } from '@/lib/data/loopgang-overview'
import { INVOICE_WORKDAY, MEETING_WORKDAY, PAYMENT_TERM_DAYS, daysBetween } from './cycle'

/**
 * Vat de loopgang samen in vier bakken: spoed, actie ondernemen, opletten, goed.
 *
 * Waarom hier een model en niet alleen een sortering: de cyclus levert losse
 * signalen (werkdag 22, factuur 6 dagen open, gepauzeerd sinds 22 augustus) en
 * die zeggen los van elkaar weinig. Wat je wil weten is wat er vandaag moet
 * gebeuren en waarom — en dat is het samenvoegen van signalen tot één zin per
 * klant.
 *
 * Wat het model NIET doet is rekenen. Alle datums, bedragen, werkdagen en
 * meldingen worden hieronder uitgerekend en als feiten meegegeven. Het model
 * kiest de bak en schrijft de toelichting. Zo kan een verkeerd getal er niet
 * insluipen, en blijft de uitkomst controleerbaar tegen wat de kalender toont.
 */

// Categoriseren op een lange lijst regels met randgevallen (een meeting die
// botst met de factuurdatum) is instructie-opvolging, geen snelheidswerk.
const MODEL = process.env.LOOPGANG_ANALYSE_MODEL || 'claude-opus-5'

export const CATEGORIEEN = ['spoed', 'actie', 'opletten', 'goed'] as const
export type Categorie = (typeof CATEGORIEEN)[number]

const schema = z.object({
  koptekst: z
    .string()
    .describe(
      'Eén zin die de stand van vandaag samenvat. Noem het aantal klanten dat aandacht vraagt en het zwaarste probleem.'
    ),
  klanten: z.array(
    z.object({
      naam: z.string().describe('De bedrijfsnaam exact zoals hij in de feiten staat.'),
      categorie: z.enum(CATEGORIEEN),
      ernst: z
        .number()
        .min(1)
        .max(3)
        .describe('Binnen spoed: 3 is het ergst, 1 het minst erg. Buiten spoed altijd 1.'),
      regel: z
        .string()
        .describe('Eén korte zin: wat is er aan de hand en wat moet er gebeuren.'),
    })
  ),
})

export interface AnalyseKlant {
  naam: string
  categorie: Categorie
  ernst: number
  regel: string
}

export interface LoopgangAnalyse {
  koptekst: string
  klanten: AnalyseKlant[]
  /** Wanneer de analyse is gemaakt; hij veroudert zodra er iets wordt vastgelegd. */
  gemaaktOp: string
}

export type AnalyseResultaat =
  | { ok: true; analyse: LoopgangAnalyse }
  | { ok: false; error: string }

/**
 * De feiten per klant, als platte tekst. Bewust geen JSON: het model leest dit
 * beter, en wij kunnen in de logs zien wat er precies is voorgelegd.
 */
function beschrijfKlant(c: LoopgangOverviewClient, vandaag: string): string {
  const regels: string[] = []

  regels.push(`Klant: ${c.companyName}`)

  if (c.cycle.anchor) {
    regels.push(
      `  Cyclus: werkdag ${c.cycle.workday} van ${INVOICE_WORKDAY}, gestart ${c.cycle.anchor} (handmatig gezette startdatum).`
    )
    if (c.cycle.invoiceDueDate) {
      const over = daysBetween(vandaag, c.cycle.invoiceDueDate)
      regels.push(
        `  Leadrapportage + factuur moet op ${c.cycle.invoiceDueDate}` +
          (over === 0 ? ' — dat is vandaag.' : over > 0 ? ` — over ${over} dagen.` : ` — ${-over} dagen geleden.`)
      )
    }
    regels.push(
      `  Kix moet vanaf werkdag ${MEETING_WORKDAY} mailen voor de meeting${
        c.cycle.meetingReminderStart ? ` (${c.cycle.meetingReminderStart})` : ''
      }.`
    )
  } else {
    regels.push('  Cyclus: geen startpunt bekend, de teller loopt niet.')
  }

  if (c.meeting) {
    regels.push(
      c.meeting.outcome === 'planned' && c.meeting.meetingDate
        ? `  Evaluatiemeeting staat gepland op ${c.meeting.meetingDate}.`
        : c.meeting.outcome === 'stop'
          ? '  Meeting afgehandeld: de klant stopt.'
          : '  Meeting afgehandeld: doorpakken zonder meeting.'
    )
  } else if (c.cycle.anchor) {
    regels.push('  Evaluatiemeeting is nog niet afgehandeld.')
  }

  if (c.isPaused) {
    const dagen = c.pausedSince ? daysBetween(c.pausedSince, vandaag) : 0
    regels.push(
      `  GEPAUZEERD sinds ${c.pausedSince ?? 'onbekend'} (${dagen} dagen). De cyclus telt zolang niet door.`
    )
    if (c.lastPause?.note) regels.push(`  Notitie bij de pauze: ${c.lastPause.note}`)
  } else if (c.isStalled) {
    regels.push(
      `  STAAT STIL: geen verzending vandaag en niet op ${c.stallWorkdays.join(' en ')}.` +
        (c.lastSendDate ? ` Laatste verzending ${c.lastSendDate}.` : ' Geen verzending gemeten.')
    )
  } else {
    regels.push(
      c.sentOnVolumeDate > 0
        ? `  Draait: ${c.sentOnVolumeDate} mails op ${c.volumeDate} (norm ${c.dailySendTarget}).`
        : `  Draait; vandaag nog niets verstuurd, laatste verzending ${c.lastSendDate ?? 'onbekend'} (norm ${c.dailySendTarget}).`
    )
  }

  if (c.lastInvoice) {
    const open = daysBetween(c.lastInvoice.invoiceDate, vandaag)
    regels.push(
      `  Laatste factuur ${c.lastInvoice.invoiceDate}` +
        (c.lastInvoice.amountCents === null ? '' : ` van ${formatEuroCents(c.lastInvoice.amountCents)}`) +
        (c.lastInvoice.paidAt
          ? `, betaald op ${c.lastInvoice.paidAt}.`
          : `, NIET BETAALD, staat ${open} dagen open (termijn ${PAYMENT_TERM_DAYS} dagen).`)
    )
  } else {
    regels.push('  Er is nog nooit een factuur vastgelegd.')
  }

  if (c.lastLeadReport) regels.push(`  Laatste leadrapportage: ${c.lastLeadReport.reportDate}.`)

  if (c.commissionLeadsSinceAnchor > 0) {
    regels.push(
      `  Deze cyclus ${c.commissionLeadsSinceAnchor} leads, samen ${formatEuroCents(
        c.commissionCentsSinceAnchor
      )}.`
    )
  }

  const ongezond = c.campaigns.filter((x) => x.statusLabel !== 'Actief' && x.statusLabel !== 'Afgerond')
  if (ongezond.length > 0) {
    regels.push(
      `  Campagnes die niet draaien: ${ongezond.map((x) => `${x.name} (${x.statusLabel})`).join(', ')}.`
    )
  }

  if (c.cycle.reminders.length > 0) {
    regels.push(
      `  Signalen uit de cyclus: ${c.cycle.reminders
        .map((r) => `${r.title}${r.detail ? ` — ${r.detail}` : ''} [${r.severity}]`)
        .join(' | ')}`
    )
  }

  if (c.analyticsError) regels.push(`  Let op: cijfers mogelijk onvolledig (${c.analyticsError}).`)

  return regels.join('\n')
}

const SYSTEEM = `Je verdeelt de klanten van een leadgeneratiebureau over vier bakken en schrijft per klant één zin. Je werkt voor de operator die 's ochtends wil weten waar hij vandaag aan moet trekken.

De cyclus die we najagen, per klant, vanaf de startdatum van de campagnemaand:
- werkdag ${MEETING_WORKDAY}: Kix begint te mailen en bellen voor een evaluatiemeeting
- kalenderdag 23 tot 31: de evaluatiemeeting zelf
- werkdag ${INVOICE_WORKDAY}: leadrapportage en factuur de deur uit
- betaaltermijn: ${PAYMENT_TERM_DAYS} dagen na de factuurdatum

Een campagne gaat pas weer live nadat de factuur is verzonden: die factuur bevestigt dat er consensus is over de leadrapportage. Een gepauzeerde klant waarvan de gedraaide periode nog niet gefactureerd is, staat dus stil door ons, niet door hem.

DE VIER BAKKEN

spoed — er loopt iets uit de hand. Een gepauzeerde campagne, een factuur die eruit had moeten zijn, een meeting die al ingepland had moeten zijn, of een factuur die over de betaaltermijn is. Geef hier een ernst:
  3 = geld of livegang staat stil: gepauzeerd terwijl de gedraaide periode niet gefactureerd is, of een factuur die ver over de betaaltermijn is
  2 = een deadline is gepasseerd maar er beweegt nog iets: werkdag ${INVOICE_WORKDAY} voorbij, of de belronde loopt al dagen zonder meeting
  1 = het loopt net achter en is vandaag nog recht te trekken

actie — vandaag of morgen iets doen, maar de klant loopt op schema. De factuur moet vandaag of morgen weg, de meeting valt binnen het venster en moet nu geregeld, de campagne-analyse moet gemaakt.

opletten — binnen enkele dagen komt er iets aan. Een factuurdatum of meetingvenster dat over twee tot vijf dagen valt, of een openstaande factuur die nog binnen de termijn is.

goed — alles is geregeld en er hoeft niets. Dit is normaal in de eerste twee weken van een lopende campagne, en ook als de meeting al staat en die niet botst met de leadrapportage en de factuur. Let op die botsing: staat een meeting op of vlak na de factuurdatum, dan is dat geen "goed" maar "opletten", want de analyse en de rapportage moeten er dan vóór liggen.

REGELS
- Elke klant uit de feiten komt precies één keer terug. Niemand overslaan, niemand verzinnen.
- Gebruik de bedrijfsnaam exact zoals hij in de feiten staat.
- Reken niets zelf uit. Alle datums, bedragen, werkdagen en dagentellingen staan in de feiten; neem ze over. Staat een getal er niet, noem het dan niet.
- Eén zin per klant, Nederlands, zakelijk. Zeg wat er aan de hand is en wat er moet gebeuren, in die volgorde.
- Noem bedragen zoals ze in de feiten staan.
- Geen oordelen over personen, geen aandrangwoorden als "asap" of "zo snel mogelijk". Een datum zegt genoeg.
- Buiten de bak spoed is ernst altijd 1.
- De koptekst is één zin: hoeveel klanten vragen aandacht en wat is het zwaarste dat er speelt.`

export async function analyseerLoopgang(overview: LoopgangOverview): Promise<AnalyseResultaat> {
  if (overview.clients.length === 0) {
    return { ok: false, error: 'Er staan geen klanten in de loopgang om te analyseren.' }
  }
  if (!process.env.ANTHROPIC_API_KEY) {
    return { ok: false, error: 'Er is geen ANTHROPIC_API_KEY ingesteld.' }
  }

  const feiten = overview.clients.map((c) => beschrijfKlant(c, overview.today)).join('\n\n')
  const prompt = `Vandaag is ${overview.today}. Hieronder staan ${overview.clients.length} klanten met hun feiten.\n\n${feiten}`

  let object: z.infer<typeof schema>
  try {
    const result = await generateObject({
      model: anthropic(MODEL),
      schema,
      system: SYSTEEM,
      prompt,
      maxRetries: 2,
    })
    object = result.object
  } catch (err) {
    console.error('[loopgang:analyse] model-aanroep mislukt:', err)
    return { ok: false, error: 'De analyse is mislukt. Probeer het opnieuw.' }
  }

  // Het model mag de bakken kiezen, maar niet bepalen wie er meedoet. Klanten
  // die het overslaat komen alsnog in beeld — een klant die stilzwijgend uit
  // het overzicht valt is precies hoe deze administratie eerder misliep.
  const gezien = new Set<string>()
  const klanten: AnalyseKlant[] = []
  for (const k of object.klanten) {
    const bekend = overview.clients.find((c) => c.companyName === k.naam)
    if (!bekend || gezien.has(k.naam)) continue
    gezien.add(k.naam)
    klanten.push({
      naam: k.naam,
      categorie: k.categorie,
      ernst: k.categorie === 'spoed' ? Math.min(3, Math.max(1, Math.round(k.ernst))) : 1,
      regel: k.regel.trim(),
    })
  }
  for (const c of overview.clients) {
    if (gezien.has(c.companyName)) continue
    klanten.push({
      naam: c.companyName,
      categorie: 'opletten',
      ernst: 1,
      regel: 'Niet meegenomen in de analyse — zelf nalopen.',
    })
  }

  console.log(
    `[loopgang:analyse] klanten=${overview.clients.length} ingedeeld=${gezien.size} model=${MODEL}`
  )

  return {
    ok: true,
    analyse: { koptekst: object.koptekst.trim(), klanten, gemaaktOp: new Date().toISOString() },
  }
}
