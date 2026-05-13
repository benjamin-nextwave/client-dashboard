import { notFound, redirect } from 'next/navigation'
import { createAdminClient } from '@/lib/supabase/admin'
import { CheckSession } from './_components/check-session'

export const dynamic = 'force-dynamic'

interface PageProps {
  searchParams: Promise<{ ids?: string }>
}

interface SessionClient {
  id: string
  companyName: string
  primaryColor: string | null
  logoUrl: string | null
  isOnboarding: boolean
}

async function loadSelectedClients(idsParam: string): Promise<SessionClient[]> {
  const ids = idsParam.split(',').map((s) => s.trim()).filter(Boolean)
  if (ids.length === 0) return []

  const supabase = createAdminClient()
  const { data, error } = await supabase
    .from('clients')
    .select('id, company_name, primary_color, logo_url, onboarding_status')
    .in('id', ids)

  if (error || !data) return []

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
      } satisfies SessionClient
    })
    .filter((c): c is SessionClient => c !== null)
}

export default async function OchtendSessiePage({ searchParams }: PageProps) {
  const { ids } = await searchParams
  if (!ids) redirect('/admin/controle/ochtend')

  const clients = await loadSelectedClients(ids)
  if (clients.length === 0) notFound()

  return <CheckSession clients={clients} />
}
