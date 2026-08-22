'use server'

import { revalidatePath } from 'next/cache'
import { createClient } from '@/lib/supabase/server'
import { getClientBranding } from '@/lib/client/get-client-branding'
import { checkReferralEmail, REJECTION_TEXT } from '@/lib/lead-inbox/referral'
import type { Lead } from './types'

/**
 * Eigen webhook, los van MAKE_OUTBOUND_WEBHOOK_URL. Dat is een antwoord in een
 * bestaande thread bij Instantly; dit is een nieuwe mail aan iemand die nog
 * nergens in staat. Via een env-variabele te overrulen zonder codewijziging.
 */
const WEBHOOK_URL =
  process.env.MAKE_REFERRAL_WEBHOOK_URL ||
  'https://hook.eu2.make.com/t89o32ukkjkisw4ot2isvcdeleqh1we9'

const MAX_SUBJECT = 300
const MAX_BODY = 20_000

export type ReferralSendResult =
  | { ok: true }
  | { ok: false; error: string }

export async function sendReferralOutreach(input: {
  leadId: string
  toEmail: string
  subject: string
  body: string
}): Promise<ReferralSendResult> {
  const branding = await getClientBranding()
  if (!branding?.lead_inbox_visible || !branding.lead_inbox_customer_id) {
    return { ok: false, error: 'Geen toegang tot de lead-inbox.' }
  }

  const subject = input.subject.trim().slice(0, MAX_SUBJECT)
  const body = input.body.trim().slice(0, MAX_BODY)
  if (!subject) return { ok: false, error: 'Onderwerp mag niet leeg zijn.' }
  if (!body) return { ok: false, error: 'Bericht mag niet leeg zijn.' }

  const supabase = await createClient()
  const { data: leadRow, error: leadError } = await supabase
    .from('leads')
    .select('id, email, name, sending_account, classification')
    .eq('customer_id', branding.lead_inbox_customer_id)
    .eq('id', input.leadId)
    .maybeSingle()

  if (leadError) return { ok: false, error: leadError.message }
  if (!leadRow) return { ok: false, error: 'Lead niet gevonden.' }

  const lead = leadRow as unknown as Pick<
    Lead,
    'id' | 'email' | 'name' | 'sending_account' | 'classification'
  >

  if (lead.classification !== 'referral') {
    return { ok: false, error: 'Deze lead is geen doorverwijzing.' }
  }

  // Dezelfde grendel als in het scherm, hier nog een keer: wat de browser
  // meestuurt is niet te vertrouwen.
  const check = checkReferralEmail(input.toEmail, {
    leadEmail: lead.email,
    sendingAccount: lead.sending_account,
  })
  if (!check.ok) return { ok: false, error: REJECTION_TEXT[check.reason] }

  const alreadySent = await findSent(input.leadId)
  if (alreadySent) {
    return {
      ok: false,
      error: `Er is al een mail naar ${alreadySent} gestuurd voor deze doorverwijzing.`,
    }
  }

  const payload = {
    // De ontvanger van déze mail: de doorverwezen persoon.
    mailadres_lead: check.email,
    ontvanger: check.email,
    sender_adres: lead.sending_account,
    onderwerp: subject,
    mailinhoud: body,
    // Dezelfde tekst als één regel met <br>, voor een HTML-mailmodule in Make.
    mailinhoud_1_variabel: body.replace(/\r?\n/g, '<br>'),
    klantnaam: branding.company_name ?? '',
    // Context, zodat in Make te zien is waar deze mail vandaan komt.
    doorverwezen_door_email: lead.email,
    doorverwezen_door_naam: lead.name ?? '',
    lead_id: lead.id,
  }

  let response: Response
  try {
    response = await fetch(WEBHOOK_URL, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(payload),
    })
  } catch (err) {
    const message = err instanceof Error ? err.message : 'Onbekende fout'
    return { ok: false, error: `Webhook onbereikbaar: ${message}` }
  }

  if (!response.ok) {
    const text = await response.text().catch(() => '')
    return {
      ok: false,
      error: `Webhook gaf ${response.status}${text ? `: ${text.slice(0, 200)}` : ''}`,
    }
  }

  // Pas vastleggen nadat Make het heeft aangenomen. Mislukt dit, dan is de
  // mail wel de deur uit — daarom een duidelijke melding in plaats van doen
  // alsof er niets gebeurd is.
  const { error: insertError } = await supabase.from('lead_referral_outreach').insert({
    lead_id: lead.id,
    client_id: branding.id,
    to_email: check.email,
    from_email: lead.sending_account,
    subject,
    body,
  })

  revalidatePath(`/dashboard/lead-inbox/${lead.id}`)
  revalidatePath('/dashboard/lead-inbox')

  if (insertError) {
    return {
      ok: false,
      error:
        'De mail is verstuurd, maar kon niet worden vastgelegd. Verstuur hem niet nog een keer.',
    }
  }

  return { ok: true }
}

/** Adres waar al naartoe gemaild is voor deze doorverwijzing, of null. */
async function findSent(leadId: string): Promise<string | null> {
  const supabase = await createClient()
  const { data, error } = await supabase
    .from('lead_referral_outreach')
    .select('to_email')
    .eq('lead_id', leadId)
    .order('sent_at', { ascending: false })
    .limit(1)
    .maybeSingle()

  // Bestaat de tabel nog niet, dan mag dat het versturen niet blokkeren.
  if (error) return null
  return (data as { to_email: string } | null)?.to_email ?? null
}
