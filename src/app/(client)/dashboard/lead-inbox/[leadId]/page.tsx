import type { Metadata } from 'next'
import { notFound } from 'next/navigation'
import { getClientBranding } from '@/lib/client/get-client-branding'
import { AdminContactBox } from '@/components/admin-contact-box'
import { getAdminContactByEmail, hasAdminContact } from '@/lib/data/lead-admin-contacts'
import { AssistantDraft } from '../_components/assistant-draft'
import { ReferralOutreach } from '../_components/referral-outreach'
import { LeadWorkspace } from '../_components/lead-workspace'
import { RepliesThread } from '../_components/replies-thread'
import { requireLeadInboxCustomerId } from '../_lib/customer'
import { getReferralOutreach } from '../_lib/referral'
import { CLASSIFICATION_DOT, CLASSIFICATION_LABEL } from '../_lib/labels'
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

  const isReferral = lead.classification === 'referral'

  const [adminContact, referralSent] = await Promise.all([
    branding ? getAdminContactByEmail(branding.id, lead.email) : null,
    isReferral ? getReferralOutreach(lead.id) : null,
  ])

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
      <header className="border-b border-line pb-4">
        <div className="flex flex-wrap items-center gap-3 pr-12">
          <h1 className="text-xl font-semibold text-fg">
            {lead.name || lead.email}
          </h1>
          <span className="inline-flex items-center gap-1.5 rounded-[5px] border border-line bg-track px-2 py-[3px] text-[11px] font-semibold">
            <span
              className="h-[5px] w-[5px] shrink-0 rounded-full"
              style={{ background: CLASSIFICATION_DOT[lead.classification] }}
              aria-hidden
            />
            {CLASSIFICATION_LABEL[lead.classification]}
          </span>
          {isTrashed && (
            <span className="inline-flex rounded-[5px] bg-[color-mix(in_oklab,var(--c-neg)_10%,transparent)] px-2 py-[3px] text-[11px] font-semibold text-neg">
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

      {/* Boven de rode contactbox: eerst wat je kunt dóén, dan de gegevens
          waar dat op gebaseerd is. */}
      {isReferral && !isTrashed && (
        <div className="mt-5">
          <ReferralOutreach
            leadId={lead.id}
            leadEmail={lead.email}
            leadName={lead.name}
            sendingAccount={lead.sending_account}
            alreadySentTo={referralSent?.toEmail ?? null}
          />
        </div>
      )}

      {hasAdminContact(adminContact) && adminContact && (
        <div className="mt-5">
          <AdminContactBox data={adminContact} />
        </div>
      )}

      <div className="mt-5">
        <AssistantDraft
          leadId={lead.id}
          canReply={!!lastInbound}
          isTrashed={isTrashed}
          replyToSubject={lastInbound?.subject ?? ''}
          sendingAccount={lead.sending_account}
          toEmail={lead.email}
        />
      </div>

      <section className="mt-5">
        <RepliesThread items={thread} />
      </section>
    </div>
  )
}
