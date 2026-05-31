import Link from 'next/link'
import { createAdminClient } from '@/lib/supabase/admin'
import { WheelStage } from './_components/wheel-stage'

export const dynamic = 'force-dynamic'
export const metadata = { title: 'Rad van fortuin' }

export default async function WheelPage() {
  const admin = createAdminClient()

  const [{ data: clientsData }, { data: pickedData }] = await Promise.all([
    admin
      .from('clients')
      .select('id, company_name, primary_color, logo_url, is_hidden')
      .order('company_name', { ascending: true }),
    admin
      .from('wheel_picks')
      .select('client_id, picked_at')
      .order('picked_at', { ascending: false }),
  ])

  const allClients = (clientsData ?? [])
    .filter((c) => !c.is_hidden)
    .map((c) => ({
      id: c.id as string,
      name: (c.company_name as string) ?? '',
      color: (c.primary_color as string | null) ?? null,
      logo: (c.logo_url as string | null) ?? null,
    }))

  const pickedRows = (pickedData ?? []) as Array<{ client_id: string; picked_at: string }>
  const pickedMap = new Map<string, string>()
  for (const row of pickedRows) {
    pickedMap.set(row.client_id, row.picked_at)
  }

  const remaining = allClients.filter((c) => !pickedMap.has(c.id))
  const history = pickedRows
    .map((row) => {
      const c = allClients.find((cl) => cl.id === row.client_id)
      if (!c) return null
      return {
        id: c.id,
        name: c.name,
        color: c.color,
        logo: c.logo,
        pickedAt: row.picked_at,
      }
    })
    .filter((x): x is { id: string; name: string; color: string | null; logo: string | null; pickedAt: string } => x !== null)

  return (
    <div className="relative min-h-[calc(100vh-4rem)] overflow-hidden bg-gradient-to-br from-slate-950 via-violet-950 to-slate-900 text-white">
      {/* Backdrop pattern */}
      <div className="pointer-events-none absolute inset-0 bg-[radial-gradient(circle_at_20%_30%,rgba(244,114,182,0.18),transparent_40%),radial-gradient(circle_at_80%_70%,rgba(251,191,36,0.15),transparent_40%),radial-gradient(circle_at_50%_50%,rgba(99,102,241,0.12),transparent_50%)]" />
      <div className="pointer-events-none absolute inset-0 bg-[linear-gradient(to_bottom,transparent_70%,rgba(2,6,23,0.6))]" />

      <div className="relative mx-auto max-w-7xl px-4 py-6 sm:px-6 lg:px-10">
        <div className="mb-6 flex items-center justify-between">
          <Link
            href="/admin"
            className="group inline-flex items-center gap-1.5 text-xs font-semibold text-white/70 transition-colors hover:text-white"
          >
            <svg className="h-3.5 w-3.5 transition-transform group-hover:-translate-x-0.5" fill="none" viewBox="0 0 24 24" strokeWidth={2.5} stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" d="M10.5 19.5 3 12m0 0 7.5-7.5M3 12h18" />
            </svg>
            Terug naar admin
          </Link>
          <div className="text-[10px] font-semibold uppercase tracking-[0.2em] text-white/50">
            Rad van fortuin
          </div>
        </div>

        <WheelStage allCount={allClients.length} remaining={remaining} history={history} />
      </div>
    </div>
  )
}
