import type { Metadata } from 'next'
import Link from 'next/link'
import { notFound } from 'next/navigation'
import { RepliesThread } from '../_components/replies-thread'
import { HARDCODED_CUSTOMER_ID } from '../_lib/constants'
import { CLASSIFICATION_BADGE, CLASSIFICATION_LABEL } from '../_lib/labels'
import { getLeadById } from '../_lib/queries'

export const metadata: Metadata = { title: 'Lead detail — Lead Inbox' }
export const dynamic = 'force-dynamic'

function formatDateTime(iso: string): string {
  const d = new Date(iso)
  return d.toLocaleString('nl-NL', {
    day: '2-digit',
    month: '2-digit',
    year: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
  })
}

export default async function LeadDetailPage({
  params,
}: {
  params: Promise<{ leadId: string }>
}) {
  const { leadId } = await params
  const lead = await getLeadById(HARDCODED_CUSTOMER_ID, leadId)

  if (!lead) notFound()

  return (
    <div>
      <Link
        href="/dashboard/lead-inbox"
        className="inline-flex items-center gap-1 text-sm text-gray-600 hover:text-gray-900"
      >
        <svg
          className="h-4 w-4"
          fill="none"
          viewBox="0 0 24 24"
          strokeWidth={1.5}
          stroke="currentColor"
        >
          <path strokeLinecap="round" strokeLinejoin="round" d="M15.75 19.5L8.25 12l7.5-7.5" />
        </svg>
        Terug naar lead inbox
      </Link>

      <div className="mt-3 flex flex-wrap items-baseline gap-3">
        <h1 className="text-2xl font-bold text-gray-900">
          {lead.name || lead.email}
        </h1>
        <span className="text-sm text-gray-600">{lead.email}</span>
      </div>

      <dl className="mt-4 grid grid-cols-1 gap-4 rounded-xl border border-gray-200 bg-white p-5 sm:grid-cols-2 lg:grid-cols-4">
        <div>
          <dt className="text-xs font-semibold uppercase tracking-wider text-gray-500">
            Classificatie
          </dt>
          <dd className="mt-1">
            <span
              className={`inline-flex rounded-full px-2 py-0.5 text-xs font-medium ${CLASSIFICATION_BADGE[lead.classification]}`}
            >
              {CLASSIFICATION_LABEL[lead.classification]}
            </span>
          </dd>
        </div>
        <div>
          <dt className="text-xs font-semibold uppercase tracking-wider text-gray-500">
            Sending account
          </dt>
          <dd className="mt-1 text-sm text-gray-900">{lead.sending_account}</dd>
        </div>
        <div>
          <dt className="text-xs font-semibold uppercase tracking-wider text-gray-500">
            Eerste reply
          </dt>
          <dd className="mt-1 text-sm text-gray-900">{formatDateTime(lead.first_reply_at)}</dd>
        </div>
        <div>
          <dt className="text-xs font-semibold uppercase tracking-wider text-gray-500">
            Laatste reply
          </dt>
          <dd className="mt-1 text-sm text-gray-900">{formatDateTime(lead.last_reply_at)}</dd>
        </div>
      </dl>

      <h2 className="mt-8 text-lg font-semibold text-gray-900">
        Replies thread ({lead.replies.length})
      </h2>
      <div className="mt-3">
        <RepliesThread replies={lead.replies} />
      </div>
    </div>
  )
}
