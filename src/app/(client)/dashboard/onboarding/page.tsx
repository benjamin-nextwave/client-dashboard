import type { Metadata } from 'next'
import { redirect } from 'next/navigation'
import { getClientBranding } from '@/lib/client/get-client-branding'
import { createClient } from '@/lib/supabase/server'
import { OnboardingTimeline } from './_components/onboarding-timeline'
import { getTranslator } from '@/lib/i18n/server'

export const metadata: Metadata = { title: 'Onboarding' }
export const dynamic = 'force-dynamic'

export default async function OnboardingPage() {
  const client = await getClientBranding()
  if (!client) redirect('/login')

  const t = await getTranslator()
  const supabase = await createClient()

  // Check if client is in onboarding
  const { data: clientData } = await supabase
    .from('clients')
    .select('onboarding_status')
    .eq('id', client.id)
    .single()

  if (!clientData || clientData.onboarding_status !== 'onboarding') {
    redirect('/dashboard')
  }

  // Fetch steps
  const { data: steps } = await supabase
    .from('onboarding_steps')
    .select('id, title, assigned_to, sort_order, is_completed, completed_at')
    .eq('client_id', client.id)
    .order('sort_order', { ascending: true })

  return (
    <div className="mx-auto max-w-2xl">
      <h1 className="text-2xl font-bold text-gray-900">{t('onboarding.title')}</h1>
      <p className="mt-2 text-sm text-gray-500">{t('onboarding.description')}</p>

      <OnboardingTimeline steps={steps ?? []} />
    </div>
  )
}
