import type { Metadata } from 'next'
import { notFound } from 'next/navigation'
import { ReplyForm } from '../_components/reply-form'
import { RepliesThread } from '../_components/replies-thread'
import { HARDCODED_CUSTOMER_ID } from '../_lib/constants'
import { CLASSIFICATION_BADGE, CLASSIFICATION_LABEL } from '../_lib/labels'
import {
  buildThreadItems,
  getLeadById,
  getOutboundRepliesForLead,
} from '../_lib/queries'

export const metadata: Metadata = { title: 'Lead — Lead Inbox' }
export const dynamic = 'force-dynamic'

export default async function LeadDetailPage({
  params,
}: {
  params: Promise<{ leadId: string }>
}) {
  const { leadId } = await params
  const [lead, outbounds] = await Promise.all([
    getLeadById(HARDCODED_CUSTOMER_ID, leadId),
    getOutboundRepliesForLead(HARDCODED_CUSTOMER_ID, leadId),
  ])

  if (!lead) notFound()

  const thread = buildThreadItems(lead, outbounds)
  const lastInbound = [...lead.replies]
    .filter((r) => r.direction !== 'outbound')
    .sort(
      (a, b) =>
        new Date(b.received_at).getTime() - new Date(a.received_at).getTime()
    )[0]

  return (
    <div className="px-5 py-5 lg:px-8 lg:py-6">
      <header className="border-b border-gray-200 pb-4">
        <div className="flex flex-wrap items-center gap-3">
          <h1 className="text-xl font-semibold text-gray-900">
            {lead.name || lead.email}
          </h1>
          <span
            className={`inline-flex rounded-full px-2 py-0.5 text-xs font-medium ${CLASSIFICATION_BADGE[lead.classification]}`}
          >
            {CLASSIFICATION_LABEL[lead.classification]}
          </span>
        </div>
        <div className="mt-1 flex flex-wrap items-center gap-x-3 gap-y-1 text-sm text-gray-600">
          <span>{lead.email}</span>
          <span aria-hidden className="text-gray-300">
            ·
          </span>
          <span>via {lead.sending_account}</span>
          {lead.thread_id && (
            <>
              <span aria-hidden className="text-gray-300">
                ·
              </span>
              <span className="break-all font-mono text-xs text-gray-500">
                {lead.thread_id}
              </span>
            </>
          )}
        </div>
      </header>

      <section className="mt-5">
        <h2 className="mb-3 text-sm font-semibold text-gray-900">
          Thread ({thread.length})
        </h2>
        <RepliesThread items={thread} />
      </section>

      {lastInbound && (
        <section className="mt-6">
          <h2 className="mb-3 text-sm font-semibold text-gray-900">Antwoorden</h2>
          <ReplyForm
            leadId={lead.id}
            replyToSubject={lastInbound.subject ?? ''}
            sendingAccount={lead.sending_account}
            toEmail={lead.email}
          />
        </section>
      )}
    </div>
  )
}
