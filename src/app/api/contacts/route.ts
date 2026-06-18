import { NextRequest, NextResponse } from 'next/server'
import { createAdminClient } from '@/lib/supabase/admin'

export const dynamic = 'force-dynamic'

/**
 * Publieke ingest-endpoint om één contact toe te voegen aan de contactenpagina
 * van een klant. Bedoeld voor externe software (bv. de eigen Clay-kloon) die
 * per row één HTTP-call doet.
 *
 * Auth:   Authorization: Bearer <CONTACTS_API_KEY>
 * Body:   { client_id | client_name, fields: { "Kolomnaam": "waarde", ... } }
 *
 * Net als de CSV-import worden ontbrekende kolommen (contact_columns) automatisch
 * aangemaakt op basis van de veldnamen. Het contact wordt opgeslagen met `data`
 * gekeyd op kolom-ID, zodat het identiek is aan handmatig geïmporteerde contacten.
 */

const UUID_RE = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i

function coerceValue(value: unknown): string | null {
  if (value === null || value === undefined) return null
  if (typeof value === 'string') return value
  if (typeof value === 'number' || typeof value === 'boolean') return String(value)
  // Objecten/arrays als JSON opslaan zodat er geen data verloren gaat.
  try {
    return JSON.stringify(value)
  } catch {
    return null
  }
}

export async function POST(req: NextRequest) {
  // 1) Auth -------------------------------------------------------------------
  const apiKey = process.env.CONTACTS_API_KEY
  if (!apiKey) {
    return NextResponse.json(
      { error: 'CONTACTS_API_KEY is niet geconfigureerd op de server.' },
      { status: 500 }
    )
  }
  const authHeader = req.headers.get('authorization')
  if (authHeader !== `Bearer ${apiKey}`) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  // 2) Body parsen ------------------------------------------------------------
  let body: unknown
  try {
    body = await req.json()
  } catch {
    return NextResponse.json({ error: 'Body is geen geldige JSON.' }, { status: 400 })
  }
  if (typeof body !== 'object' || body === null) {
    return NextResponse.json({ error: 'Body moet een JSON-object zijn.' }, { status: 400 })
  }

  const { client_id, client_name, fields } = body as {
    client_id?: unknown
    client_name?: unknown
    fields?: unknown
  }

  if (typeof fields !== 'object' || fields === null || Array.isArray(fields)) {
    return NextResponse.json(
      { error: '`fields` moet een object zijn, bv. { "Email": "jan@bedrijf.nl" }.' },
      { status: 400 }
    )
  }

  // Normaliseer velden: trim sleutels, coerce waarden, gooi lege weg.
  const cleanedFields: Record<string, string> = {}
  for (const [rawKey, rawValue] of Object.entries(fields)) {
    const key = rawKey.trim()
    if (key.length === 0) continue
    const value = coerceValue(rawValue)
    if (value === null) continue
    cleanedFields[key] = value
  }
  if (Object.keys(cleanedFields).length === 0) {
    return NextResponse.json(
      { error: 'Geef minimaal één niet-leeg veld mee in `fields`.' },
      { status: 400 }
    )
  }

  const admin = createAdminClient()

  // 3) Klant bepalen ----------------------------------------------------------
  let clientId: string
  let companyName: string
  if (typeof client_id === 'string' && UUID_RE.test(client_id)) {
    const { data, error } = await admin
      .from('clients')
      .select('id, company_name')
      .eq('id', client_id)
      .maybeSingle()
    if (error) return NextResponse.json({ error: error.message }, { status: 500 })
    if (!data) return NextResponse.json({ error: `Geen klant gevonden met client_id ${client_id}.` }, { status: 404 })
    clientId = data.id
    companyName = data.company_name
  } else if (typeof client_name === 'string' && client_name.trim().length > 0) {
    const { data, error } = await admin
      .from('clients')
      .select('id, company_name')
      .ilike('company_name', client_name.trim())
    if (error) return NextResponse.json({ error: error.message }, { status: 500 })
    if (!data || data.length === 0) {
      return NextResponse.json({ error: `Geen klant gevonden met de naam "${client_name}".` }, { status: 404 })
    }
    if (data.length > 1) {
      return NextResponse.json(
        { error: `Meerdere klanten heten "${client_name}". Gebruik client_id om de juiste te kiezen.` },
        { status: 409 }
      )
    }
    clientId = data[0].id
    companyName = data[0].company_name
  } else {
    return NextResponse.json(
      { error: 'Geef een klant op via `client_id` (UUID) of `client_name`.' },
      { status: 400 }
    )
  }

  // 4) Kolommen ophalen / aanmaken (op naam, hoofdletter-ongevoelig) ----------
  const fieldNames = Object.keys(cleanedFields)
  let columnIdByLowerName: Map<string, string>
  let createdColumns: string[] = []
  try {
    const result = await getOrCreateColumns(admin, clientId, fieldNames)
    columnIdByLowerName = result.map
    createdColumns = result.created
  } catch (e) {
    return NextResponse.json(
      { error: `Kolommen aanmaken mislukt: ${e instanceof Error ? e.message : String(e)}` },
      { status: 500 }
    )
  }

  // 5) Contact-data opbouwen, gekeyd op kolom-ID -----------------------------
  const data: Record<string, string> = {}
  for (const name of fieldNames) {
    const columnId = columnIdByLowerName.get(name.toLowerCase())
    if (!columnId) continue
    data[columnId] = cleanedFields[name]
  }

  // 6) Contact invoegen -------------------------------------------------------
  const { data: inserted, error: insertError } = await admin
    .from('contacts')
    .insert({ client_id: clientId, data })
    .select('id')
    .single()

  if (insertError || !inserted) {
    return NextResponse.json(
      { error: `Contact toevoegen mislukt: ${insertError?.message ?? 'onbekende fout'}` },
      { status: 500 }
    )
  }

  return NextResponse.json(
    {
      success: true,
      contact_id: inserted.id,
      client: { id: clientId, name: companyName },
      fields_stored: Object.keys(data).length,
      columns_created: createdColumns,
    },
    { status: 201 }
  )
}

/**
 * Zoekt per veldnaam de bijbehorende contact_column (hoofdletter-ongevoelig) of
 * maakt hem aan. Geeft een map terug van lowercase-naam → kolom-ID.
 */
async function getOrCreateColumns(
  admin: ReturnType<typeof createAdminClient>,
  clientId: string,
  fieldNames: string[]
): Promise<{ map: Map<string, string>; created: string[] }> {
  const { data: existing, error } = await admin
    .from('contact_columns')
    .select('id, name, sort_order')
    .eq('client_id', clientId)
  if (error) throw new Error(error.message)

  const map = new Map<string, string>()
  let maxOrder = -1
  for (const col of existing ?? []) {
    map.set(col.name.toLowerCase(), col.id)
    if (col.sort_order > maxOrder) maxOrder = col.sort_order
  }

  const toCreate = fieldNames.filter((n) => !map.has(n.toLowerCase()))
  if (toCreate.length === 0) return { map, created: [] }

  let nextOrder = maxOrder + 1
  const records = toCreate.map((name) => ({
    client_id: clientId,
    name,
    sort_order: nextOrder++,
  }))

  const { data: created, error: createError } = await admin
    .from('contact_columns')
    .insert(records)
    .select('id, name')

  if (createError) {
    // Mogelijke race: een andere call maakte dezelfde kolom net aan. Haal de
    // kolommen opnieuw op en val daarop terug.
    if (createError.code === '23505') {
      const { data: refetched } = await admin
        .from('contact_columns')
        .select('id, name')
        .eq('client_id', clientId)
      for (const col of refetched ?? []) map.set(col.name.toLowerCase(), col.id)
      return { map, created: [] }
    }
    throw new Error(createError.message)
  }

  for (const col of created ?? []) map.set(col.name.toLowerCase(), col.id)
  return { map, created: (created ?? []).map((c) => c.name) }
}
