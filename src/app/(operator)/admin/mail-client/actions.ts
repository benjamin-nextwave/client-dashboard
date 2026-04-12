'use server'

import { createAdminClient } from '@/lib/supabase/admin'

const WEBHOOK_URL = 'https://hook.eu2.make.com/nex1vj9hfq211ah97c9i2shx1gkifme6'

export type MailCategory =
  | 'reminder_variants'
  | 'reminder_preview'
  | 'reminder_dnc'
  | 'reminder_multiple'
  | 'new_variants'
  | 'new_proposal'

export const MAIL_CATEGORIES: {
  id: MailCategory
  group: string
  label: string
  hasTextInput?: boolean
}[] = [
  { id: 'reminder_variants', group: 'Reminder: onboarding niet voltooid', label: 'Mailvarianten zijn nog niet goedgekeurd' },
  { id: 'reminder_preview', group: 'Reminder: onboarding niet voltooid', label: 'Voorvertoning is niet goedgekeurd' },
  { id: 'reminder_dnc', group: 'Reminder: onboarding niet voltooid', label: 'DNC is niet goedgekeurd' },
  { id: 'reminder_multiple', group: 'Reminder: onboarding niet voltooid', label: 'Meerdere stappen zijn nog niet afgerond' },
  { id: 'new_variants', group: 'Beoordeling', label: 'Nieuwe mailvarianten staan in het dashboard voor beoordeling' },
  { id: 'new_proposal', group: 'Beoordeling', label: 'Nieuw voorstel voor de campagne staat in het dashboard voor beoordeling', hasTextInput: true },
]

export async function sendClientMail(input: {
  clientId: string
  category: MailCategory
  message: string
}): Promise<{ error?: string }> {
  const supabase = createAdminClient()

  const { data: client, error: fetchError } = await supabase
    .from('clients')
    .select('id, company_name, notification_email')
    .eq('id', input.clientId)
    .single()

  if (fetchError || !client) return { error: 'Klant niet gevonden' }

  // Fetch login email
  let loginEmail: string | null = null
  const { data: profile } = await supabase
    .from('profiles')
    .select('id')
    .eq('client_id', input.clientId)
    .eq('user_role', 'client')
    .single()

  if (profile) {
    const { data: authUser } = await supabase.auth.admin.getUserById(profile.id)
    if (authUser?.user?.email) loginEmail = authUser.user.email
  }

  const categoryDef = MAIL_CATEGORIES.find((c) => c.id === input.category)

  try {
    const res = await fetch(WEBHOOK_URL, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        event: 'operator_mail_client',
        client_id: client.id,
        client_name: client.company_name,
        client_email: loginEmail,
        notification_email: client.notification_email ?? null,
        category: input.category,
        category_label: categoryDef?.label ?? input.category,
        category_group: categoryDef?.group ?? '',
        message: input.message || null,
        timestamp: new Date().toISOString(),
      }),
    })
    if (!res.ok) return { error: `Webhook faalde: ${res.status}` }
  } catch (err) {
    return { error: err instanceof Error ? err.message : 'Webhook error' }
  }

  return {}
}
