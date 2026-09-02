'use server'

import { revalidatePath } from 'next/cache'
import { createAdminClient } from '@/lib/supabase/admin'
import { deleteLoopgangPdf, uploadLoopgangPdf } from '@/lib/supabase/storage'
import { getLoopgangOverview } from '@/lib/data/loopgang-overview'
import { analyseerLoopgang, type LoopgangAnalyse } from '@/lib/loopgang/analyse'
import type { MeetingOutcome } from '@/lib/loopgang/cycle'
import {
  describeTiming,
  formatTasksHtml,
  formatTasksText,
  type LoopgangTask,
} from '@/lib/loopgang/tasks'

// Auth volgt het bestaande admin-patroon: middleware (src/middleware.ts) gate't
// /admin op user_role='operator'. Acties draaien met service_role (RLS bypass).

const OVERVIEW_PATH = '/admin/loopgang'

/**
 * Het centrale overzicht kent één cyclus per klant, ook als er twee campagnes
 * naast elkaar draaien: de sporen worden hier samengeteld. Alles wat vanaf deze
 * pagina wordt vastgelegd komt daarom op spoor 1. Wie per campagne wil boeken
 * doet dat op de klantpagina, waar de schakelaar staat.
 */
const CENTRAL_TRACK = 1

function paths(clientId: string): string[] {
  return [OVERVIEW_PATH, `/admin/clients/${clientId}/loopgang`]
}

function revalidate(clientId: string): void {
  for (const p of paths(clientId)) revalidatePath(p)
}

const ISO_DATE = /^\d{4}-\d{2}-\d{2}$/

function readDate(form: FormData, key: string): string | null {
  const raw = form.get(key)
  if (typeof raw !== 'string' || !ISO_DATE.test(raw)) return null
  return raw
}

/**
 * Leest een bedrag zoals het is ingetypt en geeft centen terug. Zowel "1250,50"
 * als "1250.50" en "1.250,50" moeten werken: dit wordt met de hand ingevuld en
 * niemand let op het scheidingsteken.
 */
function readAmountCents(form: FormData, key: string): number | null {
  const raw = form.get(key)
  if (typeof raw !== 'string' || raw.trim() === '') return null

  let text = raw.trim().replace(/[€\s]/g, '')
  const lastComma = text.lastIndexOf(',')
  const lastDot = text.lastIndexOf('.')

  if (lastComma > lastDot) {
    // Komma is het decimaalteken; punten zijn duizendtallen.
    text = text.replace(/\./g, '').replace(',', '.')
  } else {
    // Punt is het decimaalteken; komma's zijn duizendtallen.
    text = text.replace(/,/g, '')
  }

  const value = Number(text)
  if (!Number.isFinite(value) || value < 0) return null
  return Math.round(value * 100)
}

function readText(form: FormData, key: string, max = 2000): string | null {
  const raw = form.get(key)
  if (typeof raw !== 'string') return null
  const trimmed = raw.trim()
  return trimmed === '' ? null : trimmed.slice(0, max)
}

export interface ActionResult {
  error?: string
}


// -----------------------------------------------------------------------------
// Facturen
// -----------------------------------------------------------------------------

/**
 * Legt een verstuurde factuur vast. De factuurdatum is meteen het nieuwe anker
 * van de cyclus: alle tellers beginnen hiervandaan opnieuw.
 *
 * Bestaat er al een factuur op deze dag, dan wordt die bijgewerkt in plaats van
 * geweigerd — de tabel heeft een unieke sleutel op (klant, datum), en een
 * foutmelding zou hier alleen maar in de weg zitten.
 */
export async function saveInvoiceAction(
  clientId: string,
  formData: FormData
): Promise<ActionResult> {
  const invoiceDate = readDate(formData, 'invoiceDate')
  if (!invoiceDate) return { error: 'Kies een factuurdatum.' }

  const amountCents = readAmountCents(formData, 'amount')
  if (amountCents === null) return { error: 'Vul een geldig bedrag in (excl. btw).' }

  const paidAt = readDate(formData, 'paidAt')
  const note = readText(formData, 'note')

  const file = formData.get('pdf')
  let pdfUrl: string | null = null
  let pdfPath: string | null = null

  if (file instanceof File && file.size > 0) {
    const upload = await uploadLoopgangPdf('invoices', clientId, file)
    if ('error' in upload) return { error: upload.error }
    pdfUrl = upload.url
    pdfPath = upload.path
  }

  const supabase = createAdminClient()

  // Alleen de PDF-velden overschrijven als er ook echt een nieuw bestand is;
  // anders zou opnieuw opslaan zonder bijlage de bestaande PDF wissen.
  const row: Record<string, unknown> = {
    client_id: clientId,
    campaign_track: CENTRAL_TRACK,
    invoice_date: invoiceDate,
    amount_cents: amountCents,
    paid_at: paidAt,
    note,
  }
  if (pdfUrl && pdfPath) {
    row.pdf_url = pdfUrl
    row.pdf_path = pdfPath
  }

  const { error } = await supabase
    .from('client_invoice_marks')
    .upsert(row, { onConflict: 'client_id,campaign_track,invoice_date' })

  if (error) {
    if (pdfPath) await deleteLoopgangPdf(pdfPath)
    return { error: error.message }
  }

  // De volgende cyclus begint zelden op de dag dat de factuur weggaat: hij
  // begint op de dag na de periode die je zojuist hebt gefactureerd. Wie dat
  // hier invult voorkomt dat een late factuur de hele volgende maand opschuift.
  const nextCycleStart = readDate(formData, 'nextCycleStart')
  if (nextCycleStart) {
    const { error: startError } = await supabase
      .from('clients')
      .update({ cycle_start_date: nextCycleStart })
      .eq('id', clientId)
    if (startError) return { error: startError.message }
  }

  console.log(
    `[loopgang] factuur opgeslagen client=${clientId} datum=${invoiceDate} bedrag=${amountCents} volgende-cyclus=${nextCycleStart ?? 'ongewijzigd'}`
  )
  revalidate(clientId)
  return {}
}

/** Zet of haalt de betaaldatum van één factuur. */
export async function setInvoicePaidAction(
  invoiceId: string,
  clientId: string,
  paidAt: string | null
): Promise<ActionResult> {
  if (paidAt !== null && !ISO_DATE.test(paidAt)) {
    return { error: 'Ongeldige betaaldatum.' }
  }

  const supabase = createAdminClient()
  const { error } = await supabase
    .from('client_invoice_marks')
    .update({ paid_at: paidAt })
    .eq('id', invoiceId)
    .eq('client_id', clientId)

  if (error) return { error: error.message }

  revalidate(clientId)
  return {}
}

export async function deleteInvoiceAction(
  invoiceId: string,
  clientId: string
): Promise<ActionResult> {
  const supabase = createAdminClient()

  const { data: existing } = await supabase
    .from('client_invoice_marks')
    .select('pdf_path')
    .eq('id', invoiceId)
    .eq('client_id', clientId)
    .single()

  const { error } = await supabase
    .from('client_invoice_marks')
    .delete()
    .eq('id', invoiceId)
    .eq('client_id', clientId)

  if (error) return { error: error.message }

  // Pas opruimen als de rij echt weg is, anders staat er een factuur zonder PDF.
  const path = (existing?.pdf_path as string | null) ?? null
  if (path) await deleteLoopgangPdf(path)

  revalidate(clientId)
  return {}
}

// -----------------------------------------------------------------------------
// Leadrapportages
// -----------------------------------------------------------------------------

export async function saveLeadReportAction(
  clientId: string,
  formData: FormData
): Promise<ActionResult> {
  const reportDate = readDate(formData, 'reportDate')
  if (!reportDate) return { error: 'Kies een datum voor de rapportage.' }

  const note = readText(formData, 'note')

  const file = formData.get('pdf')
  let pdfUrl: string | null = null
  let pdfPath: string | null = null

  if (file instanceof File && file.size > 0) {
    const upload = await uploadLoopgangPdf('lead-reports', clientId, file)
    if ('error' in upload) return { error: upload.error }
    pdfUrl = upload.url
    pdfPath = upload.path
  }

  const supabase = createAdminClient()

  const row: Record<string, unknown> = {
    client_id: clientId,
    campaign_track: CENTRAL_TRACK,
    report_date: reportDate,
    note,
  }
  if (pdfUrl && pdfPath) {
    row.pdf_url = pdfUrl
    row.pdf_path = pdfPath
  }

  const { error } = await supabase
    .from('client_lead_reports')
    .upsert(row, { onConflict: 'client_id,campaign_track,report_date' })

  if (error) {
    if (pdfPath) await deleteLoopgangPdf(pdfPath)
    return { error: error.message }
  }

  console.log(`[loopgang] leadrapportage opgeslagen client=${clientId} datum=${reportDate}`)
  revalidate(clientId)
  return {}
}

export async function deleteLeadReportAction(
  reportId: string,
  clientId: string
): Promise<ActionResult> {
  const supabase = createAdminClient()

  const { data: existing } = await supabase
    .from('client_lead_reports')
    .select('pdf_path')
    .eq('id', reportId)
    .eq('client_id', clientId)
    .single()

  const { error } = await supabase
    .from('client_lead_reports')
    .delete()
    .eq('id', reportId)
    .eq('client_id', clientId)

  if (error) return { error: error.message }

  const path = (existing?.pdf_path as string | null) ?? null
  if (path) await deleteLoopgangPdf(path)

  revalidate(clientId)
  return {}
}

// -----------------------------------------------------------------------------
// Evaluatiemeeting
// -----------------------------------------------------------------------------

const OUTCOMES: MeetingOutcome[] = ['planned', 'stop', 'continue']

/**
 * Handelt de evaluatiemeeting van de huidige cyclus af. Het anker komt van de
 * pagina mee, zodat de uitkomst aan precies één cyclus hangt: komt er later een
 * factuur bij, dan verschuift het anker en begint de herinnering opnieuw zonder
 * dat deze registratie verdwijnt.
 */
export async function handleMeetingAction(
  clientId: string,
  cycleAnchor: string,
  outcome: MeetingOutcome,
  meetingDate: string | null,
  note: string | null
): Promise<ActionResult> {
  if (!ISO_DATE.test(cycleAnchor)) return { error: 'Ongeldig startpunt van de cyclus.' }
  if (!OUTCOMES.includes(outcome)) return { error: 'Onbekende uitkomst.' }

  if (outcome === 'planned') {
    if (!meetingDate || !ISO_DATE.test(meetingDate)) {
      return { error: 'Kies de datum van de meeting.' }
    }
  }

  const supabase = createAdminClient()
  const { error } = await supabase.from('client_evaluation_meetings').upsert(
    {
      client_id: clientId,
      campaign_track: CENTRAL_TRACK,
      cycle_anchor: cycleAnchor,
      outcome,
      meeting_date: outcome === 'planned' ? meetingDate : null,
      note: note?.trim() ? note.trim().slice(0, 2000) : null,
      handled_at: new Date().toISOString(),
    },
    { onConflict: 'client_id,campaign_track,cycle_anchor' }
  )

  if (error) return { error: error.message }

  console.log(
    `[loopgang] meeting afgehandeld client=${clientId} anker=${cycleAnchor} uitkomst=${outcome}`
  )
  revalidate(clientId)
  return {}
}

/** Maakt de afhandeling ongedaan; de belherinnering komt terug. */
export async function resetMeetingAction(
  clientId: string,
  cycleAnchor: string
): Promise<ActionResult> {
  const supabase = createAdminClient()
  const { error } = await supabase
    .from('client_evaluation_meetings')
    .delete()
    .eq('client_id', clientId)
    .eq('cycle_anchor', cycleAnchor)

  if (error) return { error: error.message }

  revalidate(clientId)
  return {}
}

// -----------------------------------------------------------------------------
// Pauzereden en verzendnorm
// -----------------------------------------------------------------------------

/**
 * Zet de klant administratief stil, of haalt hem er weer af.
 *
 * Raakt Instantly níét. De knop op de loopgangpagina van de klant doet dat wel;
 * die zet de campagnes daadwerkelijk op pauze. Deze is bedoeld voor het
 * omgekeerde geval: er is buiten dit dashboard om iets stil komen te liggen, en
 * die periode moet overbrugd worden zodat de cyclus niet doortelt over dagen
 * waarop er niets is verstuurd.
 *
 * Beide acties landen in dezelfde log als de Instantly-pauze, want voor de
 * kalender en de tellers betekenen ze hetzelfde: de klant stond stil.
 */
export async function setAdminPauseAction(
  clientId: string,
  paused: boolean,
  note: string | null
): Promise<ActionResult> {
  const supabase = createAdminClient()

  // Twee pauzes achter elkaar zonder hervatting zouden de log onleesbaar maken,
  // en hervatten wat niet stilstaat verschuift de cyclus zonder reden.
  const { data: last } = await supabase
    .from('client_campaign_pause_events')
    .select('action')
    .eq('client_id', clientId)
    .order('occurred_at', { ascending: false })
    .limit(1)
    .maybeSingle()

  const currentlyPaused = last?.action === 'pause'
  if (paused && currentlyPaused) return { error: 'Deze klant staat al op pauze.' }
  if (!paused && !currentlyPaused) return { error: 'Er loopt geen pauze om te beëindigen.' }

  const { error } = await supabase.from('client_campaign_pause_events').insert({
    client_id: clientId,
    action: paused ? 'pause' : 'resume',
    campaigns: [],
    note: note?.trim() ? note.trim().slice(0, 2000) : null,
  })

  if (error) return { error: error.message }

  console.log(
    `[loopgang] administratieve pauze ${paused ? 'gestart' : 'beëindigd'} client=${clientId}`
  )
  revalidate(clientId)
  return {}
}

/**
 * Werkt de toelichting bij een pauzemoment bij. De pauze zelf wordt hier niet
 * gezet: pauzeren en hervatten raakt Instantly en blijft op de klantpagina
 * staan, zodat er maar één plek is die campagnes stilzet.
 */
export async function savePauseNoteAction(
  eventId: string,
  clientId: string,
  note: string
): Promise<ActionResult> {
  const supabase = createAdminClient()
  const { error } = await supabase
    .from('client_campaign_pause_events')
    .update({ note: note.trim() ? note.trim().slice(0, 2000) : null })
    .eq('id', eventId)
    .eq('client_id', clientId)

  if (error) return { error: error.message }

  revalidate(clientId)
  return {}
}

/**
 * Bepaalt welke klanten in de loopgangkalender staan. Komt binnen als de
 * volledige lijst, niet als losse wijzigingen: het beheerscherm laat alle
 * klanten tegelijk zien en slaat in één keer op, en dan is de hele lijst de
 * waarheid.
 *
 * Raakt alleen dit overzicht — een uitgevinkte klant blijft overal elders
 * gewoon zichtbaar.
 */
export async function setLoopgangVisibilityAction(
  visibility: Array<{ clientId: string; visible: boolean }>
): Promise<ActionResult> {
  if (visibility.length === 0) return {}

  const supabase = createAdminClient()

  const visible = visibility.filter((v) => v.visible).map((v) => v.clientId)
  const hidden = visibility.filter((v) => !v.visible).map((v) => v.clientId)

  // Twee updates in plaats van één per klant; bij vijftien klanten scheelt dat
  // dertien aanroepen.
  for (const [ids, value] of [
    [visible, true],
    [hidden, false],
  ] as const) {
    if (ids.length === 0) continue
    const { error } = await supabase
      .from('clients')
      .update({ loopgang_visible: value })
      .in('id', ids)
    if (error) return { error: error.message }
  }

  console.log(
    `[loopgang] klantenlijst bijgewerkt zichtbaar=${visible.length} verborgen=${hidden.length}`
  )
  revalidatePath(OVERVIEW_PATH)
  return {}
}

// -----------------------------------------------------------------------------
// Taken naar Kix
// -----------------------------------------------------------------------------

/**
 * De Make-webhook die de takenmail verstuurt.
 *
 * LET OP — deze zit NIET achter assertOutboundAllowed(). Die grendel beschermt
 * alleen replyToEmail() in de Instantly-koppeling. Vanaf een lokale omgeving
 * gaat dit dus echt de deur uit zodra het scenario in Make aanstaat.
 */
const TASKS_WEBHOOK_URL =
  process.env.MAKE_LOOPGANG_TASKS_WEBHOOK_URL ||
  'https://hook.eu2.make.com/9dek7vd2mlihk7itgtfp4w3ak6totg2f'

const WEBHOOK_TIMEOUT_MS = 15_000

export interface SendTasksResult {
  error?: string
  sent?: number
}

/**
 * Stuurt de aangevinkte taken naar Make.
 *
 * Elk veld gaat altijd mee, ook als het leeg is — óók binnen de taken zelf.
 * Make legt de datastructuur van een webhook vast op basis van het eerste
 * bericht dat binnenkomt; een veld dat daar ontbrak wordt later wel geaccepteerd
 * maar is niet te mappen. Weglaten van een leeg veld zou dus stilletjes een
 * kolom in het scenario kosten.
 */
export async function sendTasksToWebhookAction(
  tasks: LoopgangTask[],
  options: { date: string; note: string | null }
): Promise<SendTasksResult> {
  if (tasks.length === 0) return { error: 'Er zijn geen taken aangevinkt.' }
  if (!ISO_DATE.test(options.date)) return { error: 'Ongeldige datum.' }

  const payload = {
    verzonden_op: new Date().toISOString(),
    datum: options.date,
    datum_tekst: formatDateLong(options.date),
    aantal_taken: tasks.length,
    notitie: options.note?.trim() ? options.note.trim().slice(0, 2000) : '',
    taken_tekst: formatTasksText(tasks),
    taken_html: formatTasksHtml(tasks),
    taken: tasks.map((task) => ({
      klant: task.clientName,
      klant_id: task.clientId,
      taak: task.label,
      toelichting: task.detail ?? '',
      soort: task.kind,
      status: task.status === 'overdue' ? 'te laat' : 'vandaag',
      timing: describeTiming(task),
      vervaldatum: task.date,
      dagen_te_laat: task.daysLate,
      werkdag_cyclus: task.workday,
    })),
  }

  const controller = new AbortController()
  const timeout = setTimeout(() => controller.abort(), WEBHOOK_TIMEOUT_MS)

  try {
    const response = await fetch(TASKS_WEBHOOK_URL, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(payload),
      signal: controller.signal,
    })

    if (!response.ok) {
      const body = await response.text().catch(() => '')
      console.error(
        `[loopgang:taken] webhook gaf ${response.status}: ${body.slice(0, 200)}`
      )
      return { error: `Make gaf een fout terug (${response.status}).` }
    }

    console.log(`[loopgang:taken] ${tasks.length} taken verstuurd datum=${options.date}`)
    return { sent: tasks.length }
  } catch (err) {
    const message = err instanceof Error ? err.message : 'onbekende fout'
    console.error(`[loopgang:taken] webhook mislukt: ${message}`)
    return {
      error:
        err instanceof Error && err.name === 'AbortError'
          ? 'Make reageerde niet binnen 15 seconden.'
          : `Versturen mislukt: ${message}`,
    }
  } finally {
    clearTimeout(timeout)
  }
}

const WEEKDAY_NAMES = [
  'zondag', 'maandag', 'dinsdag', 'woensdag', 'donderdag', 'vrijdag', 'zaterdag',
]
const MONTH_NAMES = [
  'januari', 'februari', 'maart', 'april', 'mei', 'juni',
  'juli', 'augustus', 'september', 'oktober', 'november', 'december',
]

function formatDateLong(iso: string): string {
  const [y, m, d] = iso.split('-').map(Number)
  if (!y || !m || !d) return iso
  const date = new Date(Date.UTC(y, m - 1, d))
  return `${WEEKDAY_NAMES[date.getUTCDay()]} ${d} ${MONTH_NAMES[m - 1]} ${y}`
}

/** Het gewenste aantal mails per werkdag voor deze klant. */
/**
 * Laat een model de stand van vandaag samenvatten in vier bakken.
 *
 * Draait bewust op verzoek en niet bij het laden van de pagina: het kost een
 * modelaanroep, en de kalender eronder is ook zonder samenvatting compleet.
 */
export async function analyseerLoopgangAction(
  month?: string
): Promise<{ analyse?: LoopgangAnalyse; error?: string }> {
  const overview = await getLoopgangOverview(month)
  const result = await analyseerLoopgang(overview)
  if (!result.ok) return { error: result.error }
  return { analyse: result.analyse }
}

/**
 * Zet de dag waarop de lopende campagnemaand begon. Vanaf die dag telt de
 * cyclus, in plaats van vanaf de laatste factuur.
 *
 * Waarom handmatig: alleen de operator weet welke periode een factuur dekt. Ging
 * een factuur te laat de deur uit, dan zegt de factuurdatum niets over wanneer
 * de volgende maand begon — en zonder deze datum schuift die achterstand mee
 * naar de volgende cyclus in plaats van dat hij wordt gemeld.
 *
 * Een lege datum wist de startdatum; de cyclus valt dan terug op de factuurdatum
 * en anders op de livegang, precies zoals het zonder dit veld werkte.
 */
export async function setCycleStartAction(
  clientId: string,
  formData: FormData
): Promise<ActionResult> {
  const raw = formData.get('cycleStart')
  const cycleStart = typeof raw === 'string' && raw.trim() !== '' ? readDate(formData, 'cycleStart') : null

  if (typeof raw === 'string' && raw.trim() !== '' && cycleStart === null) {
    return { error: 'Kies een geldige datum, of laat het veld leeg.' }
  }

  const supabase = createAdminClient()
  const { error } = await supabase
    .from('clients')
    .update({
      cycle_start_date: cycleStart,
      cycle_start_note: cycleStart ? readText(formData, 'cycleStartNote') : null,
    })
    .eq('id', clientId)

  if (error) return { error: error.message }

  console.log(`[loopgang] cyclusstart gezet client=${clientId} datum=${cycleStart ?? 'leeg'}`)
  revalidate(clientId)
  return {}
}

export async function setDailySendTargetAction(
  clientId: string,
  target: number
): Promise<ActionResult> {
  if (!Number.isInteger(target) || target < 1 || target > 100_000) {
    return { error: 'Vul een aantal tussen 1 en 100.000 in.' }
  }

  const supabase = createAdminClient()
  const { error } = await supabase
    .from('clients')
    .update({ daily_send_target: target })
    .eq('id', clientId)

  if (error) return { error: error.message }

  revalidate(clientId)
  return {}
}
