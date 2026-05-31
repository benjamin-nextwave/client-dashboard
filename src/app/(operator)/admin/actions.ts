'use server'

import { createClient } from '@/lib/supabase/server'
import { createAdminClient } from '@/lib/supabase/admin'

const APPROVAL_REMINDER_WEBHOOK =
  'https://nextwave-inbox-n8n-u72564.vm.elestio.app/webhook/74c4b519-9542-434e-aa5b-48fdcf8b7f37'

type ActionResult = { error?: string; success?: true }

interface ReminderPayload {
  client_id: string
  company_name: string
  email: string
  pending_items: Array<{ type: string; label: string; since: string; count?: number }>
  triggered_at: string
}

export async function sendApprovalReminder(
  clientId: string,
  pendingItems: ReminderPayload['pending_items']
): Promise<ActionResult> {
  const supabase = await createClient()
  const {
    data: { user },
  } = await supabase.auth.getUser()
  if (!user) return { error: 'Niet ingelogd.' }
  if (user.app_metadata?.user_role !== 'operator') return { error: 'Geen toegang.' }

  const admin = createAdminClient()

  const { data: client } = await admin
    .from('clients')
    .select('id, company_name, notification_email')
    .eq('id', clientId)
    .single()

  if (!client) return { error: 'Klant niet gevonden.' }

  // Login-email opvragen via profiles → auth.users.
  let email: string | null = null
  const { data: profile } = await admin
    .from('profiles')
    .select('id')
    .eq('client_id', clientId)
    .eq('user_role', 'client')
    .single()

  if (profile) {
    const { data: authUser } = await admin.auth.admin.getUserById(profile.id)
    if (authUser?.user?.email) email = authUser.user.email
  }

  // Fallback op notification_email.
  if (!email) {
    const notificationEmail = (client as { notification_email?: string | null }).notification_email
    if (notificationEmail) email = notificationEmail
  }

  if (!email) return { error: 'Geen mailadres bekend voor deze klant.' }

  const companyName = (client as { company_name?: string }).company_name ?? 'Onbekend'

  const payload: ReminderPayload = {
    client_id: clientId,
    company_name: companyName,
    email,
    pending_items: pendingItems,
    triggered_at: new Date().toISOString(),
  }

  try {
    const res = await fetch(APPROVAL_REMINDER_WEBHOOK, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(payload),
    })
    if (!res.ok) {
      return { error: `Webhook gaf status ${res.status}.` }
    }
  } catch (err) {
    return {
      error: `Webhook-fout: ${err instanceof Error ? err.message : String(err)}`,
    }
  }

  return { success: true }
}
