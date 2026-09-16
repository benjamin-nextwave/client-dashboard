/**
 * Uitgaves lezen en bijwerken vanaf de opdrachtregel, zodat de kostenlijst
 * vanuit de chat gevuld kan worden (skill `uitgaves`).
 *
 * Schrijven gebeurt nooit zonder --apply: elke schrijfopdracht laat eerst zien
 * wat hij zou doen. Dat is hier geen formaliteit — dit praat rechtstreeks tegen
 * de productiedatabase, dezelfde die het dashboard leest.
 *
 *   node scripts/uitgaves.mjs lijst [--alles]
 *   node scripts/uitgaves.mjs toevoegen --leverancier "Instantly" --bedrag 297 --cadence maand [--apply]
 *   node scripts/uitgaves.mjs import <bestand.csv> [--soort rabobank] [--per-regel] [--apply]
 *   node scripts/uitgaves.mjs bijwerken <id> --bedrag 249 [--apply]
 *   node scripts/uitgaves.mjs verwijder <id> [--apply]
 */
import fs from 'node:fs'
import path from 'node:path'

const [, , command, ...rest] = process.argv

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
const TABLE = 'operator_expenses'

if (!SUPABASE_URL || !SERVICE_KEY) {
  console.error('NEXT_PUBLIC_SUPABASE_URL of SUPABASE_SERVICE_ROLE_KEY ontbreekt in .env.local')
  process.exit(1)
}

/** Vlaggen (--naam waarde) en losse argumenten uit elkaar halen. */
function parseArgs(args) {
  const flags = {}
  const loose = []
  for (let i = 0; i < args.length; i++) {
    const arg = args[i]
    if (!arg.startsWith('--')) {
      loose.push(arg)
      continue
    }
    const name = arg.slice(2)
    const next = args[i + 1]
    if (next === undefined || next.startsWith('--')) {
      flags[name] = true
    } else {
      flags[name] = next
      i++
    }
  }
  return { flags, loose }
}

const { flags, loose } = parseArgs(rest)
const APPLY = flags.apply === true

async function rest_(pathname, init = {}) {
  const res = await fetch(`${SUPABASE_URL}/rest/v1/${pathname}`, {
    ...init,
    headers: {
      apikey: SERVICE_KEY,
      Authorization: `Bearer ${SERVICE_KEY}`,
      'Content-Type': 'application/json',
      ...(init.headers ?? {}),
    },
  })
  const text = await res.text()
  if (!res.ok) {
    if (res.status === 404 || text.includes('does not exist') || text.includes('PGRST205')) {
      throw new Error(
        `De tabel ${TABLE} bestaat nog niet. Draai eerst supabase/migrations/20260916000001_uitgaves.sql in de Supabase SQL-editor.`
      )
    }
    throw new Error(`${res.status} ${text.slice(0, 400)}`)
  }
  return text ? JSON.parse(text) : null
}

const CADENCES = ['eenmalig', 'maand', 'kwartaal', 'jaar']
const STATUSES = ['actief', 'opgezegd', 'gestopt']

function euroToCents(input) {
  if (input === undefined || input === true) return null
  const trimmed = String(input).trim().replace(/[€\s]/g, '').replace(/\.(?=\d{3}\b)/g, '').replace(',', '.')
  const value = Number(trimmed)
  if (!Number.isFinite(value) || value < 0) return null
  return Math.round(value * 100)
}

function formatEuro(cents) {
  return `€${(cents / 100).toFixed(2).replace('.', ',')}`
}

function monthlyCents(row) {
  if (row.cadence === 'maand') return row.amount_cents
  if (row.cadence === 'kwartaal') return Math.round(row.amount_cents / 3)
  if (row.cadence === 'jaar') return Math.round(row.amount_cents / 12)
  return 0
}

function text(value) {
  return value === undefined || value === true ? null : String(value).trim() || null
}

/** dd-mm-jjjj → jjjj-mm-dd */
function dutchDate(value) {
  const m = /^(\d{2})-(\d{2})-(\d{4})$/.exec(String(value).trim())
  return m ? `${m[3]}-${m[2]}-${m[1]}` : null
}

function isoDate(value) {
  const v = text(value)
  return v && /^\d{4}-\d{2}-\d{2}$/.test(v) ? v : null
}

// ---------------------------------------------------------------- commando's

async function lijst() {
  const alles = flags.alles === true
  const rows = await rest_(`${TABLE}?select=*&order=amount_cents.desc`)

  const zichtbaar = alles ? rows : rows.filter((r) => r.status !== 'gestopt')
  if (zichtbaar.length === 0) {
    console.log('Nog geen uitgaves in de lijst.')
    return
  }

  let maand = 0
  for (const row of zichtbaar) {
    if (row.status !== 'gestopt') maand += monthlyCents(row)
    const bedrag = `${formatEuro(row.amount_cents)} ${row.cadence}`
    const oordeel = row.verdict ? ` [${row.verdict}]` : ''
    const actie = row.action ? ` → ${row.action}` : ''
    const stand = row.status === 'actief' ? '' : ` (${row.status})`
    console.log(
      `${row.id.slice(0, 8)}  ${row.supplier.padEnd(22).slice(0, 22)} ${bedrag.padEnd(22)} ${row.category.padEnd(11)}${oordeel}${actie}${stand}`
    )
    if (row.description) console.log(`          ${row.description}`)
  }

  console.log(`\n${zichtbaar.length} posten · vaste lasten ${formatEuro(maand)} per maand`)
}

function rowFromFlags(bestaand = null) {
  const row = {}

  const leverancier = text(flags.leverancier)
  if (leverancier) row.supplier = leverancier
  else if (!bestaand) throw new Error('--leverancier is verplicht')

  const wat = text(flags.wat)
  if (wat !== null) row.description = wat

  const categorie = text(flags.categorie)
  if (categorie) row.category = categorie
  else if (!bestaand) row.category = 'overig'

  if (flags.bedrag !== undefined) {
    const cents = euroToCents(flags.bedrag)
    if (cents === null) throw new Error(`Onleesbaar bedrag: ${flags.bedrag}`)
    row.amount_cents = cents
  } else if (!bestaand) {
    throw new Error('--bedrag is verplicht')
  }

  const cadence = text(flags.cadence)
  if (cadence) {
    if (!CADENCES.includes(cadence)) throw new Error(`--cadence moet een van: ${CADENCES.join(', ')}`)
    row.cadence = cadence
  } else if (!bestaand) {
    row.cadence = 'maand'
  }

  const status = text(flags.status)
  if (status) {
    if (!STATUSES.includes(status)) throw new Error(`--status moet een van: ${STATUSES.join(', ')}`)
    row.status = status
  }

  if (flags.sinds !== undefined) row.started_on = isoDate(flags.sinds)
  if (flags.tot !== undefined) row.ended_on = isoDate(flags.tot)
  if (flags.klant !== undefined) row.client_id = text(flags.klant)
  if (flags.notitie !== undefined) row.notes = text(flags.notitie)
  if (flags.oordeel !== undefined) row.verdict = text(flags.oordeel)
  if (flags.reden !== undefined) row.verdict_reason = text(flags.reden)
  if (flags.actie !== undefined) row.action = text(flags.actie)
  if (flags.actienotitie !== undefined) row.action_note = text(flags.actienotitie)

  if (!bestaand) row.source = text(flags.bron) ?? 'chat'

  return row
}

async function toevoegen() {
  const row = rowFromFlags()

  console.log('Toe te voegen:')
  console.log(
    `  ${row.supplier} · ${formatEuro(row.amount_cents)} ${row.cadence} · ${row.category}${row.description ? ` · ${row.description}` : ''}`
  )

  if (!APPLY) {
    console.log('\nNiets weggeschreven. Zet --apply erachter om het door te voeren.')
    return
  }

  const created = await rest_(TABLE, {
    method: 'POST',
    headers: { Prefer: 'return=representation' },
    body: JSON.stringify(row),
  })
  console.log(`Toegevoegd: ${created[0].id}`)
}

async function bijwerken() {
  const id = loose[0]
  if (!id) throw new Error('Geef het id van de post die je wilt bijwerken.')

  const bestaand = await rest_(`${TABLE}?id=eq.${id}&select=*`)
  if (bestaand.length === 0) throw new Error(`Geen post met id ${id}`)

  const row = rowFromFlags(bestaand[0])
  if (Object.keys(row).length === 0) throw new Error('Geef minstens één veld om te wijzigen.')
  row.updated_at = new Date().toISOString()

  console.log(`Bijwerken: ${bestaand[0].supplier}`)
  for (const [key, value] of Object.entries(row)) {
    if (key === 'updated_at') continue
    console.log(`  ${key}: ${JSON.stringify(bestaand[0][key])} → ${JSON.stringify(value)}`)
  }

  if (!APPLY) {
    console.log('\nNiets gewijzigd. Zet --apply erachter om het door te voeren.')
    return
  }

  await rest_(`${TABLE}?id=eq.${id}`, { method: 'PATCH', body: JSON.stringify(row) })
  console.log('Bijgewerkt.')
}

async function verwijder() {
  const id = loose[0]
  if (!id) throw new Error('Geef het id van de post die je wilt verwijderen.')

  const bestaand = await rest_(`${TABLE}?id=eq.${id}&select=*`)
  if (bestaand.length === 0) throw new Error(`Geen post met id ${id}`)

  console.log(
    `Verwijderen: ${bestaand[0].supplier} · ${formatEuro(bestaand[0].amount_cents)} ${bestaand[0].cadence}`
  )

  if (!APPLY) {
    console.log('\nNiets verwijderd. Zet --apply erachter om het door te voeren.')
    return
  }

  await rest_(`${TABLE}?id=eq.${id}`, { method: 'DELETE' })
  console.log('Verwijderd.')
}

/** Eenvoudige CSV-lezer: velden tussen dubbele quotes, komma als scheidingsteken. */
function parseCsv(content) {
  const rows = []
  let veld = ''
  let rij = []
  let inQuotes = false

  for (let i = 0; i < content.length; i++) {
    const c = content[i]
    if (inQuotes) {
      if (c === '"' && content[i + 1] === '"') {
        veld += '"'
        i++
      } else if (c === '"') {
        inQuotes = false
      } else {
        veld += c
      }
      continue
    }
    if (c === '"') inQuotes = true
    else if (c === ',') {
      rij.push(veld)
      veld = ''
    } else if (c === '\n') {
      rij.push(veld)
      if (rij.some((v) => v.trim() !== '')) rows.push(rij)
      rij = []
      veld = ''
    } else if (c !== '\r') {
      veld += c
    }
  }
  rij.push(veld)
  if (rij.some((v) => v.trim() !== '')) rows.push(rij)

  return rows
}

/**
 * Het kostenoverzicht van de Rabobank: één regel per transactiesoort per dag,
 * met aantal en tarief. Standaard worden die per soort samengeteld over de
 * periode in het bestand — dertig losse regels van vijftien cent zeggen niets,
 * "bijschrijvingen digitale overboeking, 9 stuks, €1,35" wel. Met --per-regel
 * blijft elke regel apart staan.
 *
 * Kolommen: 4 datum, 5 kostensoort, 6 code, 7 omschrijving, 12 aantal,
 * 13 tarief, 21 totaalbedrag, 25 periode.
 */
function leesRabobank(rows, perRegel) {
  const posten = []
  const groepen = new Map()
  let nul = 0

  for (const kolommen of rows) {
    if (kolommen.length < 26) continue

    const datum = dutchDate(kolommen[4])
    const code = kolommen[6].trim()
    const omschrijving = kolommen[7].trim()
    const aantal = Number(kolommen[12]) || 0
    const totaal = euroToCents(kolommen[21])
    const periode = kolommen[25].trim()

    if (!datum || totaal === null) continue
    if (totaal === 0) {
      nul++
      continue
    }

    if (perRegel) {
      posten.push({
        supplier: 'Rabobank',
        description: `${omschrijving} (${aantal}×)`,
        category: 'bank',
        amount_cents: totaal,
        cadence: 'eenmalig',
        started_on: datum,
        source: 'csv',
        external_ref: `rabo:${datum}:${code}:${totaal}:${posten.length}`,
        notes: periode ? `Kostenoverzicht ${periode}` : null,
      })
      continue
    }

    const sleutel = `${periode}:${code}`
    const groep = groepen.get(sleutel)
    if (groep) {
      groep.amount_cents += totaal
      groep.aantal += aantal
      if (datum < groep.started_on) groep.started_on = datum
    } else {
      groepen.set(sleutel, {
        supplier: 'Rabobank',
        description: omschrijving,
        category: 'bank',
        amount_cents: totaal,
        aantal,
        cadence: 'eenmalig',
        started_on: datum,
        source: 'csv',
        external_ref: `rabo:${periode}:${code}`,
        notes: periode ? `Kostenoverzicht ${periode}` : null,
      })
    }
  }

  for (const groep of groepen.values()) {
    const { aantal, ...post } = groep
    posten.push({ ...post, description: `${post.description} (${aantal}×)` })
  }

  return { posten, nul }
}

async function importeer() {
  const bestand = loose[0]
  if (!bestand) throw new Error('Geef het pad naar het CSV-bestand.')

  const soort = text(flags.soort) ?? 'rabobank'
  if (soort !== 'rabobank') throw new Error(`Onbekende --soort: ${soort}. Alleen 'rabobank' bestaat.`)

  const content = fs.readFileSync(path.resolve(bestand), 'utf8')
  const { posten, nul } = leesRabobank(parseCsv(content), flags['per-regel'] === true)

  if (posten.length === 0) {
    console.log('Geen regels met een bedrag gevonden.')
    return
  }

  const refs = posten.map((p) => p.external_ref)
  const bestaand = await rest_(
    `${TABLE}?select=external_ref&external_ref=in.(${refs.map((r) => `"${r}"`).join(',')})`
  )
  const alAanwezig = new Set(bestaand.map((r) => r.external_ref))
  const nieuw = posten.filter((p) => !alAanwezig.has(p.external_ref))

  let totaal = 0
  for (const post of posten) {
    totaal += post.amount_cents
    const dubbel = alAanwezig.has(post.external_ref) ? '  (staat er al)' : ''
    console.log(
      `  ${post.started_on}  ${formatEuro(post.amount_cents).padStart(9)}  ${post.description}${dubbel}`
    )
  }

  console.log(
    `\n${posten.length} posten, samen ${formatEuro(totaal)}. ${nul} regels van €0,00 overgeslagen. Nieuw: ${nieuw.length}.`
  )

  if (!APPLY) {
    console.log('Niets weggeschreven. Zet --apply erachter om het door te voeren.')
    return
  }
  if (nieuw.length === 0) {
    console.log('Niets toe te voegen — alles stond er al.')
    return
  }

  await rest_(TABLE, { method: 'POST', body: JSON.stringify(nieuw) })
  console.log(`${nieuw.length} posten toegevoegd.`)
}

const COMMANDS = { lijst, toevoegen, bijwerken, verwijder, import: importeer }

const uitvoeren = COMMANDS[command]
if (!uitvoeren) {
  console.error(`Onbekend commando: ${command ?? '(geen)'}`)
  console.error(`Kies uit: ${Object.keys(COMMANDS).join(', ')}`)
  process.exit(1)
}

uitvoeren().catch((err) => {
  console.error(err.message)
  process.exit(1)
})
