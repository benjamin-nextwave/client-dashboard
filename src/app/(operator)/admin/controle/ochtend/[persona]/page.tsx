import Link from 'next/link'
import { notFound } from 'next/navigation'
import { getClientsWithLastCheck } from '@/lib/data/controle'
import { ClientSelectionList } from '../_components/client-selection-list'

export const dynamic = 'force-dynamic'

interface PageProps {
  params: Promise<{ persona: string }>
}

const PERSONA_LABEL: Record<'benjamin' | 'merlijn', string> = {
  benjamin: 'Benjamin',
  merlijn: 'Merlijn',
}

export default async function OchtendPersonaPage({ params }: PageProps) {
  const { persona } = await params
  if (persona !== 'benjamin' && persona !== 'merlijn') notFound()

  const clients = await getClientsWithLastCheck()
  const label = PERSONA_LABEL[persona]

  return (
    <div className="space-y-6 pb-32">
      <div className="flex items-center justify-between">
        <div>
          <Link
            href="/admin/controle/ochtend"
            className="inline-flex items-center gap-1.5 text-xs font-semibold text-gray-500 transition-colors hover:text-gray-900"
          >
            <svg className="h-3.5 w-3.5" fill="none" viewBox="0 0 24 24" strokeWidth={2.5} stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" d="M10.5 19.5 3 12m0 0 7.5-7.5M3 12h18" />
            </svg>
            Andere persoon kiezen
          </Link>
          <h1 className="mt-2 text-3xl font-semibold tracking-tight text-gray-900">
            Dagelijkse controle — {label}
          </h1>
          <p className="mt-1 text-sm text-gray-500">
            Selecteer de klanten die je vandaag wilt controleren. Oudst gecheckte klanten staan bovenaan.
          </p>
        </div>
      </div>

      <ClientSelectionList clients={clients} persona={persona} />
    </div>
  )
}
