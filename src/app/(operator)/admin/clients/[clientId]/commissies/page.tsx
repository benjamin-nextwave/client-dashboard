import Link from 'next/link'
import { notFound } from 'next/navigation'
import { createAdminClient } from '@/lib/supabase/admin'
import {
  getClientCommissionCategories,
  getClientCommissionOverview,
  amsterdamDateString,
  STANDARD_COMMISSION_CATEGORIES,
} from '@/lib/data/commissions'
import { PeriodSelector } from '@/components/commissions/period-selector'
import { CategoryConfig } from './_components/category-config'
import { ClientOverview } from './_components/client-overview'

export const dynamic = 'force-dynamic'

interface PageProps {
  params: Promise<{ clientId: string }>
  searchParams: Promise<{ from?: string; to?: string }>
}

const DATE_RE = /^\d{4}-\d{2}-\d{2}$/

export default async function ClientCommissiesPage({ params, searchParams }: PageProps) {
  const [{ clientId }, { from: fromParam, to: toParam }] = await Promise.all([params, searchParams])

  const today = amsterdamDateString()
  const defaultFrom = today.slice(0, 8) + '01'
  const from = fromParam && DATE_RE.test(fromParam) ? fromParam : defaultFrom
  const to = toParam && DATE_RE.test(toParam) ? toParam : today

  const supabase = createAdminClient()
  const { data: client } = await supabase
    .from('clients')
    .select('id, company_name')
    .eq('id', clientId)
    .single()

  if (!client) notFound()

  const [categories, overview] = await Promise.all([
    getClientCommissionCategories(clientId),
    getClientCommissionOverview(clientId, from, to),
  ])

  return (
    <div className="mx-auto max-w-5xl space-y-6">
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
        <div className="text-[11px] font-semibold uppercase tracking-wide text-gray-400">Commissies</div>
        <h1 className="mt-1 text-2xl font-semibold tracking-tight text-gray-900">{client.company_name}</h1>
        <p className="mt-1 text-sm text-gray-500">
          Stel de commissie-categorieën en prijzen in, en bekijk het verdiende bedrag per periode. De aantallen vul je in tijdens de avondcontrole.
        </p>
      </header>

      <CategoryConfig
        clientId={clientId}
        categories={categories}
        standardCategories={STANDARD_COMMISSION_CATEGORIES}
      />

      <div className="space-y-4">
        <h2 className="text-sm font-semibold uppercase tracking-wide text-gray-500">Overzicht</h2>
        <PeriodSelector from={from} to={to} />
        <ClientOverview companyName={client.company_name} overview={overview} />
      </div>
    </div>
  )
}
