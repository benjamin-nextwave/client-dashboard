import type { Metadata } from 'next'
import { redirect } from 'next/navigation'
import { createClient } from '@/lib/supabase/server'
import {
  getCampaignLeads,
  groupLeadsByWeek,
  isLeadLabel,
  type LeadLabel,
} from '@/lib/data/campaign-leads'
import { LeadsOverview } from './_components/leads-overview'
import { EmptyState } from '@/components/ui/empty-state'

export const metadata: Metadata = { title: 'Campagne leads' }
export const dynamic = 'force-dynamic'

interface PageProps {
  searchParams: Promise<{ label?: string }>
}

export default async function CampagneLeadsPage({ searchParams }: PageProps) {
  const supabase = await createClient()
  const {
    data: { user },
  } = await supabase.auth.getUser()
  if (!user) redirect('/login')

  const clientId = user.app_metadata?.client_id as string | undefined
  if (!clientId) redirect('/login')

  const params = await searchParams
  const labelFilter: LeadLabel | null = isLeadLabel(params.label) ? params.label : null

  const leads = await getCampaignLeads(clientId)
  const filtered = labelFilter ? leads.filter((l) => l.label === labelFilter) : leads
  const weekGroups = groupLeadsByWeek(filtered)

  return (
    <div>
      <div className="mb-6">
        <h1 className="text-2xl font-semibold tracking-tight text-gray-900">Campagne leads</h1>
        <p className="mt-1 text-sm text-gray-500">
          Overzicht van leads die uit je campagne zijn voortgekomen, met de verzonden mail en de
          ontvangen reactie.
        </p>
      </div>

      {leads.length === 0 ? (
        <EmptyState
          icon={
            <svg className="h-6 w-6" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" d="M2.25 18.75a60.07 60.07 0 0 1 15.797 2.101c.727.198 1.453-.342 1.453-1.096V18.75M3.75 4.5v.75A.75.75 0 0 1 3 6h-.75m0 0v-.375c0-.621.504-1.125 1.125-1.125H20.25M2.25 6v9m18-10.5v.75c0 .414.336.75.75.75h.75m-1.5-1.5h.375c.621 0 1.125.504 1.125 1.125v9.75c0 .621-.504 1.125-1.125 1.125h-.375m1.5-1.5H21a.75.75 0 0 0-.75.75v.75m0 0H3.75m0 0h-.375a1.125 1.125 0 0 1-1.125-1.125V15m1.5 1.5v-.75A.75.75 0 0 0 3 15h-.75M15 10.5a3 3 0 1 1-6 0 3 3 0 0 1 6 0Zm3 0h.008v.008H18V10.5Zm-12 0h.008v.008H6V10.5Z" />
            </svg>
          }
          title="Nog geen campagne leads"
          description="Zodra er leads uit je campagne komen, verschijnen ze hier overzichtelijk per week."
        />
      ) : (
        <LeadsOverview
          allLeads={leads}
          weekGroups={weekGroups}
          activeLabel={labelFilter}
        />
      )}
    </div>
  )
}
