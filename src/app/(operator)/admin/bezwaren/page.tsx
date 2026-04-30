import { createAdminClient } from '@/lib/supabase/admin'
import { getCampaignLeadsWithObjections } from '@/lib/data/campaign-leads'
import { ObjectionList } from './_components/objection-list'
import { CampaignLeadObjectionsSection } from './_components/campaign-lead-objections-section'

export const dynamic = 'force-dynamic'

export default async function BezwarenPage() {
  const supabase = createAdminClient()

  // Fetch objections with client name
  const { data: rawObjections } = await supabase
    .from('synced_leads')
    .select('id, email, first_name, last_name, company_name, objection_status, objection_data, client_id')
    .not('objection_status', 'is', null)
    .order('updated_at', { ascending: false })

  // Fetch client names for all unique client IDs
  const clientIds = [...new Set((rawObjections ?? []).map((o) => o.client_id))]
  const { data: clients } = clientIds.length > 0
    ? await supabase.from('clients').select('id, company_name').in('id', clientIds)
    : { data: [] }

  const clientMap = new Map((clients ?? []).map((c) => [c.id, c.company_name]))

  const objections = (rawObjections ?? []).map((o) => ({
    ...o,
    client_company_name: clientMap.get(o.client_id) ?? 'Onbekend',
  }))

  const campaignLeadObjections = await getCampaignLeadsWithObjections()
  const pendingCampaignCount = campaignLeadObjections.filter(
    (l) => l.objectionStatus === 'pending'
  ).length

  return (
    <div className="space-y-10">
      <div>
        <h2 className="text-2xl font-bold text-gray-900">Bezwaren</h2>
        <p className="mt-1 text-sm text-gray-500">
          Beoordeel ingediende bezwaren van klanten op leads.
        </p>
      </div>

      <section>
        <div className="flex items-center gap-2">
          <h3 className="text-lg font-semibold text-gray-900">Campagne lead bezwaren</h3>
          {pendingCampaignCount > 0 && (
            <span className="rounded-full bg-amber-100 px-2 py-0.5 text-xs font-semibold text-amber-800">
              {pendingCampaignCount} open
            </span>
          )}
        </div>
        <p className="mt-1 text-sm text-gray-500">
          Bezwaren op handmatig toegevoegde leads vanuit campagnes.
        </p>
        <CampaignLeadObjectionsSection leads={campaignLeadObjections} />
      </section>

      <section>
        <h3 className="text-lg font-semibold text-gray-900">Inbox bezwaren</h3>
        <p className="mt-1 text-sm text-gray-500">
          Bezwaren op positieve leads uit de Instantly-inbox.
        </p>
        <ObjectionList objections={objections} />
      </section>
    </div>
  )
}
