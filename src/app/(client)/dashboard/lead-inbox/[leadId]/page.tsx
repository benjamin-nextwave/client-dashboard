import type { Metadata } from 'next'
import { notFound } from 'next/navigation'
import { getClientBranding } from '@/lib/client/get-client-branding'
import { LabelsManager } from '../_components/labels-manager'
import { LeadActions } from '../_components/lead-actions'
import { NotesSection } from '../_components/notes-section'
import { ReplySection } from '../_components/reply-section'
import { RepliesThread } from '../_components/replies-thread'
import { HARDCODED_CUSTOMER_ID } from '../_lib/constants'
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
  const [lead, outbounds, notes, assignedLabels, allLabels, branding] =
    await Promise.all([
      getLeadById(HARDCODED_CUSTOMER_ID, leadId),
      getOutboundRepliesForLead(HARDCODED_CUSTOMER_ID, leadId),
      getNotesForLead(leadId),
      getLabelsForLead(leadId),
      getUserLabelsForCustomer(HARDCODED_CUSTOMER_ID),
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
        <div className="flex flex-wrap items-center justify-between gap-3">
          <div className="flex flex-wrap items-center gap-3">
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
          <LeadActions leadId={lead.id} isTrashed={isTrashed} />
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
        <div className="mt-3">
          <LabelsManager
            leadId={lead.id}
            assigned={assignedLabels}
            available={allLabels}
          />
        </div>
      </header>

      <section className="mt-5">
        <h2 className="mb-2 text-xs font-semibold uppercase tracking-wider text-gray-500">
          Notities
        </h2>
        <NotesSection leadId={lead.id} notes={notes} />
      </section>

      {!isTrashed && lastInbound && (
        <section className="mt-5">
          <ReplySection
            leadId={lead.id}
            replyToSubject={lastInbound.subject ?? ''}
            sendingAccount={lead.sending_account}
            toEmail={lead.email}
            signature={signature}
          />
        </section>
      )}

      <section className="mt-5">
        <RepliesThread items={thread} />
      </section>
    </div>
  )
}
