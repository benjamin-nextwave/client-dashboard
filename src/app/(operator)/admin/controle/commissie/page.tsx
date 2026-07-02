import Link from 'next/link'
import { createAdminClient } from '@/lib/supabase/admin'
import {
  getCommissionControlClients,
  getCategoriesForClients,
} from '@/lib/data/commissions'
import { CommissionControl } from './_components/commission-control'

export const dynamic = 'force-dynamic'

async function getExistingCampaignNames(): Promise<string[]> {
  const supabase = createAdminClient()
  const { data } = await supabase
    .from('operator_commission_leads')
    .select('campaign_name')
    .not('campaign_name', 'eq', '')
    .limit(1000)
  const names = new Set<string>()
  for (const r of (data ?? []) as Array<{ campaign_name: string }>) {
    if (r.campaign_name) names.add(r.campaign_name)
  }
  return Array.from(names).sort((a, b) => a.localeCompare(b))
}

export default async function CommissieControlePage() {
  const clients = await getCommissionControlClients()
  const [categoriesByClient, campaignNames] = await Promise.all([
    getCategoriesForClients(clients.map((c) => c.id)),
    getExistingCampaignNames(),
  ])

  return (
    <div className="space-y-6 pb-32">
      <div>
        <Link
          href="/admin/controle/ochtend/benjamin"
          className="inline-flex items-center gap-1.5 text-xs font-semibold text-gray-500 transition-colors hover:text-gray-900"
        >
          <svg className="h-3.5 w-3.5" fill="none" viewBox="0 0 24 24" strokeWidth={2.5} stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" d="M10.5 19.5 3 12m0 0 7.5-7.5M3 12h18" />
          </svg>
          Andere ronde kiezen
        </Link>
        <h1 className="mt-2 text-3xl font-semibold tracking-tight text-gray-900">
          Commissiecontrole
        </h1>
        <p className="mt-1 text-sm text-gray-500">
          Voer per lead de commissie in. Klik op het plusje om een blok toe te voegen; elk nieuw blok
          neemt de klant van het vorige over. Klik onderaan op Opslaan.
        </p>
      </div>

      <CommissionControl
        clients={clients}
        categoriesByClient={categoriesByClient}
        campaignNames={campaignNames}
      />
    </div>
  )
}
