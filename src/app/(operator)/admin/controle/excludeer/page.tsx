import Link from 'next/link'
import { getExcludedSplit } from '@/lib/data/controle'
import { ExclusionLists } from './_components/exclusion-lists'

export const dynamic = 'force-dynamic'

export default async function ExcludeerPage() {
  const { excluded, available } = await getExcludedSplit()

  return (
    <div className="space-y-6">
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
          Geëxcludeerde bedrijven
        </h1>
        <p className="mt-1 text-sm text-gray-500">
          Geëxcludeerde bedrijven verdwijnen uit de Dagelijkse controle. Je kunt ze hier altijd weer terugzetten.
        </p>
      </div>

      <ExclusionLists excluded={excluded} available={available} />
    </div>
  )
}
