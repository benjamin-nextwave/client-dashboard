import Link from 'next/link'
import { notFound } from 'next/navigation'
import { createAdminClient } from '@/lib/supabase/admin'
import { AdminContactManager, type ManagerLead } from './_components/admin-contact-manager'

export const dynamic = 'force-dynamic'

interface PageProps {
  params: Promise<{ clientId: string }>
}

interface LeadRow {
  id: string
  email: string
  first_name: string | null
  last_name: string | null
  company_name: string | null
  updated_at: string | null
  admin_contact_name: string | null
  admin_contact_email: string | null
  admin_contact_linkedin_url: string | null
  admin_contact_job_title: string | null
  admin_contact_none: boolean | null
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

  const { data: leadsData } = await supabase
    .from('synced_leads')
    .select(
      'id, email, first_name, last_name, company_name, updated_at, admin_contact_name, admin_contact_email, admin_contact_linkedin_url, admin_contact_job_title, admin_contact_none'
    )
    .eq('client_id', clientId)
    .eq('interest_status', 'positive')
    .order('updated_at', { ascending: false })

  const rows = (leadsData ?? []) as LeadRow[]

  // Deduplicate by email — keep the most recent occurrence (rows are ordered desc).
  const seen = new Set<string>()
  const leads: ManagerLead[] = []
  for (const row of rows) {
    const key = row.email.toLowerCase()
    if (seen.has(key)) continue
    seen.add(key)
    const fullName = [row.first_name, row.last_name].filter(Boolean).join(' ')
    leads.push({
      id: row.id,
      email: row.email,
      fullName: fullName || null,
      companyName: row.company_name,
      contact: {
        name: row.admin_contact_name,
        email: row.admin_contact_email,
        linkedinUrl: row.admin_contact_linkedin_url,
        jobTitle: row.admin_contact_job_title,
        none: row.admin_contact_none ?? false,
      },
    })
  }

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
          verschijnen als een duidelijke rode notitie in de inbox van de klant.
        </p>
      </header>

      <AdminContactManager clientId={clientId} leads={leads} />
    </div>
  )
}
