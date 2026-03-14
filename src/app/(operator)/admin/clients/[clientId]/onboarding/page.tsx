import { redirect } from 'next/navigation'
import Link from 'next/link'
import { createAdminClient } from '@/lib/supabase/admin'
import { getOnboardingSteps } from '@/lib/actions/onboarding-actions'
import { OnboardingManager } from './_components/onboarding-manager'

export const dynamic = 'force-dynamic'

export default async function OnboardingPage({
  params,
}: {
  params: Promise<{ clientId: string }>
}) {
  const { clientId } = await params
  const supabase = createAdminClient()

  const { data: client } = await supabase
    .from('clients')
    .select('id, company_name, onboarding_status')
    .eq('id', clientId)
    .single()

  if (!client) redirect('/admin')

  const steps = await getOnboardingSteps(clientId)

  return (
    <div className="mx-auto max-w-3xl">
      <Link
        href="/admin"
        className="inline-flex items-center text-sm text-gray-500 hover:text-gray-700"
      >
        &larr; Terug naar overzicht
      </Link>

      <div className="mt-4 flex items-center justify-between">
        <h1 className="text-2xl font-bold text-gray-900">
          Onboarding: {client.company_name}
        </h1>
      </div>

      <OnboardingManager
        clientId={clientId}
        status={client.onboarding_status}
        initialSteps={steps}
      />
    </div>
  )
}
