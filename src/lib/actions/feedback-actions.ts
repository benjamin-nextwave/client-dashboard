'use server'

import { z } from 'zod'
import { revalidatePath } from 'next/cache'
import { createClient } from '@/lib/supabase/server'
import { createAdminClient } from '@/lib/supabase/admin'
import { VARIANT_REASONS } from '@/lib/data/feedback-types'
import { getLocaleForWebhook, getLocaleForUser } from '@/lib/i18n/server'
import { LOCALE_ENGLISH_NAMES } from '@/lib/i18n'

const WEBHOOK_FEEDBACK_SUBMITTED = 'https://hook.eu2.make.com/kef3iqn8i45ndloebambpsqlvc69zrhs'
const WEBHOOK_FEEDBACK_REPLY = 'https://hook.eu2.make.com/m1efmwo1fg7id6ckc415m4oqd81adxl3'

// --- Schemas ---

const FeedbackMetadataSchema = z
  .object({
    variant_reasons: z.array(z.enum(VARIANT_REASONS)).optional(),
  })
  .nullable()
  .optional()

const SubmitFeedbackSchema = z.object({
  category: z.enum([
    'bug',
    'new_feature',
    'optimization',
    'other',
    'campaign_performance',
    'new_mail_variants',
  ]),
  title: z.string().min(1, 'Titel is verplicht.').max(200, 'Titel mag maximaal 200 tekens bevatten.'),
  description: z
    .string()
    .min(1, 'Beschrijving is verplicht.')
    .max(5000, 'Beschrijving mag maximaal 5000 tekens bevatten.'),
  metadata: FeedbackMetadataSchema,
})

const UpdateFeedbackStatusSchema = z.object({
  id: z.string().uuid(),
  status: z.enum(['new', 'in_progress', 'thinking', 'denied', 'applied']),
  operator_response: z.string().max(5000).nullable(),
})

// --- Types ---

type ActionResult = { success: true } | { error: string }

// --- Actions ---

export async function submitFeedback(input: {
  category: string
  title: string
  description: string
  metadata?: { variant_reasons?: string[] } | null
}): Promise<ActionResult> {
  const parsed = SubmitFeedbackSchema.safeParse(input)
  if (!parsed.success) {
    return { error: parsed.error.errors[0]?.message ?? 'Ongeldige invoer.' }
  }

  const supabase = await createClient()
  const {
    data: { user },
  } = await supabase.auth.getUser()
  if (!user) return { error: 'Niet ingelogd.' }

  const clientId = user.app_metadata?.client_id as string | undefined
  if (!clientId) return { error: 'Geen klant gevonden.' }

  const { data: client } = await supabase
    .from('clients')
    .select('company_name')
    .eq('id', clientId)
    .single()

  const { error } = await supabase.from('feedback_requests').insert({
    client_id: clientId,
    user_id: user.id,
    category: parsed.data.category,
    title: parsed.data.title,
    description: parsed.data.description,
    metadata: parsed.data.metadata ?? null,
  })

  if (error) {
    return { error: 'Fout bij het indienen. Probeer het opnieuw.' }
  }

  // Fire submission webhook (fire-and-forget)
  const localeInfo = await getLocaleForWebhook()
  try {
    fetch(WEBHOOK_FEEDBACK_SUBMITTED, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        event: 'feedback_submitted',
        client_id: clientId,
        company_name: client?.company_name ?? 'Onbekend',
        user_email: user.email,
        ...localeInfo,
        category: parsed.data.category,
        title: parsed.data.title,
        description: parsed.data.description,
        metadata: parsed.data.metadata ?? null,
        submitted_at: new Date().toISOString(),
      }),
    }).catch(() => {})
  } catch {}

  revalidatePath('/dashboard/feedback')
  return { success: true }
}

export async function updateFeedbackStatus(input: {
  id: string
  status: string
  operator_response: string | null
}): Promise<ActionResult> {
  const parsed = UpdateFeedbackStatusSchema.safeParse(input)
  if (!parsed.success) {
    return { error: parsed.error.errors[0]?.message ?? 'Ongeldige invoer.' }
  }

  const supabase = await createClient()
  const {
    data: { user },
  } = await supabase.auth.getUser()
  if (!user) return { error: 'Niet ingelogd.' }

  const role = user.app_metadata?.user_role as string | undefined
  if (role !== 'operator') return { error: 'Geen toegang.' }

  const admin = createAdminClient()
  const { error } = await admin
    .from('feedback_requests')
    .update({
      status: parsed.data.status,
      operator_response: parsed.data.operator_response || null,
      updated_at: new Date().toISOString(),
    })
    .eq('id', parsed.data.id)

  if (error) {
    return { error: 'Fout bij het bijwerken. Probeer het opnieuw.' }
  }

  revalidatePath('/admin/feedback')
  revalidatePath('/dashboard/feedback')
  return { success: true }
}

/**
 * Operator-triggered: notify the client by email (via Make webhook) that
 * their feedback request has a reply.
 */
export async function notifyClientFeedbackReply(
  feedbackId: string
): Promise<ActionResult> {
  const supabase = await createClient()
  const {
    data: { user },
  } = await supabase.auth.getUser()
  if (!user) return { error: 'Niet ingelogd.' }

  const role = user.app_metadata?.user_role as string | undefined
  if (role !== 'operator') return { error: 'Geen toegang.' }

  const admin = createAdminClient()

  const { data: feedback, error: fetchError } = await admin
    .from('feedback_requests')
    .select('id, client_id, category, title, description, operator_response, metadata')
    .eq('id', feedbackId)
    .single()

  if (fetchError || !feedback) return { error: 'Verzoek niet gevonden.' }

  // Get client name + login email
  const { data: client } = await admin
    .from('clients')
    .select('id, company_name, notification_email')
    .eq('id', feedback.client_id)
    .single()

  if (!client) return { error: 'Klant niet gevonden.' }

  let loginEmail: string | null = null
  const { data: profile } = await admin
    .from('profiles')
    .select('id')
    .eq('client_id', feedback.client_id)
    .eq('user_role', 'client')
    .single()

  if (profile) {
    const { data: authUser } = await admin.auth.admin.getUserById(profile.id)
    if (authUser?.user?.email) loginEmail = authUser.user.email
  }

  // Operator triggert dit, maar de KLANT is de doelgroep van de mail —
  // gebruik dus de taal van de klant, niet die van de operator.
  const clientLocale = profile ? await getLocaleForUser(profile.id) : 'nl'

  try {
    const res = await fetch(WEBHOOK_FEEDBACK_REPLY, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        event: 'feedback_reply_notification',
        feedback_id: feedback.id,
        client_id: client.id,
        client_name: client.company_name,
        client_email: loginEmail,
        notification_email: client.notification_email ?? null,
        language: LOCALE_ENGLISH_NAMES[clientLocale],
        language_code: clientLocale,
        category: feedback.category,
        title: feedback.title,
        original_request: feedback.description,
        operator_response: feedback.operator_response,
        metadata: feedback.metadata ?? null,
        timestamp: new Date().toISOString(),
      }),
    })
    if (!res.ok) return { error: `Webhook faalde: ${res.status}` }
  } catch (err) {
    return { error: err instanceof Error ? err.message : 'Webhook error' }
  }

  return { success: true }
}
