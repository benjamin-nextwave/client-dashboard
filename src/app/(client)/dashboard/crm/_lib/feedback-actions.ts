'use server'

import { createClient } from '@/lib/supabase/server'
import type { ActionResult } from './types'

export type FeedbackKind = 'feedback' | 'klacht'

function isKind(value: unknown): value is FeedbackKind {
  return value === 'feedback' || value === 'klacht'
}

/**
 * Verstuurt feedback of een klacht over het CRM naar de Make-webhook.
 *
 * De webhook-URL staat in de omgeving, niet in de code: hij is bedoeld als
 * niet-publiek endpoint en mag dus niet in de git-repo of in de browserbundel
 * belanden.
 */
export async function sendCrmFeedback(
  kind: FeedbackKind,
  message: string
): Promise<ActionResult<undefined>> {
  if (!isKind(kind)) return { ok: false, error: 'Kies eerst Feedback of Klacht.' }

  const trimmed = message.trim()
  if (!trimmed) return { ok: false, error: 'Vul eerst je bericht in.' }
  if (trimmed.length > 5000) {
    return { ok: false, error: 'Bericht is te lang (maximaal 5000 tekens).' }
  }

  const webhookUrl = process.env.MAKE_CRM_FEEDBACK_WEBHOOK_URL
  if (!webhookUrl) {
    return {
      ok: false,
      error: 'MAKE_CRM_FEEDBACK_WEBHOOK_URL is niet geconfigureerd op de server.',
    }
  }

  const supabase = await createClient()
  const {
    data: { user },
  } = await supabase.auth.getUser()
  if (!user) return { ok: false, error: 'Niet ingelogd.' }

  const clientId = user.app_metadata?.client_id as string | undefined
  if (!clientId) return { ok: false, error: 'Geen klantaccount gekoppeld.' }

  const { data: client } = await supabase
    .from('clients')
    .select('company_name')
    .eq('id', clientId)
    .maybeSingle()

  let response: Response
  try {
    response = await fetch(webhookUrl, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        type: kind,
        bericht: trimmed,
        pagina: 'CRM',
        client_id: clientId,
        bedrijf: (client as { company_name?: string } | null)?.company_name ?? null,
        email: user.email ?? null,
        verstuurd_op: new Date().toISOString(),
      }),
    })
  } catch (err) {
    const detail = err instanceof Error ? err.message : 'onbekende fout'
    return { ok: false, error: `Verzenden mislukt: ${detail}` }
  }

  if (!response.ok) {
    const body = await response.text().catch(() => '')
    return {
      ok: false,
      error: `Verzenden mislukt (${response.status})${body ? `: ${body.slice(0, 150)}` : ''}`,
    }
  }

  console.log(`[crm:feedback] type=${kind} client=${clientId} status=verzonden`)
  return { ok: true, value: undefined }
}
