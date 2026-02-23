import { redirect, notFound } from 'next/navigation'
import Link from 'next/link'
import { getClientBranding } from '@/lib/client/get-client-branding'
import { getLeadThread } from '@/lib/data/inbox-data'
import { markLeadAsOpened } from '@/lib/actions/inbox-actions'
import { createClient } from '@/lib/supabase/server'
import { ThreadView } from '../_components/thread-view'
import { LeadContactCard } from '../_components/lead-contact-card'
import { ArchiveButton } from '../_components/archive-button'
import { ThreadRealtimeProvider } from '../_components/thread-realtime-provider'

export const dynamic = 'force-dynamic'

export default async function LeadThreadPage({
  params,
}: {
  params: Promise<{ leadId: string }>
}) {
  const { leadId } = await params

  const client = await getClientBranding()
  if (!client) redirect('/login')

  const supabase = await createClient()

  // Fetch lead details
  const { data: lead, error: leadError } = await supabase
    .from('synced_leads')
    .select(
      'id, email, first_name, last_name, company_name, job_title, linkedin_url, vacancy_url, sender_account, client_has_replied, reply_subject, archived_at'
    )
    .eq('id', leadId)
    .single()

  if (leadError || !lead) {
    notFound()
  }

  // Mark as opened
  await markLeadAsOpened(leadId)

  // Fetch email thread — wrapped in try/catch to prevent server component crash
  let emails: Awaited<ReturnType<typeof getLeadThread>> = []
  try {
    emails = await getLeadThread(client.id, lead.email)
  } catch (err) {
    console.error('Failed to fetch lead thread:', err)
  }

  // Resolve sender account: prefer lead record, fallback to cached sender_account,
  // then fallback to from_address of first outbound (non-reply) email in thread
  const senderAccount =
    lead.sender_account ||
    emails.find((e) => e.sender_account)?.sender_account ||
    emails.find((e) => !e.is_reply)?.from_address ||
    ''

  // Check if recruitment client
  const { data: clientData } = await supabase
    .from('clients')
    .select('is_recruitment')
    .eq('id', client.id)
    .single()

  const isRecruitment = clientData?.is_recruitment ?? false

  return (
    <div>
      <ThreadRealtimeProvider clientId={client.id} leadEmail={lead.email} />
      <div className="mb-4 flex items-center justify-between">
        <Link
          href="/dashboard/inbox"
          className="inline-block text-sm text-gray-500 hover:text-gray-700"
        >
          &larr; Terug naar inbox
        </Link>
        <ArchiveButton leadId={lead.id} isArchived={!!lead.archived_at} />
      </div>

      <div className="lg:grid lg:grid-cols-3 lg:gap-6">
        <div className="lg:col-span-2">
          <ThreadView
            emails={emails}
            leadEmail={lead.email}
            senderAccount={senderAccount}
            leadId={lead.id}
            replySubject={lead.reply_subject ?? null}
          />
        </div>
        <div className="mt-6 lg:col-span-1 lg:mt-0">
          <LeadContactCard lead={lead} isRecruitment={isRecruitment} />
        </div>
      </div>
    </div>
  )
}
