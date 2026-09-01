'use server'

import { revalidatePath } from 'next/cache'
import { createAdminClient } from '@/lib/supabase/admin'
import { deleteLoopgangPdf, uploadLoopgangPdf } from '@/lib/supabase/storage'
import type { MeetingOutcome } from '@/lib/loopgang/cycle'

// Auth volgt het bestaande admin-patroon: middleware (src/middleware.ts) gate't
// /admin op user_role='operator'. Acties draaien met service_role (RLS bypass).

const OVERVIEW_PATH = '/admin/loopgang'

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
    .upsert(row, { onConflict: 'client_id,invoice_date' })

  if (error) {
    if (pdfPath) await deleteLoopgangPdf(pdfPath)
    return { error: error.message }
  }

  console.log(
    `[loopgang] factuur opgeslagen client=${clientId} datum=${invoiceDate} bedrag=${amountCents}`
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
    report_date: reportDate,
    note,
  }
  if (pdfUrl && pdfPath) {
    row.pdf_url = pdfUrl
    row.pdf_path = pdfPath
  }

  const { error } = await supabase
    .from('client_lead_reports')
    .upsert(row, { onConflict: 'client_id,report_date' })

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
      cycle_anchor: cycleAnchor,
      outcome,
      meeting_date: outcome === 'planned' ? meetingDate : null,
      note: note?.trim() ? note.trim().slice(0, 2000) : null,
      handled_at: new Date().toISOString(),
    },
    { onConflict: 'client_id,cycle_anchor' }
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

/** Het gewenste aantal mails per werkdag voor deze klant. */
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
