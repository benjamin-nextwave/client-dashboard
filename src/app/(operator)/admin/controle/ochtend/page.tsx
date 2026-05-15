import Link from 'next/link'
import { getClientsWithLastCheck } from '@/lib/data/controle'
import { ClientSelectionList } from './_components/client-selection-list'

export const dynamic = 'force-dynamic'

export default async function OchtendPage() {
  const clients = await getClientsWithLastCheck()

  return (
    <div className="space-y-6 pb-32">
      <div className="flex items-center justify-between">
        <div>
          <Link
            href="/admin/controle"
            className="inline-flex items-center gap-1.5 text-xs font-semibold text-gray-500 transition-colors hover:text-gray-900"
          >
            <svg className="h-3.5 w-3.5" fill="none" viewBox="0 0 24 24" strokeWidth={2.5} stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" d="M10.5 19.5 3 12m0 0 7.5-7.5M3 12h18" />
            </svg>
            Terug naar Controle
          </Link>
          <h1 className="mt-2 text-3xl font-semibold tracking-tight text-gray-900">
            Dagelijkse controle — Ochtend
          </h1>
          <p className="mt-1 text-sm text-gray-500">
            Selecteer de klanten die je vandaag wilt controleren. Oudst gecheckte klanten staan bovenaan.
          </p>
        </div>
      </div>

      <ClientSelectionList clients={clients} />
    </div>
  )
}
