'use server'

import { z } from 'zod'
import { revalidatePath } from 'next/cache'
import { createClient } from '@/lib/supabase/server'
import { createAdminClient } from '@/lib/supabase/admin'

// --- Schemas ---

const SubmitFeedbackSchema = z.object({
  category: z.enum(['bug', 'new_feature', 'optimization', 'other']),
  title: z.string().min(1, 'Titel is verplicht.').max(200, 'Titel mag maximaal 200 tekens bevatten.'),
  description: z.string().min(1, 'Beschrijving is verplicht.').max(5000, 'Beschrijving mag maximaal 5000 tekens bevatten.'),
})

const UpdateFeedbackStatusSchema = z.object({
  id: z.string().uuid(),
  status: z.enum(['new', 'in_progress', 'thinking', 'denied', 'applied']),
  operator_response: z.string().max(5000).nullable(),
})

// --- Types ---

type ActionResult = { success: true } | { error: string }

// --- Helper ---

async function getAuthClientId() {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()

  if (!user) return null

  const clientId = user.app_metadata?.client_id as string | undefined
  return clientId ?? null
}

// --- Actions ---

export async function submitFeedback(input: {
  category: string
  title: string
  description: string
}): Promise<ActionResult> {
  const parsed = SubmitFeedbackSchema.safeParse(input)
  if (!parsed.success) {
    return { error: parsed.error.errors[0]?.message ?? 'Ongeldige invoer.' }
  }

  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return { error: 'Niet ingelogd.' }

  const clientId = user.app_metadata?.client_id as string | undefined
  if (!clientId) return { error: 'Geen klant gevonden.' }

  // Get client info for webhook
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
  })

  if (error) {
    return { error: 'Fout bij het indienen. Probeer het opnieuw.' }
  }

  // Fire webhook to Make.com (non-blocking)
  try {
    fetch('https://hook.eu2.make.com/ps7xtq05l5bz6tn5md18ld666ssag9s5', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        client_id: clientId,
        company_name: client?.company_name ?? 'Onbekend',
        user_email: user.email,
        category: parsed.data.category,
        title: parsed.data.title,
        description: parsed.data.description,
        submitted_at: new Date().toISOString(),
      }),
    }).catch(() => {
      // Silently ignore webhook failures
    })
  } catch {
    // Silently ignore webhook failures
  }

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
  const { data: { user } } = await supabase.auth.getUser()
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
