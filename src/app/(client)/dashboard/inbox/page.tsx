import type { Metadata } from 'next'
import { redirect } from 'next/navigation'
import { getClientBranding } from '@/lib/client/get-client-branding'
import { getPositiveLeadsForInbox } from '@/lib/data/inbox-data'
import { createClient } from '@/lib/supabase/server'
import { EmptyState } from '@/components/ui/empty-state'
import { InboxList } from './_components/inbox-list'
import { InboxRealtimeProvider } from './_components/inbox-realtime-provider'

// ── Maintenance mode toggle ─────────────────────────────────────────
// Set to `true` to show a maintenance banner instead of the inbox.
// Set back to `false` and redeploy to restore normal operation.
const MAINTENANCE_MODE = false
// ─────────────────────────────────────────────────────────────────────

export const metadata: Metadata = { title: 'Inbox' }
export const dynamic = 'force-dynamic'

export default async function InboxPage() {
  const client = await getClientBranding()
  if (!client) redirect('/login')

  if (MAINTENANCE_MODE) {
    return (
      <div>
        <h1 className="text-2xl font-bold text-gray-900">Inbox</h1>
        <div className="mt-8 flex flex-col items-center justify-center rounded-xl border border-amber-200 bg-amber-50 px-6 py-12 text-center">
          <svg className="h-12 w-12 text-amber-500" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" d="M11.42 15.17 17.25 21A2.652 2.652 0 0 0 21 17.25l-5.877-5.877M11.42 15.17l2.496-3.03c.317-.384.74-.626 1.208-.766M11.42 15.17l-4.655 5.653a2.548 2.548 0 1 1-3.586-3.586l6.837-5.63m5.108-.233c.55-.164 1.163-.188 1.743-.14a4.5 4.5 0 0 0 4.486-6.336l-3.276 3.277a3.004 3.004 0 0 1-2.25-2.25l3.276-3.276a4.5 4.5 0 0 0-6.336 4.486c.091 1.076-.071 2.264-.904 2.95l-.102.085m-1.745 1.437L5.909 7.5H4.5L2.25 3.75l1.5-1.5L7.5 4.5v1.409l4.26 4.26m-1.745 1.437 1.745-1.437m6.615 8.206L15.75 15.75M4.867 19.125h.008v.008h-.008v-.008Z" />
          </svg>
          <h2 className="mt-4 text-lg font-semibold text-amber-800">
            Inbox tijdelijk niet beschikbaar
          </h2>
          <p className="mt-2 max-w-md text-sm text-amber-700">
            We zijn bezig met onderhoud aan de inbox. Deze is binnen enkele uren weer online.
            Onze excuses voor het ongemak.
          </p>
        </div>
      </div>
    )
  }

  const [positiveLeads, clientInfoResult] = await Promise.all([
    getPositiveLeadsForInbox(client.id),
    (async () => {
      const supabase = await createClient()
      const { data } = await supabase
        .from('clients')
        .select('is_recruitment')
        .eq('id', client.id)
        .single()
      return data
    })(),
  ])

  const isRecruitment = clientInfoResult?.is_recruitment ?? false

  return (
    <div>
      <h1 className="text-2xl font-bold text-gray-900">Inbox</h1>
      <p className="mt-1 text-sm text-gray-600">
        Uw positieve leads en gesprekken
      </p>

      <InboxRealtimeProvider clientId={client.id} />

      {positiveLeads.length === 0 ? (
        <EmptyState
          icon={
            <svg className="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M21.75 6.75v10.5a2.25 2.25 0 01-2.25 2.25h-15a2.25 2.25 0 01-2.25-2.25V6.75m19.5 0A2.25 2.25 0 0019.5 4.5h-15a2.25 2.25 0 00-2.25 2.25m19.5 0v.243a2.25 2.25 0 01-1.07 1.916l-7.5 4.615a2.25 2.25 0 01-2.36 0L3.32 8.91a2.25 2.25 0 01-1.07-1.916V6.75" />
            </svg>
          }
          title="Geen positieve leads"
          description="Zodra leads positief reageren op uw campagnes verschijnen ze hier."
        />
      ) : (
        <InboxList leads={positiveLeads} isRecruitment={isRecruitment} />
      )}
    </div>
  )
}
