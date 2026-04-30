import Link from 'next/link'
import { getClientList } from '@/lib/data/admin-stats'
import { getActivityTimeline } from '@/lib/data/activity-timeline'
import { createAdminClient } from '@/lib/supabase/admin'
import { ClientOverviewList } from './_components/client-overview-list'

export const dynamic = 'force-dynamic'

async function getOpenObjectionCounts(): Promise<{
  campaignLeads: number
  inboxLeads: number
}> {
  const admin = createAdminClient()
  const [{ count: campaignCount }, { count: inboxCount }] = await Promise.all([
    admin
      .from('campaign_leads')
      .select('id', { count: 'exact', head: true })
      .eq('objection_status', 'pending'),
    admin
      .from('synced_leads')
      .select('id', { count: 'exact', head: true })
      .eq('objection_status', 'submitted'),
  ])
  return {
    campaignLeads: campaignCount ?? 0,
    inboxLeads: inboxCount ?? 0,
  }
}

export default async function AdminPage() {
  const [clients, events, objectionCounts] = await Promise.all([
    getClientList(),
    getActivityTimeline(),
    getOpenObjectionCounts(),
  ])

  const totalOpenObjections = objectionCounts.campaignLeads + objectionCounts.inboxLeads

  const activeCount = clients.filter((c) => c.status === 'active').length
  const onboardingCount = clients.filter((c) => c.status === 'onboarding').length
  const pausedCount = clients.filter((c) => c.status === 'paused').length

  return (
    <div className="space-y-8">
      {/* Hero */}
      <section className="relative overflow-hidden rounded-3xl border border-gray-200 bg-gradient-to-br from-white via-indigo-50/40 to-violet-50/40 p-8 shadow-sm">
        <div className="pointer-events-none absolute -right-20 -top-20 h-64 w-64 rounded-full bg-gradient-to-br from-violet-400/30 to-fuchsia-400/20 blur-3xl" />
        <div className="pointer-events-none absolute -left-10 bottom-0 h-56 w-56 rounded-full bg-gradient-to-tr from-indigo-400/20 to-transparent blur-3xl" />

        <div className="relative flex flex-wrap items-start justify-between gap-6">
          <div>
            <div className="inline-flex items-center gap-1.5 rounded-full border border-indigo-200/60 bg-white/80 px-3 py-1 text-[11px] font-medium text-indigo-700 backdrop-blur">
              <span className="h-1.5 w-1.5 rounded-full bg-indigo-500 shadow-[0_0_8px_rgba(99,102,241,0.8)]" />
              Operator console
            </div>
            <h1 className="mt-3 text-4xl font-semibold tracking-tight text-gray-900">
              Klantenportfolio
            </h1>
            <p className="mt-2 max-w-xl text-sm leading-relaxed text-gray-600">
              Beheer je volledige klantenbasis, open dashboards, en houd onboardings bij — allemaal vanaf één plek.
            </p>
          </div>

          <Link
            href="/admin/clients/new"
            className="group relative inline-flex items-center gap-2 overflow-hidden rounded-xl bg-gradient-to-br from-indigo-600 via-violet-600 to-fuchsia-600 px-5 py-3 text-sm font-semibold text-white shadow-lg shadow-violet-600/30 transition-all hover:shadow-xl hover:shadow-violet-600/40 hover:-translate-y-0.5"
          >
            <span className="absolute inset-0 bg-gradient-to-br from-white/0 via-white/20 to-white/0 opacity-0 transition-opacity group-hover:opacity-100" />
            <svg className="relative h-4 w-4" fill="none" viewBox="0 0 24 24" strokeWidth={2.5} stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" d="M12 4.5v15m7.5-7.5h-15" />
            </svg>
            <span className="relative">Nieuwe klant</span>
          </Link>
        </div>

        {/* Inline counts */}
        <div className="relative mt-8 flex flex-wrap gap-6">
          <CountChip label="Actief" value={activeCount} dot="bg-emerald-500" glow="shadow-[0_0_8px_rgba(16,185,129,0.6)]" />
          <CountChip label="Onboarding" value={onboardingCount} dot="bg-amber-500" glow="shadow-[0_0_8px_rgba(245,158,11,0.6)]" />
          <CountChip label="Gepauzeerd" value={pausedCount} dot="bg-gray-400" glow="" />
          <div className="ml-auto self-center text-xs text-gray-400">
            {clients.length} {clients.length === 1 ? 'klant' : 'klanten'} totaal
          </div>
        </div>
      </section>

      {/* Pending objections notification */}
      {totalOpenObjections > 0 && (
        <Link
          href="/admin/bezwaren"
          className="group flex items-center justify-between gap-4 rounded-2xl border border-rose-200 bg-gradient-to-r from-rose-50 to-amber-50 px-6 py-4 shadow-sm transition-all hover:-translate-y-0.5 hover:shadow-md"
        >
          <div className="flex items-center gap-3">
            <div className="relative flex h-10 w-10 flex-shrink-0 items-center justify-center rounded-xl bg-rose-500 text-white shadow-lg shadow-rose-500/30">
              <svg className="h-5 w-5" fill="none" viewBox="0 0 24 24" strokeWidth={2} stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" d="M12 9v3.75m9-.75a9 9 0 1 1-18 0 9 9 0 0 1 18 0Zm-9 3.75h.008v.008H12v-.008Z" />
              </svg>
              <span className="absolute -right-1 -top-1 flex h-5 min-w-5 items-center justify-center rounded-full bg-gray-900 px-1 text-[10px] font-bold text-white shadow">
                {totalOpenObjections}
              </span>
            </div>
            <div>
              <div className="text-sm font-semibold text-gray-900">
                {totalOpenObjections} {totalOpenObjections === 1 ? 'bezwaar' : 'bezwaren'} wachten op beoordeling
              </div>
              <div className="text-xs text-gray-600">
                {objectionCounts.campaignLeads > 0 && (
                  <span>
                    {objectionCounts.campaignLeads} op campagne {objectionCounts.campaignLeads === 1 ? 'lead' : 'leads'}
                  </span>
                )}
                {objectionCounts.campaignLeads > 0 && objectionCounts.inboxLeads > 0 && ' · '}
                {objectionCounts.inboxLeads > 0 && (
                  <span>
                    {objectionCounts.inboxLeads} op inbox {objectionCounts.inboxLeads === 1 ? 'lead' : 'leads'}
                  </span>
                )}
              </div>
            </div>
          </div>
          <div className="inline-flex items-center gap-1 text-xs font-semibold text-rose-700 transition-transform group-hover:translate-x-0.5">
            Behandelen
            <svg className="h-3.5 w-3.5" fill="none" viewBox="0 0 24 24" strokeWidth={2.5} stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" d="M13.5 4.5 21 12m0 0-7.5 7.5M21 12H3" />
            </svg>
          </div>
        </Link>
      )}

      {/* Activity notification */}
      {(() => {
        const unseenCount = events.filter((e) => !e.seen).length
        if (unseenCount === 0) return null
        return (
          <Link
            href="/admin/overzicht"
            className="group flex items-center justify-between gap-4 rounded-2xl border border-indigo-200 bg-gradient-to-r from-indigo-50 to-violet-50 px-6 py-4 shadow-sm transition-all hover:-translate-y-0.5 hover:shadow-md"
          >
            <div className="flex items-center gap-3">
              <div className="relative flex h-10 w-10 flex-shrink-0 items-center justify-center rounded-xl bg-indigo-500 text-white shadow-lg shadow-indigo-500/30">
                <svg className="h-5 w-5" fill="none" viewBox="0 0 24 24" strokeWidth={2} stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" d="M14.857 17.082a23.848 23.848 0 0 0 5.454-1.31A8.967 8.967 0 0 1 18 9.75V9A6 6 0 0 0 6 9v.75a8.967 8.967 0 0 1-2.312 6.022c1.733.64 3.56 1.085 5.455 1.31m5.714 0a24.255 24.255 0 0 1-5.714 0m5.714 0a3 3 0 1 1-5.714 0" />
                </svg>
                <span className="absolute -right-1 -top-1 flex h-5 min-w-5 items-center justify-center rounded-full bg-red-500 px-1 text-[10px] font-bold text-white shadow">
                  {unseenCount}
                </span>
              </div>
              <div>
                <div className="text-sm font-semibold text-gray-900">
                  {unseenCount} nieuwe {unseenCount === 1 ? 'activiteit' : 'activiteiten'}
                </div>
                <div className="text-xs text-gray-500">
                  Bekijk de tijdlijn om te zien wat er is veranderd.
                </div>
              </div>
            </div>
            <div className="inline-flex items-center gap-1 text-xs font-semibold text-indigo-600 transition-transform group-hover:translate-x-0.5">
              Bekijken
              <svg className="h-3.5 w-3.5" fill="none" viewBox="0 0 24 24" strokeWidth={2.5} stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" d="M13.5 4.5 21 12m0 0-7.5 7.5M21 12H3" />
              </svg>
            </div>
          </Link>
        )
      })()}

      {/* Client list */}
      {clients.length === 0 ? (
        <div className="flex flex-col items-center justify-center rounded-2xl border border-dashed border-gray-200 bg-gradient-to-b from-gray-50/50 to-white px-6 py-20">
          <div className="flex h-16 w-16 items-center justify-center rounded-2xl bg-gradient-to-br from-indigo-100 to-violet-100">
            <svg className="h-7 w-7 text-indigo-500" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" d="M15 19.128a9.38 9.38 0 0 0 2.625.372 9.337 9.337 0 0 0 4.121-.952 4.125 4.125 0 0 0-7.533-2.493M15 19.128v-.003c0-1.113-.285-2.16-.786-3.07M15 19.128v.106A12.318 12.318 0 0 1 8.624 21c-2.331 0-4.512-.645-6.374-1.766l-.001-.109a6.375 6.375 0 0 1 11.964-3.07M12 6.375a3.375 3.375 0 1 1-6.75 0 3.375 3.375 0 0 1 6.75 0Zm8.25 2.25a2.625 2.625 0 1 1-5.25 0 2.625 2.625 0 0 1 5.25 0Z" />
            </svg>
          </div>
          <p className="mt-5 text-lg font-semibold text-gray-900">Nog geen klanten</p>
          <p className="mt-1 text-sm text-gray-500">Begin door je eerste klant aan te maken.</p>
          <Link
            href="/admin/clients/new"
            className="mt-6 inline-flex items-center gap-2 rounded-xl bg-gradient-to-br from-indigo-600 to-violet-600 px-5 py-2.5 text-sm font-semibold text-white shadow-lg shadow-violet-600/30 hover:-translate-y-0.5 hover:shadow-xl"
          >
            <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" strokeWidth={2.5} stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" d="M12 4.5v15m7.5-7.5h-15" />
            </svg>
            Eerste klant aanmaken
          </Link>
        </div>
      ) : (
        <ClientOverviewList clients={clients} />
      )}
    </div>
  )
}

function CountChip({ label, value, dot, glow }: { label: string; value: number; dot: string; glow: string }) {
  return (
    <div className="flex items-center gap-2.5">
      <span className={`h-2 w-2 rounded-full ${dot} ${glow}`} />
      <div className="flex items-baseline gap-1.5">
        <span className="text-2xl font-semibold tracking-tight text-gray-900">{value}</span>
        <span className="text-xs text-gray-500">{label}</span>
      </div>
    </div>
  )
}
