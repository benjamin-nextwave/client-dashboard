import Link from 'next/link'
import { createAdminClient } from '@/lib/supabase/admin'
import { listCampaigns } from '@/lib/instantly/client'
import { ClientForm } from '@/components/admin/client-form'
import { updateClient } from '../../actions'

export const dynamic = 'force-dynamic'

interface EditClientPageProps {
  params: Promise<{ clientId: string }>
}

export default async function EditClientPage({ params }: EditClientPageProps) {
  const { clientId } = await params

  const supabase = createAdminClient()

  // Fetch client data
  const { data: client, error: clientError } = await supabase
    .from('clients')
    .select('*')
    .eq('id', clientId)
    .single()

  if (clientError || !client) {
    return (
      <div className="mx-auto max-w-2xl">
        <div className="mb-6">
          <Link
            href="/admin"
            className="text-sm text-gray-500 hover:text-gray-700"
          >
            &larr; Terug naar overzicht
          </Link>
        </div>
        <div className="rounded-md bg-red-50 p-4 text-sm text-red-700">
          Klant niet gevonden
        </div>
      </div>
    )
  }

  // Fetch client's current campaigns
  const { data: clientCampaigns } = await supabase
    .from('client_campaigns')
    .select('campaign_id, campaign_name')
    .eq('client_id', clientId)

  const selectedCampaignIds = clientCampaigns?.map((c) => c.campaign_id) ?? []

  // Fetch client's auth user email
  let clientEmail = ''
  const { data: profile } = await supabase
    .from('profiles')
    .select('id')
    .eq('client_id', clientId)
    .eq('user_role', 'client')
    .single()

  if (profile) {
    const { data: authUser } = await supabase.auth.admin.getUserById(profile.id)
    if (authUser?.user?.email) {
      clientEmail = authUser.user.email
    }
  }

  // Fetch available campaigns from Instantly API
  let campaigns: { id: string; name: string }[] = []
  let campaignWarning: string | null = null

  try {
    if (!process.env.INSTANTLY_API_KEY) {
      campaignWarning = 'INSTANTLY_API_KEY is niet geconfigureerd. Campagnes kunnen niet worden opgehaald.'
    } else {
      const result = await listCampaigns({ limit: 100 })
      campaigns = result.items.map((c) => ({ id: c.id, name: c.name }))
    }
  } catch (err) {
    campaignWarning = 'Campagnes konden niet worden opgehaald van Instantly.'
    console.warn('Failed to fetch campaigns:', err)
  }

  // Bind clientId to updateClient action
  const boundUpdate = updateClient.bind(null, clientId)

  return (
    <div className="mx-auto max-w-2xl">
      <div className="mb-6 flex items-center gap-4">
        <Link
          href="/admin"
          className="text-sm text-gray-500 hover:text-gray-700"
        >
          &larr; Terug naar overzicht
        </Link>
      </div>

      <div className="mb-6 flex items-center justify-between">
        <h2 className="text-2xl font-bold text-gray-900">
          Klant bewerken: {client.company_name}
        </h2>
        <Link
          href={`/admin/clients/${clientId}/csv`}
          className="rounded-md bg-gray-100 px-4 py-2 text-sm font-medium text-gray-700 hover:bg-gray-200"
        >
          CSV Beheer
        </Link>
      </div>

      {campaignWarning && (
        <div className="mb-4 rounded-md bg-yellow-50 p-4 text-sm text-yellow-700">
          {campaignWarning}
        </div>
      )}

      <div className="rounded-lg bg-white p-6 shadow-sm">
        <ClientForm
          action={boundUpdate}
          defaultValues={{
            companyName: client.company_name,
            email: clientEmail,
            primaryColor: client.primary_color,
            isRecruitment: client.is_recruitment,
            meetingUrl: client.meeting_url ?? '',
          }}
          campaigns={campaigns}
          selectedCampaignIds={selectedCampaignIds}
          currentLogoUrl={client.logo_url}
          isEditing={true}
          originalEmail={clientEmail}
        />
      </div>
    </div>
  )
}
