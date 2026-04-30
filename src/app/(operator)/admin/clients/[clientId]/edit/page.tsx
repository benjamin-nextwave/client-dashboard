import Link from 'next/link'
import { createAdminClient } from '@/lib/supabase/admin'
import { ClientForm } from '@/components/admin/client-form'
import { updateClient } from '../../actions'

export const dynamic = 'force-dynamic'

interface EditClientPageProps {
  params: Promise<{ clientId: string }>
}

export default async function EditClientPage({ params }: EditClientPageProps) {
  const { clientId } = await params

  const supabase = createAdminClient()

  const { data: client, error: clientError } = await supabase
    .from('clients')
    .select('*')
    .eq('id', clientId)
    .single()

  if (clientError || !client) {
    return (
      <div className="mx-auto max-w-3xl">
        <Link href="/admin" className="text-xs font-semibold text-gray-500 hover:text-indigo-600">
          &larr; Terug naar overzicht
        </Link>
        <div className="mt-6 rounded-2xl border border-red-200 bg-red-50 p-6 text-sm text-red-800">
          Klant niet gevonden.
        </div>
      </div>
    )
  }

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

  const boundUpdate = updateClient.bind(null, clientId)

  const accent = client.primary_color ?? '#6366f1'
  const initials = client.company_name
    .split(/\s+/)
    .slice(0, 2)
    .map((w: string) => w.charAt(0))
    .join('')
    .toUpperCase()

  return (
    <div className="mx-auto max-w-3xl">
      <Link
        href="/admin"
        className="group inline-flex items-center gap-1.5 text-xs font-semibold text-gray-500 transition-colors hover:text-indigo-600"
      >
        <svg className="h-3.5 w-3.5 transition-transform group-hover:-translate-x-0.5" fill="none" viewBox="0 0 24 24" strokeWidth={2.5} stroke="currentColor">
          <path strokeLinecap="round" strokeLinejoin="round" d="M10.5 19.5 3 12m0 0 7.5-7.5M3 12h18" />
        </svg>
        Terug naar overzicht
      </Link>

      {/* Client hero */}
      <div className="mt-5 mb-8 flex flex-wrap items-center justify-between gap-4 rounded-2xl border border-gray-200 bg-gradient-to-br from-white via-white to-indigo-50/30 p-6 shadow-sm">
        <div className="flex items-center gap-4">
          <div
            className="flex h-16 w-16 flex-shrink-0 items-center justify-center overflow-hidden rounded-2xl border border-gray-100 bg-white text-lg font-bold text-white shadow-sm"
            style={client.logo_url ? undefined : { background: `linear-gradient(135deg, ${accent}, ${accent}aa)` }}
          >
            {client.logo_url ? (
              // eslint-disable-next-line @next/next/no-img-element
              <img src={client.logo_url} alt={client.company_name} className="h-full w-full object-contain p-2" />
            ) : (
              <span className="drop-shadow">{initials}</span>
            )}
          </div>
          <div>
            <div className="text-[11px] font-semibold uppercase tracking-wide text-gray-400">Klant bewerken</div>
            <h1 className="mt-0.5 text-2xl font-semibold tracking-tight text-gray-900">
              {client.company_name}
            </h1>
            {clientEmail && (
              <p className="mt-0.5 text-xs text-gray-500">{clientEmail}</p>
            )}
          </div>
        </div>
        <div className="flex flex-wrap gap-2">
          <QuickLink href={`/admin/clients/${clientId}/campagne`} label="Campagne" highlight />
          <QuickLink href={`/admin/clients/${clientId}/campagne-flow`} label="Campagne-flow" />
          <QuickLink href={`/admin/clients/${clientId}/campagne-leads`} label="Campagne leads" />
          <QuickLink href={`/admin/clients/${clientId}/contacten`} label="Contacten" />
          <QuickLink href={`/admin/clients/${clientId}/csv`} label="CSV" />
          <QuickLink href={`/admin/clients/${clientId}/onboarding`} label="Onboarding" />
          <QuickLink href={`/admin/clients/${clientId}/voorvertoning`} label="Voorvertoning" />
        </div>
      </div>

      <ClientForm
        action={boundUpdate}
        defaultValues={{
          companyName: client.company_name,
          email: clientEmail,
          primaryColor: client.primary_color,
          isRecruitment: client.is_recruitment,
          meetingUrl: client.meeting_url ?? '',
          inboxUrl: client.inbox_url ?? '',
          inboxVisible: client.inbox_visible ?? false,
          chatInboxVisible: client.chat_inbox_visible ?? true,
          instantlyApiKey: client.instantly_api_key ?? '',
        }}
        currentLogoUrl={client.logo_url}
        isEditing={true}
        originalEmail={clientEmail}
      />
    </div>
  )
}

function QuickLink({ href, label, highlight }: { href: string; label: string; highlight?: boolean }) {
  return (
    <Link
      href={href}
      className={`inline-flex items-center rounded-lg border px-3 py-1.5 text-xs font-semibold shadow-sm transition-all hover:-translate-y-0.5 hover:shadow ${
        highlight
          ? 'border-indigo-200 bg-indigo-50 text-indigo-700 hover:border-indigo-300 hover:bg-indigo-100'
          : 'border-gray-200 bg-white text-gray-700 hover:border-indigo-200 hover:text-indigo-600'
      }`}
    >
      {label}
    </Link>
  )
}
