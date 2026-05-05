import type { Metadata } from 'next'
import { notFound } from 'next/navigation'
import { getClientBranding } from '@/lib/client/get-client-branding'
import { LeadWorkspace } from '../_components/lead-workspace'
import { RepliesThread } from '../_components/replies-thread'
import { requireLeadInboxCustomerId } from '../_lib/customer'
import { CLASSIFICATION_BADGE, CLASSIFICATION_LABEL } from '../_lib/labels'
import {
  buildThreadItems,
  getLabelsForLead,
  getLeadById,
  getNotesForLead,
  getOutboundRepliesForLead,
  getUserLabelsForCustomer,
} from '../_lib/queries'

export const metadata: Metadata = { title: 'Lead — Lead Inbox' }
export const dynamic = 'force-dynamic'

export default async function LeadDetailPage({
  params,
}: {
  params: Promise<{ leadId: string }>
}) {
  const { leadId } = await params
  const customerId = await requireLeadInboxCustomerId()
  const [lead, outbounds, notes, assignedLabels, allLabels, branding] =
    await Promise.all([
      getLeadById(customerId, leadId),
      getOutboundRepliesForLead(customerId, leadId),
      getNotesForLead(leadId),
      getLabelsForLead(leadId),
      getUserLabelsForCustomer(customerId),
      getClientBranding(),
    ])

  if (!lead) notFound()

  const thread = buildThreadItems(lead, outbounds)
  const lastInbound = [...lead.replies]
    .filter((r) => r.direction !== 'outbound')
    .sort(
      (a, b) =>
        new Date(b.received_at).getTime() - new Date(a.received_at).getTime()
    )[0]

  const isTrashed = !!lead.deleted_at
  const signature = branding?.email_signature ?? null

  return (
    <div className="px-5 py-5 lg:px-8 lg:py-6">
      <header className="border-b border-gray-200 pb-4">
        <div className="flex flex-wrap items-center gap-3 pr-12">
          <h1 className="text-xl font-semibold text-gray-900">
            {lead.name || lead.email}
          </h1>
          <span
            className={`inline-flex rounded-full px-2 py-0.5 text-xs font-medium ${CLASSIFICATION_BADGE[lead.classification]}`}
          >
            {CLASSIFICATION_LABEL[lead.classification]}
          </span>
          {isTrashed && (
            <span className="inline-flex rounded-full bg-rose-50 px-2 py-0.5 text-xs font-medium text-rose-700">
              In prullenbak
            </span>
          )}
        </div>
        <div className="mt-4">
          <LeadWorkspace
            leadId={lead.id}
            isTrashed={isTrashed}
            canReply={!!lastInbound}
            replyToSubject={lastInbound?.subject ?? ''}
            sendingAccount={lead.sending_account}
            toEmail={lead.email}
            signature={signature}
            assignedLabels={assignedLabels}
            availableLabels={allLabels}
            notes={notes}
          />
        </div>
      </header>

      <section className="mt-5">
        <RepliesThread items={thread} />
      </section>
    </div>
  )
}
