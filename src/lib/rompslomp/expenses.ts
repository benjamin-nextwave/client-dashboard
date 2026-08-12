import { rompslompGet, resolveCompanyId, type RompslompResult } from './client'

// Uitgaven ophalen uit Rompslomp. Alleen lezen — zie de toelichting in client.ts.
//
// De vorm hieronder is afgeleid uit de echte API-respons (geverifieerd
// 12 aug 2026 op de administratie Nextwave Solutions, 625 boekingen):
//
//   { "expenses": [ { id, date, state, currency, invoice_number,
//                     type_account: { path_name, type },
//                     cached_contact: { name },
//                     invoice_lines: [ { description, price_per_unit,
//                                        price_with_vat, price_without_vat,
//                                        vat_amount, quantity } ] } ] }
//
// Twee dingen om te weten:
//
//   * Een uitgave heeft GEEN totaalveld. Het bedrag komt altijd uit de
//     factuurregels. Bedragen zijn strings ("39.53").
//   * Er wordt gerekend met het bedrag EXCLUSIEF btw. Nextwave is btw-plichtig,
//     dus de btw op inkopen wordt teruggevorderd en is geen kostenpost. De
//     commissies aan de opbrengstenkant zijn eveneens exclusief btw, dus de
//     twee kanten zijn vergelijkbaar. Wil je toch inclusief rekenen, dan is
//     `AMOUNT_FIELD` hieronder de enige plek die verandert.
//
// Herkent de uitlezer een bedrag of datum niet, dan telt die boeking níét
// stilzwijgend als nul mee: hij wordt overgeslagen en geteld, zodat het
// overzicht kan waarschuwen dat het totaal onvolledig is.

export interface RompslompExpense {
  id: string
  date: string
  description: string
  supplier: string
  /** Rekening waarop geboekt is, bv. "Kosten • Overige kosten • Abonnementen". */
  category: string
  amountCents: number
}

export interface ExpenseTotals {
  from: string
  to: string
  expenses: RompslompExpense[]
  totalCents: number
  /** Rijen waarvan bedrag of datum niet te lezen was. */
  skipped: number
}

const PAGE_SIZE = 100
const MAX_PAGES = 60

/**
 * Welk regelbedrag telt als kosten. 'price_without_vat' = exclusief btw; zet
 * dit op 'price_with_vat' om inclusief te rekenen.
 */
const AMOUNT_FIELD = 'price_without_vat' as const

/** Alleen definitieve boekingen tellen mee; een concept is nog geen uitgave. */
const COUNTED_STATES = new Set(['published'])

function asRecord(value: unknown): Record<string, unknown> {
  return typeof value === 'object' && value !== null ? (value as Record<string, unknown>) : {}
}

/** Leest een bedrag dat als getal of als string ("123.45") kan binnenkomen. */
function toCents(value: unknown): number | null {
  if (typeof value === 'number' && Number.isFinite(value)) return Math.round(value * 100)
  if (typeof value === 'string') {
    const normalized = value.trim().replace(/\s/g, '').replace(',', '.')
    if (normalized.length === 0) return null
    const parsed = Number(normalized)
    if (Number.isFinite(parsed)) return Math.round(parsed * 100)
  }
  return null
}

/**
 * Telt de factuurregels op. Het regelbedrag staat in `price_without_vat` /
 * `price_with_vat`; dat is het totaal van de regel, niet de stukprijs. Alleen
 * als beide ontbreken wordt teruggevallen op stukprijs × aantal.
 */
function sumInvoiceLines(raw: Record<string, unknown>): number | null {
  const lines = raw.invoice_lines
  if (!Array.isArray(lines) || lines.length === 0) return null

  let total = 0
  let found = false
  for (const entry of lines) {
    const line = asRecord(entry)

    const lineTotal = toCents(line[AMOUNT_FIELD])
    if (lineTotal !== null) {
      total += lineTotal
      found = true
      continue
    }

    const perUnit = toCents(line.price_per_unit)
    if (perUnit !== null) {
      const quantity = Number(line.quantity)
      total += Math.round(perUnit * (Number.isFinite(quantity) && quantity !== 0 ? quantity : 1))
      found = true
    }
  }
  return found ? total : null
}

function readExpense(entry: unknown): RompslompExpense | null {
  const raw = asRecord(entry)

  // Concepten zijn nog geen uitgave.
  const state = typeof raw.state === 'string' ? raw.state : ''
  if (state.length > 0 && !COUNTED_STATES.has(state)) return null

  // Een uitgave heeft geen totaalveld; het bedrag komt uit de regels.
  const amountCents = sumInvoiceLines(raw)
  if (amountCents === null) return null

  const rawDate = raw.date
  if (typeof rawDate !== 'string' || !/^\d{4}-\d{2}-\d{2}/.test(rawDate)) return null
  const date = rawDate.slice(0, 10)

  const contact = asRecord(raw.cached_contact ?? raw.contact)
  const supplier = typeof contact.name === 'string' ? contact.name.trim() : ''

  const firstLine = Array.isArray(raw.invoice_lines) ? asRecord(raw.invoice_lines[0]) : {}
  const description =
    typeof firstLine.description === 'string' && firstLine.description.trim().length > 0
      ? firstLine.description.trim()
      : typeof raw.invoice_number === 'string'
        ? raw.invoice_number
        : ''

  const account = asRecord(raw.type_account)
  const category = typeof account.path_name === 'string' ? account.path_name : ''

  return {
    id: String(raw.id ?? `${date}-${amountCents}`),
    date,
    description,
    supplier,
    category,
    // Een creditnota komt negatief binnen en drukt zo het totaal.
    amountCents,
  }
}

/** Haalt de lijst uitgaven op; loopt door de pagina's tot er niets meer komt. */
async function fetchAllExpenses(companyId: string): Promise<RompslompResult<unknown[]>> {
  const collected: unknown[] = []

  for (let page = 1; page <= MAX_PAGES; page++) {
    const result = await rompslompGet<unknown>(`/companies/${companyId}/expenses`, {
      page,
      per_page: PAGE_SIZE,
    })
    if (!result.ok) return result

    // Het antwoord is een lijst, of een object met de lijst onder een sleutel.
    const body = result.value
    const items = Array.isArray(body)
      ? body
      : Array.isArray(asRecord(body).expenses)
        ? (asRecord(body).expenses as unknown[])
        : Array.isArray(asRecord(body).data)
          ? (asRecord(body).data as unknown[])
          : null

    if (items === null) {
      return {
        ok: false,
        error: 'Onverwacht antwoord van Rompslomp: geen lijst met uitgaven gevonden.',
      }
    }

    collected.push(...items)
    if (items.length < PAGE_SIZE) break
  }

  return { ok: true, value: collected }
}

/**
 * Alle uitgaven met een datum binnen [from, to], plus het totaal in centen.
 * Er wordt bewust client-side gefilterd: welke datumfilters de API zelf
 * ondersteunt is niet bevestigd, en fout gefilterde cijfers zijn erger dan een
 * paar rijen te veel ophalen.
 */
export async function getExpenseTotals(
  from: string,
  to: string
): Promise<RompslompResult<ExpenseTotals>> {
  const company = await resolveCompanyId()
  if (!company.ok) return company

  const all = await fetchAllExpenses(company.value)
  if (!all.ok) return all

  const expenses: RompslompExpense[] = []
  let skipped = 0

  for (const entry of all.value) {
    const expense = readExpense(entry)
    if (expense === null) {
      skipped += 1
      continue
    }
    if (expense.date < from || expense.date > to) continue
    expenses.push(expense)
  }

  expenses.sort((a, b) => (a.date < b.date ? 1 : a.date > b.date ? -1 : 0))
  const totalCents = expenses.reduce((sum, e) => sum + e.amountCents, 0)

  return { ok: true, value: { from, to, expenses, totalCents, skipped } }
}
