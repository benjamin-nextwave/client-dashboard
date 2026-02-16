import type { Metadata } from 'next'
import { redirect } from 'next/navigation'
import { getClientBranding } from '@/lib/client/get-client-branding'
import { createClient } from '@/lib/supabase/server'
import { PreferencesForm } from './_components/preferences-form'

export const metadata: Metadata = { title: 'Voorkeuren' }
export const dynamic = 'force-dynamic'

export default async function VoorkeurenPage() {
  const client = await getClientBranding()
  if (!client) redirect('/login')

  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) redirect('/login')

  const { data: profile } = await supabase
    .from('profiles')
    .select('display_name')
    .eq('id', user.id)
    .single()

  const { data: clientSettings } = await supabase
    .from('clients')
    .select('notification_email, notifications_enabled')
    .eq('id', client.id)
    .single()

  return (
    <div>
      <h1 className="text-2xl font-bold text-gray-900">Voorkeuren</h1>
      <p className="mt-1 text-sm text-gray-600">
        Beheer uw accountinstellingen en voorkeuren.
      </p>

      <div className="mt-6 space-y-6">
        <PreferencesForm
          email={user.email ?? ''}
          displayName={profile?.display_name ?? ''}
          companyName={client.company_name}
          notificationEmail={clientSettings?.notification_email ?? null}
          notificationsEnabled={clientSettings?.notifications_enabled ?? true}
        />
      </div>
    </div>
  )
}
