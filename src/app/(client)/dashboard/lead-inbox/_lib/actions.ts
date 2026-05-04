'use server'

import { revalidatePath } from 'next/cache'
import { createClient } from '@/lib/supabase/server'
import { HARDCODED_CUSTOMER_ID } from './constants'
import type { Lead } from './types'

export type SendReplyResult =
  | { ok: true }
  | { ok: false; error: string }

export async function sendReply(
  leadId: string,
  body: string
): Promise<SendReplyResult> {
  const trimmed = body.trim()
  if (!trimmed) return { ok: false, error: 'Bericht mag niet leeg zijn.' }

  const supabase = await createClient()

  // Lead ophalen voor verzendcontext (sending_account, to_email, thread_id,
  // en de laatste inbound reply om in_reply_to + subject van te bepalen).
  const { data: leadRow, error: leadError } = await supabase
    .from('leads')
    .select(
      'id, customer_id, email, thread_id, sending_account, replies'
    )
    .eq('customer_id', HARDCODED_CUSTOMER_ID)
    .eq('id', leadId)
    .maybeSingle()

  if (leadError) return { ok: false, error: leadError.message }
  if (!leadRow) return { ok: false, error: 'Lead niet gevonden.' }

  const lead = leadRow as unknown as Pick<
    Lead,
    'id' | 'customer_id' | 'email' | 'thread_id' | 'sending_account' | 'replies'
  >

  const inboundReplies = lead.replies
    .filter((r) => r.direction !== 'outbound')
    .sort(
      (a, b) =>
        new Date(b.received_at).getTime() - new Date(a.received_at).getTime()
    )
  const lastInbound = inboundReplies[0]
  if (!lastInbound) {
    return {
      ok: false,
      error: 'Geen inkomende reply gevonden om op te reageren.',
    }
  }

  const subject = lastInbound.subject?.toLowerCase().startsWith('re:')
    ? lastInbound.subject
    : `Re: ${lastInbound.subject ?? ''}`

  const { error: insertError } = await supabase.from('outbound_replies').insert({
    lead_id: lead.id,
    customer_id: lead.customer_id,
    in_reply_to_email_id: lastInbound.instantly_email_id,
    thread_id: lead.thread_id,
    sending_account: lead.sending_account,
    to_email: lead.email,
    subject,
    body: trimmed,
    status: 'queued',
  })

  if (insertError) return { ok: false, error: insertError.message }

  revalidatePath('/dashboard/lead-inbox')
  revalidatePath(`/dashboard/lead-inbox/${leadId}`)

  return { ok: true }
}
