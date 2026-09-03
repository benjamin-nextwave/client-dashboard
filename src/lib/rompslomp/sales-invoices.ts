import { getConfiguredCompanyId, rompslompGet, type RompslompResult } from './client'

/**
 * Uitgaande facturen uit Rompslomp — uitsluitend lezen.
 *
 * De lijst geeft alles wat de loopgang nodig heeft: het factuurnummer, de datum,
 * wanneer hij is verzonden, of hij betaald is en hoeveel er nog openstaat. De
 * naam van de klant zit er als `cached_contact` bij, dus er is geen recht op de
 * contactenlijst nodig.
 *
 * Wat er níét is: de dag waarop er betaald is. Rompslomp heeft geen endpoint dat
 * betalingen teruggeeft — `/payments` kent alleen POST. `payment_status` zegt
 * dus wél of er betaald is, niet wanneer.
 */

/** Alleen gepubliceerde facturen; concepten zijn nog niet verstuurd. */
const SELECTION = 'published'

/** Rompslomp geeft maximaal 100 regels per pagina. */
const PER_PAGE = 100

/** Hoeveel pagina's er hooguit worden opgehaald; 20 x 100 dekt jaren. */
const MAX_PAGES = 20

interface RawInvoice {
  id: number
  date: string
  due_date: string | null
  invoice_number: string | null
  published_at: string | null
  payment_status: 'paid' | 'unpaid' | 'overpaid' | null
  open_amount: string | null
  price_with_vat: string | null
  price_without_vat: string | null
  contact_id: number | null
  cached_contact: { name?: string | null; contact_person_email_address?: string | null } | null
  invoice_lines?: { description?: string | null }[]
}

export interface SalesInvoice {
  id: number
  /** Factuurdatum, niet de verzenddatum. */
  date: string
  /** Wanneer de factuur is gepubliceerd (= verzonden); null bij een concept. */
  publishedAt: string | null
  invoiceNumber: string | null
  contactId: number | null
  contactName: string | null
  /** E-mailadres van de contactpersoon; het domein wijst vaak de klant aan. */
  contactEmail: string | null
  paid: boolean
  /** Bedrag exclusief btw, in centen — zoals de loopgang het bewaart. */
  amountExVatCents: number
  amountIncVatCents: number
  openCents: number
  /** De omschrijving van de eerste factuurregel; die zegt welke periode hij dekt. */
  description: string | null
}

/**
 * Zet een bedrag als "2600.0" om naar centen. Rompslomp levert bedragen als
 * tekst met willekeurige precisie; via een float zou € 1234,56 op 123455 centen
 * kunnen uitkomen.
 */
function toCents(value: string | null | undefined): number {
  if (!value) return 0
  const [heel, deel = ''] = value.trim().split('.')
  const centen = `${deel}00`.slice(0, 2)
  const negatief = heel.startsWith('-')
  const bedrag = Number(heel.replace('-', '')) * 100 + Number(centen)
  return Number.isFinite(bedrag) ? (negatief ? -bedrag : bedrag) : 0
}

function toInvoice(raw: RawInvoice): SalesInvoice {
  return {
    id: raw.id,
    date: String(raw.date).slice(0, 10),
    publishedAt: raw.published_at,
    invoiceNumber: raw.invoice_number,
    contactId: raw.contact_id,
    contactName: raw.cached_contact?.name?.trim() || null,
    contactEmail: raw.cached_contact?.contact_person_email_address?.trim() || null,
    paid: raw.payment_status === 'paid' || raw.payment_status === 'overpaid',
    amountExVatCents: toCents(raw.price_without_vat),
    amountIncVatCents: toCents(raw.price_with_vat),
    openCents: toCents(raw.open_amount),
    description: raw.invoice_lines?.[0]?.description?.trim() || null,
  }
}

/**
 * Alle verstuurde facturen, nieuwste eerst. `from` beperkt het tot facturen
 * vanaf die datum; zonder komt alles mee.
 */
export async function listSalesInvoices(from?: string): Promise<RompslompResult<SalesInvoice[]>> {
  const companyId = getConfiguredCompanyId()
  if (!companyId) {
    return { ok: false, error: 'Geen ROMPSLOMP_COMPANY_ID ingesteld.' }
  }

  const alles: SalesInvoice[] = []

  for (let page = 1; page <= MAX_PAGES; page += 1) {
    const result = await rompslompGet<{ sales_invoices?: RawInvoice[] }>(
      `/companies/${companyId}/sales_invoices`,
      { selection: SELECTION, per_page: PER_PAGE, page, 'search[from]': from },
      // Het uitgaven-token heeft geen recht op facturen; dit is de enige plek
      // waar het factuurtoken voor bedoeld is.
      'invoices'
    )

    if (!result.ok) return result

    const batch = result.value.sales_invoices ?? []
    alles.push(...batch.map(toInvoice))

    if (batch.length < PER_PAGE) break
  }

  console.log(`[rompslomp:facturen] ${alles.length} facturen opgehaald vanaf=${from ?? 'begin'}`)
  return { ok: true, value: alles.sort((a, b) => b.date.localeCompare(a.date)) }
}

export interface RompslompContact {
  id: number
  name: string
  /** E-mailadres van de contactpersoon, als er een bekend is. */
  email: string | null
  /** Hoeveel facturen er op dit contact staan. */
  invoiceCount: number
  /** Datum van de nieuwste factuur. */
  lastInvoiceDate: string
}

/**
 * De contacten waar facturen op staan, afgeleid uit de facturen zelf.
 *
 * Bewust niet uit de contactenlijst van Rompslomp: daarvoor zou het token
 * `manage:contacts` moeten hebben, en dat recht mag ook schrijven. Contacten
 * zonder factuur zijn hier toch niet interessant.
 */
export function contactsFromInvoices(invoices: SalesInvoice[]): RompslompContact[] {
  const map = new Map<number, RompslompContact>()

  for (const invoice of invoices) {
    if (invoice.contactId === null) continue

    const bestaand = map.get(invoice.contactId)
    if (bestaand) {
      bestaand.invoiceCount += 1
      if (!bestaand.email && invoice.contactEmail) bestaand.email = invoice.contactEmail
      if (invoice.date > bestaand.lastInvoiceDate) bestaand.lastInvoiceDate = invoice.date
    } else {
      map.set(invoice.contactId, {
        id: invoice.contactId,
        name: invoice.contactName ?? `Contact ${invoice.contactId}`,
        email: invoice.contactEmail,
        invoiceCount: 1,
        lastInvoiceDate: invoice.date,
      })
    }
  }

  return [...map.values()].sort((a, b) => b.lastInvoiceDate.localeCompare(a.lastInvoiceDate))
}
