import { redirect, notFound } from 'next/navigation'
import Link from 'next/link'
import { getClientBranding } from '@/lib/client/get-client-branding'
import { getLeadThread } from '@/lib/data/inbox-data'
import { markLeadAsOpened } from '@/lib/actions/inbox-actions'
import { createClient } from '@/lib/supabase/server'
import { ThreadView } from '../_components/thread-view'
import { LeadContactCard } from '../_components/lead-contact-card'

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
      'id, email, first_name, last_name, company_name, job_title, linkedin_url, vacancy_url, sender_account, client_has_replied, reply_subject'
    )
    .eq('id', leadId)
    .single()

  if (leadError || !lead) {
    notFound()
  }

  // Mark as opened
  await markLeadAsOpened(leadId)

  // Fetch email thread
  const emails = await getLeadThread(client.id, lead.email)

  // Check if recruitment client
  const { data: clientData } = await supabase
    .from('clients')
    .select('is_recruitment')
    .eq('id', client.id)
    .single()

  const isRecruitment = clientData?.is_recruitment ?? false

  return (
    <div>
      <Link
        href="/dashboard/inbox"
        className="mb-4 inline-block text-sm text-gray-500 hover:text-gray-700"
      >
        &larr; Terug naar inbox
      </Link>

      <div className="lg:grid lg:grid-cols-3 lg:gap-6">
        <div className="lg:col-span-2">
          <ThreadView
            emails={emails}
            leadEmail={lead.email}
            senderAccount={lead.sender_account ?? ''}
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
