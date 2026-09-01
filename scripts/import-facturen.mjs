/**
 * Leest facturen.xlsx, legt de bedrijfsnamen naast de klanten in de database en
 * rapporteert wat er te importeren valt. Schrijft niets weg zonder --apply.
 *
 * De kolommen van "Factuurregels" zijn per factuur verschillend in aantal, dus
 * vaste kolomnummers werken alleen vóór dat blok. Alles daarna wordt gevonden
 * vanaf het klantnummer (K00051), dat een herkenbare vorm heeft.
 */
import fs from 'node:fs'
import ExcelJS from 'exceljs'

const APPLY = process.argv.includes('--apply')

const env = Object.fromEntries(
  fs
    .readFileSync('.env.local', 'utf8')
    .split('\n')
    .map((line) => line.trim())
    .filter((line) => line && !line.startsWith('#') && line.includes('='))
    .map((line) => {
      const i = line.indexOf('=')
      return [line.slice(0, i), line.slice(i + 1).replace(/^"|"$/g, '')]
    })
)

const SUPABASE_URL = env.NEXT_PUBLIC_SUPABASE_URL
const SERVICE_KEY = env.SUPABASE_SERVICE_ROLE_KEY

async function rest(path, init = {}) {
  const res = await fetch(`${SUPABASE_URL}/rest/v1/${path}`, {
    ...init,
    headers: {
      apikey: SERVICE_KEY,
      Authorization: `Bearer ${SERVICE_KEY}`,
      'Content-Type': 'application/json',
      ...(init.headers ?? {}),
    },
  })
  const text = await res.text()
  if (!res.ok) throw new Error(`${res.status} ${text.slice(0, 300)}`)
  return text ? JSON.parse(text) : null
}

/** Namen vergelijkbaar maken: rechtsvorm, leestekens en accenten eruit. */
function normalize(name) {
  return String(name ?? '')
    .toLowerCase()
    .normalize('NFD')
    .replace(/[̀-ͯ]/g, '')
    .replace(/\b(b\.?v\.?|n\.?v\.?|v\.?o\.?f\.?|holding|group|nederland)\b/g, ' ')
    .replace(/[^a-z0-9]+/g, ' ')
    .trim()
}

/**
 * Zonder spaties, voor namen die alleen in schrijfwijze verschillen:
 * "Fresh-Brains" en "FreshBrains", "Dutchman Media" en "Dutchmanmedia".
 */
function squash(name) {
  return normalize(name).replace(/ /g, '')
}

function cellText(cell) {
  let v = cell.value
  if (v && typeof v === 'object') {
    if (v instanceof Date) return v.toISOString().slice(0, 10)
    if ('text' in v) v = v.text
    else if ('result' in v) v = v.result
    else if ('richText' in v) v = v.richText.map((r) => r.text).join('')
    else v = JSON.stringify(v)
  }
  return v === null || v === undefined ? '' : String(v).trim()
}

function toNumber(text) {
  if (!text) return null
  const cleaned = String(text).replace(/[€\s]/g, '').replace(/\.(?=\d{3}\b)/g, '').replace(',', '.')
  const n = Number(cleaned)
  return Number.isFinite(n) ? n : null
}

const wb = new ExcelJS.Workbook()
await wb.xlsx.readFile('facturen.xlsx')
const ws = wb.worksheets[0]

const rows = []
ws.eachRow({ includeEmpty: false }, (row, n) => {
  if (n === 1) return
  const cells = []
  row.eachCell({ includeEmpty: true }, (cell) => cells.push(cellText(cell)))

  const k = cells.findIndex((c) => /^K\d{4,6}$/.test(c))
  if (k === -1) return

  rows.push({
    rowNumber: n,
    invoiceNumber: cells[0],
    status: cells[1],
    date: cells[2],
    description: cells[3],
    amountExcl: toNumber(cells[4]),
    amountIncl: toNumber(cells[5]),
    customerNumber: cells[k],
    companyName: cells[k + 1],
    dueDate: cells[k + 10],
    paidTotal: toNumber(cells[k + 12]),
  })
})

// Creditfacturen verwijzen in de omschrijving naar het factuurnummer dat ze
// terugdraaien. Ze los importeren kan niet — de tabel staat geen negatief bedrag
// toe — en overslaan zou het openstaande bedrag te hoog laten staan. Dus
// verrekenen tegen de factuur zelf.
const credits = new Map()
const orphanCredits = []
for (const row of rows) {
  if ((row.amountExcl ?? 0) >= 0) continue
  const ref = row.description.match(/factuur:?\s*(\d{6,})/i)?.[1]
  if (!ref) {
    orphanCredits.push({ ...row, reason: 'creditfactuur zonder verwijzing' })
    continue
  }
  credits.set(ref, (credits.get(ref) ?? 0) + row.amountExcl)
}

for (const row of rows) {
  if ((row.amountExcl ?? 0) < 0) continue
  const credit = credits.get(row.invoiceNumber)
  if (credit) {
    row.creditedBy = credit
    row.amountExcl = Math.round((row.amountExcl + credit) * 100) / 100
    row.amountIncl = Math.round(((row.amountIncl ?? 0) + credit * 1.21) * 100) / 100
    credits.delete(row.invoiceNumber)
  }
}

for (const [ref, amount] of credits) {
  orphanCredits.push({
    invoiceNumber: ref,
    companyName: '(verwijzing niet in dit bestand)',
    date: '',
    amountExcl: amount,
    reason: `creditfactuur verwijst naar ${ref}, die staat niet in dit bestand`,
  })
}

const clients = await rest(
  'clients?select=id,company_name,loopgang_visible,is_hidden&order=company_name'
)
const active = clients.filter((c) => !c.is_hidden && c.loopgang_visible !== false)

const byNormalized = new Map()
const bySquashed = new Map()
for (const c of active) {
  byNormalized.set(normalize(c.company_name), c)
  bySquashed.set(squash(c.company_name), c)
}

/**
 * Handmatig bevestigde koppelingen voor namen die te ver uit elkaar liggen om
 * automatisch te durven matchen. Alleen invullen wat de eigenaar heeft bevestigd.
 */
const MANUAL_MATCHES = Object.fromEntries(
  (process.env.LOOPGANG_EXTRA_MATCHES ?? '')
    .split(';')
    .filter(Boolean)
    .map((pair) => pair.split('=>').map((s) => s.trim()))
)

/** Exacte match, dan spatie-ongevoelig, dan een eenduidige deelmatch. */
function matchClient(companyName) {
  const manual = MANUAL_MATCHES[companyName]
  if (manual) {
    const found = active.find((c) => c.company_name === manual)
    if (found) return found
  }

  const norm = normalize(companyName)
  if (!norm) return null

  const exact = byNormalized.get(norm) ?? bySquashed.get(squash(companyName))
  if (exact) return exact

  const partial = active.filter((c) => {
    const n = normalize(c.company_name)
    return n.length > 3 && (n.includes(norm) || norm.includes(n))
  })
  return partial.length === 1 ? partial[0] : null
}

const matched = []
const unmatched = new Map()
const skipped = []

for (const row of rows) {
  if (!row.date || !/^\d{4}-\d{2}-\d{2}$/.test(row.date)) {
    skipped.push({ ...row, reason: 'geen geldige datum' })
    continue
  }
  if (row.amountExcl === null) {
    skipped.push({ ...row, reason: 'geen bedrag' })
    continue
  }
  if (row.amountExcl < 0) continue // al verrekend of gemeld als wees
  if (row.amountExcl === 0) {
    skipped.push({ ...row, reason: 'volledig gecrediteerd, blijft € 0' })
    continue
  }

  const client = matchClient(row.companyName)
  if (!client) {
    const key = row.companyName || '(leeg)'
    unmatched.set(key, (unmatched.get(key) ?? 0) + 1)
    continue
  }

  matched.push({ ...row, clientId: client.id, clientName: client.company_name })
}

// De tabel heeft een unieke sleutel op (klant, datum): twee facturen op dezelfde
// dag voor dezelfde klant worden opgeteld tot één regel.
const merged = new Map()
for (const m of matched) {
  const key = `${m.clientId}|${m.date}`
  const existing = merged.get(key)
  if (existing) {
    existing.amountExcl = Math.round((existing.amountExcl + m.amountExcl) * 100) / 100
    existing.amountIncl = Math.round(((existing.amountIncl ?? 0) + (m.amountIncl ?? 0)) * 100) / 100
    existing.paidTotal = (existing.paidTotal ?? 0) + (m.paidTotal ?? 0)
    existing.invoiceNumbers.push(m.invoiceNumber)
    if (m.dueDate > existing.dueDate) existing.dueDate = m.dueDate
  } else {
    merged.set(key, { ...m, invoiceNumbers: [m.invoiceNumber] })
  }
}

// "Betaald Totaal" is een bedrag, geen datum: het bestand zegt wél of er betaald
// is maar niet wanneer. Volledig betaald als het betaalde bedrag het bedrag
// inclusief btw dekt; daaronder is het een deelbetaling en blijft de factuur
// openstaan.
for (const inv of merged.values()) {
  const paid = inv.paidTotal ?? 0
  const total = inv.amountIncl ?? 0
  inv.fullyPaid = total > 0 && paid >= total - 0.01
  inv.partiallyPaid = paid > 0 && !inv.fullyPaid
}

const toInsert = [...merged.values()].sort(
  (a, b) => a.clientName.localeCompare(b.clientName) || a.date.localeCompare(b.date)
)

console.log(`\nGELEZEN: ${rows.length} factuurregels uit facturen.xlsx`)
console.log(`KLANTEN IN DE LOOPGANG: ${active.length}`)
console.log(`\n--- WEL GEMATCHT: ${toInsert.length} facturen ---`)

const perClient = new Map()
for (const inv of toInsert) {
  const list = perClient.get(inv.clientName) ?? []
  list.push(inv)
  perClient.set(inv.clientName, list)
}

for (const [name, list] of [...perClient.entries()].sort()) {
  const last = list[list.length - 1]
  console.log(`\n  ${name}  (${list.length} facturen, laatste ${last.date})`)
  for (const inv of list) {
    const paid = inv.fullyPaid
      ? `betaald (${inv.dueDate})`
      : inv.partiallyPaid
        ? `deels betaald ${inv.paidTotal}`
        : 'open'
    const credited = inv.creditedBy ? `  gecrediteerd ${inv.creditedBy.toFixed(2)}` : ''
    console.log(
      `    ${inv.date}  € ${String(inv.amountExcl.toFixed(2)).padStart(9)}  ${paid.padEnd(22)} ${inv.invoiceNumbers.join('+')}${credited}`
    )
  }
}

if (orphanCredits.length > 0) {
  console.log(`\n--- CREDITFACTUREN ZONDER TEGENHANGER: ${orphanCredits.length} ---`)
  for (const c of orphanCredits) {
    console.log(`  ${c.date || '????'}  ${c.companyName}  € ${c.amountExcl}  — ${c.reason}`)
  }
}

console.log(`\n--- NIET GEMATCHT (blijven buiten de loopgang) ---`)
for (const [name, count] of [...unmatched.entries()].sort((a, b) => b[1] - a[1])) {
  console.log(`  ${String(count).padStart(3)}x  ${name}`)
}

console.log(`\n--- OVERGESLAGEN: ${skipped.length} ---`)
for (const s of skipped) {
  console.log(`  ${s.date || '????'}  ${s.companyName}  — ${s.reason}`)
}

console.log(`\nKlanten in de loopgang zonder enige factuur in dit bestand:`)
for (const c of active) {
  if (!perClient.has(c.company_name)) console.log(`  ${c.company_name}`)
}

if (!APPLY) {
  console.log(`\n(Niets weggeschreven. Draai met --apply om te importeren.)`)
  process.exit(0)
}

console.log(`\nBezig met importeren…`)
const payload = toInsert.map((inv) => {
  const notes = [`Geïmporteerd uit facturen.xlsx — factuur ${inv.invoiceNumbers.join(', ')}`]
  if (inv.creditedBy) notes.push(`gecrediteerd met € ${Math.abs(inv.creditedBy).toFixed(2)}`)
  if (inv.fullyPaid) notes.push('betaaldatum onbekend, vervaldatum aangehouden')
  if (inv.partiallyPaid) {
    notes.push(`deelbetaling € ${inv.paidTotal.toFixed(2)} van € ${inv.amountIncl.toFixed(2)}`)
  }

  return {
    client_id: inv.clientId,
    invoice_date: inv.date,
    amount_cents: Math.round(inv.amountExcl * 100),
    // Het bestand kent geen betaaldatum. De vervaldatum is de enige echte datum
    // die erbij hoort; dat staat er in de notitie ook bij, zodat niemand denkt
    // dat dit een waargenomen betaalmoment is.
    paid_at: inv.fullyPaid ? inv.dueDate || inv.date : null,
    note: notes.join(' · '),
  }
})

const result = await rest('client_invoice_marks?on_conflict=client_id,invoice_date', {
  method: 'POST',
  headers: { Prefer: 'resolution=merge-duplicates,return=representation' },
  body: JSON.stringify(payload),
})

console.log(`Klaar: ${result.length} facturen weggeschreven.`)
