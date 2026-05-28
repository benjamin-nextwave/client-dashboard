import Link from 'next/link'
import { notFound } from 'next/navigation'
import { createAdminClient } from '@/lib/supabase/admin'
import { UpdatesThread } from './_components/updates-thread'

export const dynamic = 'force-dynamic'

interface PageProps {
  params: Promise<{ clientId: string }>
}

export default async function ClientUpdatesPage({ params }: PageProps) {
  const { clientId } = await params

  const supabase = createAdminClient()

  const { data: client } = await supabase
    .from('clients')
    .select('id, company_name, primary_color, logo_url')
    .eq('id', clientId)
    .single()

  if (!client) notFound()

  let updates: Array<{
    id: string
    author: string
    message: string
    is_urgent: boolean
    linked_to_summary: boolean
    created_at: string
  }> = []
  try {
    const { data } = await supabase
      .from('client_updates')
      .select('id, author, message, is_urgent, linked_to_summary, created_at')
      .eq('client_id', clientId)
      .order('created_at', { ascending: false })
    if (Array.isArray(data)) {
      updates = data
    }
  } catch {
    updates = []
  }

  return (
    <div className="mx-auto max-w-3xl space-y-6">
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
        <div className="text-[11px] font-semibold uppercase tracking-wide text-gray-400">Belangrijke updates</div>
        <h1 className="mt-1 text-2xl font-semibold tracking-tight text-gray-900">
          {client.company_name}
        </h1>
        <p className="mt-1 text-sm text-gray-500">
          Post updates over deze klant. Verbind een bericht aan de samenvatting om het op de overzichtspagina te tonen.
        </p>
      </header>

      <UpdatesThread
        clientId={clientId}
        initialUpdates={updates.map((u) => ({
          id: u.id,
          author: u.author,
          message: u.message,
          isUrgent: u.is_urgent,
          linkedToSummary: u.linked_to_summary,
          createdAt: u.created_at,
        }))}
      />
    </div>
  )
}
