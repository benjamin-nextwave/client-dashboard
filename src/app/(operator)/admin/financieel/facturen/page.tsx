import { getLoopgangOverview } from '@/lib/data/loopgang-overview'
import { InvoicesView } from '../../loopgang/_components/invoices-view'

export const dynamic = 'force-dynamic'

/**
 * Dezelfde facturen als op het tabblad in de loopgang, nu ook rechtstreeks
 * bereikbaar onder Financieel. Bewust dezelfde weergave en dezelfde acties: twee
 * lijsten die hetzelfde heten maar zich anders gedragen is precies hoe je in de
 * verkeerde gaat zitten werken.
 */
export default async function FacturenPage() {
  const overview = await getLoopgangOverview()

  return (
    <div className="mx-auto max-w-6xl space-y-6">
      <header>
        <h1 className="text-2xl font-semibold tracking-tight text-gray-900">Facturen</h1>
        <p className="mt-1 text-sm text-gray-500">
          Wat er de deur uit is gegaan en wat er nog binnen moet komen. De betaaltermijn is veertien
          dagen na de factuurdatum.
        </p>
      </header>

      <InvoicesView clients={overview.clients} today={overview.today} />
    </div>
  )
}
