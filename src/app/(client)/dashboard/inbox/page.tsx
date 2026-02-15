import { redirect } from 'next/navigation'
import { getClientBranding } from '@/lib/client/get-client-branding'
import { getPositiveLeadsForInbox } from '@/lib/data/inbox-data'
import { createClient } from '@/lib/supabase/server'
import { InboxList } from './_components/inbox-list'

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
        <div className="mt-8 rounded-lg border border-gray-200 bg-white p-8 text-center">
          <p className="text-gray-500">Geen positieve leads gevonden.</p>
        </div>
      ) : (
        <InboxList leads={positiveLeads} isRecruitment={isRecruitment} />
      )}
    </div>
  )
}
