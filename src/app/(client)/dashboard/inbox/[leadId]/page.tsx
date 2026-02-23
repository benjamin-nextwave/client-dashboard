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

// ── Maintenance mode toggle (keep in sync with ../page.tsx) ─────────
const MAINTENANCE_MODE = false
// ─────────────────────────────────────────────────────────────────────

export const dynamic = 'force-dynamic'

export default async function LeadThreadPage({
  params,
}: {
  params: Promise<{ leadId: string }>
}) {
  const { leadId } = await params

  const client = await getClientBranding()
  if (!client) redirect('/login')

  if (MAINTENANCE_MODE) {
    return (
      <div>
        <Link
          href="/dashboard/inbox"
          className="inline-block text-sm text-gray-500 hover:text-gray-700"
        >
          &larr; Terug naar inbox
        </Link>
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
