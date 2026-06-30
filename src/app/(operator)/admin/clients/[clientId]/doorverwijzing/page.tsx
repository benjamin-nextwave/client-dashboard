import Link from 'next/link'
import { notFound } from 'next/navigation'
import { createAdminClient } from '@/lib/supabase/admin'
import { getCampaignLeads } from '@/lib/data/campaign-leads'
import { getAdminContactsMap } from '@/lib/data/lead-admin-contacts'
import { AdminContactManager, type ManagerLead } from './_components/admin-contact-manager'

export const dynamic = 'force-dynamic'

interface PageProps {
  params: Promise<{ clientId: string }>
}

interface SyncedRow {
  email: string
  first_name: string | null
  last_name: string | null
  company_name: string | null
}

export default async function AdminClientReferralPage({ params }: PageProps) {
  const { clientId } = await params

  const supabase = createAdminClient()

  const { data: client } = await supabase
    .from('clients')
    .select('id, company_name')
    .eq('id', clientId)
    .single()

  if (!client) notFound()

  const companyName = (client.company_name as string) ?? ''

  // Twee bronnen samenvoegen: inbox-leads (synced_leads, positief) en
  // campagne-leads (campaign_leads of lead-inbox). Gekoppeld op e-mailadres.
  const [{ data: syncedData }, campaignLeads, contacts] = await Promise.all([
    supabase
      .from('synced_leads')
      .select('email, first_name, last_name, company_name')
      .eq('client_id', clientId)
      .eq('interest_status', 'positive')
      .order('updated_at', { ascending: false }),
    getCampaignLeads(clientId),
    getAdminContactsMap(clientId),
  ])

  // Merge in een map gekoppeld op lowercased e-mailadres.
  const byEmail = new Map<string, ManagerLead>()

  const ensure = (email: string): ManagerLead => {
    const key = email.toLowerCase()
    let entry = byEmail.get(key)
    if (!entry) {
      entry = {
        email: key,
        fullName: null,
        companyName: null,
        sources: [],
        contact: contacts.get(key) ?? null,
      }
      byEmail.set(key, entry)
    }
    return entry
  }

  for (const lead of campaignLeads) {
    if (!lead.leadEmail) continue
    const entry = ensure(lead.leadEmail)
    entry.fullName ??= lead.leadName
    entry.companyName ??= lead.leadCompany
    if (!entry.sources.includes('campaign')) entry.sources.push('campaign')
  }

  for (const row of (syncedData ?? []) as SyncedRow[]) {
    if (!row.email) continue
    const entry = ensure(row.email)
    const fullName = [row.first_name, row.last_name].filter(Boolean).join(' ')
    entry.fullName ??= fullName || null
    entry.companyName ??= row.company_name
    if (!entry.sources.includes('inbox')) entry.sources.push('inbox')
  }

  const leads = Array.from(byEmail.values()).sort((a, b) =>
    a.email.localeCompare(b.email)
  )

  return (
    <div className="mx-auto max-w-3xl space-y-6">
      <Link
        href={`/admin/clients/${clientId}`}
        className="group inline-flex items-center gap-1.5 text-xs font-semibold text-gray-500 transition-colors hover:text-indigo-600"
      >
        <svg className="h-3.5 w-3.5 transition-transform group-hover:-translate-x-0.5" fill="none" viewBox="0 0 24 24" strokeWidth={2.5} stroke="currentColor">
          <path strokeLinecap="round" strokeLinejoin="round" d="M10.5 19.5 3 12m0 0 7.5-7.5M3 12h18" />
        </svg>
        Terug naar klantoverzicht
      </Link>

      <header>
        <div className="text-[11px] font-semibold uppercase tracking-wide text-gray-400">Doorverwijzing</div>
        <h1 className="mt-1 text-2xl font-semibold tracking-tight text-gray-900">{companyName}</h1>
        <p className="mt-1 text-sm text-gray-500">
          Voeg handmatig de contactgegevens van de beslisser toe wanneer een lead
          doorverwijst (bijv. &ldquo;hiervoor moet je bij HR zijn&rdquo;). Deze
          verschijnen als een duidelijke rode notitie bij de klant — zowel in de
          inbox als bij de campagne-leads.
        </p>
      </header>

      <AdminContactManager clientId={clientId} leads={leads} />
    </div>
  )
}
