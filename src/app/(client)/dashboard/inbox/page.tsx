import type { Metadata } from 'next'
import { redirect } from 'next/navigation'
import { getClientBranding } from '@/lib/client/get-client-branding'
import { getPositiveLeadsForInbox } from '@/lib/data/inbox-data'
import { createClient } from '@/lib/supabase/server'
import { EmptyState } from '@/components/ui/empty-state'
import { InboxList } from './_components/inbox-list'

export const metadata: Metadata = { title: 'Inbox' }
export const dynamic = 'force-dynamic'

export default async function InboxPage() {
  const client = await getClientBranding()
  if (!client) redirect('/login')

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
