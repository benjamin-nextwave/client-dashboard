import { rompslompGet, resolveCompanyId, type RompslompResult } from './client'

// Uitgaven ophalen uit Rompslomp. Alleen lezen — zie de toelichting in client.ts.
//
// De Swagger-spec van Rompslomp beschrijft wél een Expense-object, maar was te
// groot om er de exacte veldnamen van bedrag en datum uit te bevestigen. Daarom
// leest `readExpense` hieronder tolerant: het probeert een aantal gangbare
// namen en telt anders de factuurregels op. Herkent hij een bedrag niet, dan
// levert hij null en telt die uitgave níét stilzwijgend als nul mee — de
// aanroeper krijgt te horen hoeveel rijen zijn overgeslagen.

export interface RompslompExpense {
  id: string
  date: string
  description: string
  supplier: string
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
const MAX_PAGES = 25

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

const AMOUNT_FIELDS = [
  'total_including_vat',
  'total_incl_vat',
  'amount_including_vat',
  'total_amount',
  'total',
  'amount',
  'price_including_vat',
]

const DATE_FIELDS = ['date', 'invoice_date', 'booked_at', 'created_at']

/** Telt de factuurregels op als er geen totaalveld herkend wordt. */
function sumInvoiceLines(raw: Record<string, unknown>): number | null {
  const lines = raw.invoice_lines
  if (!Array.isArray(lines) || lines.length === 0) return null

  let total = 0
  let found = false
  for (const entry of lines) {
    const line = asRecord(entry)
    const lineTotal =
      toCents(line.total_including_vat) ??
      toCents(line.total_incl_vat) ??
      toCents(line.total) ??
      toCents(line.amount)
    if (lineTotal !== null) {
      total += lineTotal
      found = true
      continue
    }
    // Geen regeltotaal: dan zelf prijs × aantal.
    const price = toCents(line.price) ?? toCents(line.unit_price)
    const quantity = typeof line.quantity === 'number' ? line.quantity : 1
    if (price !== null) {
      total += Math.round(price * quantity)
      found = true
    }
  }
  return found ? total : null
}

function readExpense(entry: unknown): RompslompExpense | null {
  const raw = asRecord(entry)

  let amountCents: number | null = null
  for (const field of AMOUNT_FIELDS) {
    amountCents = toCents(raw[field])
    if (amountCents !== null) break
  }
  if (amountCents === null) amountCents = sumInvoiceLines(raw)
  if (amountCents === null) return null

  let date: string | null = null
  for (const field of DATE_FIELDS) {
    const value = raw[field]
    if (typeof value === 'string' && /^\d{4}-\d{2}-\d{2}/.test(value)) {
      date = value.slice(0, 10)
      break
    }
  }
  if (date === null) return null

  const contact = asRecord(raw.cached_contact ?? raw.contact)
  const supplier =
    typeof contact.name === 'string'
      ? contact.name
      : typeof contact.company_name === 'string'
        ? contact.company_name
        : ''

  const description =
    typeof raw.description === 'string' && raw.description.trim().length > 0
      ? raw.description
      : typeof raw.invoice_number === 'string'
        ? raw.invoice_number
        : ''

  return {
    id: String(raw.id ?? `${date}-${amountCents}`),
    date,
    description,
    supplier,
    // Een creditnota kan negatief binnenkomen; die hoort het totaal te drukken.
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
