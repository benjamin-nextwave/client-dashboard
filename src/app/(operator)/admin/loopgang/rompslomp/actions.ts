'use server'

import { revalidatePath, revalidateTag } from 'next/cache'
import { createAdminClient } from '@/lib/supabase/admin'
import { amsterdamDateString } from '@/lib/commissions-shared'
import { ROMPSLOMP_CACHE_TAG } from '@/lib/rompslomp/client'
import { listSalesInvoices } from '@/lib/rompslomp/sales-invoices'

// Auth volgt het bestaande admin-patroon: middleware gate't /admin op
// user_role='operator'. Acties draaien met service_role (RLS bypass).

const LOOPGANG_PATH = '/admin/loopgang'
const KOPPEL_PATH = '/admin/loopgang/rompslomp'

/** Het campagnespoor waar het centrale overzicht op boekt. */
const CENTRAL_TRACK = 1

const UUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i

/**
 * Koppelt een Rompslomp-contact aan een klant, of maakt de koppeling los met
 * `null`. Eén contact hoort bij één klant; de unieke index in de database
 * bewaakt dat.
 */
export async function koppelContactAction(
  clientId: string,
  contactId: number | null
): Promise<{ error?: string }> {
  if (!UUID.test(clientId)) return { error: 'Ongeldige klant.' }
  if (contactId !== null && !Number.isSafeInteger(contactId)) {
    return { error: 'Ongeldig contact.' }
  }

  const supabase = createAdminClient()

  // Een contact mag niet aan twee klanten hangen; anders zou dezelfde factuur
  // op twee cyclussen terechtkomen.
  if (contactId !== null) {
    const { data: bezet } = await supabase
      .from('clients')
      .select('id, company_name')
      .eq('rompslomp_contact_id', contactId)
      .neq('id', clientId)
      .maybeSingle()

    if (bezet) {
      return { error: `Dit contact hangt al aan ${bezet.company_name as string}.` }
    }
  }

  const { error } = await supabase
    .from('clients')
    .update({ rompslomp_contact_id: contactId })
    .eq('id', clientId)

  if (error) {
    console.error(`[rompslomp:koppel] mislukt client=${clientId}: ${error.message}`)
    return { error: 'Koppelen mislukt.' }
  }

  console.log(`[rompslomp:koppel] client=${clientId} contact=${contactId ?? 'losgekoppeld'}`)
  revalidatePath(KOPPEL_PATH)
  revalidatePath(LOOPGANG_PATH)
  return {}
}

export interface SyncResult {
  error?: string
  /** Nieuw aangemaakte factuurregels. */
  created?: number
  /** Bijgewerkte regels, inclusief handmatige die zijn overgenomen. */
  updated?: number
  /** Klanten waarvoor is gesynchroniseerd. */
  clients?: number
}

interface MarkRow {
  id: string
  client_id: string
  invoice_date: string
  amount_cents: number | null
  paid_at: string | null
  rompslomp_invoice_id: number | null
}

/**
 * Neemt de facturen uit Rompslomp over in de loopgang.
 *
 * Alleen voor klanten met een gekoppeld contact — zonder koppeling is niet vast
 * te stellen van wie een factuur is. Herhaalbaar: een factuur die al is
 * overgenomen wordt bijgewerkt op zijn `rompslomp_invoice_id`, niet nog eens
 * aangemaakt.
 *
 * Staat er al een handmatige regel op dezelfde dag voor dezelfde klant, dan
 * wordt die overgenomen in plaats van dat er een tweede naast komt. Anders zou
 * de eerste synchronisatie elke met de hand ingevoerde factuur verdubbelen, en
 * daarmee de werkdagteller van die klant verzetten.
 *
 * De betaaldatum blijft met rust. Rompslomp geeft wél of een factuur betaald is,
 * maar niet wanneer — er is geen endpoint dat betalingen teruggeeft. Eerder
 * vulden we daarom de dag in waarop we het voor het eerst zagen, maar dat leverde
 * drieëndertig facturen op die allemaal op dezelfde dag "betaald" waren. Een
 * verzonnen datum is erger dan geen datum: hij ziet er even echt uit als een
 * goede en je gaat erop rekenen. Betaald afvinken doe je met de hand.
 */
export async function syncInvoicesAction(): Promise<SyncResult> {
  const supabase = createAdminClient()
  const today = amsterdamDateString()

  const { data: clientRows, error: clientError } = await supabase
    .from('clients')
    .select('id, company_name, rompslomp_contact_id')
    .not('rompslomp_contact_id', 'is', null)

  if (clientError) {
    console.error(`[rompslomp:sync] klanten ophalen mislukt: ${clientError.message}`)
    return { error: 'Klanten ophalen mislukt.' }
  }

  const clients = (clientRows ?? []) as {
    id: string
    company_name: string
    rompslomp_contact_id: number
  }[]

  if (clients.length === 0) {
    return { error: 'Er is nog geen enkele klant aan een Rompslomp-contact gekoppeld.' }
  }

  const invoicesResult = await listSalesInvoices()
  if (!invoicesResult.ok) return { error: invoicesResult.error }

  const byContact = new Map<number, typeof invoicesResult.value>()
  for (const invoice of invoicesResult.value) {
    if (invoice.contactId === null) continue
    const list = byContact.get(invoice.contactId)
    if (list) list.push(invoice)
    else byContact.set(invoice.contactId, [invoice])
  }

  const clientIds = clients.map((c) => c.id)
  const { data: markRows, error: markError } = await supabase
    .from('client_invoice_marks')
    .select('id, client_id, invoice_date, amount_cents, paid_at, rompslomp_invoice_id')
    .in('client_id', clientIds)

  if (markError) {
    console.error(`[rompslomp:sync] factuurregels ophalen mislukt: ${markError.message}`)
    return { error: 'Bestaande facturen ophalen mislukt.' }
  }

  const marks = (markRows ?? []) as MarkRow[]
  const byRompslompId = new Map(
    marks.filter((m) => m.rompslomp_invoice_id !== null).map((m) => [m.rompslomp_invoice_id, m])
  )
  const handmatigOpDag = new Map<string, MarkRow>()
  for (const mark of marks) {
    if (mark.rompslomp_invoice_id !== null) continue
    handmatigOpDag.set(`${mark.client_id}|${mark.invoice_date}`, mark)
  }

  let created = 0
  let updated = 0
  let geraakt = 0

  for (const client of clients) {
    const invoices = byContact.get(client.rompslomp_contact_id) ?? []
    if (invoices.length === 0) continue
    geraakt += 1

    for (const invoice of invoices) {
      const notitie = [invoice.invoiceNumber, invoice.description].filter(Boolean).join(' — ')
      const bestaand =
        byRompslompId.get(invoice.id) ??
        handmatigOpDag.get(`${client.id}|${invoice.date}`) ??
        null

      if (bestaand) {
        const { error } = await supabase
          .from('client_invoice_marks')
          .update({
            invoice_date: invoice.date,
            amount_cents: invoice.amountExVatCents,
            note: notitie || null,
            rompslomp_invoice_id: invoice.id,
          })
          .eq('id', bestaand.id)

        if (error) {
          console.error(`[rompslomp:sync] bijwerken mislukt factuur=${invoice.id}: ${error.message}`)
          continue
        }
        updated += 1
      } else {
        const { error } = await supabase.from('client_invoice_marks').insert({
          client_id: client.id,
          invoice_date: invoice.date,
          amount_cents: invoice.amountExVatCents,
          note: notitie || null,
          campaign_track: CENTRAL_TRACK,
          rompslomp_invoice_id: invoice.id,
        })

        if (error) {
          console.error(`[rompslomp:sync] aanmaken mislukt factuur=${invoice.id}: ${error.message}`)
          continue
        }
        created += 1
      }
    }
  }

  console.log(
    `[rompslomp:sync] klanten=${geraakt} nieuw=${created} bijgewerkt=${updated} result=success`
  )

  revalidateTag(ROMPSLOMP_CACHE_TAG)
  revalidatePath(KOPPEL_PATH)
  revalidatePath(LOOPGANG_PATH)
  return { created, updated, clients: geraakt }
}
