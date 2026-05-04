import type { Metadata } from 'next'
import { LeadTable } from './_components/lead-table'
import { HARDCODED_CUSTOMER_ID } from './_lib/constants'
import { getLeadsForCustomer } from './_lib/queries'

export const metadata: Metadata = { title: 'Lead Inbox' }
export const dynamic = 'force-dynamic'

export default async function LeadInboxPage() {
  const leads = await getLeadsForCustomer(HARDCODED_CUSTOMER_ID)

  return (
    <div>
      <h1 className="text-2xl font-bold text-gray-900">Lead Inbox</h1>
      <p className="mt-1 text-sm text-gray-600">
        Positieve replies vanuit Instantly, gesynchroniseerd via Make naar Supabase.
      </p>

      <div className="mt-3 flex items-start gap-2.5 rounded-lg border border-blue-200 bg-blue-50 px-4 py-3">
        <svg
          className="mt-0.5 h-4 w-4 shrink-0 text-blue-500"
          fill="none"
          viewBox="0 0 24 24"
          strokeWidth={1.5}
          stroke="currentColor"
        >
          <path
            strokeLinecap="round"
            strokeLinejoin="round"
            d="M11.25 11.25l.041-.02a.75.75 0 011.063.852l-.708 2.836a.75.75 0 001.063.853l.041-.021M21 12a9 9 0 11-18 0 9 9 0 0118 0zm-9-3.75h.008v.008H12V8.25z"
          />
        </svg>
        <p className="text-xs leading-relaxed text-blue-800">
          <span className="font-semibold">Sprint 1 — preview:</span> deze pagina staat los van de
          bestaande inbox. Customer-filter is hardcoded op de test-klant; auth & multi-tenant logic volgt
          in een latere sprint.
        </p>
      </div>

      <div className="mt-6">
        <LeadTable leads={leads} />
      </div>
    </div>
  )
}
