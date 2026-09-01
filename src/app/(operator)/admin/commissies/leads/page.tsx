import Link from 'next/link'
import { createAdminClient } from '@/lib/supabase/admin'
import {
  getAllCommissionLeads,
  getCategoriesForClients,
} from '@/lib/data/commissions'
import { getClientList } from '@/lib/data/admin-stats'
import { LeadHistory } from './_components/lead-history'

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

const ISO_DATE = /^\d{4}-\d{2}-\d{2}$/

function readParam(value: string | string[] | undefined): string | undefined {
  return typeof value === 'string' && value.trim() !== '' ? value : undefined
}

function readDateParam(value: string | string[] | undefined): string | undefined {
  const raw = readParam(value)
  return raw && ISO_DATE.test(raw) ? raw : undefined
}

interface PageProps {
  searchParams: Promise<Record<string, string | string[] | undefined>>
}

export default async function LeadGeschiedenisPage({ searchParams }: PageProps) {
  // De loopgang linkt hierheen met ?klant=&van=&tot= om meteen op de juiste
  // klant en periode uit te komen. Zonder parameters verandert er niets.
  const params = await searchParams
  const initialFilters = {
    client: readParam(params.klant),
    from: readDateParam(params.van),
    to: readDateParam(params.tot),
  }

  const [leads, clientList, campaignNames] = await Promise.all([
    getAllCommissionLeads(),
    getClientList(),
    getExistingCampaignNames(),
  ])

  // Volledige klantlijst als bewerk-opties (ook verborgen/geëxcludeerde klanten,
  // zodat historische leads altijd hun klant kunnen behouden).
  const clients = clientList
    .map((c) => ({ id: c.id, companyName: c.companyName }))
    .sort((a, b) => a.companyName.localeCompare(b.companyName))
  const categoriesByClient = await getCategoriesForClients(clients.map((c) => c.id))

  return (
    <div className="mx-auto max-w-5xl space-y-6">
      <header>
        <Link
          href="/admin/commissies"
          className="inline-flex items-center gap-1.5 text-xs font-semibold text-gray-500 transition-colors hover:text-gray-900"
        >
          <svg className="h-3.5 w-3.5" fill="none" viewBox="0 0 24 24" strokeWidth={2.5} stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" d="M10.5 19.5 3 12m0 0 7.5-7.5M3 12h18" />
          </svg>
          Terug
        </Link>
        <h1 className="mt-2 text-2xl font-semibold tracking-tight text-gray-900">Lead geschiedenis</h1>
        <p className="mt-1 text-sm text-gray-500">
          Alle leads die ooit in de commissiecontrole zijn ingevoerd. Zoek, filter, vink af, bewerk,
          verwijder en exporteer.
        </p>
      </header>

      <LeadHistory
        leads={leads}
        clients={clients}
        categoriesByClient={categoriesByClient}
        campaignNames={campaignNames}
        initialFilters={initialFilters}
      />
    </div>
  )
}
