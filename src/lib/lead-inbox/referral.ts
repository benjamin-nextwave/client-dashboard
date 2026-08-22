/**
 * Doorverwijzingen: de lead antwoordt dat iemand anders erover gaat.
 *
 * Twee wegen naar het adres van die ander:
 *   1. de lead noemt het adres zelf in zijn antwoord;
 *   2. de lead noemt alleen een naam of functie, en NextWave zoekt de
 *      gegevens op en zet ze in lead_admin_contacts.
 *
 * In beide gevallen geldt dezelfde grendel: er mag nooit naar de
 * oorspronkelijke lead of naar ons eigen verzendadres gemaild worden. Dat
 * is niet theoretisch — in de echte data staat een doorverwijzing naar
 * "Lieke de Groot" zonder adres, met onderaan het algemene info@-adres van
 * hetzelfde bedrijf in de handtekening. Zonder grendel zou dat adres er
 * zomaar uit rollen.
 */

const EMAIL_PATTERN = /^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/

/**
 * Adressen die nooit een doorverwijzing kunnen zijn: automatische
 * postbussen die niemand leest.
 */
const BLOCKED_LOCAL_PARTS = [
  'noreply',
  'no-reply',
  'donotreply',
  'do-not-reply',
  'postmaster',
  'mailer-daemon',
  'bounce',
  'bounces',
  'abuse',
  'spam',
  'unsubscribe',
]

export function normalizeEmail(value: string): string {
  return value.trim().toLowerCase().replace(/^mailto:/, '').replace(/[.,;:>)\]]+$/, '')
}

export type ReferralRejection =
  | 'geen-adres'
  | 'ongeldig'
  | 'zelfde-als-lead'
  | 'ons-eigen-adres'
  | 'automatische-postbus'

export type ReferralCheck =
  | { ok: true; email: string }
  | { ok: false; reason: ReferralRejection }

/**
 * De enige plek waar bepaald wordt of een adres de doorverwijzing mag zijn.
 * Zowel het scherm als de verzendactie lopen hierlangs, zodat een gesleutelde
 * waarde uit de browser niet alsnog bij de oorspronkelijke lead uitkomt.
 */
export function checkReferralEmail(
  candidate: string | null | undefined,
  context: { leadEmail: string; sendingAccount: string | null | undefined }
): ReferralCheck {
  if (!candidate) return { ok: false, reason: 'geen-adres' }

  const email = normalizeEmail(candidate)
  if (!email) return { ok: false, reason: 'geen-adres' }
  if (!EMAIL_PATTERN.test(email)) return { ok: false, reason: 'ongeldig' }

  if (email === normalizeEmail(context.leadEmail)) {
    return { ok: false, reason: 'zelfde-als-lead' }
  }
  if (context.sendingAccount && email === normalizeEmail(context.sendingAccount)) {
    return { ok: false, reason: 'ons-eigen-adres' }
  }

  const local = email.split('@')[0]
  if (BLOCKED_LOCAL_PARTS.some((blocked) => local === blocked)) {
    return { ok: false, reason: 'automatische-postbus' }
  }

  return { ok: true, email }
}

export const REJECTION_TEXT: Record<ReferralRejection, string> = {
  'geen-adres': 'Er is geen e-mailadres opgegeven.',
  ongeldig: 'Dit is geen geldig e-mailadres.',
  'zelfde-als-lead':
    'Dit is het adres van de lead zelf. Een doorverwijzing moet naar iemand anders gaan.',
  'ons-eigen-adres': 'Dit is het verzendadres van de campagne, niet dat van een lead.',
  'automatische-postbus': 'Dit is een automatische postbus waar niemand op antwoordt.',
}

/**
 * Grove voorcontrole vóór er een AI-aanroep gedaan wordt: staat er überhaupt
 * een apenstaartje in het nieuwe deel van de reactie? Zo niet, dan valt er
 * niets te ontleden en scheelt dat een aanroep. Ruim de helft van de
 * doorverwijzingen valt hierin.
 */
export function mightContainEmail(text: string): boolean {
  return newPartOf(text).includes('@')
}

/**
 * Het deel dat de lead zélf getypt heeft, dus zonder de mail van ons die
 * eronder is geciteerd. Alleen daar kan een doorverwijzing in staan.
 */
export function newPartOf(body: string): string {
  return body.split(
    /-{3,}\s*Oorspronkelijk bericht|-{3,}\s*Original Message|_{5,}|^\s*Van:\s|^\s*From:\s/im
  )[0]
}
