'use server'

import { createClient } from '@/lib/supabase/server'
import { HARDCODED_CUSTOMER_ID } from './constants'
import type { Lead } from './types'

export type SendReplyResult = { ok: true } | { ok: false; error: string }

const WEBHOOK_URL = process.env.MAKE_OUTBOUND_WEBHOOK_URL

export async function sendReply(
  leadId: string,
  body: string
): Promise<SendReplyResult> {
  const trimmed = body.trim()
  if (!trimmed) return { ok: false, error: 'Bericht mag niet leeg zijn.' }

  if (!WEBHOOK_URL) {
    return {
      ok: false,
      error:
        'MAKE_OUTBOUND_WEBHOOK_URL is niet geconfigureerd op de server.',
    }
  }

  // Lead ophalen: we hebben de laatste inbound reply nodig (in_reply_to_email_id)
  // en het sending_account waar Instantly vanuit moet antwoorden.
  const supabase = await createClient()
  const { data: leadRow, error: leadError } = await supabase
    .from('leads')
    .select('id, sending_account, replies')
    .eq('customer_id', HARDCODED_CUSTOMER_ID)
    .eq('id', leadId)
    .maybeSingle()

  if (leadError) return { ok: false, error: leadError.message }
  if (!leadRow) return { ok: false, error: 'Lead niet gevonden.' }

  const lead = leadRow as unknown as Pick<
    Lead,
    'id' | 'sending_account' | 'replies'
  >

  // Laatste reply (chronologisch). Make beantwoordt altijd de meest recente.
  const sortedReplies = [...lead.replies].sort(
    (a, b) =>
      new Date(b.received_at).getTime() - new Date(a.received_at).getTime()
  )
  const latestReply = sortedReplies[0]
  if (!latestReply?.instantly_email_id) {
    return {
      ok: false,
      error: 'Geen reply gevonden om op te reageren.',
    }
  }

  let response: Response
  try {
    response = await fetch(WEBHOOK_URL, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        instantly_email_id: latestReply.instantly_email_id,
        sending_account: lead.sending_account,
        body_text: trimmed,
      }),
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

  return { ok: true }
}
