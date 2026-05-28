import Link from 'next/link'
import { notFound } from 'next/navigation'
import { createAdminClient } from '@/lib/supabase/admin'
import { ClientOverviewBubbles } from './_components/client-overview-bubbles'
import { ClientSummaryCard } from './_components/client-summary-card'
import { OverviewQuickLinks } from './_components/overview-quick-links'

export const dynamic = 'force-dynamic'

interface PageProps {
  params: Promise<{ clientId: string }>
}

interface ClientUpdateRow {
  id: string
  author: string
  message: string
  is_urgent: boolean
  linked_to_summary: boolean
  created_at: string
}

export default async function ClientOverviewPage({ params }: PageProps) {
  const { clientId } = await params

  const supabase = createAdminClient()

  const { data: client, error: clientError } = await supabase
    .from('clients')
    .select('*')
    .eq('id', clientId)
    .single()

  if (clientError || !client) {
    notFound()
  }

  // Login email via profile + auth.users
  let clientEmail = ''
  const { data: profile } = await supabase
    .from('profiles')
    .select('id')
    .eq('client_id', clientId)
    .eq('user_role', 'client')
    .single()

  if (profile) {
    const { data: authUser } = await supabase.auth.admin.getUserById(profile.id)
    if (authUser?.user?.email) {
      clientEmail = authUser.user.email
    }
  }

  // Check whether at least one campaign form submission exists for the
  // "invulformulier"-button. Falls back to false on error/missing table.
  let hasFormSubmission = false
  try {
    const { count } = await supabase
      .from('campaign_form_submissions')
      .select('id', { count: 'exact', head: true })
      .eq('client_id', clientId)
    hasFormSubmission = (count ?? 0) > 0
  } catch {
    hasFormSubmission = false
  }

  // Updates linked to summary — degrade gracefully if table not yet migrated.
  let linkedUpdates: ClientUpdateRow[] = []
  try {
    const { data } = await supabase
      .from('client_updates')
      .select('id, author, message, is_urgent, linked_to_summary, created_at')
      .eq('client_id', clientId)
      .eq('linked_to_summary', true)
      .order('created_at', { ascending: false })
    if (Array.isArray(data)) {
      linkedUpdates = data as ClientUpdateRow[]
    }
  } catch {
    linkedUpdates = []
  }

  const c = client as unknown as Record<string, unknown>
  const accent = (c.primary_color as string | null) ?? '#6366f1'
  const companyName = (c.company_name as string) ?? ''
  const logoUrl = (c.logo_url as string | null) ?? null
  const password = (c.password as string | null) ?? null
  const dealbasis = (c.dealbasis as string | null) ?? null
  const inboxApproach = (c.inbox_approach as string | null) ?? null
  const startDateMaand = (c.start_date_maand as string | null) ?? null
  const endDateMaand = (c.end_date_maand as string | null) ?? null
  const companySummary = (c.company_summary as string | null) ?? null

  const initials = companyName
    .split(/\s+/)
    .slice(0, 2)
    .map((w) => w.charAt(0))
    .join('')
    .toUpperCase()

  return (
    <div className="mx-auto max-w-5xl space-y-8">
      {/* Back link */}
      <Link
        href="/admin"
        className="group inline-flex items-center gap-1.5 text-xs font-semibold text-gray-500 transition-colors hover:text-indigo-600"
      >
        <svg className="h-3.5 w-3.5 transition-transform group-hover:-translate-x-0.5" fill="none" viewBox="0 0 24 24" strokeWidth={2.5} stroke="currentColor">
          <path strokeLinecap="round" strokeLinejoin="round" d="M10.5 19.5 3 12m0 0 7.5-7.5M3 12h18" />
        </svg>
        Terug naar overzicht
      </Link>

      {/* Hero */}
      <section className="relative overflow-hidden rounded-3xl border border-gray-200 bg-gradient-to-br from-white via-indigo-50/30 to-violet-50/20 p-8 shadow-sm">
        <div
          className="pointer-events-none absolute inset-x-0 top-0 h-1"
          style={{ background: `linear-gradient(90deg, ${accent}, ${accent}55 60%, transparent)` }}
        />
        <div className="relative flex flex-wrap items-center gap-5">
          <div
            className="flex h-20 w-20 flex-shrink-0 items-center justify-center overflow-hidden rounded-2xl border border-gray-100 bg-white text-2xl font-bold text-white shadow-sm"
            style={logoUrl ? undefined : { background: `linear-gradient(135deg, ${accent}, ${accent}aa)` }}
          >
            {logoUrl ? (
              // eslint-disable-next-line @next/next/no-img-element
              <img src={logoUrl} alt={companyName} className="h-full w-full object-contain p-2" />
            ) : (
              <span className="drop-shadow">{initials}</span>
            )}
          </div>
          <div className="min-w-0">
            <div className="text-[11px] font-semibold uppercase tracking-wide text-gray-400">Klantoverzicht</div>
            <h1 className="mt-1 text-3xl font-semibold tracking-tight text-gray-900">{companyName}</h1>
            {clientEmail && (
              <p className="mt-1 text-xs text-gray-500">{clientEmail}</p>
            )}
          </div>
        </div>
      </section>

      {/* Editable bubbles */}
      <ClientOverviewBubbles
        clientId={clientId}
        accent={accent}
        email={clientEmail}
        password={password}
        dealbasis={dealbasis}
        inboxApproach={inboxApproach}
        startDateMaand={startDateMaand}
        endDateMaand={endDateMaand}
        hasFormSubmission={hasFormSubmission}
      />

      {/* Quick-link buttons */}
      <OverviewQuickLinks clientId={clientId} />

      {/* Summary + linked updates */}
      <ClientSummaryCard
        clientId={clientId}
        initialSummary={companySummary}
        linkedUpdates={linkedUpdates.map((u) => ({
          id: u.id,
          author: u.author,
          message: u.message,
          isUrgent: u.is_urgent,
          createdAt: u.created_at,
        }))}
      />
    </div>
  )
}
