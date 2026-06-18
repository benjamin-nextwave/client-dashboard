import { notFound, redirect } from 'next/navigation'
import { createAdminClient } from '@/lib/supabase/admin'
import { getClientMonthlyData, type ControleShift } from '@/lib/data/controle'
import { getClientCommissionCategories } from '@/lib/data/commissions'
import type { CommissionCategory } from '@/lib/commissions-shared'
import { CheckSession } from './_components/check-session'

export const dynamic = 'force-dynamic'

interface PageProps {
  params: Promise<{ persona: string }>
  searchParams: Promise<{ ids?: string; shift?: string }>
}

interface SessionClient {
  id: string
  companyName: string
  primaryColor: string | null
  logoUrl: string | null
  isOnboarding: boolean
  monthlyContacts: number | null
  commissionCategories: CommissionCategory[]
}

async function loadSelectedClients(
  idsParam: string,
  loadCommissions: boolean
): Promise<SessionClient[]> {
  const ids = idsParam.split(',').map((s) => s.trim()).filter(Boolean)
  if (ids.length === 0) return []

  const supabase = createAdminClient()
  const { data, error } = await supabase
    .from('clients')
    .select('id, company_name, primary_color, logo_url, onboarding_status')
    .in('id', ids)

  if (error || !data) return []

  // Haal maanddata voor de huidige maand op zodat de threshold-suggesties
  // de juiste {{aantal}}-waarde kunnen tonen. Parallel om latency te
  // beperken bij grotere selecties.
  const now = new Date()
  const year = now.getFullYear()
  const month = now.getMonth() + 1

  const monthlyById = new Map<string, number | null>()
  const categoriesById = new Map<string, CommissionCategory[]>()
  await Promise.all(
    data.map(async (c) => {
      const row = await getClientMonthlyData(c.id, year, month)
      monthlyById.set(c.id, row?.contactsToApproach ?? null)
      if (loadCommissions) {
        categoriesById.set(c.id, await getClientCommissionCategories(c.id))
      }
    })
  )

  // Preserve the original order from the URL (operator's order of selection).
  const byId = new Map(data.map((c) => [c.id, c]))
  return ids
    .map((id) => {
      const c = byId.get(id)
      if (!c) return null
      return {
        id: c.id,
        companyName: c.company_name,
        primaryColor: c.primary_color,
        logoUrl: c.logo_url,
        isOnboarding: (c.onboarding_status ?? 'live') === 'onboarding',
        monthlyContacts: monthlyById.get(c.id) ?? null,
        commissionCategories: categoriesById.get(c.id) ?? [],
      } satisfies SessionClient
    })
    .filter((c): c is SessionClient => c !== null)
}

export default async function OchtendSessiePage({ params, searchParams }: PageProps) {
  const [{ persona }, { ids, shift: shiftParam }] = await Promise.all([params, searchParams])
  if (persona !== 'benjamin' && persona !== 'merlijn') notFound()
  if (!ids) redirect(`/admin/controle/ochtend/${persona}`)

  const shift: ControleShift | null =
    persona === 'benjamin' && (shiftParam === 'ochtend' || shiftParam === 'avond')
      ? shiftParam
      : null

  // Benjamin moet altijd een ronde hebben gekozen; zonder shift terug naar
  // de ronde-keuze.
  if (persona === 'benjamin' && shift === null) {
    redirect('/admin/controle/ochtend/benjamin')
  }

  const clients = await loadSelectedClients(ids, persona === 'benjamin' && shift === 'avond')
  if (clients.length === 0) notFound()

  return <CheckSession clients={clients} persona={persona} shift={shift} />
}
