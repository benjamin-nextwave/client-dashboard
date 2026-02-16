'use server'

import { createClient } from '@/lib/supabase/server'

export async function updateNotificationSettings(
  notificationEmail: string | null,
  notificationsEnabled: boolean
) {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return { error: 'Niet ingelogd' }

  const clientId = user.app_metadata?.client_id as string | undefined
  if (!clientId) return { error: 'Geen klant gevonden' }

  // Store null if the notification email matches the login email (use default)
  const emailToStore =
    notificationEmail && notificationEmail.trim() !== '' && notificationEmail.trim() !== user.email
      ? notificationEmail.trim()
      : null

  const { error } = await supabase
    .from('clients')
    .update({
      notification_email: emailToStore,
      notifications_enabled: notificationsEnabled,
    })
    .eq('id', clientId)

  if (error) return { error: 'Opslaan mislukt' }
  return { success: true }
}
