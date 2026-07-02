import Link from 'next/link'
import { getAllCommissionLeads } from '@/lib/data/commissions'
import { LeadHistory } from './_components/lead-history'

export const dynamic = 'force-dynamic'

export default async function LeadGeschiedenisPage() {
  const leads = await getAllCommissionLeads()

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
          Alle leads die ooit in de commissiecontrole zijn ingevoerd. Zoek, filter, vink af en exporteer.
        </p>
      </header>

      <LeadHistory leads={leads} />
    </div>
  )
}
