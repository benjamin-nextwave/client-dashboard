import Link from 'next/link'
import { notFound } from 'next/navigation'
import { createAdminClient } from '@/lib/supabase/admin'
import { getCampaignLeads, groupLeadsByWeek, LABEL_META } from '@/lib/data/campaign-leads'
import { LeadFormDialog } from './_components/lead-form-dialog'
import { LeadsTable } from './_components/leads-table'

export const dynamic = 'force-dynamic'
export const metadata = { title: 'Campagne leads' }

interface Props {
  params: Promise<{ clientId: string }>
}

export default async function OperatorCampaignLeadsPage({ params }: Props) {
  const { clientId } = await params

  const supabase = createAdminClient()
  const { data: client } = await supabase
    .from('clients')
    .select('id, company_name')
    .eq('id', clientId)
    .single()

  if (!client) notFound()

  const leads = await getCampaignLeads(clientId)
  const weekGroups = groupLeadsByWeek(leads)

  // Telling per label
  const counts = leads.reduce<Record<string, number>>((acc, l) => {
    acc[l.label] = (acc[l.label] ?? 0) + 1
    return acc
  }, {})

  const pendingObjections = leads.filter((l) => l.objectionStatus === 'pending').length

  return (
    <div className="mx-auto max-w-6xl">
      <Link
        href={`/admin/clients/${clientId}/edit`}
        className="group inline-flex items-center gap-1.5 text-xs font-semibold text-gray-500 transition-colors hover:text-indigo-600"
      >
        <svg className="h-3.5 w-3.5 transition-transform group-hover:-translate-x-0.5" fill="none" viewBox="0 0 24 24" strokeWidth={2.5} stroke="currentColor">
          <path strokeLinecap="round" strokeLinejoin="round" d="M10.5 19.5 3 12m0 0 7.5-7.5M3 12h18" />
        </svg>
        Terug naar klant
      </Link>

      <div className="mt-5 flex flex-wrap items-end justify-between gap-4">
        <div>
          <div className="text-[11px] font-semibold uppercase tracking-wide text-gray-400">
            Campagne leads
          </div>
          <h1 className="mt-1 text-3xl font-semibold tracking-tight text-gray-900">
            {client.company_name}
          </h1>
          <p className="mt-1 text-sm text-gray-500">
            Beheer leads die uit de campagne komen. De klant ziet ze read-only op haar dashboard.
          </p>
        </div>

        <LeadFormDialog
          clientId={clientId}
          mode="create"
          trigger={
            <span className="inline-flex items-center gap-2 rounded-lg bg-gray-900 px-4 py-2 text-sm font-semibold text-white shadow-sm transition-colors hover:bg-gray-800">
              <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" strokeWidth={2} stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" d="M12 4.5v15m7.5-7.5h-15" />
              </svg>
              Lead toevoegen
            </span>
          }
        />
      </div>

      {/* Stats per label */}
      <div className="mt-6 grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-4">
        <StatCard label="Totaal" value={leads.length} accent="bg-gray-900" />
        {Object.entries(LABEL_META).map(([key, meta]) => (
          <StatCard
            key={key}
            label={meta.short}
            value={counts[key] ?? 0}
            accent={meta.dot}
          />
        ))}
      </div>

      {pendingObjections > 0 && (
        <Link
          href="/admin/bezwaren"
          className="mt-6 flex items-center justify-between gap-3 rounded-xl border border-amber-200 bg-amber-50 px-4 py-3 transition-colors hover:bg-amber-100"
        >
          <div className="flex items-center gap-3">
            <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-amber-200 text-amber-800">
              <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" strokeWidth={2} stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" d="M12 9v3.75m9-.75a9 9 0 1 1-18 0 9 9 0 0 1 18 0Zm-9 3.75h.008v.008H12v-.008Z" />
              </svg>
            </div>
            <div>
              <p className="text-sm font-semibold text-amber-900">
                {pendingObjections} open {pendingObjections === 1 ? 'bezwaar' : 'bezwaren'} op leads van deze klant
              </p>
              <p className="text-xs text-amber-700">Beoordeel ze in het centrale bezwaren-overzicht.</p>
            </div>
          </div>
          <span className="text-xs font-semibold text-amber-800">Behandelen →</span>
        </Link>
      )}

      <div className="mt-8">
        {leads.length === 0 ? (
          <div className="rounded-xl border border-dashed border-gray-300 bg-white px-6 py-16 text-center">
            <p className="text-sm font-medium text-gray-700">Nog geen leads voor deze klant</p>
            <p className="mt-1 text-xs text-gray-500">
              Klik op &ldquo;Lead toevoegen&rdquo; om de eerste lead vast te leggen.
            </p>
          </div>
        ) : (
          <LeadsTable clientId={clientId} weekGroups={weekGroups} />
        )}
      </div>
    </div>
  )
}

function StatCard({ label, value, accent }: { label: string; value: number; accent: string }) {
  return (
    <div className="rounded-xl border border-gray-200 bg-white p-4">
      <div className="flex items-center gap-2">
        <span className={`h-1.5 w-1.5 rounded-full ${accent}`} />
        <p className="text-[11px] font-semibold uppercase tracking-wide text-gray-500">{label}</p>
      </div>
      <p className="mt-2 text-2xl font-bold text-gray-900">{value}</p>
    </div>
  )
}
